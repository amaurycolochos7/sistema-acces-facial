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
    checkAngle: (yaw: number, pitch: number) => Math.abs(yaw) < 12 && Math.abs(pitch) < 12,
    arcStart: -18,
    arcEnd: 18,
  },
  right: {
    label: 'Derecha',
    instruction: 'Gira lentamente tu cabeza a la derecha',
    shortInstruction: 'Gira a la derecha',
    checkAngle: (yaw: number) => yaw < -18,
    arcStart: 18,
    arcEnd: 90,
  },
  down: {
    label: 'Abajo',
    instruction: 'Inclina lentamente tu cabeza hacia abajo',
    shortInstruction: 'Mira hacia abajo',
    checkAngle: (_yaw: number, pitch: number) => pitch > 12,
    arcStart: 90,
    arcEnd: 162,
  },
  left: {
    label: 'Izquierda',
    instruction: 'Gira lentamente tu cabeza a la izquierda',
    shortInstruction: 'Gira a la izquierda',
    checkAngle: (yaw: number) => yaw > 18,
    arcStart: 162,
    arcEnd: 234,
  },
  up: {
    label: 'Arriba',
    instruction: 'Inclina lentamente tu cabeza hacia arriba',
    shortInstruction: 'Mira hacia arriba',
    checkAngle: (_yaw: number, pitch: number) => pitch < -12,
    arcStart: 234,
    arcEnd: 342,
  },
};

