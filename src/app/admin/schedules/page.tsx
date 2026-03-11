'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, X } from 'lucide-react';

interface Period { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean; }
interface Schedule {
  id: string; name: string; officialEntry: string; lateEntry: string;
  cutoffEntry: string; officialExit: string; daysActive: string;
  isActive: boolean; period: Period;
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', officialEntry: '07:00', lateEntry: '07:15', cutoffEntry: '07:30',
    officialExit: '14:00', daysActive: 'L,M,Mi,J,V', periodId: '', isActive: true,
  });

  const fetchData = async () => {
    const [s, p] = await Promise.all([
      fetch('/api/schedule-config').then(r => r.json()),
      fetch('/api/academic-periods').then(r => r.json()),
    ]);
    setSchedules(s);
    setPeriods(p);
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/schedule-config/${editingId}` : '/api/schedule-config';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditingId(null);
    setForm({ name: '', officialEntry: '07:00', lateEntry: '07:15', cutoffEntry: '07:30', officialExit: '14:00', daysActive: 'L,M,Mi,J,V', periodId: '', isActive: true });
    fetchData();
  };

  const handleEdit = (s: Schedule) => {
    setForm({ name: s.name, officialEntry: s.officialEntry, lateEntry: s.lateEntry, cutoffEntry: s.cutoffEntry, officialExit: s.officialExit, daysActive: s.daysActive, periodId: s.period.id, isActive: s.isActive });
    setEditingId(s.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este horario?')) return;
    await fetch(`/api/schedule-config/${id}`, { method: 'DELETE' }); fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horarios</h1>
          <p className="text-sm text-gray-500">Configuración de horarios de acceso</p>
        </div>
        <button onClick={() => { setForm({ name: '', officialEntry: '07:00', lateEntry: '07:15', cutoffEntry: '07:30', officialExit: '14:00', daysActive: 'L,M,Mi,J,V', periodId: periods[0]?.id || '', isActive: true }); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: 'var(--navy)' }}>
          <Plus className="w-4 h-4" /> Nuevo Horario
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {schedules.map((s) => (
          <div key={s.id} className={`bg-white rounded-xl border border-gray-200 p-5 ${!s.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <p className="text-xs text-gray-500">{s.period.name} · {s.daysActive}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(s)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-lg bg-green-50">
                <p className="text-xs text-green-600 font-medium">Entrada</p>
                <p className="text-lg font-bold text-green-700">{s.officialEntry}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-amber-50">
                <p className="text-xs text-amber-600 font-medium">Retardo</p>
                <p className="text-lg font-bold text-amber-700">{s.lateEntry}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50">
                <p className="text-xs text-red-600 font-medium">Falta</p>
                <p className="text-lg font-bold text-red-700">{s.cutoffEntry}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-50">
                <p className="text-xs text-blue-600 font-medium">Salida</p>
                <p className="text-lg font-bold text-blue-700">{s.officialExit}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar Horario' : 'Nuevo Horario'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ej: Turno Matutino" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
                  <select value={form.periodId} onChange={(e) => setForm({ ...form, periodId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" required>
                    <option value="">Seleccionar...</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">Entrada</label>
                  <input type="time" value={form.officialEntry} onChange={(e) => setForm({ ...form, officialEntry: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-amber-700 mb-1">Retardo</label>
                  <input type="time" value={form.lateEntry} onChange={(e) => setForm({ ...form, lateEntry: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">Falta</label>
                  <input type="time" value={form.cutoffEntry} onChange={(e) => setForm({ ...form, cutoffEntry: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">Salida</label>
                  <input type="time" value={form.officialExit} onChange={(e) => setForm({ ...form, officialExit: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Días Activos</label>
                <input type="text" value={form.daysActive} onChange={(e) => setForm({ ...form, daysActive: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="L,M,Mi,J,V" />
              </div>
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
