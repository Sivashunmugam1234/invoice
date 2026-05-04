from datetime import datetime
import mimetypes
import re
import sqlite3
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, request, send_file, g
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import os
import pdfplumber
import pytesseract
from PIL import Image
import cv2
import numpy as np

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except (ImportError, OSError):
    nlp = None

load_dotenv()

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
DB_PATH = BASE_DIR / "invoices.db"
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

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

# ── Phase 7: Database Schema ─────────────────────────────────────────────────

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS invoices (
    id              TEXT PRIMARY KEY,
    filename        TEXT NOT NULL,
    original_name   TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    file_size       INTEGER NOT NULL,
    uploaded_at     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'uploaded'
    -- status values: uploaded | extracting | extracted | validating | validated | stored | failed
);

CREATE TABLE IF NOT EXISTS invoice_fields (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id      TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    invoice_number  TEXT,
    invoice_date    TEXT,
    due_date        TEXT,
    vendor          TEXT,
    bill_to         TEXT,
    subtotal        REAL,
    tax             REAL,
    total           REAL,
    raw_text        TEXT,
    extracted_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id      TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description     TEXT NOT NULL,
    quantity        REAL,
    unit_price      REAL,
    amount          REAL
);

CREATE TABLE IF NOT EXISTS invoice_validation (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id              TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    is_valid                INTEGER NOT NULL DEFAULT 0,
    date_format_ok          INTEGER NOT NULL DEFAULT 0,
    amount_consistency_ok   INTEGER NOT NULL DEFAULT 0,
    gst_calculation_ok      INTEGER NOT NULL DEFAULT 0,
    total_match_ok          INTEGER NOT NULL DEFAULT 0,
    errors                  TEXT,
    validated_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workflow_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id  TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    step        TEXT NOT NULL,
    status      TEXT NOT NULL,
    message     TEXT,
    created_at  TEXT NOT NULL
);
"""


def get_db():
    """Get a SQLite connection, stored on Flask's g object for the request lifetime."""
    if "db" not in g:
        g.db = sqlite3.connect(str(DB_PATH), detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create tables on startup if they don't exist."""
    con = sqlite3.connect(str(DB_PATH))
    con.executescript(SCHEMA_SQL)
    con.commit()
    con.close()


# ── File helpers ─────────────────────────────────────────────────────────────

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def serialize_invoice(file_path):
    stats = file_path.stat()
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    return {
        "id": file_path.stem,
        "filename": file_path.name,
        "originalName": file_path.name.split("_", 2)[-1],
        "size": stats.st_size,
        "uploadedAt": datetime.fromtimestamp(stats.st_mtime).isoformat(),
        "mimeType": mime_type,
        "previewUrl": f"/api/invoices/{file_path.stem}/file",
    }


def uploaded_invoice_files():
    files = [
        fp for fp in UPLOAD_FOLDER.iterdir()
        if fp.is_file() and fp.name != ".gitkeep"
    ]
    return sorted(files, key=lambda fp: fp.stat().st_mtime, reverse=True)


def list_uploaded_invoices():
    return [serialize_invoice(fp) for fp in uploaded_invoice_files()]


def find_invoice_file(invoice_id):
    for fp in uploaded_invoice_files():
        if fp.stem == invoice_id:
            return fp
    return None


# ── Phase 6: Workflow log helper ─────────────────────────────────────────────

def log_workflow(db, invoice_id: str, step: str, status: str, message: str = ""):
    db.execute(
        "INSERT INTO workflow_log (invoice_id, step, status, message, created_at) VALUES (?,?,?,?,?)",
        (invoice_id, step, status, message, datetime.utcnow().isoformat()),
    )
    db.execute("UPDATE invoices SET status = ? WHERE id = ?", (status, invoice_id))
    db.commit()


# ── Phase 2 & 3: Image preprocessing + OCR ──────────────────────────────────

def deskew_image(image):
    try:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.bitwise_not(gray)
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)[1]
        coords = np.column_stack(np.where(thresh > 0))
        rect = cv2.minAreaRect(coords)
        angle = rect[-1]
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        elif angle < 0:
            angle = -angle
        else:
            angle = -angle
        if abs(angle) < 0.5 or abs(angle) > 45:
            return image
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_REPLICATE)
    except Exception:
        return image


