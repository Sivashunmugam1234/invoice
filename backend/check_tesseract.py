"""
Quick diagnostic script to check if Tesseract OCR is installed and accessible.
Run this to verify your Tesseract installation.
"""
import os
import shutil
import sys

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

print("=" * 70)
print("TESSERACT OCR DIAGNOSTIC CHECK")
print("=" * 70)

# Check if tesseract is in PATH
tesseract_in_path = shutil.which("tesseract")
if tesseract_in_path:
    print(f"\n✓ Tesseract found in PATH: {tesseract_in_path}")
else:
    print("\n✗ Tesseract NOT found in PATH")

# Check common installation locations
print("\nChecking common installation locations:")
common_paths = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    r"C:\Tesseract-OCR\tesseract.exe",
]

found = False
for path in common_paths:
    exists = os.path.exists(path)
    status = "✓ FOUND" if exists else "✗ Not found"
    print(f"  {status}: {path}")
    if exists:
        found = True

# Try to import and use pytesseract
print("\nChecking pytesseract Python package:")
try:
    import pytesseract
    print("  ✓ pytesseract package is installed")
    
    # Try to get version
    if tesseract_in_path or found:
        try:
            if found and not tesseract_in_path:
                # Set the path to the first found location
                for path in common_paths:
                    if os.path.exists(path):
                        pytesseract.pytesseract.pytesseract_cmd = path
                        break
            
            version = pytesseract.get_tesseract_version()
            print(f"  ✓ Tesseract version: {version}")
        except Exception as e:
            print(f"  ✗ Could not get Tesseract version: {e}")
    else:
        print("  ⚠ Cannot test Tesseract - executable not found")
        
except ImportError:
    print("  ✗ pytesseract package is NOT installed")
    print("    Install with: pip install pytesseract")

# Final verdict
print("\n" + "=" * 70)
if tesseract_in_path or found:
    print("✓ TESSERACT IS INSTALLED - Image extraction should work!")
    print("\nIf you still have issues:")
    print("  1. Restart your backend server")
    print("  2. Check the backend logs for detailed error messages")
else:
    print("✗ TESSERACT IS NOT INSTALLED")
    print("\nTO FIX THIS:")
    print("  1. Download Tesseract installer from:")
    print("     https://github.com/UB-Mannheim/tesseract/wiki")
    print("  2. Run the installer (tesseract-ocr-w64-setup-x.x.x.exe)")
    print("  3. Install to default location: C:\\Program Files\\Tesseract-OCR")
    print("  4. Restart your backend server")
    print("  5. Run this script again to verify")

print("=" * 70)
