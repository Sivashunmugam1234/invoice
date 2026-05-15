import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from services.extraction import extract_text_from_file, extract_fields_from_text
from pathlib import Path

uploads_dir = Path(__file__).parent / "uploads"
test_files = list(uploads_dir.glob("*.png")) + list(uploads_dir.glob("*.jpg"))

if test_files:
    test_file = test_files[0]
    print(f"Testing: {test_file.name}\n")
    
    text = extract_text_from_file(test_file)
    print(f"Extracted text ({len(text)} chars):")
    print("=" * 70)
    print(text)
    print("=" * 70)
    
    fields = extract_fields_from_text(text)
    print("\nExtracted Fields:")
    print("-" * 70)
    for key, value in fields.items():
        if key != 'raw_text' and key != 'items':
            print(f"{key:20s}: {value}")
    
    if fields.get('items'):
        print(f"\nLine Items ({len(fields['items'])} found):")
        for i, item in enumerate(fields['items'], 1):
            print(f"  {i}. {item}")
else:
    print("No image files found")