def preprocess_image_for_ocr(file_path: Path) -> Image.Image:
    image = cv2.imread(str(file_path))
    if image is None:
        raise ValueError("Could not read image file.")
    deskewed = deskew_image(image)
    gray = cv2.cvtColor(deskewed, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY, 11, 2)
    return Image.fromarray(thresh)


def extract_text_from_file(file_path: Path) -> str:
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        with pdfplumber.open(file_path) as pdf:
            pages_text = [page.extract_text() or "" for page in pdf.pages]
        return "\n".join(pages_text)
    else:
        image = preprocess_image_for_ocr(file_path)
        return pytesseract.image_to_string(image)


# ── Phase 4: Improved field extraction ──────────────────────────────────────

FIELD_PATTERNS = {
    "invoice_number": re.compile(
        r"(?:invoice\s*(?:no\.?|number|#|num)[:\s]*)([A-Za-z0-9\-/]+)", re.I
    ),
    "date": re.compile(
        r"(?:^|\b)(?:invoice\s*)?date[:\s]*([\d]{1,2}[\-\/][\d]{1,2}[\-\/][\d]{2,4}"
        r"|[A-Za-z]+\s+\d{1,2},?\s+\d{4})",
        re.I | re.MULTILINE,
    ),
    "due_date": re.compile(
        r"(?:due\s*date|payment\s*due|pay\s*by)[:\s]*([\d]{1,2}[\-\/][\d]{1,2}[\-\/][\d]{2,4}"
        r"|[A-Za-z]+\s+\d{1,2},?\s+\d{4})",
        re.I,
    ),
    "vendor": re.compile(
        r"(?:^|\b)(?:from|vendor|billed?\s*by|seller|company)[:\s]*([^\n]{3,60})", re.I | re.MULTILINE
    ),
    "bill_to": re.compile(
        r"(?:bill\s*to|client|customer|sold\s*to|ship\s*to)[:\s]*([^\n]{3,60})", re.I
    ),
    "subtotal": re.compile(
        r"(?:sub[\s-]?total)[:\s]*[\$£€₹]?\s*([\d,]+\.?\d*)", re.I
    ),
    "tax": re.compile(
        r"(?:tax|vat|gst|hst|pst|cgst|sgst|igst)[:\s]*[\$£€₹]?\s*([\d,]+\.?\d*)", re.I
    ),
    "total": re.compile(
        r"(?:(?:grand\s*)?total(?:\s*(?:amount|due))?|amount\s*due|balance\s*due)"
        r"[:\s]*[\$£€₹]?\s*([\d,]+\.?\d*)",
        re.I,
    ),
}

# Patterns for line items: description  [qty]  unit_price  amount
LINE_ITEM_PATTERN = re.compile(
    r"^(?P<desc>[A-Za-z][^\t\n]{5,60?}?)\s+"
    r"(?:(?P<qty>\d+(?:\.\d+)?)\s+)?"
    r"(?P<unit_price>[\d,]+\.\d{2})\s+"
    r"(?P<amount>[\d,]+\.\d{2})\s*$",
    re.MULTILINE,
)

IGNORE_LINE_KEYWORDS = re.compile(
    r"^\s*(?:total|subtotal|sub total|tax|vat|gst|balance|amount due|"
    r"invoice|date|due|bill|from|to|description|item|qty|quantity|"
    r"unit|price|rate|no\.|#)\b",
    re.I,
)


