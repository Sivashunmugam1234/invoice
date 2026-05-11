# Automated Invoice Processing System

## Project Report

**Project Title:** Automated Invoice Processing System  
**Domain:** Document Processing / OCR / Web Application  
**Frontend:** React with Vite  
**Backend:** Flask  
**Database:** MySQL  
**Core Technologies:** OCR, PDF text extraction, image preprocessing, regex-based field extraction, validation, CSV/Excel export

---

## Abstract

The Automated Invoice Processing System is a web-based application designed to reduce manual effort in invoice data entry. In many organizations, invoices are received as PDF documents or scanned images. Manually reading these invoices, typing the data into a system, checking totals, and preparing reports is time-consuming and error-prone.

This project automates the invoice handling process by allowing users to upload invoice documents, extract key invoice details, validate the extracted values, store the data in a database, and export the results in CSV or Excel format. The system uses React for the frontend, Flask for the backend, MySQL for persistent storage, pdfplumber for text extraction from PDFs, Tesseract OCR for image-based invoices, and OpenCV for image preprocessing.

The main objective of this project is to create a complete invoice processing workflow: upload, preview, extract, validate, store, and export. This makes invoice management faster, more accurate, and more suitable for business use.

---

## 1. Introduction

Invoice processing is a common activity in companies, shops, institutions, and accounting departments. An invoice usually contains important details such as invoice number, invoice date, vendor name, customer name, subtotal, tax amount, total amount, and line items. Traditionally, these details are entered manually into accounting software or spreadsheets.

Manual invoice entry has several disadvantages:

- It consumes more time.
- It may lead to typing errors.
- It is difficult to process large numbers of invoices.
- Validation of totals and tax values requires manual checking.
- Searching and exporting invoice records becomes inconvenient.

The proposed system solves these problems by automating invoice processing. Users can upload invoices in PDF, PNG, JPG, or JPEG format. The backend extracts text from the uploaded document, identifies required fields, validates financial values, stores the information in a MySQL database, and provides export options.

---

## 2. Problem Statement

Organizations often receive invoices in different formats such as digital PDFs and scanned images. Extracting useful information from these documents manually is slow and error-prone. There is a need for a system that can automatically read invoice documents, extract structured data, validate important fields, and store the results for later use.

The problem addressed by this project is:

**To develop an automated invoice processing system that can upload invoice documents, extract key invoice information using OCR and text parsing, validate the extracted data, store it in a database, and export it in useful formats.**

---

## 3. Objectives

The main objectives of this project are:

- To create a user-friendly web interface for uploading invoice files.
- To support invoice uploads in PDF and image formats.
- To extract text from PDFs using PDF text extraction.
- To extract text from scanned invoice images using OCR.
- To improve OCR accuracy through image preprocessing.
- To identify important invoice fields such as invoice number, date, vendor, subtotal, tax, and total.
- To validate extracted data using business rules.
- To store invoice details, extracted fields, line items, and validation results in MySQL.
- To provide CSV and Excel export options.
- To maintain workflow logs for tracking each processing step.
- To test important backend functions using unit tests.

---

## 4. Scope of the Project

The scope of this project includes:

- Uploading invoices through a web interface.
- Displaying uploaded invoices in a document viewer.
- Extracting text from PDF and image invoices.
- Extracting structured fields from raw invoice text.
- Validating invoice date, GST/tax, subtotal, and total amount.
- Storing invoice data in a relational database.
- Exporting extracted records as CSV and Excel files.

The current system is mainly designed for common invoice layouts. It may require further enhancement for highly complex, handwritten, or unusual invoice formats.

---

## 5. Existing System

In the existing manual system, invoice processing is usually done by a person. The user opens each invoice, reads the required values, enters the values into a spreadsheet or accounting system, checks totals manually, and then saves the record.

### Disadvantages of Existing System

- Manual data entry takes more time.
- Human errors can occur during typing.
- Large invoice volumes are difficult to manage.
- Searching and exporting old invoice data is inconvenient.
- There is no automatic validation of total and tax values.
- Repeated work reduces productivity.

---

## 6. Proposed System

