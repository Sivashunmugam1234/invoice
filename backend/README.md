# Flask Backend for Invoice App

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- macOS/Linux: `source venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the Flask server:
```bash
python app.py
```

The server will run on `http://localhost:5000`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/invoices` - Get all invoices

## Structure

- `app.py` - Main Flask application
- `routes/` - API route definitions
- `models/` - Database models
- `requirements.txt` - Python dependencies
- `.env` - Environment variables