def parse_amount(value: str) -> float | None:
    """Strip currency symbols/commas and convert to float."""
    try:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def extract_line_items(text: str) -> list[dict]:
    """
    Phase 4: Extract structured line items using regex.
    Falls back to NLP heuristics when the structured pattern finds nothing.
    """
    items = []

    # --- Structured regex approach ---
    for match in LINE_ITEM_PATTERN.finditer(text):
        desc = match.group("desc").strip()
        if IGNORE_LINE_KEYWORDS.match(desc):
            continue
        item = {
            "description": desc,
            "quantity": None,
            "unit_price": None,
            "amount": None,
        }
        if match.group("qty"):
            item["quantity"] = parse_amount(match.group("qty"))
        if match.group("unit_price"):
            item["unit_price"] = parse_amount(match.group("unit_price"))
        if match.group("amount"):
            item["amount"] = parse_amount(match.group("amount"))
        items.append(item)

    if items:
        return items

    # --- NLP heuristic fallback ---
    if not nlp:
        return []

    for line in text.split("\n"):
        line = line.strip()
        if not line or len(line) < 10:
            continue
        if IGNORE_LINE_KEYWORDS.match(line):
            continue
        doc = nlp(line)
        has_noun = any(t.pos_ in ("NOUN", "PROPN") for t in doc)
        numbers = []
        for token in doc:
            if token.like_num or token.pos_ == "NUM":
                val = parse_amount(token.text)
                if val is not None:
                    numbers.append(val)
        if has_noun and numbers:
            amount = max(numbers) if numbers else None
            unit_price = numbers[-2] if len(numbers) >= 2 else None
            qty = numbers[0] if len(numbers) >= 3 else None
            items.append({
                "description": line,
                "quantity": qty,
                "unit_price": unit_price,
                "amount": amount,
            })

    return items


def extract_fields_from_text(text: str) -> dict:
    """Phase 4: Extract all structured fields from raw OCR text."""
    fields: dict = {}

    for key, pattern in FIELD_PATTERNS.items():
        match = pattern.search(text)
        if match:
            fields[key] = match.group(1).strip()

    # NLP fallback for vendor if regex missed it
    if not fields.get("vendor") and nlp:
        doc = nlp(text[:800])
        for ent in doc.ents:
            if ent.label_ == "ORG":
                fields["vendor"] = ent.text.strip()
                break

    # Coerce numeric fields to floats for validation later
    for numeric_key in ("subtotal", "tax", "total"):
        if fields.get(numeric_key):
            fields[numeric_key] = parse_amount(fields[numeric_key])

    fields["raw_text"] = text.strip()
    fields["items"] = extract_line_items(text)
    return fields


# ── Phase 5: Data Validation ─────────────────────────────────────────────────

DATE_FORMATS = [
    r"^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$",          # DD/MM/YYYY or MM-DD-YYYY
    r"^[A-Za-z]+ \d{1,2},? \d{4}$",                  # Month DD, YYYY
    r"^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$",             # YYYY-MM-DD
]

GST_RATE = 0.18          # 18 % standard Indian GST; adjust as needed
GST_TOLERANCE = 0.02     # allow 2 % rounding tolerance


def validate_date_format(value: str | None) -> bool:
    if not value:
        return False
    return any(re.match(pat, value.strip()) for pat in DATE_FORMATS)


def validate_fields(fields: dict) -> dict:
    """
    Phase 5: Validate extracted fields.
    Returns a validation result dict.
    """
    errors = []
    result = {
        "date_format_ok": False,
        "amount_consistency_ok": False,
        "gst_calculation_ok": False,
        "total_match_ok": False,
    }

    # --- Date format check ---
    date_val = fields.get("date")
    if validate_date_format(date_val):
        result["date_format_ok"] = True
    else:
        errors.append(f"Invoice date '{date_val}' is missing or not a recognised format.")

    # --- Numeric amounts ---
    subtotal = fields.get("subtotal")
    tax = fields.get("tax")
    total = fields.get("total")

    # Convert if still strings (edge case)
    if isinstance(subtotal, str):
        subtotal = parse_amount(subtotal)
    if isinstance(tax, str):
        tax = parse_amount(tax)
    if isinstance(total, str):
        total = parse_amount(total)

    # --- Amount consistency: subtotal + tax ≈ total ---
    if subtotal is not None and tax is not None and total is not None:
        expected_total = round(subtotal + tax, 2)
        actual_total = round(total, 2)
        if abs(expected_total - actual_total) <= 0.05:
            result["amount_consistency_ok"] = True
            result["total_match_ok"] = True
        else:
            errors.append(
                f"Total mismatch: subtotal ({subtotal}) + tax ({tax}) = {expected_total}, "
                f"but extracted total is {actual_total}."
            )
    elif total is not None:
        # If only total is available, consider totals as present
        result["total_match_ok"] = True
    else:
        errors.append("Could not find subtotal, tax, or total to verify amounts.")

    # --- GST consistency: tax ≈ subtotal × GST_RATE ---
    if subtotal is not None and tax is not None and subtotal > 0:
        expected_gst = round(subtotal * GST_RATE, 2)
        if abs(tax - expected_gst) / subtotal <= GST_TOLERANCE:
            result["gst_calculation_ok"] = True
        else:
            # Non-blocking warning – different tax rates are valid
            errors.append(
                f"Tax ({tax}) doesn't match standard 18% GST on subtotal ({subtotal}). "
                "This may be correct if a different rate applies."
            )

    result["is_valid"] = len([e for e in errors if "doesn't match standard" not in e]) == 0
    result["errors"] = errors
    return result


