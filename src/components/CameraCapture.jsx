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
 * @param {boolean} props.autoOpen - If true, automatically opens camera on mount
 */
export default function CameraCapture({ label, onCapture, existingPhotoUrl, autoOpen = false }) {
  const [stream, setStream] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);
  const [imageLoading, setImageLoading] = useState(!!existingPhotoUrl);
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const prevUrlRef = useRef(existingPhotoUrl);
  const savedPhotoRef = useRef(null); // Store photo before retake
  const hasAutoOpenedRef = useRef(false); // Track if we've auto-opened
  
  // Track URL changes to show loader for new images
  if (prevUrlRef.current !== existingPhotoUrl) {
    prevUrlRef.current = existingPhotoUrl;
    if (existingPhotoUrl) {
      setImageLoading(true);
    }
  }
  
  const [photoDataUrl, setPhotoDataUrl] = useState(existingPhotoUrl || null);

  // Update photoDataUrl when existingPhotoUrl changes
  useEffect(() => {
    setPhotoDataUrl(existingPhotoUrl || null);
    if (existingPhotoUrl) {
      setImageLoading(true);
    }
  }, [existingPhotoUrl]);

  // Auto-open camera if autoOpen is true and no existing photo
  useEffect(() => {
    if (autoOpen && !existingPhotoUrl && !photoDataUrl && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      startCamera();
    }
  }, [autoOpen, existingPhotoUrl, photoDataUrl]);

  const startCamera = async () => {
    setError(null);
    setCameraLoading(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setStream(mediaStream);
      setIsCapturing(true);
      setCameraLoading(false);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied or not available');
      setCameraLoading(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
    setCameraLoading(false);
    
    // Restore saved photo if user cancels
    if (savedPhotoRef.current) {
      setPhotoDataUrl(savedPhotoRef.current.dataUrl);
      onCapture(savedPhotoRef.current.blob, savedPhotoRef.current.dataUrl);
      savedPhotoRef.current = null;
    }
  }, [stream, onCapture]);

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
        setImageLoading(false); // Reset loading state for newly captured photo
        setPhotoDataUrl(dataUrl);
        savedPhotoRef.current = null; // Clear saved photo after successful capture
        stopCamera();
        onCapture(compressedBlob, dataUrl);
      };
      reader.readAsDataURL(compressedBlob);
    }, 'image/jpeg');
  };

  const retake = async () => {
    setImageLoading(false);
    // Save current photo in case user cancels
    savedPhotoRef.current = { 
      blob: null, // We don't have the blob for existing photos
      dataUrl: photoDataUrl 
    };
    setPhotoDataUrl(null);
    await startCamera();
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

      {!isCapturing && !photoDataUrl && !cameraLoading && (
        <button
          type="button"
          onClick={startCamera}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          📷 Capture {label}
        </button>
      )}

      {cameraLoading && !isCapturing && (
        <div className="w-full px-4 py-3 bg-blue-50 text-blue-600 rounded border border-blue-200 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Opening camera...</span>
        </div>
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
          {imageLoading && photoDataUrl.startsWith('http') ? (
            <div className="relative border-2 border-green-500 rounded overflow-hidden bg-gray-100 aspect-[4/3] flex items-center justify-center">
              <div className="animate-pulse text-gray-400 text-sm">Loading photo...</div>
            </div>
          ) : null}
          <div className="relative border-2 border-green-500 rounded overflow-hidden" style={{ display: imageLoading && photoDataUrl.startsWith('http') ? 'none' : 'block' }}>
            <img 
              src={photoDataUrl} 
              alt={label} 
              className="w-full"
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
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
