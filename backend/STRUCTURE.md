# Backend Structure

The backend was split so `app.py` stays focused on API wiring and request handling.

## Folder Map

- `app.py`
  - Flask app setup
  - DB setup and auth/session helpers
  - API routes (`/api/*`)
  - Compatibility exports used by tests (`FIELD_PATTERNS`, `parse_amount`, `_build_csv`, etc.)
- `services/extraction.py`
  - OCR preprocessing
  - text extraction from PDF/image
  - invoice field extraction
  - line item extraction
  - validation rules
- `services/workflow.py`
  - workflow logging (`upload`, `extract`, `validate`, `store`)
  - full extract -> validate -> persist pipeline (`run_workflow`)
- `services/exporters.py`
  - export query helper
  - CSV generation
  - Excel generation

## How to Extend Cleanly

- New API endpoint: add route handler in `app.py`.
- New extraction rule: update `services/extraction.py`.
- New workflow step or storage logic: update `services/workflow.py`.
- New export format: add helper in `services/exporters.py` and route in `app.py`.
