from datetime import datetime
import mimetypes
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import os

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

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
