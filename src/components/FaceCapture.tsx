'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { CheckCircle, RotateCcw, Loader2 } from 'lucide-react';

type CaptureStep = 'front' | 'left' | 'right' | 'up' | 'down';

interface StepConfig {
  label: string;
  instruction: string;
  shortInstruction: string;
  checkAngle: (yaw: number, pitch: number) => boolean;
  arcStart: number; // degrees for the circular segment
  arcEnd: number;
}

const STEPS: Record<CaptureStep, StepConfig> = {
  front: {
    label: 'Frente',
    instruction: 'Mira directamente a la camara',
    shortInstruction: 'Mira al frente',
    checkAngle: (yaw: number, pitch: number) => Math.abs(yaw) < 15 && Math.abs(pitch) < 15,
    arcStart: -18,
    arcEnd: 18,
  },
  right: {
    label: 'Derecha',
    instruction: 'Gira lentamente tu cabeza a la derecha',
    shortInstruction: 'Gira a la derecha',
    checkAngle: (yaw: number) => yaw > 15,
    arcStart: 18,
    arcEnd: 90,
  },
  down: {
    label: 'Abajo',
    instruction: 'Inclina lentamente tu cabeza hacia abajo',
    shortInstruction: 'Mira hacia abajo',
    checkAngle: (_yaw: number, pitch: number) => pitch > 10,
    arcStart: 90,
    arcEnd: 162,
  },
  left: {
    label: 'Izquierda',
    instruction: 'Gira lentamente tu cabeza a la izquierda',
    shortInstruction: 'Gira a la izquierda',
    checkAngle: (yaw: number) => yaw < -15,
    arcStart: 162,
    arcEnd: 234,
  },
  up: {
    label: 'Arriba',
    instruction: 'Inclina lentamente tu cabeza hacia arriba',
    shortInstruction: 'Mira hacia arriba',
    checkAngle: (_yaw: number, pitch: number) => pitch < -10,
    arcStart: 234,
    arcEnd: 342,
  },
};

const STEP_ORDER: CaptureStep[] = ['front', 'right', 'down', 'left', 'up'];
const HOLD_DURATION = 1200;

// Lightweight config for enrollment — only loads detector, mesh, and description
// Skips iris, antispoof, liveness, gesture to reduce load time from ~60s to ~15s
const ENROLL_CONFIG = {
  modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
  backend: 'webgl' as const,
  async: true,
  warmup: 'face' as const,
  cacheSensitivity: 0.75,
  filter: { enabled: true, equalization: true, flip: false },
  face: {
    enabled: true,
    detector: { enabled: true, rotation: true, maxDetected: 1, minConfidence: 0.5, modelPath: 'blazeface-back.json' },
    mesh: { enabled: true, modelPath: 'facemesh.json' },
    iris: { enabled: false },
    description: { enabled: true, modelPath: 'faceres.json', minConfidence: 0.1 },
    emotion: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
};

interface FaceCaptureProps {
  onDescriptorsReady: (descriptors: number[][]) => void;
  requiredCaptures?: number;
}

// Helper to draw an arc segment on an SVG path
function describeArc(cx: number, cy: number, rx: number, ry: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, rx, ry, endAngle);
  const end = polarToCartesian(cx, cy, rx, ry, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${rx} ${ry} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, rx: number, ry: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) };
}

