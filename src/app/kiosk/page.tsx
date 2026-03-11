'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera, Wifi, WifiOff, LogIn, LogOut, CheckCircle, XCircle,
  AlertTriangle, User, Clock, X, Loader2, ShieldCheck, ShieldAlert,
} from 'lucide-react';

interface MatchedUser {
  id: string;
  controlNumber: string;
  fullName: string;
  role: string;
  career: string | null;
  careerCode: string | null;
}

interface ExitReason {
  id: string;
  name: string;
  icon: string;
  category: string;
}

type KioskState =
  | 'initializing'
  | 'scanning'
  | 'matched'
  | 'confirming_entry'
  | 'confirming_exit'
  | 'select_exit_reason'
  | 'registering'
  | 'success'
  | 'error'
  | 'no_match';

export default function KioskPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const humanRef = useRef<import('@vladmandic/human').default | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const scanningRef = useRef(true);
  const cooldownRef = useRef(false);

  const [state, setState] = useState<KioskState>('initializing');
  const [matchedUser, setMatchedUser] = useState<MatchedUser | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [liveness, setLiveness] = useState(0);
  const [antispoof, setAntispoof] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [exitReasons, setExitReasons] = useState<ExitReason[]>([]);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [exitNote, setExitNote] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState<'entry' | 'exit' | 'late' | 'error'>('entry');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline] = useState(true);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load exit reasons
  useEffect(() => {
    fetch('/api/exit-reasons').then(r => r.json()).then(setExitReasons).catch(() => {});
  }, []);

  // Initialize Human.js + Camera
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const H = (await import('@vladmandic/human')).default;
        const { humanConfig } = await import('@/lib/human-config');
        const human = new H(humanConfig as ConstructorParameters<typeof H>[0]);
        await human.load();
        await human.warmup();
        if (!mounted) return;
        humanRef.current = human;

        // Start camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setState('scanning');
        }
      } catch (err) {
        console.error(err);
        if (mounted) setState('error');
      }
    };
    init();
    return () => { mounted = false; };
  }, []);

  // Detection + auto-match loop
  const detectAndMatch = useCallback(async () => {
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

      const live = face.live ?? 0;
      const real = face.real ?? 0;
      setLiveness(live);
      setAntispoof(real);

      // Draw box
      if (face.box) {
        const [x, y, w, h] = face.box;
        const isGoodFace = live > 0.3 && real > 0.3;
        ctx.strokeStyle = isGoodFace ? '#22C55E' : '#EAB308';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
      }

      // Draw mesh
      if (face.mesh) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
        for (const point of face.mesh) {
          ctx.beginPath();
          ctx.arc(point[0], point[1], 1, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Auto-match when scanning
      if (scanningRef.current && !cooldownRef.current && face.embedding && face.embedding.length > 0) {
        if (live > 0.3 && real > 0.3) {
          cooldownRef.current = true;
          scanningRef.current = false;

          try {
            const res = await fetch('/api/face-verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                descriptor: Array.from(face.embedding),
                liveness: live,
                antispoof: real,
              }),
            });
            const data = await res.json();

            if (data.match && data.user) {
              setMatchedUser(data.user);
              setConfidence(data.confidence);
              setState('matched');
            } else {
              setState('no_match');
              setTimeout(() => {
                setState('scanning');
                scanningRef.current = true;
                cooldownRef.current = false;
              }, 3000);
            }
          } catch {
            cooldownRef.current = false;
            scanningRef.current = true;
          }
        }
      }
    } else {
      setFaceDetected(false);
    }

    animationRef.current = requestAnimationFrame(detectAndMatch);
  }, []);

  // Start detect loop when scanning
  useEffect(() => {
    if (state === 'scanning') {
      scanningRef.current = true;
      animationRef.current = requestAnimationFrame(detectAndMatch);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state, detectAndMatch]);

  // Register entry
  const registerEntry = async () => {
    if (!matchedUser) return;
    setState('registering');
    try {
      const res = await fetch('/api/access-logs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: matchedUser.id, type: 'ENTRY', confidence }),
      });
      const data = await res.json();
      if (data.success) {
        const isPunctual = data.log?.punctuality;
        setResultMessage(data.message);
        setResultType(isPunctual === 'LATE' ? 'late' : 'entry');
        setState('success');
      } else {
        setResultMessage(data.error || 'Error al registrar');
        setResultType('error');
        setState('success');
      }
    } catch {
      setResultMessage('Error de conexión');
      setResultType('error');
      setState('success');
    }
  };

  // Register exit
  const registerExit = async () => {
    if (!matchedUser) return;
    setState('registering');
    try {
      const res = await fetch('/api/access-logs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: matchedUser.id,
          type: 'EXIT',
          confidence,
          exitReasonId: selectedReason || undefined,
          exitNote: exitNote || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResultMessage(data.message);
        setResultType('exit');
        setState('success');
      } else {
        setResultMessage(data.error || 'Error al registrar');
        setResultType('error');
        setState('success');
      }
    } catch {
      setResultMessage('Error de conexión');
      setResultType('error');
      setState('success');
    }
  };

  // Go to exit reason selection
  const showExitReasonModal = () => {
    setSelectedReason('');
    setExitNote('');
    setState('select_exit_reason');
  };

  // Reset to scanning
  const resetToScanning = useCallback(() => {
    setMatchedUser(null);
    setConfidence(0);
    setSelectedReason('');
    setExitNote('');
    setResultMessage('');
    cooldownRef.current = false;
    scanningRef.current = true;
    setState('scanning');
  }, []);

  // Auto-reset after success/error
  useEffect(() => {
    if (state === 'success' || state === 'no_match') {
      const timer = setTimeout(resetToScanning, 5000);
      return () => clearTimeout(timer);
    }
  }, [state, resetToScanning]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const timeString = currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase();
  const dateString = currentTime.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#1B2A4A' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-sm">TecNM VC — Control de Acceso</span>
            <p className="text-white/50 text-xs capitalize">{dateString}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-white text-2xl font-bold tabular-nums">{timeString}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            isOnline ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-6">
        {/* Camera Feed */}
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1 bg-black rounded-2xl overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline muted
              style={{ transform: 'scaleX(-1)' }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Loading overlay */}
            {state === 'initializing' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                <p className="text-white/70 text-sm">Cargando modelos de reconocimiento facial...</p>
              </div>
            )}

            {/* Top indicators bar */}
            {state === 'scanning' && (
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                  faceDetected ? 'bg-green-500/30 text-green-300' : 'bg-white/10 text-white/50'
                }`}>
                  {faceDetected ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {faceDetected ? 'Rostro detectado' : 'Esperando rostro...'}
                </div>
                <div className="flex gap-2">
                  <span className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                    liveness > 0.5 ? 'bg-green-500/30 text-green-300' : 'bg-white/10 text-white/40'
                  }`}>
                    <ShieldCheck className="w-3 h-3" /> {(liveness * 100).toFixed(0)}%
                  </span>
                  <span className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                    antispoof > 0.5 ? 'bg-green-500/30 text-green-300' : 'bg-white/10 text-white/40'
                  }`}>
                    <ShieldAlert className="w-3 h-3" /> {(antispoof * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Scanning pulse */}
            {state === 'scanning' && faceDetected && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/30 rounded-full backdrop-blur-sm">
                  <Loader2 className="w-4 h-4 text-blue-300 animate-spin" />
                  <span className="text-blue-200 text-sm font-medium">Identificando...</span>
                </div>
              </div>
            )}

            {/* No match overlay */}
            {state === 'no_match' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="text-center">
                  <XCircle className="w-16 h-16 text-red-400 mx-auto mb-3" />
                  <p className="text-white text-xl font-bold">No identificado</p>
                  <p className="text-white/60 text-sm mt-1">Regístra tu rostro con un administrador</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side Panel */}
        <div className="w-96 flex flex-col gap-4">
          {/* Identity Card */}
          {(state === 'matched' || state === 'confirming_entry' || state === 'confirming_exit' || state === 'select_exit_reason' || state === 'registering') && matchedUser && (
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <User className="w-7 h-7 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-bold text-lg">{matchedUser.fullName}</h2>
                  <p className="text-white/60 text-sm">{matchedUser.controlNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-white/40 text-xs">Rol</p>
                  <p className="text-white text-sm font-medium">
                    {matchedUser.role === 'STUDENT' ? '🎓 Alumno' : '👨‍🏫 Maestro'}
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2">
                  <p className="text-white/40 text-xs">Carrera</p>
                  <p className="text-white text-sm font-medium">{matchedUser.careerCode || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${confidence * 100}%` }} />
                </div>
                <span className="text-green-400 text-xs font-bold">{(confidence * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* Action Buttons — Matched state */}
          {state === 'matched' && (
            <div className="flex flex-col gap-3">
              <button onClick={registerEntry}
                className="w-full py-5 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.97]"
                style={{ backgroundColor: '#22C55E' }}>
                <LogIn className="w-6 h-6" /> Registrar Entrada
              </button>
              <button onClick={showExitReasonModal}
                className="w-full py-5 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-3 transition-transform hover:scale-[1.02] active:scale-[0.97]"
                style={{ backgroundColor: '#EF4444' }}>
                <LogOut className="w-6 h-6" /> Registrar Salida
              </button>
              <button onClick={resetToScanning}
                className="w-full py-3 rounded-xl text-white/60 font-medium text-sm hover:text-white/80 transition-colors">
                Cancelar
              </button>
            </div>
          )}

          {/* Exit Reason Selection */}
          {state === 'select_exit_reason' && (
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
              <h3 className="text-white font-bold text-lg mb-4">Motivo de Salida</h3>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {exitReasons.filter(r => r.category !== 'DEFINITIVE' || true).map((reason) => (
                  <button key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                      selectedReason === reason.id
                        ? 'bg-blue-500/30 border border-blue-400/50'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}>
                    <span className="text-lg">{reason.icon}</span>
                    <span className="text-white text-sm font-medium">{reason.name}</span>
                  </button>
                ))}
              </div>
              <textarea
                value={exitNote}
                onChange={(e) => setExitNote(e.target.value)}
                placeholder="Nota adicional (opcional)..."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-blue-500/50 mb-4 resize-none"
                rows={2}
              />
              <div className="flex gap-3">
                <button onClick={() => setState('matched')}
                  className="flex-1 py-3 rounded-lg border border-white/20 text-white/60 font-medium text-sm hover:bg-white/5">
                  Atrás
                </button>
                <button onClick={registerExit}
                  className="flex-1 py-3 rounded-lg text-white font-bold text-sm"
                  style={{ backgroundColor: '#EF4444' }}>
                  Confirmar Salida
                </button>
              </div>
            </div>
          )}

          {/* Registering */}
          {state === 'registering' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
                <p className="text-white/70 text-sm">Registrando...</p>
              </div>
            </div>
          )}

          {/* Success / Error Result */}
          {state === 'success' && (
            <div className={`rounded-2xl p-8 text-center ${
              resultType === 'entry' ? 'bg-green-500/20 border border-green-500/30' :
              resultType === 'exit' ? 'bg-red-500/20 border border-red-500/30' :
              resultType === 'late' ? 'bg-amber-500/20 border border-amber-500/30' :
              'bg-red-500/20 border border-red-500/30'
            }`}>
              {resultType === 'error' ? (
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-3" />
              ) : resultType === 'late' ? (
                <Clock className="w-16 h-16 text-amber-400 mx-auto mb-3" />
              ) : (
                <CheckCircle className="w-16 h-16 mx-auto mb-3" style={{
                  color: resultType === 'entry' ? '#22C55E' : '#EF4444'
                }} />
              )}
              <p className="text-white text-xl font-bold mb-1">{resultMessage}</p>
              <p className="text-white/50 text-sm">
                {resultType === 'late' ? 'RETARDO REGISTRADO' :
                 resultType === 'entry' ? 'ENTRADA REGISTRADA' :
                 resultType === 'exit' ? 'SALIDA REGISTRADA' : 'ERROR'}
              </p>
              <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white/30 rounded-full animate-shrink" />
              </div>
            </div>
          )}

          {/* Scanning idle */}
          {state === 'scanning' && !faceDetected && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-16 h-16 text-white/15 mx-auto mb-4" />
                <p className="text-white/40 text-lg font-medium">Acércate a la cámara</p>
                <p className="text-white/25 text-sm mt-1">El sistema te identificará automáticamente</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {state === 'error' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-white text-lg font-bold">Error</p>
                <p className="text-white/50 text-sm mt-1">No se pudo acceder a la cámara o cargar modelos</p>
                <button onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20">
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