The proposed system automates invoice processing using a web-based application. The user uploads an invoice file. The backend extracts text from the invoice using either PDF text extraction or OCR. Then the system applies field extraction logic to identify key invoice details. After extraction, the system validates the data and stores it in the database.

### Advantages of Proposed System

- Reduces manual data entry.
- Supports both PDF and image invoices.
- Uses OCR to process scanned invoices.
- Performs automatic validation of invoice values.
- Stores extracted data in a structured database.
- Provides export options for reporting.
- Improves speed and accuracy of invoice processing.

---

## 7. System Architecture

The system follows a client-server architecture.

### Frontend

The frontend is built using React and Vite. It provides the user interface for uploading invoices, viewing uploaded documents, triggering extraction, displaying extracted fields, showing validation status, and exporting data.

### Backend

The backend is built using Flask. It provides REST API endpoints for file upload, invoice listing, file preview, extraction, validation, workflow tracking, and export.

### Database

The backend uses MySQL through PyMySQL. Extracted invoice data, validation results, line items, and workflow logs are stored in relational tables.

### Processing Layer

The processing layer includes:

- PDF text extraction using pdfplumber.
- OCR using pytesseract.
- Image preprocessing using OpenCV and Pillow.
- Field extraction using regular expressions.
- Optional NLP fallback using spaCy.
- Data validation using predefined rules.

### Architecture Flow

User -> React Frontend -> Flask API -> OCR/Text Extraction -> Field Extraction -> Validation -> MySQL Database -> Export

---

## 8. Technologies Used

### React

React is used to build the frontend interface. It helps create reusable components and dynamic user interactions.

### Vite

Vite is used as the frontend build tool. It provides fast development server support and efficient project building.

### Flask

Flask is used to build the backend REST API. It handles file uploads, invoice extraction, validation, database operations, and export features.

### MySQL

MySQL is used to store uploaded invoice metadata, extracted fields, line items, validation results, and workflow logs.

### PyMySQL

PyMySQL is used to connect the Flask application with the MySQL database.

### pdfplumber

pdfplumber is used to extract text from PDF invoices.

### Tesseract OCR

Tesseract OCR is used to extract text from image-based invoices.

### OpenCV

OpenCV is used for image preprocessing. It improves image quality before OCR by applying grayscale conversion, blurring, thresholding, and deskewing.

### Pillow

Pillow is used for image handling in Python.

### spaCy

spaCy is optionally used as a fallback for identifying organization names and line item information when regex extraction is not enough.

### openpyxl

openpyxl is used to generate Excel export files.

### Pytest

Pytest is used to test backend functions such as file validation, amount parsing, date validation, field extraction, validation logic, and CSV export.

---

## 9. Modules of the Project

### 9.1 Upload Module

The upload module allows users to upload invoice documents. The accepted file types are PDF, PNG, JPG, and JPEG. The backend checks whether the uploaded file is valid and saves it securely in the uploads folder.

Important backend function:

`allowed_file(filename)`

This function checks whether the file extension is allowed.

### 9.2 Invoice Listing Module

This module displays all uploaded invoices in the frontend. It shows details such as file name, file size, upload time, and status.

Important API:

`GET /api/invoices`

### 9.3 Document Preview Module

This module allows users to preview uploaded invoices. PDFs are shown using an iframe, and images are shown using an image viewer.

Important API:

`GET /api/invoices/<invoice_id>/file`

### 9.4 Text Extraction Module

This module extracts raw text from uploaded invoice files.

For PDFs:

`pdfplumber` extracts text from each page.

For images:

OpenCV preprocesses the image and Tesseract OCR extracts the text.

Important backend function:

`extract_text_from_file(file_path)`

### 9.5 Image Preprocessing Module

Image preprocessing improves OCR accuracy. The system performs:

- Grayscale conversion.
- Gaussian blur.
- Adaptive thresholding.
- Deskewing.

Important backend functions:

`deskew_image(image)`  
`preprocess_image_for_ocr(file_path)`

### 9.6 Field Extraction Module

This module extracts structured fields from raw invoice text. It uses regular expressions to identify:

- Invoice number
- Invoice date
- Due date
- Vendor
- Bill to
- Subtotal
- Tax/GST
- Total amount
- Line items

