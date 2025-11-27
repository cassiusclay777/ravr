import React, { useState, useRef } from 'react';
import { useMobileDetection } from './MobileOptimizations';

interface ScannedMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: string;
  genre?: string;
  coverArt?: string;
}

interface CameraScannerProps {
  onMetadataDetected: (metadata: ScannedMetadata) => void;
  onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onMetadataDetected,
  onClose,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { isAndroid, isMobile } = useMobileDetection();

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
        navigator.vibrate?.(50);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Nelze získat přístup ke kameře. Zkontrolujte oprávnění.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    stopCamera();
    navigator.vibrate?.(100);

    // Process the image
    processImage(imageData);
  };

  // Process image with OCR and metadata extraction
  const processImage = async (imageData: string) => {
    setIsProcessing(true);

    try {
      // Simulate OCR processing (in production, use Tesseract.js or Google Vision API)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock OCR result - in production, this would be actual OCR
      const mockText = extractMockTextFromImage(imageData);
      setExtractedText(mockText);

      // Extract metadata from text
      const metadata = extractMetadataFromText(mockText);
      
      if (metadata.title || metadata.artist || metadata.album) {
        onMetadataDetected({
          ...metadata,
          coverArt: imageData,
        });
        navigator.vibrate?.(200);
      }
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock OCR - in production, replace with real OCR
  const extractMockTextFromImage = (imageData: string): string => {
    // This is a placeholder - real implementation would use:
    // - Tesseract.js for client-side OCR
    // - Google Cloud Vision API
    // - Azure Computer Vision
    return `
      Artist Name
      Album Title
      Track 1 - Song Name
      Track 2 - Another Song
      © 2024
      Genre: Rock
    `;
  };

  // Extract metadata from OCR text
  const extractMetadataFromText = (text: string): ScannedMetadata => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    
    const metadata: ScannedMetadata = {};

    // Simple pattern matching (in production, use more sophisticated NLP)
    lines.forEach((line, index) => {
      // First line is often the artist
      if (index === 0 && line.length > 2 && line.length < 50) {
        metadata.artist = line;
      }
      
      // Second line is often the album
      if (index === 1 && line.length > 2 && line.length < 50) {
        metadata.album = line;
      }

      // Look for year pattern
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        metadata.year = yearMatch[0];
      }

      // Look for genre
      const genreMatch = line.match(/genre:?\s*(\w+)/i);
      if (genreMatch) {
        metadata.genre = genreMatch[1];
      }
    });

    return metadata;
  };

  // Retry scanning
  const retryScanning = () => {
    setCapturedImage(null);
    setExtractedText('');
    startCamera();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold text-xl">📷 Skenování CD/Vinyl</h2>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
          >
            <span className="text-2xl">✕</span>
          </button>
        </div>
      </div>

      {/* Camera View */}
      {isScanning && (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Scanning Frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-80 h-80 border-4 border-cyan-500 rounded-xl shadow-2xl shadow-cyan-500/50">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl" />
            </div>
          </div>

          {/* Instructions */}
          <div className="absolute bottom-32 left-0 right-0 px-6 text-center">
            <p className="text-white text-lg font-semibold bg-black/60 backdrop-blur-sm rounded-xl p-4">
              Namiřte kameru na CD obal nebo vinylovou desku
            </p>
          </div>

          {/* Capture Button */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <button
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 border-4 border-cyan-500"
            >
              <div className="w-16 h-16 bg-cyan-600 rounded-full" />
            </button>
          </div>
        </div>
      )}

      {/* Captured Image Review */}
      {capturedImage && (
        <div className="relative w-full h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center bg-black p-4">
            <img
              src={capturedImage}
              alt="Captured"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
          </div>

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-white text-xl font-semibold">Zpracovávám...</p>
                <p className="text-white/60 text-sm mt-2">Rozpoznávám text a metadata</p>
              </div>
            </div>
          )}

          {/* Extracted Text */}
          {extractedText && !isProcessing && (
            <div className="bg-gradient-to-t from-black via-black/90 to-transparent p-6">
              <div className="bg-white/10 rounded-xl p-4 border border-white/20 max-h-48 overflow-y-auto">
                <p className="text-white/80 text-sm font-mono whitespace-pre-wrap">
                  {extractedText}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-black/90 p-6 flex gap-3">
            <button
              onClick={retryScanning}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-4 rounded-xl transition-all active:scale-95 min-h-[56px]"
            >
              🔄 Znovu
            </button>
            <button
              onClick={() => {
                if (capturedImage) {
                  processImage(capturedImage);
                }
              }}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white font-semibold py-4 rounded-xl transition-all active:scale-95 disabled:opacity-50 min-h-[56px]"
            >
              ✅ Použít
            </button>
          </div>
        </div>
      )}

      {/* Initial State - Start Camera */}
      {!isScanning && !capturedImage && (
        <div className="flex items-center justify-center h-full p-6">
          <div className="text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-cyan-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <span className="text-6xl">📷</span>
            </div>
            <h3 className="text-white text-2xl font-bold mb-4">
              Skenování CD/Vinyl Obalu
            </h3>
            <p className="text-white/60 mb-8 max-w-md">
              Namiřte kameru na obal alba pro automatické rozpoznání názvu, 
              interpreta a dalších informací
            </p>
            <button
              onClick={startCamera}
              className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all active:scale-95 shadow-lg min-h-[56px]"
            >
              📸 Spustit kameru
            </button>
          </div>
        </div>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// Camera Scanner Button Component
export const CameraScannerButton: React.FC<{
  onMetadataDetected: (metadata: ScannedMetadata) => void;
}> = ({ onMetadataDetected }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAndroid, isMobile } = useMobileDetection();

  if (!isAndroid && !isMobile) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg min-h-[56px] flex items-center gap-2"
      >
        <span className="text-xl">📷</span>
        <span>Skenovat CD/Vinyl</span>
      </button>

      {isOpen && (
        <CameraScanner
          onMetadataDetected={(metadata) => {
            onMetadataDetected(metadata);
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
