"""Lightweight wrapper to ingest images and unsupported files gracefully."""
import os
from src.rag.knowledge_base import knowledge_base


SUPPORTED_EXTENSIONS = {".txt", ".pdf", ".docx", ".json", ".md", ".csv", ".html"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg"}
UNSUPPORTED_MESSAGE = "Unsupported file type. Supported: txt, pdf, docx, json, md, csv, html"


def ingest_with_feedback(file_path: str) -> tuple[int, str]:
    ext = os.path.splitext(file_path)[1].lower()
    if ext in IMAGE_EXTENSIONS:
        return 0, f"Cannot read '{os.path.basename(file_path)}' (image input not supported). Please upload a text-based document."
    if ext not in SUPPORTED_EXTENSIONS:
        return 0, UNSUPPORTED_MESSAGE + f" (got '{ext}')."
    count = knowledge_base.ingest_file(file_path)
    if count > 0:
        knowledge_base._save_index()
    else:
        return 0, f"No content extracted from '{os.path.basename(file_path)}'. Ensure the file contains readable text."
    return count, ""
