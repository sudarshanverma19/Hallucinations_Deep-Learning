from fastapi import FastAPI, UploadFile, File, Request, Form
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import io
import os
import logging
from PIL import Image
import numpy as np
from .predict import generate_image

# Environment configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI app configuration
app_config = {
    "title": "DeepDream Image Generator",
    "version": "1.0.0",
    "description": "AI-powered image generation using DeepDream algorithm"
}

if ENVIRONMENT == "production":
    app_config["docs_url"] = None  # Disable docs in production
    app_config["redoc_url"] = None

app = FastAPI(**app_config)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
def health_check():
    """Health check endpoint for Docker and AWS load balancers"""
    return {
        "status": "healthy",
        "environment": ENVIRONMENT,
        "version": "1.0.0"
    }

@app.get("/api")
def api_info():
    return {
        "message": "Welcome to CIFAR-10 DeepDream Generator API",
        "environment": ENVIRONMENT,
        "available_models": ["inception", "vgg16", "custom"]
    }

@app.post("/generate/")
async def generate(file: UploadFile = File(...), model_type: str = Form('inception')):
    try:
        # Read input image from uploaded file
        input_image = Image.open(file.file).convert("RGB")

        # Generate new image using selected model
        generated_array = generate_image(input_image, model_type)

        # Convert NumPy array to PIL Image
        if generated_array.max() <= 1.0:
            # If values are normalized between 0-1, scale to 0-255
            output_image = Image.fromarray((generated_array * 255).astype(np.uint8))
        else:
            # If values are already 0-255
            output_image = Image.fromarray(generated_array.astype(np.uint8))

        # Return image as PNG response
        buf = io.BytesIO()
        output_image.save(buf, format="PNG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/png")
        
    except Exception as e:
        logger.error(f"Error in generate endpoint: {str(e)}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")
