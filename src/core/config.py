import os
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AI Customer Support Coaching Assistant"
    version: str = "1.0.0"
    debug: bool = True

    data_dir: str = str(Path(__file__).resolve().parent.parent.parent / "data")
    knowledge_base_dir: str = ""
    transcripts_dir: str = ""
    reports_dir: str = ""

    embedding_model: str = "all-MiniLM-L6-v2"
    vector_store_path: str = ""
    chunk_size: int = 512
    chunk_overlap: int = 64

    openai_api_key: str = ""
    openai_model: str = "gpt-3.5-turbo"
    use_mock_llm: bool = True
    groq_api_key: str = ""

    max_turns_per_session: int = 50
    escalation_high_threshold: float = 0.7
    escalation_critical_threshold: float = 0.9

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.knowledge_base_dir:
            self.knowledge_base_dir = os.path.join(self.data_dir, "knowledge_base")
        if not self.transcripts_dir:
            self.transcripts_dir = os.path.join(self.data_dir, "transcripts")
        if not self.reports_dir:
            self.reports_dir = os.path.join(self.data_dir, "reports")
        if not self.vector_store_path:
            self.vector_store_path = os.path.join(self.data_dir, "vector_store")
        os.makedirs(self.knowledge_base_dir, exist_ok=True)
        os.makedirs(self.transcripts_dir, exist_ok=True)
        os.makedirs(self.reports_dir, exist_ok=True)
        os.makedirs(self.vector_store_path, exist_ok=True)


settings = Settings()
