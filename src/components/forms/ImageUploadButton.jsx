/**
 * ImageUploadButton Component
 * Provides a button to upload bet slip images with drag-and-drop support
 */

import React, { useRef, useState, useCallback } from 'react';
import { Camera, Upload } from 'lucide-react';
import { validateImageFile } from '../../utils/imageProcessing';

const ImageUploadButton = ({ onFileSelect, disabled = false, isMobile = false }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const processFile = useCallback((file) => {
    setError(null);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    onFileSelect(file);
  }, [onFileSelect]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/heic"
        capture={isMobile ? "environment" : undefined}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload button */}
      <button
        type="button"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 font-semibold rounded
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${isMobile ? 'min-h-[44px]' : ''}
          ${isDragging
            ? 'bg-blue-600 text-white border-2 border-dashed border-blue-300'
            : 'bg-blue-600 text-white hover:bg-blue-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isMobile ? (
          <Camera size={24} />
        ) : (
          <Upload size={20} />
        )}
        <span>Upload Bet Slip</span>
      </button>

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 mt-1 text-sm text-red-400 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageUploadButton;
