import os
import datetime
from ..core.config import settings

LOCAL_STORAGE_DIR = os.path.join(os.getcwd(), "logdir", "archives")

def upload_content(kb_id: str, filename: str, content: str) -> str:
    local_dir = os.path.join(LOCAL_STORAGE_DIR, kb_id)
    os.makedirs(local_dir, exist_ok=True)
    local_file = os.path.join(local_dir, filename)
    with open(local_file, "w", encoding="utf-8") as f:
        f.write(content)
    return f"local://{local_file}"

def download_content(local_path: str) -> str:
    if not local_path.startswith("local://"):
        raise ValueError("Invalid local path")
    path = local_path[8:]
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def generate_presigned_upload_url(filename: str) -> str:
    # A true local solution would need a custom FastAPI POST endpoint instead of signed URLs.
    # For now, return a placeholder.
    return "/api/upload/local"

def list_kb_files(kb_id: str) -> list[str]:
    local_dir = os.path.join(LOCAL_STORAGE_DIR, kb_id)
    if not os.path.exists(local_dir):
        return []
    files = []
    for f in os.listdir(local_dir):
        files.append(f"local://{os.path.join(local_dir, f)}")
    return files
