export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F172A' }}>
      <div className="text-center">
        <div className="text-6xl mb-4">📡</div>
        <h1 className="text-white text-2xl font-bold mb-2">Sin conexión</h1>
        <p className="text-white/50 text-sm mb-6">
          El kiosco seguirá funcionando en modo offline.
          Los registros se sincronizarán al reconectarse.
        </p>
        <a href="/kiosk"
          className="inline-flex px-6 py-3 rounded-lg text-white font-semibold text-sm"
          style={{ backgroundColor: '#1B2A4A' }}>
          Ir al Kiosco
        </a>
      </div>
    </div>
  );
}
