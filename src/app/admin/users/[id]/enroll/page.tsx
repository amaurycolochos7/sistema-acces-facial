'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { ArrowLeft, Camera, User, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const FaceCapture = dynamic(() => import('@/components/FaceCapture'), { ssr: false });

interface UserData {
  id: string;
  controlNumber: string;
  fullName: string;
  role: string;
  hasFaceRegistered: boolean;
  career: { name: string; code: string } | null;
  faceDescriptors: { id: string; createdAt: string }[];
}

export default function EnrollFacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<UserData | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchUser = useCallback(async () => {
    const res = await fetch(`/api/users/${id}`);
    if (res.ok) setUser(await res.json());
  }, [id]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleDescriptorsReady = async (descriptors: number[][]) => {
    setSaving(true);
    setResult(null);

    try {
      const res = await fetch('/api/face-descriptors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, descriptors }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: data.message });
        fetchUser(); // Refresh user data
      } else {
        setResult({ success: false, message: data.error || 'Error al guardar descriptores.' });
      }
    } catch {
      setResult({ success: false, message: 'Error de conexión.' });
    }
    setSaving(false);
  };

  if (!user) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver a Usuarios
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Registro Facial</h1>
      </div>

      {/* User card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 max-w-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
            <p className="text-sm text-gray-500">{user.controlNumber} · {user.career?.code || user.role}</p>
          </div>
          <div className="ml-auto">
            {user.hasFaceRegistered ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                <CheckCircle className="w-3 h-3" /> Registrado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                <AlertCircle className="w-3 h-3" /> Sin registro
              </span>
            )}
          </div>
        </div>
        {user.faceDescriptors.length > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            {user.faceDescriptors.length} descriptores · Último: {new Date(user.faceDescriptors[0]?.createdAt).toLocaleDateString('es-MX')}
          </p>
        )}
      </div>

      {/* Result message */}
      {result && (
        <div className={`max-w-md mb-4 p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <div className="flex items-center gap-2">
            {result.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <p className="text-sm font-medium">{result.message}</p>
          </div>
        </div>
      )}

      {/* Saving indicator */}
      {saving && (
        <div className="max-w-md mb-4 p-4 rounded-lg bg-blue-50 text-blue-700">
          <p className="text-sm font-medium">Guardando descriptores faciales...</p>
        </div>
      )}

      {/* Face capture section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">
            {user.hasFaceRegistered ? 'Re-registrar Rostro' : 'Capturar Rostro'}
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Se capturarán 3 fotos desde diferentes ángulos para crear un perfil facial preciso.
          {user.hasFaceRegistered && ' Los descriptores anteriores serán reemplazados.'}
        </p>

        <FaceCapture onDescriptorsReady={handleDescriptorsReady} requiredCaptures={3} />
      </div>
    </div>
  );
}
