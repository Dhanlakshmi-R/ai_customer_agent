import json
import os
import pypdf
import docx

def extract_text_from_file(file_path: str) -> str:
    """Extract clean text content from PDF, DOCX, TXT, MD, or JSON files."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".json":
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            if "content" in data:
                # FAQ schema: {title, category, content, keywords}
                parts = []
                if data.get("title"):
                    parts.append(f"Title: {data['title']}")
                if data.get("category"):
                    parts.append(f"Category: {data['category']}")
                if data.get("content"):
                    parts.append(data["content"])
                if data.get("keywords"):
                    parts.append(f"Keywords: {', '.join(data['keywords'])}")
                return "\n\n".join(parts)
            return json.dumps(data)
        if isinstance(data, list):
            return "\n\n".join(
                item.get("content", item.get("text", json.dumps(item)))
                if isinstance(item, dict)
                else str(item)
                for item in data
            )
        return str(data)

    if ext == ".pdf":
        text = ""
        with open(file_path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text

    elif ext == ".docx":
        doc = docx.Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text])

    elif ext in [".txt", ".md", ".markdown"]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()

    else:
        raise ValueError(f"Unsupported file format: {ext}")