Important backend function:

`extract_fields_from_text(text)`

### 9.7 Validation Module

This module checks whether extracted data is logically correct.

Validation checks include:

- Date format validation.
- Subtotal plus tax should match total.
- GST calculation based on 18 percent.
- Total amount availability.

Important backend function:

`validate_fields(fields)`

### 9.8 Workflow Module

This module tracks each stage of invoice processing. It records steps such as upload, extraction, validation, and storage.

Important backend function:

`log_workflow(db, invoice_id, step, status, message)`

Important API:

`GET /api/invoices/<invoice_id>/workflow`

### 9.9 Database Storage Module

After extraction and validation, the invoice data is stored in MySQL. The system stores invoice metadata, extracted fields, line items, and validation results.

Important backend function:

`run_workflow(invoice_id, file_path, db)`

### 9.10 Export Module

This module allows users to export extracted invoice data.

Supported export formats:

- CSV
- Excel

Important APIs:

`GET /api/invoices/<invoice_id>/export/csv`  
`GET /api/invoices/<invoice_id>/export/excel`  
`GET /api/export/csv`  
`GET /api/export/excel`

---

## 10. Database Design

The system uses a MySQL database with the following tables.

### 10.1 invoices

This table stores uploaded invoice file details.

Fields:

- id
- filename
- original_name
- mime_type
- file_size
- uploaded_at
- status

### 10.2 invoice_fields

This table stores extracted invoice-level information.

Fields:

- id
- invoice_id
- invoice_number
- invoice_date
- due_date
- vendor
- bill_to
- subtotal
- tax
- total
- raw_text
- extracted_at

### 10.3 invoice_line_items

This table stores item-wise invoice information.

Fields:

- id
- invoice_id
- description
- quantity
- unit_price
- amount

### 10.4 invoice_validation

This table stores validation results.

Fields:

- id
- invoice_id
- is_valid
- date_format_ok
- amount_consistency_ok
- gst_calculation_ok
- total_match_ok
- errors
- validated_at

### 10.5 workflow_log

This table stores workflow history.

Fields:

- id
- invoice_id
- step
- status
- message
- created_at

---

## 11. API Design

The backend exposes REST APIs for frontend communication.

### Health Check

`GET /api/health`

Checks whether the Flask backend is running.

### Get All Invoices

`GET /api/invoices`

Returns the list of uploaded invoices.

### Upload Invoice

`POST /api/invoices`

Uploads a new invoice file.

### Get Invoice Details

`GET /api/invoices/<invoice_id>`

Returns details of a specific invoice.

### Preview Invoice File

`GET /api/invoices/<invoice_id>/file`

Returns the uploaded file for preview.

### Extract Invoice

`POST /api/invoices/<invoice_id>/extract`

Runs the complete workflow: extract, validate, and store.

### Get Workflow Log

`GET /api/invoices/<invoice_id>/workflow`

Returns the workflow history of an invoice.

### Get Validation Result

`GET /api/invoices/<invoice_id>/validation`

Returns the latest validation result.

### Export Single Invoice

`GET /api/invoices/<invoice_id>/export/csv`  
`GET /api/invoices/<invoice_id>/export/excel`

Exports one invoice.

### Export All Invoices

`GET /api/export/csv`  
`GET /api/export/excel`

Exports all processed invoices.

---

## 12. Working of the System

The working of the system can be explained step by step:

1. The user opens the React frontend.
2. The user selects or drags and drops an invoice file.
3. The frontend sends the file to the Flask backend using a POST request.
4. The backend validates the file type.
5. The file is saved in the uploads folder with a unique name.
6. The invoice metadata is stored in the database.
7. The user selects the uploaded invoice and clicks Extract Fields.
8. The backend checks the file type.
9. If the file is a PDF, text is extracted using pdfplumber.
10. If the file is an image, it is preprocessed using OpenCV and read using Tesseract OCR.
11. The raw text is passed to the field extraction function.
12. Regex patterns extract invoice number, date, vendor, subtotal, tax, total, and other details.
13. Validation logic checks date format and amount consistency.
14. Extracted fields and validation results are stored in MySQL.
15. The frontend displays extracted fields and validation status.
16. The user can export the result as CSV or Excel.

