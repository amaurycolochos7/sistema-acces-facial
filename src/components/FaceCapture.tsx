'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, CheckCircle, XCircle, RotateCcw, Loader2 } from 'lucide-react';

interface FaceCaptureProps {
  onDescriptorsReady: (descriptors: number[][]) => void;
  requiredCaptures?: number;
}

export default function FaceCapture({ onDescriptorsReady, requiredCaptures = 3 }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const humanRef = useRef<import('@vladmandic/human').default | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);

  const [status, setStatus] = useState<'loading' | 'ready' | 'capturing' | 'done' | 'error'>('loading');
  const [captures, setCaptures] = useState<number[][]>([]);
  const [message, setMessage] = useState('Cargando modelos de reconocimiento facial...');
  const [liveness, setLiveness] = useState<number>(0);
  const [antispoof, setAntispoof] = useState<number>(0);
  const [faceDetected, setFaceDetected] = useState(false);

  // Initialize Human.js
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const H = (await import('@vladmandic/human')).default;
        const { humanConfig } = await import('@/lib/human-config');
        const human = new H(humanConfig as ConstructorParameters<typeof H>[0]);
        await human.load();
        await human.warmup();
        if (mounted) {
          humanRef.current = human;
          setStatus('ready');
          setMessage('Modelo cargado. Inicia la cámara para capturar.');
        }
      } catch (err) {
        console.error('Error loading Human.js:', err);
        if (mounted) {
          setStatus('error');
          setMessage('Error cargando modelos. Verifica la conexión.');
        }
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('capturing');
        setMessage(`Mira a la cámara. Capturas: 0/${requiredCaptures}`);
        detectLoop();
      }
    } catch {
      setStatus('error');
      setMessage('No se pudo acceder a la cámara.');
    }
  }, [requiredCaptures]);

  // Detection loop
  const detectLoop = useCallback(async () => {
    const human = humanRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!human || !video || !canvas || video.paused) return;

    const result = await human.detect(video);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (result.face && result.face.length > 0) {
      const face = result.face[0];
      setFaceDetected(true);

      // Draw bounding box
      if (face.box) {
        const [x, y, w, h] = face.box;
        ctx.strokeStyle = '#22C55E';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
      }

      // Update liveness and antispoof scores
      const live = face.real ?? 0;
      const spoof = face.live ?? 0;
      setLiveness(spoof);
      setAntispoof(live);

      // Draw face mesh points
      if (face.mesh && face.mesh.length > 0) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
        for (const point of face.mesh) {
          ctx.beginPath();
          ctx.arc(point[0], point[1], 1.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    } else {
      setFaceDetected(false);
    }

    animationRef.current = requestAnimationFrame(() => detectLoop());
  }, []);

  // Capture descriptor
  const captureDescriptor = useCallback(async () => {
    const human = humanRef.current;
    const video = videoRef.current;
    if (!human || !video) return;

    const result = await human.detect(video);
    if (!result.face || result.face.length === 0) {
      setMessage('No se detectó rostro. Intenta de nuevo.');
      return;
    }

    const face = result.face[0];
    if (!face.embedding || face.embedding.length === 0) {
      setMessage('No se pudo extraer descriptor. Intenta de nuevo.');
      return;
    }

    const descriptor = Array.from(face.embedding);
    const newCaptures = [...captures, descriptor];
    setCaptures(newCaptures);

    if (newCaptures.length >= requiredCaptures) {
      setStatus('done');
      setMessage(`✅ ${requiredCaptures} capturas completadas.`);
      stopCamera();
      onDescriptorsReady(newCaptures);
    } else {
      setMessage(`Captura ${newCaptures.length}/${requiredCaptures}. Mueve ligeramente la cabeza y captura otra.`);
    }
  }, [captures, requiredCaptures, onDescriptorsReady]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Reset
  const reset = useCallback(() => {
    setCaptures([]);
    stopCamera();
    setStatus('ready');
    setMessage('Modelo cargado. Inicia la cámara para capturar.');
  }, [stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-4">
      {/* Camera area */}
      <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-[4/3] max-w-md mx-auto">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* Overlay when no camera */}
        {status !== 'capturing' && status !== 'done' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            {status === 'loading' ? (
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            ) : (
              <Camera className="w-12 h-12 text-gray-600" />
            )}
          </div>
        )}

        {/* Indicators */}
        {status === 'capturing' && (
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              faceDetected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {faceDetected ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {faceDetected ? 'Rostro detectado' : 'Sin rostro'}
            </div>
            <div className="flex gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                liveness > 0.5 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                Live: {(liveness * 100).toFixed(0)}%
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                antispoof > 0.5 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                Real: {(antispoof * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="max-w-md mx-auto">
        <div className="flex gap-2 mb-2">
          {Array.from({ length: requiredCaptures }).map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full ${
              i < captures.length ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          ))}
        </div>
        <p className="text-sm text-gray-600 text-center">{message}</p>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3 max-w-md mx-auto">
        {status === 'ready' && (
          <button onClick={startCamera}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold"
            style={{ backgroundColor: 'var(--navy)' }}>
            <Camera className="w-4 h-4" /> Iniciar Cámara
          </button>
        )}
        {status === 'capturing' && (
          <button onClick={captureDescriptor} disabled={!faceDetected}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-white text-sm font-bold disabled:opacity-40 transition-all"
            style={{ backgroundColor: 'var(--green)' }}>
            <Camera className="w-4 h-4" /> Capturar ({captures.length}/{requiredCaptures})
          </button>
        )}
        {(status === 'capturing' || status === 'done') && (
          <button onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
            <RotateCcw className="w-4 h-4" /> Reiniciar
          </button>
        )}
      </div>
    </div>
  );
}