# ── Phase 6: Workflow orchestration ─────────────────────────────────────────

def run_workflow(invoice_id: str, file_path: Path, db) -> dict:
    """
    Phase 6: Full Extract → Validate → Store pipeline.
    Each step is logged to workflow_log.
    """

    # STEP 1 – Extract
    log_workflow(db, invoice_id, "extract", "extracting", "Starting OCR extraction.")
    try:
        text = extract_text_from_file(file_path)
        fields = extract_fields_from_text(text)
        log_workflow(db, invoice_id, "extract", "extracted", "OCR extraction complete.")
    except Exception as exc:
        log_workflow(db, invoice_id, "extract", "failed", str(exc))
        return {"error": f"Extraction failed: {exc}"}

    # STEP 2 – Validate
    log_workflow(db, invoice_id, "validate", "validating", "Starting validation.")
    validation = validate_fields(fields)
    validation_status = "validated" if validation["is_valid"] else "validation_failed"
    log_workflow(db, invoice_id, "validate", validation_status,
                 "; ".join(validation["errors"]) if validation["errors"] else "Validation passed.")

    # STEP 3 – Store into DB
    log_workflow(db, invoice_id, "store", "storing", "Persisting fields to database.")
    try:
        now = datetime.utcnow().isoformat()

        # Upsert invoice record (may already exist from upload step)
        db.execute("""
            INSERT INTO invoices (id, filename, original_name, mime_type, file_size, uploaded_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET status = excluded.status
        """, (
            invoice_id,
            file_path.name,
            file_path.name.split("_", 2)[-1],
            mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
            file_path.stat().st_size,
            datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
            "stored",
        ))

        # Remove old extracted fields if re-extracting
        db.execute("DELETE FROM invoice_fields WHERE invoice_id = ?", (invoice_id,))
        db.execute("""
            INSERT INTO invoice_fields
              (invoice_id, invoice_number, invoice_date, due_date, vendor, bill_to,
               subtotal, tax, total, raw_text, extracted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            invoice_id,
            fields.get("invoice_number"),
            fields.get("date"),
            fields.get("due_date"),
            fields.get("vendor"),
            fields.get("bill_to"),
            fields.get("subtotal"),
            fields.get("tax"),
            fields.get("total"),
            fields.get("raw_text", ""),
            now,
        ))

        # Store line items
        db.execute("DELETE FROM invoice_line_items WHERE invoice_id = ?", (invoice_id,))
        for item in fields.get("items", []):
            db.execute("""
                INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, amount)
                VALUES (?, ?, ?, ?, ?)
            """, (
                invoice_id,
                item.get("description", ""),
                item.get("quantity"),
                item.get("unit_price"),
                item.get("amount"),
            ))

        # Store validation result
        db.execute("DELETE FROM invoice_validation WHERE invoice_id = ?", (invoice_id,))
        db.execute("""
            INSERT INTO invoice_validation
              (invoice_id, is_valid, date_format_ok, amount_consistency_ok,
               gst_calculation_ok, total_match_ok, errors, validated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            invoice_id,
            int(validation["is_valid"]),
            int(validation["date_format_ok"]),
            int(validation["amount_consistency_ok"]),
            int(validation["gst_calculation_ok"]),
            int(validation["total_match_ok"]),
            "; ".join(validation.get("errors", [])),
            now,
        ))

        db.commit()
        log_workflow(db, invoice_id, "store", "stored", "All data persisted successfully.")
    except Exception as exc:
        db.rollback()
        log_workflow(db, invoice_id, "store", "failed", str(exc))
        return {"error": f"Storage failed: {exc}"}

    # Return everything to the API caller
    return {
        "fields": {
            **fields,
            "items": [
                {
                    "description": it.get("description", ""),
                    "quantity": it.get("quantity"),
                    "unit_price": it.get("unit_price"),
                    "amount": it.get("amount"),
                }
                for it in fields.get("items", [])
            ],
        },
        "validation": validation,
        "workflow_status": validation_status,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "message": "Flask backend is running"}), 200