const STEP_ORDER: CaptureStep[] = ['front', 'right', 'down', 'left', 'up'];
const HOLD_DURATION = 1500;

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

  const currentStepIndex = capturedRef.current.length;
  const currentStep = STEP_ORDER[currentStepIndex] || 'front';
  const stepConfig = STEPS[currentStep];

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

      // Check head rotation
      const yaw = face.rotation?.angle?.yaw ?? 0;
      const pitch = face.rotation?.angle?.pitch ?? 0;
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

  // SVG dimensions for the face guide overlay
  const svgW = 320;
  const svgH = 400;
  const cx = svgW / 2;
  const cy = svgH / 2;
  const rx = 110;
  const ry = 145;

  return (
    <div className="face-capture-container">
      <style>{`
        .face-capture-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          max-width: 420px;
          margin: 0 auto;
        }
        .fc-camera-wrapper {
          position: relative;
          width: 100%;
          aspect-ratio: 3/4;
          background: #0a0a0a;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .fc-camera-wrapper video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1);
        }
        .fc-camera-wrapper canvas {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          transform: scaleX(-1);
          pointer-events: none;
        }
        .fc-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .fc-guide-svg {
          width: 80%;
          max-width: 320px;
          height: auto;
          filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.15));
        }
        .fc-segment-bg {
          fill: none;
          stroke: rgba(255,255,255,0.12);
          stroke-width: 4;
          stroke-linecap: round;
        }
        .fc-segment-completed {
          fill: none;
          stroke: #22C55E;
          stroke-width: 4.5;
          stroke-linecap: round;
          filter: drop-shadow(0 0 6px rgba(34,197,94,0.5));
          transition: stroke 0.4s, filter 0.4s;
        }
        .fc-segment-active {
          fill: none;
          stroke-width: 4.5;
          stroke-linecap: round;
          transition: stroke 0.3s;
        }
        .fc-segment-active.correct {
          stroke: #22C55E;
          filter: drop-shadow(0 0 8px rgba(34,197,94,0.6));
        }
        .fc-segment-active.searching {
          stroke: #3B82F6;
          filter: drop-shadow(0 0 6px rgba(59,130,246,0.4));
          animation: fc-pulse-blue 1.5s ease-in-out infinite;
        }
        .fc-segment-inactive {
          fill: none;
          stroke: rgba(255,255,255,0.08);
          stroke-width: 3;
          stroke-linecap: round;
        }
        .fc-face-outline {
          fill: none;
          stroke: rgba(255,255,255,0.06);
          stroke-width: 1;
        }
        .fc-hold-ring {
          fill: none;
          stroke: #22C55E;
          stroke-width: 5;
          stroke-linecap: round;
          filter: drop-shadow(0 0 10px rgba(34,197,94,0.5));
          transition: stroke-dasharray 0.1s linear;
        }
        @keyframes fc-pulse-blue {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes fc-pulse-green {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(34,197,94,0.3)); }
          50% { filter: drop-shadow(0 0 25px rgba(34,197,94,0.7)); }
        }
        .fc-flash {
          position: absolute;
          inset: 0;
          background: rgba(34, 197, 94, 0.15);
          border-radius: 24px;
          animation: fc-flash-anim 0.7s ease-out forwards;
          pointer-events: none;
        }
        @keyframes fc-flash-anim {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .fc-instruction-bar {
          position: absolute;
          bottom: 16px;
          left: 16px;
          right: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 18px;
          border-radius: 16px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          transition: background 0.3s, border-color 0.3s;
        }
        .fc-instruction-bar.correct {
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        .fc-instruction-bar.searching {
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .fc-instruction-bar.no-face {
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .fc-instruction-icon {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 20px;
          transition: background 0.3s;
        }
        .fc-instruction-icon.correct { background: rgba(34,197,94,0.3); }
        .fc-instruction-icon.searching { background: rgba(59,130,246,0.2); }
        .fc-instruction-icon.no-face { background: rgba(255,255,255,0.08); }
        .fc-instruction-text h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: white;
        }
        .fc-instruction-text p {
          margin: 2px 0 0;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }
        .fc-no-face-indicator {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 16px;
          border-radius: 20px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.3);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .fc-no-face-indicator span {
          font-size: 12px;
          font-weight: 500;
          color: #FCA5A5;
        }
        .fc-loading-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          border-radius: 24px;
        }
        .fc-loading-overlay p {
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          margin-top: 12px;
        }
        .fc-done-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(10,10,10,0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-radius: 24px;
          animation: fc-fade-in 0.4s ease-out;
        }
        @keyframes fc-fade-in {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .fc-done-overlay h3 {
          color: white;
          font-size: 20px;
          font-weight: 700;
          margin: 16px 0 4px;
        }
        .fc-done-overlay p {
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          margin: 0;
        }

        /* Progress bar */
        .fc-progress-section {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .fc-progress-bar-bg {
          width: 100%;
          height: 6px;
          background: #E5E7EB;
          border-radius: 3px;
          overflow: hidden;
        }
        .fc-progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3B82F6, #22C55E);
          border-radius: 3px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .fc-steps-row {
          display: flex;
          gap: 6px;
        }
        .fc-step-chip {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 4px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.3s;
          border: 1px solid transparent;
        }
        .fc-step-chip.completed {
          background: #F0FDF4;
          color: #16A34A;
          border-color: #BBF7D0;
        }
        .fc-step-chip.active {
          background: #EFF6FF;
          color: #2563EB;
          border-color: #BFDBFE;
          animation: fc-chip-pulse 2s ease-in-out infinite;
        }
        .fc-step-chip.pending {
          background: #F9FAFB;
          color: #9CA3AF;
          border-color: #F3F4F6;
        }
        @keyframes fc-chip-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
          50% { box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        }

        /* Instruction message below */
        .fc-message {
          text-align: center;
          font-size: 14px;
          color: #6B7280;
          min-height: 20px;
        }
        .fc-actions {
          display: flex;
          justify-content: center;
        }
        .fc-reset-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 10px;
          border: 1px solid #E5E7EB;
          background: white;
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: background 0.2s;
        }
        .fc-reset-btn:hover { background: #F9FAFB; }
      `}</style>

      {/* Camera */}
      <div className="fc-camera-wrapper">
        <video ref={videoRef} playsInline muted />
        <canvas ref={canvasRef} />

        {/* Loading */}
        {(status === 'loading' || status === 'ready') && (
          <div className="fc-loading-overlay">
            <Loader2 style={{ width: 40, height: 40, color: '#3B82F6', animation: 'spin 1s linear infinite' }} />
            <p>Cargando modelos de reconocimiento...</p>
          </div>
        )}

        {/* Face guide overlay */}
        {status === 'capturing' && (
          <div className="fc-overlay">
            <svg className="fc-guide-svg" viewBox={`0 0 ${svgW} ${svgH}`} xmlns="http://www.w3.org/2000/svg">
              {/* Subtle face outline */}
              <ellipse cx={cx} cy={cy} rx={rx - 8} ry={ry - 8} className="fc-face-outline" />

              {/* Segments */}
              {STEP_ORDER.map((step, i) => {
                const config = STEPS[step];
                const isCompleted = completedSteps[i];
                const isCurrent = i === currentStepIndex;
                const gap = 3; // degrees gap between segments
                const arcS = config.arcStart + gap / 2;
                const arcE = config.arcEnd - gap / 2;
                const path = describeArc(cx, cy, rx, ry, arcS, arcE);

                if (isCompleted) {
                  return <path key={step} d={path} className="fc-segment-completed" />;
                }
                if (isCurrent) {
                  return (
                    <path
                      key={step}
                      d={path}
                      className={`fc-segment-active ${poseCorrect ? 'correct' : 'searching'}`}
                    />
                  );
                }
                return <path key={step} d={path} className="fc-segment-inactive" />;
              })}

              {/* Hold progress ring (inner) */}
              {poseCorrect && holdProgress > 0 && (
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={rx + 12}
                  ry={ry + 12}
                  className="fc-hold-ring"
                  strokeDasharray={`${holdProgress * 2 * Math.PI * ((rx + ry + 24) / 2)} ${2 * Math.PI * ((rx + ry + 24) / 2)}`}
                  style={{ animation: 'fc-pulse-green 1s ease-in-out infinite' }}
                />
              )}
            </svg>
          </div>
        )}

        {/* No face warning */}
        {status === 'capturing' && !faceDetected && (
          <div className="fc-no-face-indicator">
            <span>Posiciona tu rostro en el ovalo</span>
          </div>
        )}

        {/* Instruction bar */}
        {status === 'capturing' && (
          <div className={`fc-instruction-bar ${!faceDetected ? 'no-face' : poseCorrect ? 'correct' : 'searching'}`}>
            <div className={`fc-instruction-icon ${!faceDetected ? 'no-face' : poseCorrect ? 'correct' : 'searching'}`}>
              {getStepEmoji(currentStep)}
            </div>
            <div className="fc-instruction-text">
              <h4>{!faceDetected ? 'Buscando rostro...' : stepConfig.shortInstruction}</h4>
              <p>
                {!faceDetected
                  ? 'Centra tu rostro en el ovalo'
                  : poseCorrect
                    ? 'Manten la posicion...'
                    : `Paso ${currentStepIndex + 1} de ${STEP_ORDER.length}`}
              </p>
            </div>
            {poseCorrect && holdProgress > 0 && (
              <div style={{ width: 36, height: 36, position: 'relative', flexShrink: 0 }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${holdProgress * 94.2} 94.2`}
                    style={{ transition: 'stroke-dasharray 0.1s linear' }}
                  />
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Flash on capture */}
        {justCaptured && <div className="fc-flash" />}

        {/* Done overlay */}
        {status === 'done' && (
          <div className="fc-done-overlay">
            <CheckCircle style={{ width: 56, height: 56, color: '#22C55E' }} />
            <h3>Registro completado</h3>
            <p>{STEP_ORDER.length} angulos capturados correctamente</p>
          </div>
        )}
      </div>

      {/* Progress section */}
      <div className="fc-progress-section">
        <div className="fc-progress-bar-bg">
          <div className="fc-progress-bar-fill" style={{ width: `${globalProgress * 100}%` }} />
        </div>
        <div className="fc-steps-row">
          {STEP_ORDER.map((step, i) => {
            const config = STEPS[step];
            const isCompleted = completedSteps[i];
            const isCurrent = i === currentStepIndex && status === 'capturing';
            return (
              <div key={step} className={`fc-step-chip ${isCompleted ? 'completed' : isCurrent ? 'active' : 'pending'}`}>
                {isCompleted ? <CheckCircle style={{ width: 12, height: 12 }} /> : getStepEmoji(step)}
                <span>{config.label}</span>
              </div>
            );
          })}
        </div>
        <p className="fc-message">{message}</p>
      </div>

      {/* Actions */}
      {(status === 'capturing' || status === 'done') && (
        <div className="fc-actions">
          <button onClick={reset} className="fc-reset-btn">
            <RotateCcw style={{ width: 14, height: 14 }} /> Reiniciar
          </button>
        </div>
      )}
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
