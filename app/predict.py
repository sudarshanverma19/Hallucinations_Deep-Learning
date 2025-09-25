import numpy as np
import tensorflow as tf
from PIL import Image
from .model import get_deepdream_instance, deprocess, MODEL_CONFIGS
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_image(input_image, model_type='inception') -> np.ndarray:
    """
    Takes a PIL Image, applies DeepDream with specified model, and returns generated image as numpy array.
    """
    try:
        model_name = MODEL_CONFIGS.get(model_type, {}).get('name', model_type)
        logger.info(f"Using model: {model_name}")
        logger.info(f"Input image size: {input_image.size}")
        logger.info(f"Input image mode: {input_image.mode}")
        
        # Resize to reasonable size for DeepDream (not too small, not too large)
        max_dim = 512
        original_size = input_image.size
        if max(original_size) > max_dim:
            input_image.thumbnail((max_dim, max_dim))
            logger.info(f"Resized image to: {input_image.size}")
        
        # Convert PIL to numpy array
        img_array = np.array(input_image)
        logger.info(f"Image array shape: {img_array.shape}")
        
        # Preprocess for InceptionV3
        img = tf.keras.applications.inception_v3.preprocess_input(img_array.astype(np.float32))
        img = tf.convert_to_tensor(img)
        logger.info(f"Preprocessed image range: [{img.numpy().min():.3f}, {img.numpy().max():.3f}]")
        
        # Get DeepDream instance for specified model
        logger.info(f"Getting DeepDream instance for {model_name}...")
        deepdream = get_deepdream_instance(model_type)
        
        # Apply DeepDream
        logger.info("Applying DeepDream transformation...")
        steps = 50  # Reduced for faster processing
        step_size = 0.02
        
        loss, dream_img = deepdream(img, tf.constant(steps), tf.constant(step_size))
        logger.info(f"DeepDream completed with loss: {loss.numpy():.4f}")
        
        # Convert back to displayable format
        result = deprocess(dream_img)
        result_array = result.numpy()
        logger.info(f"Final output shape: {result_array.shape}")
        logger.info(f"Final output range: [{result_array.min()}, {result_array.max()}]")
        
        # Convert to 0-1 range for consistent handling
        result_normalized = result_array.astype(np.float32) / 255.0
        
        return result_normalized
        
    except Exception as e:
        logger.error(f"Error in generate_image: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise e
