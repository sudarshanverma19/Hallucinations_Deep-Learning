import tensorflow as tf
import logging

logger = logging.getLogger(__name__)

# DeepDream models will be loaded lazily
_dream_models = {}
_deepdream_instances = {}

# Model configurations
MODEL_CONFIGS = {
    'inception': {
        'name': 'InceptionV3',
        'model_class': tf.keras.applications.InceptionV3,
        'layers': ['mixed3', 'mixed5'],
        'description': 'Creates complex, abstract dream patterns with intricate details'
    },
    'vgg16': {
        'name': 'VGG16',
        'model_class': tf.keras.applications.VGG16,
        'layers': ['block3_conv3', 'block4_conv3'],
        'description': 'Generates geometric, structured patterns with clear textures'
    }
}

def get_dream_model(model_type='inception'):
    """Load specified DeepDream model lazily when first needed"""
    global _dream_models
    
    if model_type not in MODEL_CONFIGS:
        raise ValueError(f"Unknown model type: {model_type}")
    
    if model_type not in _dream_models:
        config = MODEL_CONFIGS[model_type]
        logger.info(f"Loading {config['name']} model for DeepDream...")
        try:
            # Load pre-trained model
            base_model = config['model_class'](include_top=False, weights='imagenet')
            
            # Get specified layers for dream effect
            layers = [base_model.get_layer(name).output for name in config['layers']]
            
            # Create the feature extraction model
            _dream_models[model_type] = tf.keras.Model(inputs=base_model.input, outputs=layers)
            logger.info(f"{config['name']} DeepDream model loaded successfully!")
        except Exception as e:
            logger.error(f"Failed to load {config['name']} DeepDream model: {e}")
            raise e
    
    return _dream_models[model_type]

class DeepDream(tf.Module):
    def __init__(self, model):
        self.model = model

    @tf.function(
        input_signature=(
            tf.TensorSpec(shape=[None,None,3], dtype=tf.float32),
            tf.TensorSpec(shape=[], dtype=tf.int32),
            tf.TensorSpec(shape=[], dtype=tf.float32),)
    )
    def __call__(self, img, steps, step_size):
        loss = tf.constant(0.0)
        for n in tf.range(steps):
            with tf.GradientTape() as tape:
                tape.watch(img)
                loss = self._calc_loss(img)

            gradients = tape.gradient(loss, img)
            gradients /= tf.math.reduce_std(gradients) + 1e-8
            img = img + gradients*step_size
            img = tf.clip_by_value(img, -1, 1)

        return loss, img
    
    def _calc_loss(self, img):
        """Calculate loss for DeepDream"""
        img_batch = tf.expand_dims(img, axis=0)
        layer_activations = self.model(img_batch)
        if len(layer_activations) == 1:
            layer_activations = [layer_activations]

        losses = []
        for act in layer_activations:
            loss = tf.math.reduce_mean(act)
            losses.append(loss)

        return tf.reduce_sum(losses)

def get_deepdream_instance(model_type='inception'):
    """Get DeepDream instance lazily"""
    global _deepdream_instances
    
    if model_type not in _deepdream_instances:
        dream_model = get_dream_model(model_type)
        _deepdream_instances[model_type] = DeepDream(dream_model)
        logger.info(f"DeepDream {MODEL_CONFIGS[model_type]['name']} instance created!")
    
    return _deepdream_instances[model_type]

# Helper functions
def deprocess(img):
    """Convert from [-1,1] to [0,255] uint8"""
    img = 255*(img + 1.0)/2.0
    return tf.cast(img, tf.uint8)
