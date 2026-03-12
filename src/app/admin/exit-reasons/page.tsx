'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, CheckCircle, Home, RefreshCw, Hospital, ClipboardList, GraduationCap, AlertCircle, Siren } from 'lucide-react';

const ICON_OPTIONS = [
  { value: 'home', label: 'Casa', Icon: Home },
  { value: 'refresh-cw', label: 'Temporal', Icon: RefreshCw },
  { value: 'hospital', label: 'Hospital', Icon: Hospital },
  { value: 'clipboard', label: 'Portapapeles', Icon: ClipboardList },
  { value: 'graduation-cap', label: 'Educacion', Icon: GraduationCap },
  { value: 'alert-circle', label: 'Alerta', Icon: AlertCircle },
  { value: 'siren', label: 'Emergencia', Icon: Siren },
];

const LUCIDE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  'refresh-cw': RefreshCw,
  hospital: Hospital,
  clipboard: ClipboardList,
  'graduation-cap': GraduationCap,
  'alert-circle': AlertCircle,
  siren: Siren,
};

const CATEGORIES = [
  { value: 'DEFINITIVE', label: 'Definitiva', color: 'bg-red-50 text-red-700' },
  { value: 'TEMPORARY', label: 'Temporal', color: 'bg-amber-50 text-amber-700' },
  { value: 'MEDICAL', label: 'Médica', color: 'bg-green-50 text-green-700' },
  { value: 'ADMINISTRATIVE', label: 'Administrativa', color: 'bg-blue-50 text-blue-700' },
];

interface ExitReason {
  id: string;
  name: string;
  category: string;
  icon: string;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
}

export default function ExitReasonsPage() {
  const [reasons, setReasons] = useState<ExitReason[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'TEMPORARY', icon: 'clipboard', sortOrder: 0, isDefault: false });

  const fetchReasons = async () => {
    const res = await fetch('/api/exit-reasons');
    setReasons(await res.json());
  };
  useEffect(() => { fetchReasons(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/exit-reasons/${editingId}` : '/api/exit-reasons';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', category: 'TEMPORARY', icon: 'clipboard', sortOrder: 0, isDefault: false });
    fetchReasons();
  };

  const handleEdit = (r: ExitReason) => {
    setForm({ name: r.name, category: r.category, icon: r.icon, sortOrder: r.sortOrder, isDefault: r.isDefault });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar este motivo?')) return;
    await fetch(`/api/exit-reasons/${id}`, { method: 'DELETE' });
    fetchReasons();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Motivos de Salida</h1>
          <p className="text-sm text-gray-500">{reasons.filter(r => r.isActive).length} activos</p>
        </div>
        <button onClick={() => { setForm({ name: '', category: 'TEMPORARY', icon: 'clipboard', sortOrder: 0, isDefault: false }); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: 'var(--navy)' }}>
          <Plus className="w-4 h-4" /> Nuevo Motivo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Orden</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Ícono</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Motivo</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Categoría</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Default</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Estado</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map((r) => {
              const cat = CATEGORIES.find(c => c.value === r.category);
              return (
                <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!r.isActive ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 text-gray-500">{r.sortOrder}</td>
                  <td className="px-4 py-3">{(() => { const Icon = LUCIDE_ICON_MAP[r.icon]; return Icon ? <Icon className="w-5 h-5 text-gray-700" /> : <ClipboardList className="w-5 h-5 text-gray-700" />; })()}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cat?.color || ''}`}>{cat?.label}</span>
                  </td>
                  <td className="px-4 py-3">{r.isDefault ? <CheckCircle className="w-4 h-4 text-green-600" /> : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${r.isActive ? 'text-green-600' : 'text-gray-400'}`}>{r.isActive ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(r)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar Motivo' : 'Nuevo Motivo'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icono</label>
                  <select value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                    {ICON_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Opción por defecto</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: 'var(--navy)' }}>
                  {editingId ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