@app.route("/api/invoices", methods=["GET"])
def get_invoices():
    return jsonify({"invoices": list_uploaded_invoices()}), 200


@app.route("/api/invoices/<invoice_id>", methods=["GET"])
def get_invoice(invoice_id):
    file_path = find_invoice_file(invoice_id)
    if file_path is None:
        return jsonify({"error": "Invoice not found."}), 404
    return jsonify({"invoice": serialize_invoice(file_path)}), 200


@app.route("/api/invoices/<invoice_id>/file", methods=["GET"])
def serve_invoice_file(invoice_id):
    file_path = find_invoice_file(invoice_id)
    if file_path is None:
        return jsonify({"error": "Invoice not found."}), 404
    return send_file(file_path, as_attachment=False)


@app.route("/api/invoices", methods=["POST"])
def upload_invoice():
    if "invoice" not in request.files:
        return jsonify({"error": "No invoice file was provided."}), 400
    invoice_file = request.files["invoice"]
    if invoice_file.filename == "":
        return jsonify({"error": "Please choose an invoice file to upload."}), 400
    if not allowed_file(invoice_file.filename):
        return jsonify(
            {"error": "Only PDF, PNG, JPG, and JPEG invoice files are supported."}
        ), 400

    safe_name = secure_filename(invoice_file.filename)
    stored_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid4().hex}_{safe_name}"
    target_path = UPLOAD_FOLDER / stored_name
    invoice_file.save(target_path)

    invoice_data = serialize_invoice(target_path)

    # Register in DB with initial status
    db = get_db()
    db.execute("""
        INSERT OR IGNORE INTO invoices
          (id, filename, original_name, mime_type, file_size, uploaded_at, status)
        VALUES (?, ?, ?, ?, ?, ?, 'uploaded')
    """, (
        invoice_data["id"],
        invoice_data["filename"],
        invoice_data["originalName"],
        invoice_data["mimeType"],
        invoice_data["size"],
        invoice_data["uploadedAt"],
    ))
    db.commit()

    log_workflow(db, invoice_data["id"], "upload", "uploaded", "File uploaded successfully.")

    return jsonify({"message": "Invoice uploaded successfully.", "invoice": invoice_data}), 201


@app.route("/api/invoices/<invoice_id>/extract", methods=["POST"])
def extract_invoice(invoice_id):
    """
    Phase 6: Runs the full workflow (extract → validate → store) and returns results.
    This replaces the old extract-only endpoint.
    """
    file_path = find_invoice_file(invoice_id)
    if file_path is None:
        return jsonify({"error": "Invoice not found."}), 404

    db = get_db()
    result = run_workflow(invoice_id, file_path, db)

    if "error" in result:
        return jsonify(result), 500

    return jsonify(result), 200


@app.route("/api/invoices/<invoice_id>/workflow", methods=["GET"])
def get_workflow_log(invoice_id):
    """Return the workflow history for an invoice."""
    db = get_db()
    rows = db.execute(
        "SELECT step, status, message, created_at FROM workflow_log WHERE invoice_id = ? ORDER BY id ASC",
        (invoice_id,),
    ).fetchall()
    return jsonify({"log": [dict(r) for r in rows]}), 200


@app.route("/api/invoices/<invoice_id>/validation", methods=["GET"])
def get_validation(invoice_id):
    """Return the latest validation result for an invoice."""
    db = get_db()
    row = db.execute(
        "SELECT * FROM invoice_validation WHERE invoice_id = ? ORDER BY id DESC LIMIT 1",
        (invoice_id,),
    ).fetchone()
    if not row:
        return jsonify({"error": "No validation record found."}), 404
    return jsonify({"validation": dict(row)}), 200


if __name__ == "__main__":
    init_db()
    debug_mode = os.getenv("FLASK_ENV") == "development"
    app.run(debug=debug_mode, host="0.0.0.0", port=5000)