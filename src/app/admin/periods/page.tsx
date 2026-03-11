'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CalendarDays, X, Check } from 'lucide-react';

interface Period {
  id: string; name: string; startDate: string; endDate: string;
  isCurrent: boolean; _count: { schedules: number };
}

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });

  const fetchPeriods = async () => {
    const res = await fetch('/api/academic-periods');
    setPeriods(await res.json());
  };
  useEffect(() => { fetchPeriods(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/academic-periods/${editingId}` : '/api/academic-periods';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditingId(null);
    setForm({ name: '', startDate: '', endDate: '', isCurrent: false });
    fetchPeriods();
  };

  const handleEdit = (p: Period) => {
    setForm({ name: p.name, startDate: p.startDate.slice(0, 10), endDate: p.endDate.slice(0, 10), isCurrent: p.isCurrent });
    setEditingId(p.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este período?')) return;
    await fetch(`/api/academic-periods/${id}`, { method: 'DELETE' }); fetchPeriods();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Períodos Académicos</h1>
          <p className="text-sm text-gray-500">Gestión de períodos escolares</p>
        </div>
        <button onClick={() => { setForm({ name: '', startDate: '', endDate: '', isCurrent: false }); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: 'var(--navy)' }}>
          <Plus className="w-4 h-4" /> Nuevo Período
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {periods.map((p) => (
          <div key={p.id} className={`bg-white rounded-xl border-2 p-5 ${p.isCurrent ? 'border-blue-500' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${p.isCurrent ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <CalendarDays className={`w-5 h-5 ${p.isCurrent ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  {p.isCurrent && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                      <Check className="w-3 h-3" /> Período actual
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(p)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">Inicio</p>
                <p className="font-medium text-gray-700">{new Date(p.startDate).toLocaleDateString('es-MX')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500">Fin</p>
                <p className="font-medium text-gray-700">{new Date(p.endDate).toLocaleDateString('es-MX')}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{p._count.schedules} horarios configurados</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar Período' : 'Nuevo Período'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ej: Ene-Jun 2026" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" required />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
                  className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Marcar como período actual</span>
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
