from datetime import datetime, timedelta
import hashlib
import io
import json
import logging
import mimetypes
import os
import re
from functools import wraps
from pathlib import Path
import secrets
from uuid import uuid4

from dotenv import load_dotenv
from flask import Flask, g, jsonify, request, send_file
from flask_cors import CORS
import pymysql
import pymysql.cursors
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename

from services.extraction import (
    FIELD_PATTERNS,
    extract_fields_from_text,
    extract_line_items,
    parse_amount,
    validate_date_format,
    validate_fields,
)
from services.exporters import build_csv, build_excel, fetch_export_rows
from services.workflow import log_workflow, run_workflow

load_dotenv()

app = Flask(__name__)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "invoices_db"),
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": False,
}
SESSION_TTL_HOURS = int(os.getenv("SESSION_TTL_HOURS", "12"))

UPLOAD_FOLDER.mkdir(exist_ok=True)

app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        }
    },
)

SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS organizations (
        id           INT           PRIMARY KEY AUTO_INCREMENT,
        name         VARCHAR(255)  NOT NULL,
        slug         VARCHAR(120)  NOT NULL UNIQUE,
        created_at   DATETIME      NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS users (
        id             INT           PRIMARY KEY AUTO_INCREMENT,
        organization_id INT          NOT NULL,
        full_name      VARCHAR(255)  NOT NULL,
        email          VARCHAR(255)  NOT NULL UNIQUE,
        password_hash  VARCHAR(255)  NOT NULL,
        is_active      TINYINT(1)    NOT NULL DEFAULT 1,
        created_at     DATETIME      NOT NULL,
        last_login_at  DATETIME      NULL,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS auth_sessions (
        id           INT           PRIMARY KEY AUTO_INCREMENT,
        user_id      INT           NOT NULL,
        token_hash   CHAR(64)      NOT NULL UNIQUE,
        created_at   DATETIME      NOT NULL,
        expires_at   DATETIME      NOT NULL,
        revoked_at   DATETIME      NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS invoices (
        id                  VARCHAR(255)  PRIMARY KEY,
        organization_id     INT           NULL,
        uploaded_by_user_id INT           NULL,
        filename            VARCHAR(500)  NOT NULL,
        original_name       VARCHAR(500)  NOT NULL,
        mime_type           VARCHAR(100)  NOT NULL,
        file_size           BIGINT        NOT NULL,
        uploaded_at         DATETIME      NOT NULL,
        status              VARCHAR(50)   NOT NULL DEFAULT 'uploaded',
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
        FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS invoice_fields (
        id              INT           PRIMARY KEY AUTO_INCREMENT,
        invoice_id      VARCHAR(255)  NOT NULL,
        invoice_number  VARCHAR(100),
        invoice_date    VARCHAR(100),
        due_date        VARCHAR(100),
        vendor          VARCHAR(255),
        bill_to         VARCHAR(255),
        subtotal        DECIMAL(15,2),
        tax             DECIMAL(15,2),
        total           DECIMAL(15,2),
        raw_text        LONGTEXT,
        extracted_at    DATETIME      NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS invoice_line_items (
        id           INT           PRIMARY KEY AUTO_INCREMENT,
        invoice_id   VARCHAR(255)  NOT NULL,
        description  TEXT          NOT NULL,
        quantity     DECIMAL(15,4),
        unit_price   DECIMAL(15,2),
        amount       DECIMAL(15,2),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS invoice_validation (
        id                    INT           PRIMARY KEY AUTO_INCREMENT,
        invoice_id            VARCHAR(255)  NOT NULL,
        is_valid              TINYINT(1)    NOT NULL DEFAULT 0,
        date_format_ok        TINYINT(1)    NOT NULL DEFAULT 0,
        amount_consistency_ok TINYINT(1)    NOT NULL DEFAULT 0,
        gst_calculation_ok    TINYINT(1)    NOT NULL DEFAULT 0,
        total_match_ok        TINYINT(1)    NOT NULL DEFAULT 0,
        errors                TEXT,
        validated_at          DATETIME      NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS workflow_log (
        id          INT           PRIMARY KEY AUTO_INCREMENT,
        invoice_id  VARCHAR(255)  NOT NULL,
        step        VARCHAR(100)  NOT NULL,
        status      VARCHAR(100)  NOT NULL,
        message     TEXT,
        created_at  DATETIME      NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS invoice_decisions (
        id                INT           PRIMARY KEY AUTO_INCREMENT,
        invoice_id        VARCHAR(255)  NOT NULL,
        organization_id   INT           NOT NULL,
        reviewer_user_id  INT           NULL,
        decision          VARCHAR(20)   NOT NULL,
        reason            TEXT,
        confidence_score  DECIMAL(5,2)  NULL,
        decided_at        DATETIME      NOT NULL,
        updated_at        DATETIME      NOT NULL,
        UNIQUE KEY uq_invoice_decision (invoice_id),
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS ml_training_samples (
        id               INT           PRIMARY KEY AUTO_INCREMENT,
        invoice_id       VARCHAR(255)  NOT NULL,
        organization_id  INT           NOT NULL,
        label            VARCHAR(20)   NOT NULL,
        features_json    LONGTEXT      NOT NULL,
        created_at       DATETIME      NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        INDEX idx_ml_training_org_created (organization_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
]


def get_db():
    if "db" not in g:
        g.db = pymysql.connect(**DB_CONFIG)
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def create_org_if_missing(db, name: str, slug: str) -> int:
    with db.cursor() as cur:
        cur.execute("SELECT id FROM organizations WHERE slug = %s", (slug,))
        row = cur.fetchone()
        if row:
            return row["id"]
        cur.execute(
            "INSERT INTO organizations (name, slug, created_at) VALUES (%s, %s, %s)",
            (name, slug, datetime.utcnow()),
        )
        return cur.lastrowid


def create_user_if_missing(db, organization_id: int, full_name: str, email: str, password: str):
    with db.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
        if row:
            return
        cur.execute(
            """
            INSERT INTO users (organization_id, full_name, email, password_hash, is_active, created_at)
            VALUES (%s, %s, %s, %s, 1, %s)
            """,
            (organization_id, full_name, email, generate_password_hash(password), datetime.utcnow()),
        )


def seed_default_access(db):
    alpha_org_id = create_org_if_missing(db, "Alpha Traders", "alpha-traders")
    zen_org_id = create_org_if_missing(db, "Zen Supplies", "zen-supplies")
    create_user_if_missing(db, alpha_org_id, "Alpha Admin", "alpha.admin@demo.com", "alpha123")
    create_user_if_missing(db, zen_org_id, "Zen Admin", "zen.admin@demo.com", "zen123")
    db.commit()


def init_db():
    con = pymysql.connect(**DB_CONFIG)
    try:
        with con.cursor() as cur:
            for statement in SCHEMA_STATEMENTS:
                clean = re.sub(r"--[^\n]*", "", statement).strip()
                if clean:
                    cur.execute(clean)
            cur.execute(
                "SELECT COUNT(*) AS count FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'organization_id'",
                (DB_CONFIG["database"],),
            )
            if cur.fetchone()["count"] == 0:
                cur.execute("ALTER TABLE invoices ADD COLUMN organization_id INT NULL")
            cur.execute(
                "SELECT COUNT(*) AS count FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'uploaded_by_user_id'",
                (DB_CONFIG["database"],),
            )
            if cur.fetchone()["count"] == 0:
                cur.execute("ALTER TABLE invoices ADD COLUMN uploaded_by_user_id INT NULL")
        con.commit()
        seed_default_access(con)
    finally:
        con.close()


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _serialize_user(row: dict) -> dict:
    return {
        "id": row["id"],
        "fullName": row["full_name"],
        "email": row["email"],
        "organizationId": row["organization_id"],
        "organizationName": row["organization_name"],
        "organizationSlug": row["organization_slug"],
    }


def _slugify_org_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").strip().lower()).strip("-")
    return slug or "org"


def _create_unique_org_slug(cur, organization_name: str) -> str:
    base_slug = _slugify_org_name(organization_name)
    slug = base_slug
    suffix = 1
    while True:
        cur.execute("SELECT id FROM organizations WHERE slug = %s LIMIT 1", (slug,))
        if not cur.fetchone():
            return slug
        suffix += 1
        slug = f"{base_slug}-{suffix}"


def get_user_from_token(token: str):
    if not token:
        return None
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT u.id, u.full_name, u.email, u.organization_id, o.name AS organization_name, o.slug AS organization_slug
            FROM auth_sessions s
            JOIN users u ON u.id = s.user_id
            JOIN organizations o ON o.id = u.organization_id
            WHERE s.token_hash = %s
              AND s.revoked_at IS NULL
              AND s.expires_at > %s
              AND u.is_active = 1
            ORDER BY s.id DESC
            LIMIT 1
            """,
            (_token_hash(token), datetime.utcnow()),
        )
        return cur.fetchone()


@app.before_request
def load_user_from_bearer_token():
    g.current_user = None
    if request.path.startswith("/api/health"):
        return
    auth_header = request.headers.get("Authorization", "")
    token = ""
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    elif request.args.get("token"):
        token = request.args.get("token", "").strip()
    if not token:
        return
    user = get_user_from_token(token)
    if user:
        g.current_user = user


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not g.get("current_user"):
            return jsonify({"error": "Authentication required."}), 401
        return fn(*args, **kwargs)

    return wrapper


def current_org_id() -> int:
    return g.current_user["organization_id"]


def current_user_id() -> int:
    return g.current_user["id"]


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def serialize_invoice_row(row):
    uploaded_at = row.get("uploaded_at")
    if isinstance(uploaded_at, datetime):
        uploaded_at = uploaded_at.isoformat()
    return {
        "id": row["id"],
        "filename": row["filename"],
        "originalName": row["original_name"],
        "size": int(row["file_size"]),
        "uploadedAt": uploaded_at,
        "mimeType": row["mime_type"],
        "status": row.get("status") or "uploaded",
        "decision": row.get("decision"),
        "previewUrl": f"/api/invoices/{row['id']}/file",
    }


def serialize_invoice_file(file_path, status="uploaded"):
    stats = file_path.stat()
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    return {
        "id": file_path.stem,
        "filename": file_path.name,
        "originalName": file_path.name.split("_", 2)[-1],
        "size": stats.st_size,
        "uploadedAt": datetime.fromtimestamp(stats.st_mtime).isoformat(),
        "mimeType": mime_type,
        "status": status,
        "previewUrl": f"/api/invoices/{file_path.stem}/file",
    }


def list_uploaded_invoices(organization_id: int):
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT i.id, i.filename, i.original_name, i.mime_type, i.file_size, i.uploaded_at, i.status, d.decision
            FROM invoices i
            LEFT JOIN invoice_decisions d ON d.invoice_id = i.id
            WHERE i.organization_id = %s
            ORDER BY i.uploaded_at DESC
            """,
            (organization_id,),
        )
        rows = cur.fetchall()
    return [serialize_invoice_row(row) for row in rows]


def get_invoice_row(invoice_id: str, organization_id: int):
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT id, filename, original_name, mime_type, file_size, uploaded_at, status, organization_id
            FROM invoices
            WHERE id = %s AND organization_id = %s
            LIMIT 1
            """,
            (invoice_id, organization_id),
        )
        return cur.fetchone()


def get_invoice_file(invoice_row: dict):
    if not invoice_row:
        return None
    file_path = UPLOAD_FOLDER / invoice_row["filename"]
    if not file_path.exists():
        return None
    return file_path


def get_invoice_review_data(invoice_id: str, organization_id: int):
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT i.id, i.original_name, i.mime_type, i.file_size, i.uploaded_at, i.status,
                   f.invoice_number, f.invoice_date, f.due_date, f.vendor, f.bill_to,
                   f.subtotal, f.tax, f.total, f.raw_text,
                   d.decision, d.reason, d.confidence_score, d.decided_at
            FROM invoices i
            LEFT JOIN invoice_fields f ON f.invoice_id = i.id
            LEFT JOIN invoice_decisions d ON d.invoice_id = i.id
            WHERE i.id = %s AND i.organization_id = %s
            LIMIT 1
            """,
            (invoice_id, organization_id),
        )
        row = cur.fetchone()
        if not row:
            return None

        cur.execute(
            """
            SELECT description, quantity, unit_price, amount
            FROM invoice_line_items
            WHERE invoice_id = %s
            ORDER BY id ASC
            """,
            (invoice_id,),
        )
        items = cur.fetchall()

        cur.execute(
            """
            SELECT is_valid, date_format_ok, amount_consistency_ok, gst_calculation_ok, total_match_ok, errors
            FROM invoice_validation
            WHERE invoice_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (invoice_id,),
        )
        validation = cur.fetchone()

        cur.execute(
            """
            SELECT status
            FROM workflow_log
            WHERE invoice_id = %s
            ORDER BY id DESC
            LIMIT 1
            """,
            (invoice_id,),
        )
        wf = cur.fetchone()

    fields = {
        "invoice_number": row.get("invoice_number"),
        "date": row.get("invoice_date"),
        "due_date": row.get("due_date"),
        "vendor": row.get("vendor"),
        "bill_to": row.get("bill_to"),
        "subtotal": float(row["subtotal"]) if row.get("subtotal") is not None else None,
        "tax": float(row["tax"]) if row.get("tax") is not None else None,
        "total": float(row["total"]) if row.get("total") is not None else None,
        "raw_text": row.get("raw_text") or "",
        "items": [
            {
                "description": item.get("description", ""),
                "quantity": float(item["quantity"]) if item.get("quantity") is not None else None,
                "unit_price": float(item["unit_price"]) if item.get("unit_price") is not None else None,
                "amount": float(item["amount"]) if item.get("amount") is not None else None,
            }
            for item in items
        ],
    }

    decision = None
    if row.get("decision"):
        decision = {
            "decision": row["decision"],
            "reason": row.get("reason") or "",
            "confidenceScore": float(row["confidence_score"]) if row.get("confidence_score") is not None else None,
            "decidedAt": row["decided_at"].isoformat() if isinstance(row.get("decided_at"), datetime) else row.get("decided_at"),
        }

    invoice_meta = {
        "id": row["id"],
        "originalName": row["original_name"],
        "mimeType": row["mime_type"],
        "size": int(row["file_size"]) if row.get("file_size") is not None else 0,
        "uploadedAt": row["uploaded_at"].isoformat() if isinstance(row.get("uploaded_at"), datetime) else row.get("uploaded_at"),
        "status": row.get("status"),
    }

    return {
        "invoice": invoice_meta,
        "fields": fields,
        "validation": validation,
        "workflow_status": (wf or {}).get("status", ""),
        "decision": decision,
    }


def build_ml_features_snapshot(invoice_id: str, organization_id: int):
    review = get_invoice_review_data(invoice_id, organization_id)
    if not review:
        return None
    fields = review.get("fields") or {}
    validation = review.get("validation") or {}
    items = fields.get("items") or []
    return {
        "invoiceId": invoice_id,
        "organizationId": organization_id,
        "invoiceNumber": fields.get("invoice_number"),
        "invoiceDate": fields.get("date"),
        "dueDate": fields.get("due_date"),
        "vendor": fields.get("vendor"),
        "billTo": fields.get("bill_to"),
        "subtotal": fields.get("subtotal"),
        "tax": fields.get("tax"),
        "total": fields.get("total"),
        "lineItemCount": len(items),
        "hasValidation": bool(validation),
        "validation": validation,
    }


def _fetch_export_rows(db, organization_id: int, invoice_id=None):
    return fetch_export_rows(db, organization_id, invoice_id)


def _build_csv(rows):
    return build_csv(rows)


def _build_excel(rows):
    return build_excel(rows)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Flask backend is running"}), 200


@app.route("/api/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            SELECT u.id, u.full_name, u.email, u.password_hash, u.is_active, u.organization_id,
                   o.name AS organization_name, o.slug AS organization_slug
            FROM users u
            JOIN organizations o ON o.id = u.organization_id
            WHERE u.email = %s
            LIMIT 1
            """,
            (email,),
        )
        user = cur.fetchone()

    if not user or not user["is_active"] or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid credentials."}), 401

    token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=SESSION_TTL_HOURS)
    with db.cursor() as cur:
        cur.execute(
            "INSERT INTO auth_sessions (user_id, token_hash, created_at, expires_at) VALUES (%s, %s, %s, %s)",
            (user["id"], _token_hash(token), now, expires_at),
        )
        cur.execute("UPDATE users SET last_login_at = %s WHERE id = %s", (now, user["id"]))
    db.commit()

    return jsonify({"token": token, "expiresAt": expires_at.isoformat(), "user": _serialize_user(user)}), 200


@app.route("/api/auth/signup", methods=["POST"])
def signup():
    payload = request.get_json(silent=True) or {}
    full_name = (payload.get("fullName") or "").strip()
    organization_name = (payload.get("organizationName") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""

    if not full_name or not organization_name or not email or not password:
        return jsonify({"error": "Full name, organization name, email, and password are required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s LIMIT 1", (email,))
            if cur.fetchone():
                return jsonify({"error": "An account with this email already exists."}), 409

            org_slug = _create_unique_org_slug(cur, organization_name)
            now = datetime.utcnow()
            cur.execute(
                "INSERT INTO organizations (name, slug, created_at) VALUES (%s, %s, %s)",
                (organization_name, org_slug, now),
            )
            org_id = cur.lastrowid

            cur.execute(
                """
                INSERT INTO users (organization_id, full_name, email, password_hash, is_active, created_at, last_login_at)
                VALUES (%s, %s, %s, %s, 1, %s, %s)
                """,
                (org_id, full_name, email, generate_password_hash(password), now, now),
            )
            user_id = cur.lastrowid

            token = secrets.token_urlsafe(32)
            expires_at = now + timedelta(hours=SESSION_TTL_HOURS)
            cur.execute(
                "INSERT INTO auth_sessions (user_id, token_hash, created_at, expires_at) VALUES (%s, %s, %s, %s)",
                (user_id, _token_hash(token), now, expires_at),
            )
        db.commit()
    except Exception:
        db.rollback()
        raise

    user = {
        "id": user_id,
        "full_name": full_name,
        "email": email,
        "organization_id": org_id,
        "organization_name": organization_name,
        "organization_slug": org_slug,
    }
    return jsonify({"token": token, "expiresAt": expires_at.isoformat(), "user": _serialize_user(user)}), 201


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def me():
    return jsonify({"user": _serialize_user(g.current_user)}), 200


@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def logout():
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split(" ", 1)[1].strip() if auth_header.startswith("Bearer ") else ""
    if token:
        db = get_db()
        with db.cursor() as cur:
            cur.execute(
                "UPDATE auth_sessions SET revoked_at = %s WHERE token_hash = %s AND revoked_at IS NULL",
                (datetime.utcnow(), _token_hash(token)),
            )
        db.commit()
    return jsonify({"message": "Logged out."}), 200


@app.route("/api/invoices", methods=["GET"])
@require_auth
def get_invoices():
    return jsonify({"invoices": list_uploaded_invoices(current_org_id())}), 200


@app.route("/api/invoices/<invoice_id>", methods=["GET"])
@require_auth
def get_invoice(invoice_id):
    invoice_row = get_invoice_row(invoice_id, current_org_id())
    if invoice_row is None:
        return jsonify({"error": "Invoice not found."}), 404
    return jsonify({"invoice": serialize_invoice_row(invoice_row)}), 200


@app.route("/api/invoices/<invoice_id>/file", methods=["GET"])
@require_auth
def serve_invoice_file(invoice_id):
    invoice_row = get_invoice_row(invoice_id, current_org_id())
    file_path = get_invoice_file(invoice_row)
    if file_path is None:
        return jsonify({"error": "Invoice not found."}), 404
    return send_file(file_path, as_attachment=False)


@app.route("/api/invoices", methods=["POST"])
@require_auth
def upload_invoice():
    if "invoice" not in request.files:
        return jsonify({"error": "No invoice file was provided."}), 400

    invoice_file = request.files["invoice"]
    if invoice_file.filename == "":
        return jsonify({"error": "Please choose an invoice file to upload."}), 400
    if not allowed_file(invoice_file.filename):
        return jsonify({"error": "Only PDF, PNG, JPG, and JPEG invoice files are supported."}), 400

    safe_name = secure_filename(invoice_file.filename)
    stored_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid4().hex}_{safe_name}"
    target_path = UPLOAD_FOLDER / stored_name
    invoice_file.save(target_path)

    invoice_data = serialize_invoice_file(target_path)

    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            """
            INSERT IGNORE INTO invoices
              (id, organization_id, uploaded_by_user_id, filename, original_name, mime_type, file_size, uploaded_at, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'uploaded')
            """,
            (
                invoice_data["id"],
                current_org_id(),
                current_user_id(),
                invoice_data["filename"],
                invoice_data["originalName"],
                invoice_data["mimeType"],
                invoice_data["size"],
                invoice_data["uploadedAt"],
            ),
        )
    db.commit()

    log_workflow(db, invoice_data["id"], "upload", "uploaded", "File uploaded successfully.")
    workflow_result = run_workflow(invoice_data["id"], target_path, db)
    if "error" in workflow_result:
        return jsonify(
            {
                "message": "Invoice uploaded, but auto-processing failed.",
                "invoice": invoice_data,
                "processingError": workflow_result["error"],
            }
        ), 202

    return jsonify(
        {
            "message": "Invoice uploaded and processed successfully.",
            "invoice": invoice_data,
            "fields": workflow_result.get("fields"),
            "validation": workflow_result.get("validation"),
            "workflow_status": workflow_result.get("workflow_status"),
        }
    ), 201


@app.route("/api/invoices/<invoice_id>/extract", methods=["POST"])
@require_auth
def extract_invoice(invoice_id):
    invoice_row = get_invoice_row(invoice_id, current_org_id())
    file_path = get_invoice_file(invoice_row)
    if file_path is None:
        return jsonify({"error": "Invoice not found."}), 404

    db = get_db()
    result = run_workflow(invoice_id, file_path, db)
    if "error" in result:
        return jsonify(result), 500
    return jsonify(result), 200


@app.route("/api/invoices/<invoice_id>/workflow", methods=["GET"])
@require_auth
def get_workflow_log(invoice_id):
    invoice_row = get_invoice_row(invoice_id, current_org_id())
    if invoice_row is None:
        return jsonify({"error": "Invoice not found."}), 404
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            "SELECT step, status, message, created_at FROM workflow_log WHERE invoice_id = %s ORDER BY id ASC",
            (invoice_id,),
        )
        rows = cur.fetchall()
    return jsonify({"log": rows}), 200


@app.route("/api/invoices/<invoice_id>/validation", methods=["GET"])
@require_auth
def get_validation(invoice_id):
    invoice_row = get_invoice_row(invoice_id, current_org_id())
    if invoice_row is None:
        return jsonify({"error": "Invoice not found."}), 404
    db = get_db()
    with db.cursor() as cur:
        cur.execute(
            "SELECT * FROM invoice_validation WHERE invoice_id = %s ORDER BY id DESC LIMIT 1",
            (invoice_id,),
        )
        row = cur.fetchone()
    if not row:
        return jsonify({"error": "No validation record found."}), 404
    return jsonify({"validation": row}), 200


@app.route("/api/invoices/<invoice_id>/review", methods=["GET"])
@require_auth
def get_invoice_review(invoice_id):
    data = get_invoice_review_data(invoice_id, current_org_id())
    if not data:
        return jsonify({"error": "Invoice not found."}), 404
    return jsonify(data), 200


@app.route("/api/invoices/<invoice_id>/decision", methods=["POST"])
@require_auth
def set_invoice_decision(invoice_id):
    invoice_row = get_invoice_row(invoice_id, current_org_id())
    if invoice_row is None:
        return jsonify({"error": "Invoice not found."}), 404

    payload = request.get_json(silent=True) or {}
    decision = (payload.get("decision") or "").strip().lower()
    reason = (payload.get("reason") or "").strip()
    confidence_score = payload.get("confidenceScore")

    if decision not in {"approved", "rejected"}:
        return jsonify({"error": "Decision must be 'approved' or 'rejected'."}), 400
    if decision == "rejected" and not reason:
        return jsonify({"error": "Reason is required when rejecting an invoice."}), 400

    if confidence_score is not None:
        try:
            confidence_score = float(confidence_score)
        except (TypeError, ValueError):
            return jsonify({"error": "confidenceScore must be a number between 0 and 100."}), 400
        if confidence_score < 0 or confidence_score > 100:
            return jsonify({"error": "confidenceScore must be between 0 and 100."}), 400

    db = get_db()
    now = datetime.utcnow()
    with db.cursor() as cur:
        cur.execute(
            """
            INSERT INTO invoice_decisions
              (invoice_id, organization_id, reviewer_user_id, decision, reason, confidence_score, decided_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
              decision = VALUES(decision),
              reason = VALUES(reason),
              confidence_score = VALUES(confidence_score),
              reviewer_user_id = VALUES(reviewer_user_id),
              updated_at = VALUES(updated_at)
            """,
            (
                invoice_id,
                current_org_id(),
                current_user_id(),
                decision,
                reason,
                confidence_score,
                now,
                now,
            ),
        )

    features = build_ml_features_snapshot(invoice_id, current_org_id()) or {}
    with db.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ml_training_samples (invoice_id, organization_id, label, features_json, created_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                invoice_id,
                current_org_id(),
                decision,
                json.dumps(features, default=str),
                now,
            ),
        )
    db.commit()

    return jsonify({"message": f"Invoice marked as {decision}.", "decision": decision}), 200


@app.route("/api/invoices/<invoice_id>/export/csv", methods=["GET"])
@require_auth
def export_invoice_csv(invoice_id):
    invoice_row = get_invoice_row(invoice_id, current_org_id())
    if invoice_row is None:
        return jsonify({"error": "Invoice not found."}), 404
    db = get_db()
    rows = _fetch_export_rows(db, current_org_id(), invoice_id=invoice_id)
    if not rows:
        return jsonify({"error": "No extracted data found for this invoice."}), 404
    csv_text = _build_csv(rows)
    buf = io.BytesIO(csv_text.encode("utf-8"))
    buf.seek(0)
    return send_file(
        buf,
        mimetype="text/csv",
        as_attachment=True,
        download_name=f"invoice_{invoice_id}.csv",
    )


@app.route("/api/invoices/<invoice_id>/export/excel", methods=["GET"])
@require_auth
def export_invoice_excel(invoice_id):
    invoice_row = get_invoice_row(invoice_id, current_org_id())
    if invoice_row is None:
        return jsonify({"error": "Invoice not found."}), 404
    db = get_db()
    rows = _fetch_export_rows(db, current_org_id(), invoice_id=invoice_id)
    if not rows:
        return jsonify({"error": "No extracted data found for this invoice."}), 404
    buf = _build_excel(rows)
    return send_file(
        buf,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=f"invoice_{invoice_id}.xlsx",
    )


@app.route("/api/export/csv", methods=["GET"])
@require_auth
def export_all_csv():
    db = get_db()
    rows = _fetch_export_rows(db, current_org_id())
    if not rows:
        return jsonify({"error": "No extracted data found."}), 404
    csv_text = _build_csv(rows)
    buf = io.BytesIO(csv_text.encode("utf-8"))
    buf.seek(0)
    return send_file(
        buf,
        mimetype="text/csv",
        as_attachment=True,
        download_name="all_invoices.csv",
    )


@app.route("/api/export/excel", methods=["GET"])
@require_auth
def export_all_excel():
    db = get_db()
    rows = _fetch_export_rows(db, current_org_id())
    if not rows:
        return jsonify({"error": "No extracted data found."}), 404
    buf = _build_excel(rows)
    return send_file(
        buf,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="all_invoices.xlsx",
    )


if __name__ == "__main__":
    init_db()
    debug_mode = os.getenv("FLASK_ENV") == "development"
    app.run(debug=debug_mode, host="0.0.0.0", port=5000)
