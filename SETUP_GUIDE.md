# Project Setup Guide

This guide provides step-by-step instructions for setting up the Invoice Processing project locally.

## 1. System Prerequisites

Before running the application, ensure you have the following installed on your system:
- **Node.js** (v18 or higher) for the frontend.
- **Python 3.8+** for the backend.
- **MySQL Server** (e.g., via XAMPP, WAMP, or a standalone MySQL installation).
- **Tesseract OCR**: Required for extracting text from images.
  - **Windows**: Right-click and select "Run as Administrator" on the included `install_tesseract.bat` file in the root directory.
  - **macOS**: Run `brew install tesseract`
  - **Linux (Ubuntu/Debian)**: Run `sudo apt-get install tesseract-ocr`

## 2. Database Setup

1. Ensure your MySQL server is running (e.g., start the MySQL module in your XAMPP control panel).
2. Create a new, empty database named `invoices_db`. You can do this via phpMyAdmin or by running the following SQL command in your MySQL terminal:
   ```sql
   CREATE DATABASE invoices_db;
   ```
*(Note: You do not need to create the tables manually. The backend will automatically create and seed all the required tables when it first starts.)*

## 3. Backend Setup (Flask API)

Open a terminal and navigate to the `backend` directory:
```bash
cd backend
```

### Virtual Environment Setup
1. Create a virtual environment:
   - **Windows**: `python -m venv venv`
   - **macOS/Linux**: `python3 -m venv venv`
2. Activate the virtual environment:
   - **Windows**: `venv\Scripts\activate`
   - **macOS/Linux**: `source venv/bin/activate`

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Environment Configuration (.env)
Create a `.env` file in the `backend` directory (if it doesn't already exist) and configure your database credentials. 

Here is the setup model for your `.env` file:
```env
# Flask Configuration
FLASK_ENV=development
FLASK_APP=app.py

# MySQL Database Configuration
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
# Add your MySQL password here if you have one, otherwise leave blank
DB_PASSWORD=
DB_NAME=invoices_db

# Session Configuration
SESSION_TTL_HOURS=12
```
*Make sure to update `DB_PASSWORD` or `DB_USER` if your local MySQL configuration differs from the defaults.*

### Start the Server
```bash
python app.py
```
*The server will start on `http://localhost:5000` and automatically initialize the database.*

## 4. Frontend Setup (React/Vite)

Open a **new** terminal window and navigate to the `invoice` (frontend) directory:
```bash
cd invoice
```

### Install Dependencies
```bash
npm install
```

### Start the Development Server
```bash
npm run dev
```
*The frontend will typically be accessible at `http://localhost:5173`.*

## 5. Default Test Accounts

Once both servers are running, open your browser and navigate to the frontend URL. The backend automatically creates two default demo accounts you can use to log in and test the application immediately:

- **Account 1 (Alpha Traders)**:
  - Email: `alpha.admin@demo.com`
  - Password: `alpha123`
- **Account 2 (Zen Supplies)**:
  - Email: `zen.admin@demo.com`
  - Password: `zen123`
