'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const KioskClient = dynamic(() => import('@/components/KioskClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F172A' }}>
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
        <p className="text-white/70 text-sm">Iniciando kiosco...</p>
      </div>
    </div>
  ),
});

export default function KioskPage() {
  return <KioskClient />;
}
