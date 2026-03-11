'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, X } from 'lucide-react';

const LEVELS = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', color: 'bg-purple-50 text-purple-700' },
  { value: 'ADMIN', label: 'Administrador', color: 'bg-blue-50 text-blue-700' },
  { value: 'VIEWER', label: 'Solo lectura', color: 'bg-gray-100 text-gray-600' },
];

interface Admin {
  id: string; username: string; fullName: string; level: string;
  isActive: boolean; createdAt: string;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '', fullName: '', level: 'ADMIN' });

  const fetchAdmins = async () => {
    const res = await fetch('/api/admins');
    setAdmins(await res.json());
  };
  useEffect(() => { fetchAdmins(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/admins/${editingId}` : '/api/admins';
    const body: Record<string, string> = { fullName: form.fullName, level: form.level };
    if (!editingId) body.username = form.username;
    if (form.password) body.password = form.password;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowForm(false); setEditingId(null);
    setForm({ username: '', password: '', fullName: '', level: 'ADMIN' });
    fetchAdmins();
  };

  const handleEdit = (a: Admin) => {
    setForm({ username: a.username, password: '', fullName: a.fullName, level: a.level });
    setEditingId(a.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar este administrador?')) return;
    await fetch(`/api/admins/${id}`, { method: 'DELETE' }); fetchAdmins();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administradores</h1>
          <p className="text-sm text-gray-500">{admins.length} administradores</p>
        </div>
        <button onClick={() => { setForm({ username: '', password: '', fullName: '', level: 'ADMIN' }); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: 'var(--navy)' }}>
          <Plus className="w-4 h-4" /> Nuevo Admin
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Usuario</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Nivel</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Estado</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => {
              const level = LEVELS.find(l => l.value === a.level);
              return (
                <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!a.isActive ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.username}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.fullName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${level?.color}`}>
                      <Shield className="w-3 h-3" /> {level?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${a.isActive ? 'text-green-600' : 'text-gray-400'}`}>{a.isActive ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(a)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
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
              <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Editar Admin' : 'Nuevo Admin'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-gray-100"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                  <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {editingId && '(dejar vacío para no cambiar)'}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  required={!editingId} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nivel de Acceso</label>
                <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                  {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
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
