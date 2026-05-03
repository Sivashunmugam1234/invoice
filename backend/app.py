from datetime import datetime
import mimetypes
import re
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import os
import pdfplumber
import pytesseract
from PIL import Image
import cv2
import numpy as np
import spacy

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = None
import numpy as np

# Load environment variables
load_dotenv()

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

UPLOAD_FOLDER.mkdir(exist_ok=True)

app.config["UPLOAD_FOLDER"] = str(UPLOAD_FOLDER)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

# Enable CORS for React frontend
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
        file_path
        for file_path in UPLOAD_FOLDER.iterdir()
        if file_path.is_file() and file_path.name != ".gitkeep"
    ]
    return sorted(files, key=lambda file_path: file_path.stat().st_mtime, reverse=True)


def list_uploaded_invoices():
    return [serialize_invoice(file_path) for file_path in uploaded_invoice_files()]


def find_invoice_file(invoice_id):
    for file_path in uploaded_invoice_files():
        if file_path.stem == invoice_id:
            return file_path

    return None


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Flask backend is running"}), 200

@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    return jsonify({"invoices": list_uploaded_invoices()}), 200


@app.route('/api/invoices/<invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    file_path = find_invoice_file(invoice_id)

    if file_path is None:
        return jsonify({"error": "Invoice not found."}), 404

    return jsonify({"invoice": serialize_invoice(file_path)}), 200


@app.route('/api/invoices/<invoice_id>/file', methods=['GET'])
def serve_invoice_file(invoice_id):
    file_path = find_invoice_file(invoice_id)

    if file_path is None:
        return jsonify({"error": "Invoice not found."}), 404

    return send_file(file_path, as_attachment=False)


@app.route('/api/invoices', methods=['POST'])
def upload_invoice():
    if 'invoice' not in request.files:
        return jsonify({"error": "No invoice file was provided."}), 400

    invoice_file = request.files['invoice']

    if invoice_file.filename == '':
        return jsonify({"error": "Please choose an invoice file to upload."}), 400

    if not allowed_file(invoice_file.filename):
        return jsonify(
            {"error": "Only PDF, PNG, JPG, and JPEG invoice files are supported."}
        ), 400

    safe_name = secure_filename(invoice_file.filename)
    stored_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid4().hex}_{safe_name}"
    target_path = UPLOAD_FOLDER / stored_name

    invoice_file.save(target_path)

    return jsonify(
        {
            "message": "Invoice uploaded successfully.",
            "invoice": serialize_invoice(target_path),
        }
    ), 201

# ── OCR / field-extraction helpers ──────────────────────────────────────────

FIELD_PATTERNS = {
    "invoice_number": re.compile(
        r"(?:invoice\s*(?:no\.?|number|#)[:\s]*)(\S+)", re.I
    ),
    "date": re.compile(
        r"(?:date|invoice\s*date)[:\s]*([\d]{1,2}[\-\/][\d]{1,2}[\-\/][\d]{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})",
        re.I,
    ),
    "due_date": re.compile(
        r"(?:due\s*date|payment\s*due)[:\s]*([\d]{1,2}[\-\/][\d]{1,2}[\-\/][\d]{2,4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})",
        re.I,
    ),
    "vendor": re.compile(
        r"(?:from|vendor|billed?\s*by|seller)[:\s]*([^\n]+)", re.I
    ),
    "bill_to": re.compile(
        r"(?:bill\s*to|client|customer|sold\s*to)[:\s]*([^\n]+)", re.I
    ),
    "subtotal": re.compile(
        r"(?:sub\s*total|subtotal)[:\s]*[\$£€]?\s*([\d,]+\.?\d*)", re.I
    ),
    "tax": re.compile(
        r"(?:tax|vat|gst)[:\s]*[\$£€]?\s*([\d,]+\.?\d*)", re.I
    ),
    "total": re.compile(
        r"(?:total\s*(?:amount|due)?|amount\s*due|grand\s*total)[:\s]*[\$£€]?\s*([\d,]+\.?\d*)",
        re.I,
    ),
}


def extract_items_nlp(text: str) -> list:
    """Extract line items from invoice text using NLP heuristics."""
    if not nlp:
        return []
        
    items = []
    lines = text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 10:
            continue
            
        doc = nlp(line)
        
        has_noun = False
        numbers = []
        
        for token in doc:
            if token.pos_ in ['NOUN', 'PROPN']:
                has_noun = True
            elif token.like_num or token.pos_ == 'NUM':
                num_str = re.sub(r'[^\d.]', '', token.text)
                try:
                    if num_str:
                        numbers.append(float(num_str))
                except ValueError:
                    pass
                    
        # A typical line item has a description (noun) and at least one number (price/qty)
        if has_noun and len(numbers) >= 1:
            lower_line = line.lower()
            # Ignore headers and summary lines
            if not any(header in lower_line for header in ['total', 'subtotal', 'tax', 'balance', 'due', 'amount', 'invoice', 'date']):
                items.append({
                    "description": line,
                    "extracted_numbers": numbers
                })
                
    return items

def extract_fields_from_text(text: str) -> dict:
    fields = {}
    for key, pattern in FIELD_PATTERNS.items():
        match = pattern.search(text)
        if match:
            fields[key] = match.group(1).strip()
            
    # NLP fallback for vendor
    if not fields.get('vendor') and nlp:
        doc = nlp(text[:500])
        for ent in doc.ents:
            if ent.label_ == 'ORG':
                fields['vendor'] = ent.text.strip()
                break
                
    fields["raw_text"] = text.strip()
    fields["items"] = extract_items_nlp(text)
    return fields


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

        # Only deskew if the angle is significant but not too extreme
        if abs(angle) < 0.5 or abs(angle) > 45:
             return image
             
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return rotated
    except Exception:
        return image

def preprocess_image_for_ocr(file_path: Path) -> Image.Image:
    # Read image using OpenCV
    image = cv2.imread(str(file_path))
    
    if image is None:
        raise ValueError("Could not read image file.")
        
    # 1. Deskewing
    deskewed = deskew_image(image)
    
    # 2. Grayscale conversion
    gray = cv2.cvtColor(deskewed, cv2.COLOR_BGR2GRAY)
    
    # 3. Noise removal
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # 4. Thresholding (Adaptive)
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
    
    # Convert back to PIL Image for Tesseract
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


@app.route("/api/invoices/<invoice_id>/extract", methods=["POST"])
def extract_invoice(invoice_id):
    file_path = find_invoice_file(invoice_id)
    if file_path is None:
        return jsonify({"error": "Invoice not found."}), 404

    try:
        text = extract_text_from_file(file_path)
        fields = extract_fields_from_text(text)
        return jsonify({"fields": fields}), 200
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
