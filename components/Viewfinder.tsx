'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, Upload, RefreshCw } from 'lucide-react';

interface ViewfinderProps {
  onCapture: (base64Image: string) => void;
  isAnalyzing: boolean;
}

export function Viewfinder({ onCapture, isAnalyzing }: ViewfinderProps) {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    let isSubscribed = true;

    if (mode === 'camera') {
      const getMedia = async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          if (isSubscribed) {
            setCameraError('Camera access is not supported on this device.');
          }
          return;
        }

        try {
          const constraints: MediaStreamConstraints = {
            video: {
              facingMode: facingMode,
              width: { ideal: 1080 },
              height: { ideal: 1440 },
            },
            audio: false,
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (!isSubscribed) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setCameraActive(true);
          setCameraError(null);
        } catch (err) {
          if (!isSubscribed) return;
          console.warn('Camera access unavailable:', err);
          setCameraError('Camera unavailable. You can upload an image instead.');
          setCameraActive(false);
        }
      };

      getMedia();
    }

    return () => {
      isSubscribed = false;
      stopStream();
    };
  }, [mode, facingMode, retryTrigger, stopStream]);

  // Flip between front and rear cameras
  const toggleFacingMode = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
  };


  // Capture frame from live video
  const handleCaptureFrame = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      // If video stream isn't ready yet
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If user facing, mirror image horizontally to match preview
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    stopStream();
    setCameraActive(false);
    onCapture(dataUrl);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setSelectedFilePreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmUpload = () => {
    if (selectedFilePreview) {
      onCapture(selectedFilePreview);
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setSelectedFilePreview(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center">
      {/* Mode Switcher Pill */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-neutral-950 border border-neutral-900 mb-6">
        <button
          id="mode-camera-btn"
          type="button"
          onClick={() => {
            setSelectedFilePreview(null);
            setMode('camera');
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all duration-200 ${
            mode === 'camera'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Live Scan</span>
        </button>

        <button
          id="mode-upload-btn"
          type="button"
          onClick={() => {
            setMode('upload');
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium tracking-wider uppercase transition-all duration-200 ${
            mode === 'upload'
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Viewfinder Canvas Area */}
      <div 
        id="viewfinder-container"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative w-full aspect-[4/5] rounded-3xl overflow-hidden bg-neutral-950 flex items-center justify-center transition-all duration-300 ${
          dragActive ? 'ring-1 ring-blue-500/60 bg-neutral-900/40' : ''
        }`}
      >
        {/* Subtle Corner Brackets (Titanium Silver) */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-neutral-600/80 pointer-events-none z-20" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-neutral-600/80 pointer-events-none z-20" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-neutral-600/80 pointer-events-none z-20" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-neutral-600/80 pointer-events-none z-20" />

        {/* Optical Axis Indicators */}
        <div className="absolute top-1/2 left-4 w-2 h-[1px] bg-neutral-800 pointer-events-none z-20" />
        <div className="absolute top-1/2 right-4 w-2 h-[1px] bg-neutral-800 pointer-events-none z-20" />
        <div className="absolute left-1/2 top-4 w-[1px] h-2 bg-neutral-800 pointer-events-none z-20" />
        <div className="absolute left-1/2 bottom-4 w-[1px] h-2 bg-neutral-800 pointer-events-none z-20" />

        {/* Camera Feed Mode */}
        {mode === 'camera' && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Subtle Face Guide Silhouette Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
              <div className="w-48 h-64 rounded-[50%] border border-neutral-700/30 opacity-70 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
              </div>
            </div>

            {/* Camera Switch Tool (Floating Minimal Button) */}
            {cameraActive && (
              <button
                id="camera-flip-btn"
                type="button"
                onClick={toggleFacingMode}
                title="Switch Camera"
                className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/60 backdrop-blur-md text-neutral-300 hover:text-white transition-colors active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 bg-neutral-950">
                <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 mb-3">
                  <Camera className="w-5 h-5" />
                </div>
                <p className="text-xs tracking-wider text-neutral-400 uppercase font-mono">
                  {cameraError || 'Initializing Optical Sensor...'}
                </p>
                <button
                  type="button"
                  onClick={() => setRetryTrigger((prev) => prev + 1)}
                  className="mt-4 text-xs font-medium text-white px-4 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors"
                >
                  Retry Camera
                </button>
              </div>
            )}
          </div>
        )}

        {/* Upload File Mode */}
        {mode === 'upload' && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors hover:bg-neutral-900/30"
          >
            {selectedFilePreview ? (
              <div className="relative w-full h-full">
                {/* Preview Image */}
                <div 
                  className="w-full h-full bg-contain bg-no-repeat bg-center rounded-2xl"
                  style={{ backgroundImage: `url(${selectedFilePreview})` }}
                />
                <button
                  id="change-selected-image-btn"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="absolute bottom-4 right-4 text-[10px] tracking-wider uppercase font-medium bg-black/80 backdrop-blur-sm text-neutral-300 px-3 py-1.5 rounded-full hover:text-white"
                >
                  Change Image
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-300 mb-4 transition-transform group-hover:scale-105">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs tracking-widest text-neutral-200 uppercase font-medium mb-1">
                  Select Portrait Image
                </span>
                <span className="text-[11px] tracking-wider text-neutral-500 uppercase font-mono">
                  Tap or Drop File Here
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Primary Action Button: 'Scan Face' or 'Upload Image' */}
      <div className="w-full mt-6">
        {mode === 'camera' ? (
          <button
            id="scan-face-btn"
            type="button"
            disabled={!cameraActive || isAnalyzing}
            onClick={handleCaptureFrame}
            className="w-full py-4 rounded-full bg-white text-black font-medium text-sm tracking-[0.1em] uppercase transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-none"
          >
            Scan Face
          </button>
        ) : (
          <button
            id="upload-image-btn"
            type="button"
            disabled={isAnalyzing}
            onClick={handleConfirmUpload}
            className="w-full py-4 rounded-full bg-white text-black font-medium text-sm tracking-[0.1em] uppercase transition-all duration-200 hover:bg-neutral-200 active:scale-[0.98] disabled:opacity-40 shadow-none"
          >
            {selectedFilePreview ? 'Analyze Image' : 'Upload Image'}
          </button>
        )}
      </div>

      {/* Subtle Hint */}
      <p className="text-[10px] tracking-widest text-neutral-400 uppercase font-mono mt-3 select-none text-center">
        Position face in direct lighting for high accuracy
      </p>
    </div>
  );
}
