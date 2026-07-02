#!/usr/bin/env python3
import subprocess
import sys

if __name__ == "__main__":
    print("=" * 60)
    print("  AI Customer Support Coaching Assistant")
    print("=" * 60)
    print("\nStarting the Streamlit UI...\n")

    subprocess.run([
        sys.executable, "-m", "streamlit", "run",
        "src/ui/app.py",
        "--server.port", "8501",
        "--server.headless", "true",
    ])