---

## 13. Field Extraction Logic

The field extraction logic is based on pattern matching. Invoices usually contain labels such as:

- Invoice No
- Invoice Number
- Date
- Due Date
- Vendor
- Bill To
- Subtotal
- GST
- Tax
- Total Amount

The backend uses regular expressions to detect these labels and capture the values next to them.

For example:

`Invoice No: INV-2026-001`

From this text, the system extracts:

`invoice_number = INV-2026-001`

Amount values are cleaned by removing currency symbols and commas before converting them into numbers.

Example:

`Rs. 1,180.00` becomes `1180.00`

---

## 14. Validation Logic

Validation is important because OCR may produce incorrect text, and invoices may have calculation errors. The system performs the following checks:

### Date Format Validation

The invoice date must match supported formats such as:

- DD/MM/YYYY
- DD-MM-YYYY
- YYYY-MM-DD
- Month DD, YYYY

### Amount Consistency Validation

The system checks:

`subtotal + tax = total`

Small differences are allowed because of rounding.

### GST Validation

The system checks whether the tax amount approximately matches 18 percent GST.

Formula:

`GST = subtotal * 0.18`

This is treated as a warning because different invoices may use different tax rates.

### Total Match Validation

The system checks whether a total amount is present and whether it matches the expected value.

---

## 15. Frontend Design

The frontend is designed as a dashboard. It includes:

- Header with uploaded, processed, and pending counts.
- Upload panel.
- Invoice list panel.
- Document viewer.
- Extract Fields button.
- Export buttons.
- Extracted fields panel.
- Validation result panel.
- Raw OCR text section.

React state is used to manage:

- Selected file
- Uploaded invoices
- Active invoice
- Loading status
- Upload status
- Extracted fields
- Validation result
- Error messages

The frontend communicates with the backend using the Fetch API.

---

## 16. Backend Design

The backend is implemented in a single Flask application file. It handles:

- File upload
- File validation
- Invoice listing
- File preview
- Text extraction
- Field extraction
- Data validation
- MySQL storage
- Workflow logging
- CSV export
- Excel export

The backend follows a clear processing pipeline:

`Upload -> Extract -> Validate -> Store -> Export`

---

## 17. Testing and Evaluation

The project includes unit tests using Pytest. The tests check important backend functions.

Test categories include:

- File validation
- Amount parsing
- Date validation
- Field extraction
- Validation logic
- Line item extraction
- Different invoice formats
- CSV export
- Regex pattern coverage

The test suite was executed successfully.

Test result:

`68 passed`

This shows that the core backend logic works correctly for the tested cases.

---

## 18. Results

The system successfully performs the following operations:

- Uploads invoice files.
- Displays uploaded invoices.
- Previews PDF and image invoices.
- Extracts raw text from invoices.
- Extracts important invoice fields.
- Validates extracted values.
- Stores results in MySQL.
- Displays validation status to the user.
- Exports invoice data as CSV and Excel.

The final output is a structured invoice record that can be used for reporting, accounting, or further processing.

---

## 19. Advantages

- Reduces manual invoice entry work.
- Saves time in processing invoices.
- Supports both PDF and image files.
- Uses OCR for scanned invoices.
- Validates important financial fields.
- Stores data in a structured database.
- Provides CSV and Excel export.
- Maintains workflow logs.
- Includes backend unit testing.

---

## 20. Limitations

- OCR accuracy depends on image quality.
- Handwritten invoices may not be processed accurately.
- Regex-based extraction may fail for unusual invoice layouts.
- GST validation assumes an 18 percent rate.
- spaCy model must be installed for NLP fallback.
- The current system does not include user authentication.
- The system does not provide manual correction before final storage.

---

## 21. Future Enhancements

The project can be improved in the following ways:

- Add user login and role-based access.
- Add manual correction and approval before storing data.
- Use machine learning models for better invoice field extraction.
- Support more invoice formats and languages.
- Add dashboard analytics for monthly invoice totals.
- Integrate with accounting software.
- Store files in cloud storage.
- Add duplicate invoice detection.
- Add email invoice import.
- Improve GST handling for different tax rates.

---

