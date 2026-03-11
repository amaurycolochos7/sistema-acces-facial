'use client';

import { Camera, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';

export default function KioskPage() {
  const [isOnline] = useState(true);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: 'var(--navy)' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">TecNM VC - Acceso</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-white/80 text-lg font-semibold tabular-nums" suppressHydrationWarning>
            {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()}
          </span>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isOnline ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Camera Placeholder */}
        <div className="w-full max-w-md aspect-[4/3] rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center mb-8">
          <div className="text-center">
            <Camera className="w-16 h-16 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Cámara se activará al configurar</p>
            <p className="text-white/30 text-xs mt-1">@vladmandic/human</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full max-w-md grid grid-cols-2 gap-4">
          <button className="py-5 rounded-xl text-white font-bold text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: 'var(--green)' }}>
            Registrar Entrada
          </button>
          <button className="py-5 rounded-xl text-white font-bold text-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: 'var(--red)' }}>
            Registrar Salida
          </button>
        </div>
      </div>
    </div>
  );
}
