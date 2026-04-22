from datetime import datetime
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, request
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


def list_uploaded_invoices():
    invoices = []

    for file_path in sorted(UPLOAD_FOLDER.iterdir(), reverse=True):
        if not file_path.is_file() or file_path.name == ".gitkeep":
            continue

        stats = file_path.stat()
        invoices.append(
            {
                "id": file_path.stem,
                "filename": file_path.name,
                "originalName": file_path.name.split("_", 2)[-1],
                "size": stats.st_size,
                "uploadedAt": datetime.fromtimestamp(stats.st_mtime).isoformat(),
            }
        )

    return invoices


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Flask backend is running"}), 200

@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    return jsonify({"invoices": list_uploaded_invoices()}), 200


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
            "invoice": {
                "id": target_path.stem,
                "filename": target_path.name,
                "originalName": safe_name,
                "size": target_path.stat().st_size,
                "uploadedAt": datetime.now().isoformat(),
            },
        }
    ), 201

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
