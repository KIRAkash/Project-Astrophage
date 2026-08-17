from ..local_storage import download_content
import zipfile
import io

def process_uploaded_file(gcs_path: str) -> str:
    try:
        content = download_content(gcs_path)
        return content
    except Exception as e:
        return f"Error processing uploaded file: {str(e)}"
        
# For PDF and ZIP, you would typically read bytes, but for simplicity here we assume text or simple extraction
# A robust implementation would use a library like PyPDF2 or python-magic
