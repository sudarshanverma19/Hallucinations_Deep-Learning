# CIFAR-10 Image Classifier API

This is a FastAPI project that serves a trained CNN model for CIFAR-10 classification.

## Run Locally
```bash
uvicorn app.main:app --reload
```

### Example Request

POST /predict/ with an image file.

---

# 🔹 Running Locally
From project root:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```
