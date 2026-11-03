# File Manifest

| Path | Purpose |
|---|---|
| `remote-sensing-service/app/main.py` | FastAPI application, endpoints, envelopes, logging |
| `remote-sensing-service/app/config.py` | Environment-based limits and storage configuration |
| `remote-sensing-service/app/schemas.py` | Request/response request schema |
| `remote-sensing-service/app/storage.py` | Safe UUID result/overlay persistence and retention |
| `remote-sensing-service/app/processing/images.py` | Image validation, differencing, connected regions, overlay |
| `remote-sensing-service/app/demand/rules.py` | Explainable experimental demand heuristics and canonical categories |
| `remote-sensing-service/tests/` | CPU-only synthetic API and demand tests |
| `remote-sensing-service/scripts/evaluate.py` | IoU, precision, recall, F1 evaluation for labelled masks |
| `remote-sensing-service/data/README.md` | Synthetic sample-data and dataset guidance |
| `remote-sensing-service/requirements.txt` | Pinned Python dependencies |
| `remote-sensing-service/Dockerfile` | Container build |
| `remote-sensing-service/.env.example` | Safe configuration template |
| `remote-sensing-service/.gitignore` | Excludes secrets, caches, runtime data |
| `remote-sensing-service/README.md` | Service setup, API, tests, limitations |
| `README.md` | ZIP overview and quick start |
| `FILE_MANIFEST.md` | This file |
| `INTEGRATION_NOTES.md` | Shared backend integration contract and assumptions |
