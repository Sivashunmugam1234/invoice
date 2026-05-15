import logging
import os
import re
import shutil
from pathlib import Path

import cv2
import numpy as np
import pdfplumber
import pytesseract
from PIL import Image

logger = logging.getLogger(__name__)

# Configure pytesseract to find Tesseract
# Try common Windows installation paths
TESSERACT_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Users\SIVA SHUNMUGAM\AppData\Local\Tesseract-OCR\tesseract.exe",
    r"C:\Tesseract-OCR\tesseract.exe",
]

# Check if tesseract is in PATH or at common locations
tesseract_cmd = shutil.which("tesseract")
if tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    logger.info(f"Found Tesseract in PATH: {tesseract_cmd}")
else:
    for path in TESSERACT_PATHS:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            logger.info(f"Found Tesseract at: {path}")
            break
    else:
        logger.error("Tesseract-OCR NOT FOUND!")
        logger.error("  Please install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki")
        logger.error("  After installation, restart the backend server.")
        logger.error(f"  Searched locations: {TESSERACT_PATHS}")

try:
    import spacy

    nlp = spacy.load("en_core_web_sm")
except (ImportError, OSError):
    nlp = None


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
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(
            image,
            matrix,
            (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )
    except Exception:
        return image


def preprocess_image_for_ocr(file_path: Path) -> Image.Image:
    try:
        image = cv2.imread(str(file_path))
        if image is None:
            logger.error(f"cv2.imread failed for {file_path}")
            raise ValueError("Could not read image file.")
        
        logger.info(f"Image loaded successfully, shape: {image.shape}")
        
        # Upscale if image is too small
        height, width = image.shape[:2]
        if height < 1000 or width < 1000:
            scale = max(1500 / height, 1500 / width)
            image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            logger.info(f"Upscaled image to: {image.shape}")
        
        deskewed = deskew_image(image)
        gray = cv2.cvtColor(deskewed, cv2.COLOR_BGR2GRAY)
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
        
        # Increase contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(denoised)
        
        # Sharpen
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        # Adaptive threshold
        thresh = cv2.adaptiveThreshold(
            sharpened,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            15,
            3,
        )
        
        result = Image.fromarray(thresh)
        logger.info(f"Image preprocessing completed, output size: {result.size}")
        return result
    except Exception as e:
        logger.error(f"Error in preprocess_image_for_ocr: {e}")
        raise


def extract_text_from_file(file_path: Path) -> str:
    suffix = file_path.suffix.lower()
    logger.info(f"Starting text extraction from {file_path.name} (type: {suffix})")
    
    if suffix == ".pdf":
        logger.info("Processing PDF file with pdfplumber")
        try:
            with pdfplumber.open(file_path) as pdf:
                pages_text = [page.extract_text() or "" for page in pdf.pages]
            text = "\n".join(pages_text)
            logger.info(f"Successfully extracted {len(pages_text)} pages from PDF, total text length: {len(text)}")
            return text
        except Exception as e:
            logger.error(f"Error extracting PDF: {e}")
            raise

    logger.info(f"Processing image file: {file_path.name}")
    try:
        image = preprocess_image_for_ocr(file_path)
        logger.info(f"Image preprocessed successfully, dimensions: {image.size}")
        
        try:
            # Test if Tesseract is accessible
            logger.info(f"Attempting OCR with Tesseract command: {pytesseract.pytesseract.tesseract_cmd}")
            
            # Try multiple OCR passes with different configs
            texts = []
            
            # Pass 1: Standard config for structured documents
            config1 = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
            text1 = pytesseract.image_to_string(image, config=config1)
            texts.append(text1)
            
            # Pass 2: Sparse text config
            config2 = r'--oem 3 --psm 11'
            text2 = pytesseract.image_to_string(image, config=config2)
            texts.append(text2)
            
            # Combine results - use the longest one
            text = max(texts, key=len)
            
            logger.info(f"Successfully extracted text using Tesseract, text length: {len(text)}")
            if not text or len(text.strip()) < 10:
                logger.warning(f"Extracted text is very short ({len(text)} chars). Image may be unclear or not contain text.")
            return text
        except pytesseract.TesseractNotFoundError as e:
            logger.error(f"Tesseract-OCR not found: {e}")
            logger.error("")
            logger.error("SOLUTION:")
            logger.error("  1. Download Tesseract installer from: https://github.com/UB-Mannheim/tesseract/wiki")
            logger.error("  2. Run the installer (tesseract-ocr-w64-setup-x.x.x.exe)")
            logger.error("  3. Install to default location: C:\\Program Files\\Tesseract-OCR")
            logger.error("  4. Restart this backend server")
            logger.error("")
            raise ValueError(
                "Tesseract-OCR is not installed. "
                "Download from https://github.com/UB-Mannheim/tesseract/wiki and install it. "
                "Then restart the backend server."
            ) from e
        except Exception as e:
            logger.error(f"Error during OCR: {e}")
            raise
    except Exception as e:
        logger.error(f"Error preprocessing image: {e}")
        raise


FIELD_PATTERNS = {
    "invoice_number": re.compile(
        r"(?:invoice\s*(?:no\.?|number|#|num)?|inv)[:\s#-]*([A-Za-z0-9\-/]+?)(?:\s|$)", re.I
    ),
    "date": re.compile(
        r"(?:invoice\s*)?date[:\s]*(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})",
        re.I | re.MULTILINE,
    ),
    "due_date": re.compile(
        r"(?:due\s*date|payment\s*due|pay\s*by)[:\s]*(\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})",
        re.I,
    ),
    "vendor": re.compile(
        r"(?:from|vendor|billed?\s*by|seller|company)[:\s]*([^\n]{3,80}?)(?:\n|$)",
        re.I | re.MULTILINE,
    ),
    "bill_to": re.compile(
        r"(?:bill\s*to|client|customer|sold\s*to|ship\s*to)[:\s]*([^\n]{3,80}?)(?:\n|$)",
        re.I | re.MULTILINE,
    ),
    "subtotal": re.compile(
        r"(?:sub[\s-]?total|全ubtotal)[:\s]*(?:rs\.?|inr|\$|[\u00A3\u20AC\u20B9])?\s*([\d,]+\.\d+)", re.I
    ),
    "tax": re.compile(
        r"\b(?:tax|vat|gst|hst|pst|cgst|sgst|igst)\b(?:\s*\([\d.]+%\))?[:\s-]*(?:rs\.?|inr|\$|[\u00A3\u20AC\u20B9])?\s*([\d,]+\.\d+)",
        re.I,
    ),
    "total": re.compile(
        r"\b(?:(?:grand\s*)?total(?:\s*(?:amount|due))?|amount\s*due|balance\s*due)\b[:\s-]*(?:rs\.?|inr|\$|[\u00A3\u20AC\u20B9])?\s*([\d,]+\.\d+)",
        re.I,
    ),
}

LINE_ITEM_PATTERN = re.compile(
    r"^(?P<desc>[A-Za-z][^\t\n]{5,80}?)\s+"
    r"(?:(?P<qty>\d+(?:\.\d+)?)\s+)?"
    r"(?:(?:rs\.?|inr|\$|₹)?\s*)?(?P<unit_price>[\d,]+\.\d{2})\s+"
    r"(?:(?:rs\.?|inr|\$|₹)?\s*)?(?P<amount>[\d,]+\.\d{2})\s*$",
    re.I | re.MULTILINE,
)

DATE_TOKEN_PATTERN = re.compile(
    r"\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})\b",
    re.MULTILINE,
)

IGNORE_LINE_KEYWORDS = re.compile(
    r"^\s*(?:total|subtotal|sub total|tax|vat|gst|balance|amount due|"
    r"invoice|date|due|bill|from|to|description|item|qty|quantity|"
    r"unit|price|rate|no\.|#)\b",
    re.I,
)

DATE_FORMATS = [
    r"^\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}$",
    r"^[A-Za-z]+ \d{1,2},? \d{4}$",
    r"^\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2}$",
]

GST_RATE = 0.18
GST_TOLERANCE = 0.02
AMOUNT_TOKEN_PATTERN = re.compile(r"[\d,]+(?:\.\d+)?")


def parse_amount(value: str) -> float | None:
    try:
        cleaned = re.sub(r"[^\d.]", "", value)
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def _clean_party_value(value: str) -> str:
    value = re.sub(r"\s+", " ", (value or "").strip())
    value = re.sub(r"^[\-\:\|]+|[\-\:\|]+$", "", value).strip()
    if not value:
        return ""
    if re.match(r"^(?:from|bill\s*to|invoice|no\.?|date|due\s*date|vendor|company|seller)\b", value, re.I):
        return ""
    if re.fullmatch(r"[A-Z\s]{2,15}", value) and len(value.split()) <= 3:
        return ""
    return value


def _looks_like_metadata_line(line: str) -> bool:
    if not line:
        return True
    if re.search(r"\bINV[-/]\d{2,}\b", line, re.I) and len(DATE_TOKEN_PATTERN.findall(line)) >= 1:
        return True
    if re.match(r"^(?:invoice|no\.?|date|due\s*date|bill\s*to|from)\b", line, re.I):
        return True
    return False


def _extract_amount_from_keyword_line(text: str, keyword_pattern: str) -> float | None:
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or not re.search(keyword_pattern, line, re.I):
            continue
        # Remove common OCR artifacts
        line = re.sub(r'[|\[\]{}]', ' ', line)
        numeric_tokens = AMOUNT_TOKEN_PATTERN.findall(line)
        amounts = [parse_amount(token) for token in numeric_tokens]
        amounts = [value for value in amounts if value is not None and value > 0.01]
        if not amounts:
            continue
        # For lines like "GST (18%) Rs. 6,486.67", pick payable amount, not rate.
        # Filter out percentages (values < 100 that look like rates)
        filtered = [a for a in amounts if a >= 100 or len([x for x in amounts if x > 100]) == 0]
        if filtered:
            return max(filtered)
        return max(amounts)
    return None


def _extract_party_from_label(text: str, label_pattern: str) -> str | None:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for idx, line in enumerate(lines):
        if re.search(label_pattern, line, re.I):
            inline = re.sub(label_pattern, "", line, flags=re.I).strip(" :|-")
            cleaned_inline = _clean_party_value(inline)
            if cleaned_inline:
                return cleaned_inline
            for j in range(idx + 1, min(idx + 4, len(lines))):
                candidate = _clean_party_value(lines[j])
                if not candidate or _looks_like_metadata_line(candidate):
                    continue
                if re.fullmatch(r"[A-Za-z]{2,}", candidate, re.I) and candidate.lower() in {
                    "india",
                    "usa",
                    "uk",
                    "uae",
                    "singapore",
                }:
                    continue
                return candidate
    return None


def _apply_field_fallbacks(text: str, fields: dict):
    if not fields.get("invoice_number"):
        inv = re.search(r"\b([A-Z]{2,}[-/]\d{2,}[-/]\d+)\b", text, re.I)
        if inv:
            fields["invoice_number"] = inv.group(1)

    if not fields.get("date") or not fields.get("due_date"):
        date_tokens = []
        for token in DATE_TOKEN_PATTERN.findall(text):
            normalized = token.strip()
            if validate_date_format(normalized) and normalized not in date_tokens:
                date_tokens.append(normalized)
        if date_tokens:
            if not fields.get("date"):
                fields["date"] = date_tokens[0]
            if not fields.get("due_date") and len(date_tokens) > 1:
                fields["due_date"] = date_tokens[1]

    vendor = _clean_party_value(fields.get("vendor", ""))
    if not vendor:
        label_vendor = _extract_party_from_label(text, r"\b(?:from|vendor|billed?\s*by|seller|company)\b")
        if label_vendor:
            fields["vendor"] = label_vendor
    else:
        fields["vendor"] = vendor

    bill_to = _clean_party_value(fields.get("bill_to", ""))
    if not bill_to:
        label_bill_to = _extract_party_from_label(text, r"\b(?:bill\s*to|client|customer|sold\s*to|ship\s*to)\b")
        if label_bill_to:
            fields["bill_to"] = label_bill_to
    else:
        fields["bill_to"] = bill_to

    items = fields.get("items") or []
    line_amounts = [it.get("amount") for it in items if isinstance(it.get("amount"), (int, float)) and it.get("amount") > 0]
    
    # Calculate subtotal from line items if missing or seems wrong
    if line_amounts:
        calculated_subtotal = round(sum(line_amounts), 2)
        current_subtotal = fields.get("subtotal")
        
        # If no subtotal or calculated is significantly different, use calculated
        if current_subtotal is None:
            fields["subtotal"] = calculated_subtotal
            logger.info(f"Calculated subtotal from line items: {calculated_subtotal}")
        elif abs(calculated_subtotal - current_subtotal) > current_subtotal * 0.1:
            # If difference is more than 10%, likely OCR error
            logger.warning(f"Subtotal mismatch: extracted={current_subtotal}, calculated={calculated_subtotal}. Using calculated.")
            fields["subtotal"] = calculated_subtotal

    if fields.get("tax") is None:
        # Try multiple patterns for tax
        tax_patterns = [
            r"\b(?:tax|vat|gst|hst|pst|cgst|sgst|igst)\b",
            r"\b(?:ostqrax|0stqrax)\b",  # OCR misreads
        ]
        for pattern in tax_patterns:
            tax_from_line = _extract_amount_from_keyword_line(text, pattern)
            if tax_from_line is not None:
                fields["tax"] = tax_from_line
                break
        
        # If still no tax, try to calculate from subtotal and total
        if fields.get("tax") is None:
            subtotal = fields.get("subtotal")
            total = fields.get("total")
            if isinstance(subtotal, (int, float)) and isinstance(total, (int, float)) and total > subtotal:
                calculated_tax = round(total - subtotal, 2)
                if calculated_tax > 0:
                    fields["tax"] = calculated_tax
                    logger.info(f"Calculated tax from total - subtotal: {calculated_tax}")
            # If still no tax, calculate 18% GST from subtotal
            elif isinstance(subtotal, (int, float)) and subtotal > 0:
                calculated_gst = round(subtotal * 0.18, 2)
                fields["tax"] = calculated_gst
                logger.info(f"Calculated 18% GST from subtotal: {calculated_gst}")
    
    if fields.get("total") is None:
        # Try to find total from text
        total_from_line = _extract_amount_from_keyword_line(
            text,
            r"\b(?:(?:grand\s*)?total(?:\s*(?:amount|due))?|amount\s*due|balance\s*due)\b",
        )
        if total_from_line is not None:
            fields["total"] = total_from_line
        else:
            # Calculate from subtotal + tax
            subtotal = fields.get("subtotal")
            tax = fields.get("tax")
            if isinstance(subtotal, (int, float)) and subtotal > 0:
                fields["total"] = round(subtotal + (tax or 0), 2)
                logger.info(f"Calculated total from subtotal + tax: {fields['total']}")

    subtotal = fields.get("subtotal")
    tax = fields.get("tax")
    total = fields.get("total")
    if (
        isinstance(subtotal, (int, float))
        and isinstance(tax, (int, float))
        and isinstance(total, (int, float))
        and tax > 0
        and abs(total - subtotal) <= 0.05
    ):
        total_from_line = _extract_amount_from_keyword_line(
            text,
            r"\b(?:(?:grand\s*)?total(?:\s*(?:amount|due))?|amount\s*due|balance\s*due)\b",
        )
        if total_from_line is not None:
            fields["total"] = total_from_line
        else:
            fields["total"] = round(subtotal + tax, 2)


def extract_line_items(text: str) -> list[dict]:
    items = []
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
    if not nlp:
        return []

    for line in text.split("\n"):
        line = line.strip()
        if not line or len(line) < 10:
            continue
        if IGNORE_LINE_KEYWORDS.match(line):
            continue
        if _looks_like_metadata_line(line):
            continue
        doc = nlp(line)
        has_noun = any(token.pos_ in ("NOUN", "PROPN") for token in doc)
        numbers = []
        for token in doc:
            if token.like_num or token.pos_ == "NUM":
                val = parse_amount(token.text)
                if val is not None:
                    numbers.append(val)
        if has_noun and numbers:
            items.append(
                {
                    "description": line,
                    "quantity": numbers[0] if len(numbers) >= 3 else None,
                    "unit_price": numbers[-2] if len(numbers) >= 2 else None,
                    "amount": max(numbers),
                }
            )

    return items


def extract_fields_from_text(text: str) -> dict:
    fields: dict = {}

    for key, pattern in FIELD_PATTERNS.items():
        match = pattern.search(text)
        if match:
            fields[key] = match.group(1).strip()

    if not fields.get("vendor") and nlp:
        doc = nlp(text[:800])
        for ent in doc.ents:
            if ent.label_ == "ORG":
                fields["vendor"] = ent.text.strip()
                break

    for numeric_key in ("subtotal", "tax", "total"):
        if fields.get(numeric_key):
            fields[numeric_key] = parse_amount(fields[numeric_key])

    fields["items"] = extract_line_items(text)
    _apply_field_fallbacks(text, fields)
    fields["raw_text"] = text.strip()
    return fields


def validate_date_format(value: str | None) -> bool:
    if not value:
        return False
    return any(re.match(pattern, value.strip()) for pattern in DATE_FORMATS)


def validate_fields(fields: dict) -> dict:
    errors = []
    result = {
        "date_format_ok": False,
        "amount_consistency_ok": False,
        "gst_calculation_ok": False,
        "total_match_ok": False,
    }

    date_val = fields.get("date")
    if validate_date_format(date_val):
        result["date_format_ok"] = True
    else:
        errors.append(f"Invoice date '{date_val}' is missing or not a recognised format.")

    subtotal = fields.get("subtotal")
    tax = fields.get("tax")
    total = fields.get("total")

    if isinstance(subtotal, str):
        subtotal = parse_amount(subtotal)
    if isinstance(tax, str):
        tax = parse_amount(tax)
    if isinstance(total, str):
        total = parse_amount(total)

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
        result["total_match_ok"] = True
    else:
        errors.append("Could not find subtotal, tax, or total to verify amounts.")

    if subtotal is not None and tax is not None and subtotal > 0:
        expected_gst = round(subtotal * GST_RATE, 2)
        if abs(tax - expected_gst) / subtotal <= GST_TOLERANCE:
            result["gst_calculation_ok"] = True
        else:
            errors.append(
                f"Tax ({tax}) doesn't match standard 18% GST on subtotal ({subtotal}). "
                "This may be correct if a different rate applies."
            )

    result["is_valid"] = len([err for err in errors if "doesn't match standard" not in err]) == 0
    result["errors"] = errors
    return result
