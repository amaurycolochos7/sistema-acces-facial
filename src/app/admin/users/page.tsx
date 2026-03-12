'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, UserPlus, GraduationCap, Briefcase, X, Camera, CheckCircle, XCircle, Users, ScanFace, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Career {
  id: string;
  name: string;
  code: string;
}

interface User {
  id: string;
  controlNumber: string;
  fullName: string;
  email: string;
  phone: string;
  tutorPhone: string | null;
  role: 'STUDENT' | 'TEACHER';
  isActive: boolean;
  hasFaceRegistered: boolean;
  career: Career | null;
}

interface UserFormData {
  controlNumber: string;
  fullName: string;
  email: string;
  phone: string;
  tutorPhone: string;
  role: 'STUDENT' | 'TEACHER';
  careerId: string;
}

const emptyForm: UserFormData = {
  controlNumber: '',
  fullName: '',
  email: '',
  phone: '',
  tutorPhone: '',
  role: 'STUDENT',
  careerId: '',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [faceFilter, setFaceFilter] = useState(''); // '', 'yes', 'no'
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, withFace: 0, withoutFace: 0 });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    if (faceFilter) params.set('face', faceFilter);
    const res = await fetch(`/api/users?${params}`);
    const data = await res.json();
    setUsers(data.users);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, roleFilter, faceFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/users/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetch('/api/careers').then(r => r.json()).then(setCareers);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/users/${editingId}` : '/api/users';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, careerId: form.careerId || null }),
    });
    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchUsers();
      fetchStats();
    }
  };

  const handleEdit = (user: User) => {
    setForm({
      controlNumber: user.controlNumber,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      tutorPhone: user.tutorPhone || '',
      role: user.role,
      careerId: user.career?.id || '',
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Desactivar este usuario?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    fetchUsers();
    fetchStats();
  };

  const pctRegistered = stats.total > 0 ? Math.round((stats.withFace / stats.total) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500">{total} registrados</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'var(--navy)' }}
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => { setFaceFilter(''); setPage(1); }}
          className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${faceFilter === '' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total de usuarios</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => { setFaceFilter('yes'); setPage(1); }}
          className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${faceFilter === 'yes' ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <ScanFace className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.withFace}</p>
              <p className="text-xs text-gray-500">Con registro facial</p>
            </div>
          </div>
          {stats.total > 0 && (
            <div className="mt-3">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pctRegistered}%` }} />
              </div>
              <p className="text-xs text-green-600 mt-1 font-medium">{pctRegistered}%</p>
            </div>
          )}
        </button>

        <button
          onClick={() => { setFaceFilter('no'); setPage(1); }}
          className={`bg-white rounded-xl border p-4 text-left transition-all hover:shadow-md ${faceFilter === 'no' ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{stats.withoutFace}</p>
              <p className="text-xs text-gray-500">Sin registro facial</p>
            </div>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, control o correo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todos los roles</option>
          <option value="STUDENT">Alumnos</option>
          <option value="TEACHER">Maestros</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Usuario</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Correo</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Rol</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Carrera</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Registro Facial</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">Cargando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-gray-400">No hay usuarios registrados</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  {/* User info combined */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
                        user.hasFaceRegistered 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 leading-tight">{user.fullName}</p>
                        <p className="text-xs text-gray-400 font-mono">{user.controlNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'STUDENT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {user.role === 'STUDENT' ? <><GraduationCap className="w-3 h-3" /> Alumno</> : <><Briefcase className="w-3 h-3" /> Maestro</>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.career?.code || '—'}</td>
                  <td className="px-4 py-3">
                    {user.hasFaceRegistered ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle className="w-3.5 h-3.5" /> Registrado
                      </span>
                    ) : (
                      <Link href={`/admin/users/${user.id}/enroll`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer">
                        <Camera className="w-3.5 h-3.5" /> Pendiente - Registrar
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/users/${user.id}/enroll`}
                        className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Registro facial">
                        <Camera className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => handleEdit(user)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(user.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">Mostrando {((page-1)*15)+1}–{Math.min(page*15, total)} de {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">Anterior</button>
            <button onClick={() => setPage(p => p+1)} disabled={page*15 >= total}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">Siguiente</button>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'STUDENT' | 'TEACHER' })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="STUDENT">Alumno</option>
                    <option value="TEACHER">Maestro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Num. Control / ID</label>
                  <input type="text" value={form.controlNumber} onChange={(e) => setForm({ ...form, controlNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Institucional</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                  required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                    required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tel. Tutor {form.role === 'TEACHER' && '(opcional)'}</label>
                  <input type="tel" value={form.tutorPhone} onChange={(e) => setForm({ ...form, tutorPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>

              {form.role === 'STUDENT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
                  <select value={form.careerId} onChange={(e) => setForm({ ...form, careerId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Seleccionar carrera...</option>
                    {careers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit"
                  className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                  style={{ backgroundColor: 'var(--navy)' }}>
                  {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
