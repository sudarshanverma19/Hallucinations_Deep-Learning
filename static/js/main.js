// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const generationSection = document.getElementById('generationSection');
const originalImage = document.getElementById('originalImage');
const generatedImage = document.getElementById('generatedImage');
const loadingSpinner = document.getElementById('loadingSpinner');
const generateBtn = document.getElementById('generateBtn');
const downloadBtn = document.getElementById('downloadBtn');
const newImageBtn = document.getElementById('newImageBtn');
const modelSelect = document.getElementById('modelSelect');
const modelDescription = document.getElementById('modelDescription');

// Global variables
let currentFile = null;
let generatedImageBlob = null;

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    // File input change
    imageInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    uploadArea.addEventListener('click', () => imageInput.click());
    
    // Model selection change
    modelSelect.addEventListener('change', updateModelDescription);
    
    // Button clicks
    generateBtn.addEventListener('click', generateImage);
    downloadBtn.addEventListener('click', downloadImage);
    newImageBtn.addEventListener('click', resetInterface);
}

// File handling functions
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file && isValidImageFile(file)) {
        processSelectedFile(file);
    } else {
        showNotification('Please select a valid image file (JPG, PNG, GIF)', 'error');
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && isValidImageFile(files[0])) {
        processSelectedFile(files[0]);
    } else {
        showNotification('Please drop a valid image file', 'error');
    }
}

function isValidImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return allowedTypes.includes(file.type);
}

function processSelectedFile(file) {
    currentFile = file;
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = function(e) {
        originalImage.src = e.target.result;
        showGenerationSection();
    };
    reader.readAsDataURL(file);
}

// UI functions
function showGenerationSection() {
    generationSection.style.display = 'block';
    generationSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Reset generation state
    resetGenerationState();
}

function resetGenerationState() {
    generatedImage.style.display = 'none';
    loadingSpinner.style.display = 'none';
    downloadBtn.style.display = 'none';
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<i class="fas fa-play"></i> Generate Image';
}

function resetInterface() {
    currentFile = null;
    generatedImageBlob = null;
    imageInput.value = '';
    generationSection.style.display = 'none';
    uploadArea.classList.remove('drag-over');
    
    // Scroll back to upload section
    uploadArea.scrollIntoView({ behavior: 'smooth' });
}

// Model selection functions
function updateModelDescription() {
    const selectedModel = modelSelect.value;
    const descriptions = {
        'inception': 'Creates complex, abstract dream patterns with intricate details',
        'vgg16': 'Generates geometric, structured patterns with clear textures'
    };
    
    modelDescription.textContent = descriptions[selectedModel] || descriptions.inception;
}

// Image generation functions
async function generateImage() {
    if (!currentFile) {
        showNotification('Please select an image first', 'error');
        return;
    }
    
    try {
        // Update UI for loading state
        setLoadingState(true);
        
        // Prepare form data
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('model_type', modelSelect.value);
        
        // Make API call
        const response = await fetch('/generate/', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get the generated image blob
        generatedImageBlob = await response.blob();
        
        // Display the generated image
        const imageUrl = URL.createObjectURL(generatedImageBlob);
        generatedImage.src = imageUrl;
        generatedImage.style.display = 'block';
        generatedImage.classList.add('success-animation');
        
        // Show download button
        downloadBtn.style.display = 'inline-flex';
        
        showNotification('Image generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating image:', error);
        showNotification('Failed to generate image. Please try again.', 'error');
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(loading) {
    if (loading) {
        loadingSpinner.style.display = 'flex';
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    } else {
        loadingSpinner.style.display = 'none';
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-play"></i> Generate Image';
    }
}

// Download function
function downloadImage() {
    if (!generatedImageBlob) {
        showNotification('No generated image to download', 'error');
        return;
    }
    
    // Create download link
    const url = URL.createObjectURL(generatedImageBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Image downloaded successfully!', 'success');
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '10px',
        color: 'white',
        fontWeight: '500',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        zIndex: '1000',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        animation: 'slideIn 0.3s ease-out'
    });
    
    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };
    notification.style.background = colors[type] || colors.info;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    return icons[type] || icons.info;
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0;
        margin-left: auto;
        opacity: 0.8;
        transition: opacity 0.2s;
    }
    
    .notification-close:hover {
        opacity: 1;
    }
`;
document.head.appendChild(notificationStyles);

// Error handling for images
originalImage.addEventListener('error', function() {
    showNotification('Failed to load the selected image', 'error');
});

generatedImage.addEventListener('error', function() {
    showNotification('Failed to load the generated image', 'error');
});

// Prevent default drag behaviors on the page
document.addEventListener('dragover', function(e) {
    e.preventDefault();
});

document.addEventListener('drop', function(e) {
    e.preventDefault();
});