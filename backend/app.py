from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)

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

# Health check route
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Flask backend is running"}), 200

# Sample route
@app.route('/api/invoices', methods=['GET'])
def get_invoices():
    return jsonify({
        "invoices": [
            {
                "id": 1,
                "number": "INV-001",
                "client": "Northwind Traders",
                "amount": 1000,
                "status": "Paid",
            },
            {
                "id": 2,
                "number": "INV-002",
                "client": "Bluewave Logistics",
                "amount": 2000,
                "status": "Pending",
            },
            {
                "id": 3,
                "number": "INV-003",
                "client": "Vertex Studio",
                "amount": 3500,
                "status": "Paid",
            },
        ]
    }), 200

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
