import os
import pickle
from pathlib import Path

import numpy as np

from src.core.config import settings


class EmbeddingService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _load_model(self):
        if self._model is not None:
            return
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(settings.embedding_model)
        except ImportError:
            self._model = None

    def embed(self, texts: list[str]) -> np.ndarray:
        self._load_model()
        if self._model:
            return self._model.encode(texts, show_progress_bar=False)
        return np.random.rand(len(texts), 384).astype(np.float32)

    def embed_single(self, text: str) -> np.ndarray:
        return self.embed([text])[0]


embedding_service = EmbeddingService()
