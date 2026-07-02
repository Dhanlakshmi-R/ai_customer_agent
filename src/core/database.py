import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path

from src.core.config import settings
from src.core.models import (
    PerformanceReport,
    ResolutionQuality,
    SessionConfig,
    SessionState,
)


class Database:
    def __init__(self):
        self.db_path = os.path.join(settings.data_dir, "coach.db")
        self._init_db()

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                config TEXT,
                messages TEXT,
                created_at TEXT,
                is_active INTEGER
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                session_id TEXT PRIMARY KEY,
                agent_name TEXT,
                mode TEXT,
                total_turns INTEGER,
                overall_score REAL,
                resolution_score REAL,
                report_data TEXT,
                generated_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_file TEXT,
                chunk_text TEXT,
                metadata TEXT,
                created_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS agent_calibration (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_name TEXT,
                calibration_data TEXT,
                updated_at TEXT
            )
        """)
        conn.commit()
        conn.close()

    def save_session(self, session: SessionState):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT OR REPLACE INTO sessions VALUES (?, ?, ?, ?, ?)",
            (
                session.session_id,
                json.dumps({
                    "mode": session.config.mode.value,
                    "product_context": session.config.product_context,
                    "agent_name": session.config.agent_name,
                }),
                json.dumps([m.model_dump() for m in session.messages], default=str),
                session.created_at.isoformat(),
                1 if session.is_active else 0,
            ),
        )
        conn.commit()
        conn.close()

    def get_all_sessions(self) -> list[dict]:
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute(
            "SELECT session_id, config, created_at, is_active FROM sessions ORDER BY created_at DESC"
        ).fetchall()
        conn.close()
        return [
            {
                "id": r[0],
                "config": json.loads(r[1]),
                "created_at": r[2],
                "is_active": bool(r[3]),
            }
            for r in rows
        ]

    def delete_all_sessions(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("DELETE FROM sessions")
        conn.execute("DELETE FROM reports")
        conn.commit()
        conn.close()

    def save_report(self, report: PerformanceReport):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT OR REPLACE INTO reports VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                report.session_id,
                report.agent_name,
                report.interaction_mode.value,
                report.total_turns,
                report.overall_score,
                report.resolution_quality.score if report.resolution_quality else 0.0,
                json.dumps(report.model_dump(), default=str),
                report.generated_at.isoformat(),
            ),
        )
        conn.commit()
        conn.close()

    def get_all_reports(self) -> list[PerformanceReport]:
        conn = sqlite3.connect(self.db_path)
        rows = conn.execute(
            "SELECT report_data FROM reports ORDER BY generated_at DESC"
        ).fetchall()
        conn.close()
        reports = []
        for (data,) in rows:
            try:
                d = json.loads(data)
                d["resolution_quality"] = (
                    ResolutionQuality(**d["resolution_quality"])
                    if d.get("resolution_quality")
                    else None
                )
                reports.append(PerformanceReport(**d))
            except Exception:
                pass
        return reports

    def save_chunk(self, source_file: str, chunk_text: str, metadata: dict):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT INTO knowledge_chunks (source_file, chunk_text, metadata, created_at) VALUES (?, ?, ?, ?)",
            (source_file, chunk_text, json.dumps(metadata), datetime.now().isoformat()),
        )
        conn.commit()
        conn.close()

    def save_calibration(self, agent_name: str, data: dict):
        conn = sqlite3.connect(self.db_path)
        conn.execute(
            "INSERT OR REPLACE INTO agent_calibration (id, agent_name, calibration_data, updated_at) "
            "VALUES ((SELECT id FROM agent_calibration WHERE agent_name = ?), ?, ?, ?)",
            (agent_name, agent_name, json.dumps(data), datetime.now().isoformat()),
        )
        conn.commit()
        conn.close()


database = Database()