## 22. Conclusion

The Automated Invoice Processing System provides a complete solution for uploading, extracting, validating, storing, and exporting invoice data. It reduces manual effort and improves the speed of invoice handling. The project combines web development, OCR, image processing, text extraction, data validation, database management, and export generation.

The system demonstrates how automation can be applied to a real-world business process. It is useful for organizations that handle many invoices and want to reduce repetitive manual data entry. Although the current version has limitations with complex invoice layouts and OCR quality, it provides a strong foundation for a practical invoice automation system.

---

## 23. Viva Preparation Notes

### Short Project Explanation

This project is an automated invoice processing system. It allows users to upload invoice files, extracts key invoice details using OCR and PDF text extraction, validates the extracted data, stores it in MySQL, and exports the data as CSV or Excel.

### Main Workflow

Upload invoice -> Extract text -> Extract fields -> Validate data -> Store in database -> Export result

### Why This Project Is Useful

It reduces manual invoice entry, saves time, prevents calculation mistakes, and creates structured invoice records for future use.

### Why React Is Used

React is used to build a dynamic frontend where users can upload files, preview invoices, view extracted data, and export results.

### Why Flask Is Used

Flask is lightweight and suitable for creating REST APIs. It handles file upload, OCR processing, validation, database storage, and export.

### Why OCR Is Used

OCR is used because some invoices are scanned images. OCR converts image text into machine-readable text.

### Why OpenCV Is Used

OpenCV improves image quality before OCR by applying preprocessing techniques such as grayscale conversion, thresholding, and deskewing.

### Why MySQL Is Used

MySQL stores invoice details in structured relational tables, making it easy to search, manage, and export data.

### Main Validation Checks

- Date format check
- Subtotal plus tax equals total
- GST calculation check
- Total amount check

### Main Strength of the Project

The project is end-to-end. It does not stop at uploading files. It performs extraction, validation, database storage, workflow tracking, and export.

### Main Limitation

The system depends on OCR quality and invoice layout. Very unclear images or unusual invoice formats may reduce extraction accuracy.

---

## 24. Common Viva Questions and Answers

### Q1. What is your project about?

This project is about automating invoice processing. It extracts important fields from invoice PDFs or images, validates the values, stores them in a database, and allows export as CSV or Excel.

### Q2. What problem does your project solve?

It solves the problem of manual invoice data entry, which is slow, repetitive, and error-prone.

### Q3. What are the main modules?

The main modules are upload, preview, OCR/text extraction, field extraction, validation, database storage, workflow logging, and export.

### Q4. How do you extract text from PDFs?

The system uses pdfplumber to extract text from PDF invoices.

### Q5. How do you extract text from images?

The system preprocesses the image using OpenCV and then uses Tesseract OCR to extract text.

### Q6. What is OCR?

OCR stands for Optical Character Recognition. It converts text present in images into editable and searchable machine-readable text.

### Q7. What fields are extracted?

The system extracts invoice number, date, due date, vendor, bill to, subtotal, tax, total, raw text, and line items.

### Q8. How is validation performed?

Validation is done by checking the date format, verifying subtotal plus tax equals total, checking GST calculation, and ensuring total amount availability.

### Q9. What database is used?

The project uses MySQL as the database and PyMySQL to connect Flask with MySQL.

### Q10. What is the role of workflow_log?

The workflow_log table tracks each stage of invoice processing, such as upload, extraction, validation, and storage.

### Q11. What export formats are supported?

The system supports CSV and Excel export.

### Q12. What are the limitations?

The system may not work perfectly for poor-quality images, handwritten invoices, or unusual invoice formats. GST validation currently assumes 18 percent.

### Q13. How did you test the project?

Backend functions were tested using Pytest. The tests cover file validation, amount parsing, date validation, field extraction, validation logic, line item extraction, and export.

### Q14. What is the future scope?

Future improvements include user login, manual correction, machine learning-based extraction, support for more invoice formats, duplicate detection, and accounting software integration.

---

## 25. References

- React documentation
- Flask documentation
- MySQL documentation
- Tesseract OCR documentation
- OpenCV documentation
- pdfplumber documentation
- Pytest documentation
- openpyxl documentation

