from datetime import datetime
import logging
import mimetypes
from pathlib import Path

from .extraction import extract_fields_from_text, extract_text_from_file, validate_fields

logger = logging.getLogger(__name__)


def log_workflow(db, invoice_id: str, step: str, status: str, message: str = ""):
    logger.info(f"[{invoice_id}] Workflow {step}: {status} - {message}")
    with db.cursor() as cur:
        cur.execute(
            "INSERT INTO workflow_log (invoice_id, step, status, message, created_at) VALUES (%s,%s,%s,%s,%s)",
            (invoice_id, step, status, message, datetime.utcnow()),
        )
        cur.execute("UPDATE invoices SET status = %s WHERE id = %s", (status, invoice_id))
    db.commit()


def run_workflow(invoice_id: str, file_path: Path, db) -> dict:
    logger.info(f"[{invoice_id}] Starting workflow for {file_path.name}")
    log_workflow(db, invoice_id, "extract", "extracting", "Starting OCR extraction.")
    try:
        text = extract_text_from_file(file_path)
        fields = extract_fields_from_text(text)
        logger.info(f"[{invoice_id}] Extracted fields: {list(fields.keys())}")
        log_workflow(db, invoice_id, "extract", "extracted", "OCR extraction complete.")
    except Exception as exc:
        logger.exception(f"[{invoice_id}] Extraction failed: {exc}")
        error_msg = str(exc)
        log_workflow(db, invoice_id, "extract", "failed", error_msg)
        return {"error": error_msg}

    log_workflow(db, invoice_id, "validate", "validating", "Starting validation.")
    validation = validate_fields(fields)
    validation_status = "validated" if validation["is_valid"] else "validation_failed"
    log_workflow(
        db,
        invoice_id,
        "validate",
        validation_status,
        "; ".join(validation["errors"]) if validation["errors"] else "Validation passed.",
    )

    log_workflow(db, invoice_id, "store", "storing", "Persisting fields to database.")
    try:
        now = datetime.utcnow()
        with db.cursor() as cur:
            cur.execute(
                """
                INSERT INTO invoices (id, filename, original_name, mime_type, file_size, uploaded_at, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'stored')
                ON DUPLICATE KEY UPDATE status = 'stored'
                """,
                (
                    invoice_id,
                    file_path.name,
                    file_path.name.split("_", 2)[-1],
                    mimetypes.guess_type(file_path.name)[0] or "application/octet-stream",
                    file_path.stat().st_size,
                    datetime.fromtimestamp(file_path.stat().st_mtime),
                ),
            )

            cur.execute("DELETE FROM invoice_fields WHERE invoice_id = %s", (invoice_id,))
            cur.execute(
                """
                INSERT INTO invoice_fields
                  (invoice_id, invoice_number, invoice_date, due_date, vendor, bill_to,
                   subtotal, tax, total, raw_text, extracted_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
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
                ),
            )

            cur.execute("DELETE FROM invoice_line_items WHERE invoice_id = %s", (invoice_id,))
            for item in fields.get("items", []):
                cur.execute(
                    """
                    INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, amount)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        invoice_id,
                        item.get("description", ""),
                        item.get("quantity"),
                        item.get("unit_price"),
                        item.get("amount"),
                    ),
                )

            cur.execute("DELETE FROM invoice_validation WHERE invoice_id = %s", (invoice_id,))
            cur.execute(
                """
                INSERT INTO invoice_validation
                  (invoice_id, is_valid, date_format_ok, amount_consistency_ok,
                   gst_calculation_ok, total_match_ok, errors, validated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    invoice_id,
                    int(validation["is_valid"]),
                    int(validation["date_format_ok"]),
                    int(validation["amount_consistency_ok"]),
                    int(validation["gst_calculation_ok"]),
                    int(validation["total_match_ok"]),
                    "; ".join(validation.get("errors", [])),
                    now,
                ),
            )

        db.commit()
        log_workflow(db, invoice_id, "store", "stored", "All data persisted successfully.")
    except Exception as exc:
        db.rollback()
        log_workflow(db, invoice_id, "store", "failed", str(exc))
        return {"error": f"Storage failed: {exc}"}

    return {
        "fields": {
            **fields,
            "items": [
                {
                    "description": item.get("description", ""),
                    "quantity": item.get("quantity"),
                    "unit_price": item.get("unit_price"),
                    "amount": item.get("amount"),
                }
                for item in fields.get("items", [])
            ],
        },
        "validation": validation,
        "workflow_status": validation_status,
    }

