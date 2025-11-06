'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * CameraCapture Component
 * Captures photos using device camera with compression
 * 
 * @param {Object} props
 * @param {string} props.label - Label for the capture button (e.g., "Person Photo")
 * @param {function} props.onCapture - Callback with (blob, dataUrl) when photo is captured
 * @param {string} props.existingPhotoUrl - Optional existing photo URL to display
 */
export default function CameraCapture({ label, onCapture, existingPhotoUrl }) {
  const [stream, setStream] = useState(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(existingPhotoUrl || null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Update photoDataUrl when existingPhotoUrl changes (when modal opens with different bed)
  useEffect(() => {
    setPhotoDataUrl(existingPhotoUrl || null);
  }, [existingPhotoUrl]);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setStream(mediaStream);
      setIsCapturing(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied or not available');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const compressImage = async (blob) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions (max 800px width/height)
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        
        if (width > height && width > maxDim) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else if (height > maxDim) {
          width = (width / height) * maxDim;
          height = maxDim;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress as JPEG with 0.8 quality
        canvas.toBlob((compressedBlob) => {
          URL.revokeObjectURL(url);
          resolve(compressedBlob);
        }, 'image/jpeg', 0.8);
      };
      
      img.src = url;
    });
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      // Compress the image
      const compressedBlob = await compressImage(blob);
      
      // Convert to data URL for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        setPhotoDataUrl(dataUrl);
        stopCamera();
        onCapture(compressedBlob, dataUrl);
      };
      reader.readAsDataURL(compressedBlob);
    }, 'image/jpeg');
  };

  const retake = () => {
    setPhotoDataUrl(null);
    onCapture(null, null);
    startCamera();
  };

  const deletePhoto = () => {
    setPhotoDataUrl(null);
    onCapture(null, null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {!isCapturing && !photoDataUrl && (
        <button
          type="button"
          onClick={startCamera}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          📷 Capture {label}
        </button>
      )}

      {isCapturing && (
        <div className="space-y-2">
          <div className="relative bg-black rounded overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              ✓ Take Photo
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {photoDataUrl && !isCapturing && (
        <div className="space-y-2">
          <div className="relative border-2 border-green-500 rounded overflow-hidden">
            <img src={photoDataUrl} alt={label} className="w-full" />
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
              ✓ Captured
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={retake}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              📷 Retake
            </button>
            <button
              type="button"
              onClick={deletePhoto}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              🗑 Delete
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
