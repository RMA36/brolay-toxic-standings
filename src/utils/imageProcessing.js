/**
 * Image Processing Utilities for Bet Slip OCR
 * Handles image preprocessing to improve OCR accuracy
 */

/**
 * Compress and resize image for OCR processing
 * @param {File} file - Image file to process
 * @param {Object} options - Processing options
 * @returns {Promise<string>} - Base64 encoded processed image
 */
export const processImageForOCR = async (file, options = {}) => {
  const {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 0.9,
    enhanceContrast = true
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // Create canvas for processing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Apply contrast enhancement if enabled
        if (enhanceContrast) {
          const imageData = ctx.getImageData(0, 0, width, height);
          const enhanced = enhanceImageContrast(imageData);
          ctx.putImageData(enhanced, 0, 0);
        }

        // Convert to base64
        const base64 = canvas.toDataURL('image/png', quality);
        resolve(base64);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Enhance image contrast for better OCR results
 * Increases contrast and applies slight sharpening
 * @param {ImageData} imageData - Canvas image data
 * @returns {ImageData} - Enhanced image data
 */
const enhanceImageContrast = (imageData) => {
  const data = imageData.data;
  const factor = 1.3; // Contrast factor (1.0 = no change, >1.0 = more contrast)

  for (let i = 0; i < data.length; i += 4) {
    // Get RGB values
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Convert to grayscale for better OCR
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Apply contrast adjustment
    let adjusted = ((gray - 128) * factor) + 128;

    // Clamp values
    adjusted = Math.max(0, Math.min(255, adjusted));

    // Set all channels to grayscale value
    data[i] = adjusted;
    data[i + 1] = adjusted;
    data[i + 2] = adjusted;
  }

  return imageData;
};

/**
 * Convert image to grayscale for better OCR
 * @param {ImageData} imageData - Canvas image data
 * @returns {ImageData} - Grayscale image data
 */
export const convertToGrayscale = (imageData) => {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  return imageData;
};

/**
 * Apply threshold to make text more distinct
 * @param {ImageData} imageData - Canvas image data
 * @param {number} threshold - Threshold value (0-255)
 * @returns {ImageData} - Thresholded image data
 */
export const applyThreshold = (imageData, threshold = 128) => {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const value = gray > threshold ? 255 : 0;
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  return imageData;
};

/**
 * Validate image file before processing
 * @param {File} file - File to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
export const validateImageFile = (file) => {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!validTypes.includes(file.type.toLowerCase())) {
    return { valid: false, error: 'Please upload a PNG, JPG, or HEIC image' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Image exceeds 10MB. Please use a smaller image.' };
  }

  return { valid: true };
};

/**
 * Create image preview URL from file
 * @param {File} file - Image file
 * @returns {string} - Object URL for preview
 */
export const createImagePreview = (file) => {
  return URL.createObjectURL(file);
};

/**
 * Revoke image preview URL to free memory
 * @param {string} url - Object URL to revoke
 */
export const revokeImagePreview = (url) => {
  if (url) {
    URL.revokeObjectURL(url);
  }
};
