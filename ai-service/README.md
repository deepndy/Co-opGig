# Co-opGig AI Service (`ai-service/`)

FastAPI service behind the Co-opGig chat bubble: job classification + a structured
booking assistant. **No paid API key needed.**

Quick start (from inside this folder):

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python -m pytest                   # run the tests
uvicorn app.main:app --reload      # start the service on http://127.0.0.1:8000
```

Then open <http://127.0.0.1:8000/docs> to try the endpoints in your browser.

The full beginner-friendly guide is the **root `README.md`** (one folder up), and the
hand-over details for the other team members are in **`INTEGRATION_NOTES.md`**.
