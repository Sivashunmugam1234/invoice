import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from services.extraction import extract_text_from_file
from pathlib import Path

uploads_dir = Path(__file__).parent / "uploads"
test_files = list(uploads_dir.glob("*.png")) + list(uploads_dir.glob("*.jpg"))

if test_files:
    test_file = test_files[0]
    print(f"Testing: {test_file.name}")
    text = extract_text_from_file(test_file)
    print(f"SUCCESS! Extracted {len(text)} characters")
    print(f"\nFirst 300 chars:\n{text[:300]}")
else:
    print("No image files found")
