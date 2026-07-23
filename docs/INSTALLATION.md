# Installation & Setup Guide

## Option 1: Local Development

### Prerequisites
- Python 3.11+
- Node.js v20+ & npm

### Backend Setup
1. Create and activate virtual environment:
   ```bash
   python -m venv .venv
   # Windows
   .venv\Scripts\activate
   # Linux/macOS
   source .venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Run FastAPI Backend:
   ```bash
   python -m uvicorn backend.main:app --reload --port 8000
   ```

### Frontend Setup
1. Install npm packages:
   ```bash
   cd frontend
   npm install
   ```
2. Run Vite Dev Server:
   ```bash
   npm run dev
   ```
3. Open browser at `http://localhost:5173`.

---

## Option 2: Docker Containerization

Run both services with Docker Compose:
```bash
docker-compose -f docker/docker-compose.yml up --build
```
- Frontend: `http://localhost:80`
- Backend API Docs: `http://localhost:8000/docs`
