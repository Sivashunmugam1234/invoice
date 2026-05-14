"""
Quick test to verify Tesseract OCR is working with pytesseract
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from services.extraction import extract_text_from_file
from pathlib import Path

print("Testing Tesseract OCR integration...")
print("=" * 70)

# Find a test image in uploads folder
uploads_dir = Path(__file__).parent / "uploads"
test_files = list(uploads_dir.glob("*.png")) + list(uploads_dir.glob("*.jpg"))

if not test_files:
    print("No PNG or JPG files found in uploads folder to test.")
    print("Upload an image invoice first, then run this test.")
else:
    test_file = test_files[0]
    print(f"\nTesting with file: {test_file.name}")
    print("-" * 70)
    
    try:
        text = extract_text_from_file(test_file)
        print(f"\n✓ SUCCESS! Extracted {len(text)} characters")
        print("\nFirst 500 characters of extracted text:")
        print("-" * 70)
        print(text[:500])
        print("-" * 70)
        print("\n✓ Image extraction is working!")
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        print("\nTroubleshooting:")
        print("  1. Make sure you restarted the backend server")
        print("  2. Check that Tesseract is at: C:\\Program Files\\Tesseract-OCR\\tesseract.exe")
