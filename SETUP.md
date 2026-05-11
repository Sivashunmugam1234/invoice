# Invoice Application Setup

## Project Structure

```
invoice/
├── invoice/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── AuthView.jsx
│   │   │   ├── DashboardHeader.jsx
│   │   │   ├── UploadPanel.jsx
│   │   │   ├── InvoiceListPanel.jsx
│   │   │   ├── PreviewPanel.jsx
│   │   │   └── ExtractedFieldsPanel.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── server.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── invoices.js
│   │   └── export.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   ├── extraction.js
│   │   └── validation.js
│   ├── .env
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 16+ and npm
- Python 3.8+ (for invoice processing)
- SQLite3

## Installation

### Frontend Setup

```bash
cd invoice
npm install
```

### Backend Setup

```bash
cd server
npm install
pip install -r requirements.txt
```

## Environment Configuration

Create `.env` file in the `server/` directory:

```
PORT=5000
DATABASE_URL=sqlite:///invoices.db
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd invoice
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

```bash
cd invoice
npm run build
```

## Features

- User authentication with JWT
- Invoice file upload (PDF, images)
- Automatic field extraction using OCR/AI
- Data validation
- CSV/Excel export
- Invoice management dashboard

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Invoices
- `GET /api/invoices` - List all invoices
- `POST /api/invoices` - Upload invoice
- `POST /api/invoices/:id/extract` - Extract fields
- `GET /api/invoices/:id/export/csv` - Export as CSV
- `GET /api/invoices/:id/export/excel` - Export as Excel

### Export
- `GET /api/export/csv` - Export all invoices as CSV
- `GET /api/export/excel` - Export all invoices as Excel

## Troubleshooting

### Port Already in Use
Change the PORT in `.env` or kill the process using the port.

### Database Issues
Delete `invoices.db` and restart the server to reinitialize.

### CORS Errors
Ensure backend is running on the correct port and frontend is configured to use the right API URL.