export default function FaceCapture({ onDescriptorsReady }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const humanRef = useRef<import('@vladmandic/human').default | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const holdStartRef = useRef<number>(0);
  const capturedRef = useRef<number[][]>([]);

  const [status, setStatus] = useState<'loading' | 'ready' | 'capturing' | 'done' | 'error'>('loading');
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(new Array(STEP_ORDER.length).fill(false));
  const [holdProgress, setHoldProgress] = useState(0);
  const [message, setMessage] = useState('Cargando modelos...');
  const [faceDetected, setFaceDetected] = useState(false);
  const [poseCorrect, setPoseCorrect] = useState(false);
  const [justCaptured, setJustCaptured] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [debugAngles, setDebugAngles] = useState({ yaw: 0, pitch: 0 });

  const currentStepIndex = capturedRef.current.length;
  const currentStep = STEP_ORDER[currentStepIndex] || 'front';
  const stepConfig = STEPS[currentStep];

  // Initialize Human.js
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const H = (await import('@vladmandic/human')).default;
        const human = new H(ENROLL_CONFIG as ConstructorParameters<typeof H>[0]);
        await human.load();
        await human.warmup();
        if (mounted) {
          humanRef.current = human;
          setStatus('ready');
          startCamera();
        }
      } catch (err) {
        console.error('Error loading Human.js:', err);
        if (mounted) {
          setStatus('error');
          setMessage('Error cargando modelos. Verifica la conexion.');
        }
      }
    };
    init();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setMessage(STEPS.front.instruction);
      }
    } catch {
      setStatus('error');
      setMessage('No se pudo acceder a la camara.');
    }
  }, []);

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

      // Draw subtle face mesh
      if (face.mesh && face.mesh.length > 0) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
        for (const point of face.mesh) {
          ctx.beginPath();
          ctx.arc(point[0], point[1], 1, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Check head rotation — convert radians to degrees
      const yawRad = face.rotation?.angle?.yaw ?? 0;
      const pitchRad = face.rotation?.angle?.pitch ?? 0;
      const yaw = yawRad * (180 / Math.PI);
      const pitch = pitchRad * (180 / Math.PI);
      setDebugAngles({ yaw: Math.round(yaw), pitch: Math.round(pitch) });
      const stepIdx = capturedRef.current.length;

      if (stepIdx < STEP_ORDER.length) {
        const step = STEP_ORDER[stepIdx];
        const config = STEPS[step];
        const isCorrectPose = config.checkAngle(yaw, pitch);
        setPoseCorrect(isCorrectPose);

        if (isCorrectPose && face.embedding && face.embedding.length > 0) {
          if (holdStartRef.current === 0) {
            holdStartRef.current = Date.now();
          }
          const elapsed = Date.now() - holdStartRef.current;
          const progress = Math.min(elapsed / HOLD_DURATION, 1);
          setHoldProgress(progress);

          if (elapsed >= HOLD_DURATION) {
            // Auto-capture
            const descriptor = Array.from(face.embedding);
            capturedRef.current = [...capturedRef.current, descriptor];
            const newCompleted = [...completedSteps];
            newCompleted[stepIdx] = true;
            setCompletedSteps(newCompleted);
            holdStartRef.current = 0;
            setHoldProgress(0);
            setJustCaptured(true);
            setGlobalProgress((stepIdx + 1) / STEP_ORDER.length);
            setTimeout(() => setJustCaptured(false), 700);

            if (capturedRef.current.length >= STEP_ORDER.length) {
              setStatus('done');
              setMessage('Registro facial completado');
              stopCamera();
              onDescriptorsReady(capturedRef.current);
              return;
            } else {
              const nextStep = STEP_ORDER[capturedRef.current.length];
              setMessage(STEPS[nextStep].instruction);
            }
          }
        } else {
          holdStartRef.current = 0;
          setHoldProgress(0);
        }
      }
    } else {
      setFaceDetected(false);
      setPoseCorrect(false);
      holdStartRef.current = 0;
      setHoldProgress(0);
    }

    animationRef.current = requestAnimationFrame(() => detectLoop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedSteps, onDescriptorsReady]);

  useEffect(() => {
    if (status === 'capturing') {
      animationRef.current = requestAnimationFrame(detectLoop);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [status, detectLoop]);

  const stopCamera = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    capturedRef.current = [];
    setCompletedSteps(new Array(STEP_ORDER.length).fill(false));
    setHoldProgress(0);
    setGlobalProgress(0);
    holdStartRef.current = 0;
    setPoseCorrect(false);
    stopCamera();
    setStatus('ready');
    setMessage(STEPS.front.instruction);
    startCamera();
  }, [stopCamera, startCamera]);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);
  const svgW = 280;
  const svgH = 360;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const rx = 95;
  const ry = 130;

  return (
    <div className="fc-root">
      <style>{`
        .fc-root {
          display: flex;
          gap: 24px;
          align-items: stretch;
          width: 100%;
        }

        /* LEFT: Camera panel */
        .fc-camera-panel {
          flex: 0 0 320px;
          position: relative;
          background: #0f0f0f;
          border-radius: 16px;
          overflow: hidden;
          aspect-ratio: 3/4;
        }
        .fc-camera-panel video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }
        .fc-camera-panel canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform: scaleX(-1);
          pointer-events: none;
          z-index: 1;
        }
        .fc-guide-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 2;
        }
        .fc-guide-svg {
          width: 85%;
          max-width: 280px;
          height: auto;
        }
        .fc-segment-bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 3.5; stroke-linecap: round; }
        .fc-segment-done { fill: none; stroke: #22C55E; stroke-width: 4; stroke-linecap: round; filter: drop-shadow(0 0 4px rgba(34,197,94,0.4)); }
        .fc-segment-active { fill: none; stroke-width: 4; stroke-linecap: round; }
        .fc-segment-active.ok { stroke: #22C55E; filter: drop-shadow(0 0 6px rgba(34,197,94,0.5)); }
        .fc-segment-active.search { stroke: #3B82F6; filter: drop-shadow(0 0 4px rgba(59,130,246,0.3)); animation: fc-pulse 1.5s ease-in-out infinite; }
        .fc-segment-inactive { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 3; stroke-linecap: round; }
        .fc-face-outline { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 1.5; }
        .fc-hold-ring { fill: none; stroke: #22C55E; stroke-width: 3; stroke-linecap: round; }
        @keyframes fc-pulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }

        .fc-loading-cover {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0f0f0f;
          z-index: 10;
        }
        .fc-loading-cover p { color: #888; font-size: 13px; margin-top: 12px; }
        .fc-done-cover {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(10,10,10,0.9);
          backdrop-filter: blur(6px);
          z-index: 10;
          animation: fc-fadein 0.3s ease;
        }
        @keyframes fc-fadein { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .fc-done-cover h3 { color: #fff; font-size: 18px; font-weight: 700; margin: 12px 0 4px; }
        .fc-done-cover p { color: #999; font-size: 13px; margin: 0; }
        .fc-flash { position: absolute; inset: 0; background: white; animation: fc-flash-anim 0.5s ease-out forwards; z-index: 15; pointer-events: none; }
        @keyframes fc-flash-anim { 0%{opacity:0.8} 100%{opacity:0} }
        .fc-debug-badge {
          position: absolute; top: 8px; right: 8px;
          padding: 3px 8px; border-radius: 6px;
          background: rgba(0,0,0,0.65); font-size: 10px;
          font-family: monospace; color: rgba(255,255,255,0.6);
          z-index: 5; pointer-events: none;
        }

        /* RIGHT: Info panel */
        .fc-info-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-width: 0;
        }

        /* Current instruction card */
        .fc-instruction-card {
          padding: 16px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.3s;
        }
        .fc-instruction-card.search { background: #EFF6FF; border: 1px solid #BFDBFE; }
        .fc-instruction-card.ok { background: #F0FDF4; border: 1px solid #BBF7D0; }
        .fc-instruction-card.noface { background: #FEF2F2; border: 1px solid #FECACA; }
        .fc-instruction-card.done { background: #F0FDF4; border: 1px solid #BBF7D0; }

        .fc-instr-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 700; flex-shrink: 0;
        }
        .fc-instr-icon.search { background: #DBEAFE; color: #2563EB; }
        .fc-instr-icon.ok { background: #DCFCE7; color: #16A34A; }
        .fc-instr-icon.noface { background: #FEE2E2; color: #DC2626; }
        .fc-instr-icon.done { background: #DCFCE7; color: #16A34A; }

        .fc-instr-text h4 { margin: 0; font-size: 15px; font-weight: 600; color: #111827; }
        .fc-instr-text p { margin: 2px 0 0; font-size: 13px; color: #6B7280; }

        /* Hold progress bar */
        .fc-hold-bar { width: 100%; height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden; }
        .fc-hold-fill { height: 100%; background: linear-gradient(90deg, #22C55E, #16A34A); transition: width 0.1s linear; border-radius: 3px; }

        /* Steps list */
        .fc-steps-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .fc-step-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          transition: all 0.3s;
          font-size: 14px;
        }
        .fc-step-item.done {
          background: #F0FDF4;
          color: #15803D;
          font-weight: 500;
        }
        .fc-step-item.active {
          background: #EFF6FF;
          color: #1D4ED8;
          font-weight: 600;
          box-shadow: 0 0 0 2px #BFDBFE;
        }
        .fc-step-item.pending {
          background: #F9FAFB;
          color: #9CA3AF;
        }
        .fc-step-num {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; flex-shrink: 0;
        }
        .fc-step-item.done .fc-step-num { background: #DCFCE7; color: #16A34A; }
        .fc-step-item.active .fc-step-num { background: #DBEAFE; color: #2563EB; }
        .fc-step-item.pending .fc-step-num { background: #F3F4F6; color: #9CA3AF; }

        /* Progress bar */
        .fc-progress-track { width: 100%; height: 4px; background: #E5E7EB; border-radius: 2px; overflow: hidden; }
        .fc-progress-fill { height: 100%; background: linear-gradient(90deg, #3B82F6, #22C55E); transition: width 0.5s ease; border-radius: 2px; }

        /* Reset button */
        .fc-reset-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; border-radius: 8px;
          border: 1px solid #E5E7EB; background: #fff;
          font-size: 13px; font-weight: 500; color: #6B7280;
          cursor: pointer; transition: background 0.2s;
        }
        .fc-reset-btn:hover { background: #F3F4F6; }
      `}</style>

      {/* LEFT: Camera */}
      <div className="fc-camera-panel">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />

        {(status === 'loading' || status === 'ready') && (
          <div className="fc-loading-cover">
            <Loader2 style={{ width: 36, height: 36, color: '#3B82F6', animation: 'spin 1s linear infinite' }} />
            <p>Cargando modelos...</p>
          </div>
        )}

        {status === 'capturing' && (
          <div className="fc-guide-overlay">
            <svg className="fc-guide-svg" viewBox={`0 0 ${svgW} ${svgH}`}>
              <ellipse cx={cx} cy={cy} rx={rx - 6} ry={ry - 6} className="fc-face-outline" />
              {STEP_ORDER.map((step, i) => {
                const config = STEPS[step];
                const isCompleted = completedSteps[i];
                const isCurrent = i === currentStepIndex;
                const gap = 3;
                const arcS = config.arcStart + gap / 2;
                const arcE = config.arcEnd - gap / 2;
                const path = describeArc(cx, cy, rx, ry, arcS, arcE);
                if (isCompleted) return <path key={step} d={path} className="fc-segment-done" />;
                if (isCurrent) return <path key={step} d={path} className={`fc-segment-active ${poseCorrect ? 'ok' : 'search'}`} />;
                return <path key={step} d={path} className="fc-segment-inactive" />;
              })}
              {poseCorrect && holdProgress > 0 && (
                <ellipse cx={cx} cy={cy} rx={rx + 10} ry={ry + 10} className="fc-hold-ring"
                  strokeDasharray={`${holdProgress * 2 * Math.PI * ((rx + ry + 20) / 2)} ${2 * Math.PI * ((rx + ry + 20) / 2)}`}
                />
              )}
            </svg>
          </div>
        )}

        {status === 'capturing' && faceDetected && (
          <div className="fc-debug-badge">Y:{debugAngles.yaw} P:{debugAngles.pitch}</div>
        )}

        {justCaptured && <div className="fc-flash" />}

        {status === 'done' && (
          <div className="fc-done-cover">
            <CheckCircle style={{ width: 48, height: 48, color: '#22C55E' }} />
            <h3>Completado</h3>
            <p>{STEP_ORDER.length} angulos capturados</p>
          </div>
        )}
      </div>

      {/* RIGHT: Info panel */}
      <div className="fc-info-panel">
        {/* Current instruction */}
        <div className={`fc-instruction-card ${status === 'done' ? 'done' : !faceDetected ? 'noface' : poseCorrect ? 'ok' : 'search'}`}>
          <div className={`fc-instr-icon ${status === 'done' ? 'done' : !faceDetected ? 'noface' : poseCorrect ? 'ok' : 'search'}`}>
            {status === 'done' ? <CheckCircle style={{ width: 22, height: 22 }} /> : getStepEmoji(currentStep)}
          </div>
          <div className="fc-instr-text">
            <h4>
              {status === 'done'
                ? 'Registro completado'
                : !faceDetected
                  ? 'Buscando rostro...'
                  : stepConfig.shortInstruction}
            </h4>
            <p>
              {status === 'done'
                ? 'Todos los angulos fueron capturados'
                : !faceDetected
                  ? 'Centra tu rostro en el ovalo'
                  : poseCorrect
                    ? 'Manten la posicion...'
                    : stepConfig.instruction}
            </p>
          </div>
        </div>

        {/* Hold progress */}
        {poseCorrect && holdProgress > 0 && status === 'capturing' && (
          <div className="fc-hold-bar">
            <div className="fc-hold-fill" style={{ width: `${holdProgress * 100}%` }} />
          </div>
        )}

        {/* Overall progress */}
        <div className="fc-progress-track">
          <div className="fc-progress-fill" style={{ width: `${globalProgress * 100}%` }} />
        </div>

        {/* Steps list */}
        <div className="fc-steps-list">
          {STEP_ORDER.map((step, i) => {
            const config = STEPS[step];
            const isCompleted = completedSteps[i];
            const isCurrent = i === currentStepIndex && status === 'capturing';
            return (
              <div key={step} className={`fc-step-item ${isCompleted ? 'done' : isCurrent ? 'active' : 'pending'}`}>
                <div className="fc-step-num">
                  {isCompleted ? <CheckCircle style={{ width: 16, height: 16 }} /> : i + 1}
                </div>
                <span>{config.label}</span>
                {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.6 }}>Actual</span>}
                {isCompleted && <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.6 }}>Listo</span>}
              </div>
            );
          })}
        </div>

        {/* Reset */}
        {(status === 'capturing' || status === 'done') && (
          <button onClick={reset} className="fc-reset-btn">
            <RotateCcw style={{ width: 14, height: 14 }} /> Reiniciar captura
          </button>
        )}
      </div>
    </div>
  );
}

function getStepEmoji(step: CaptureStep): string {
  switch (step) {
    case 'front': return '●';
    case 'left': return '←';
    case 'right': return '→';
    case 'up': return '↑';
    case 'down': return '↓';
    default: return '●';
  }
}
