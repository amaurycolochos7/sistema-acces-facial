'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Edit2, Trash2, UserPlus, GraduationCap, Briefcase, X, Camera, CheckCircle, XCircle, Users, ScanFace, AlertTriangle, FileDown } from 'lucide-react';
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
  updatedAt?: string;
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

type TabType = 'STUDENT' | 'TEACHER';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [faceFilter, setFaceFilter] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('STUDENT');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, withFace: 0, withoutFace: 0 });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '15', role: activeTab });
    if (search) params.set('search', search);
    if (faceFilter) params.set('face', faceFilter);
    const res = await fetch(`/api/users?${params}`);
    const data = await res.json();
    setUsers(data.users);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, faceFilter, activeTab]);

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams({ role: activeTab });
      const res = await fetch(`/api/users/stats?${params}`);
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }, [activeTab]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetch('/api/careers').then(r => r.json()).then(setCareers); }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setPage(1);
    setSearch('');
    setFaceFilter('');
  };

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
  const tabLabel = activeTab === 'STUDENT' ? 'Estudiantes' : 'Docentes';

  // Find pending users for the "Pendientes" card subtitle
  const pendingNames = users.filter(u => !u.hasFaceRegistered).map(u => u.fullName).slice(0, 3);

  return (
    <div>
      {/* Header */}
      <div className="mb-2">
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a Usuarios
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard de Gestion de Biometria Facial</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Total */}
        <button
          onClick={() => { setFaceFilter(''); setPage(1); }}
          className={`bg-white rounded-xl border p-5 text-left transition-all hover:shadow-md ${faceFilter === '' ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total de {tabLabel}</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </button>

        {/* Registered */}
        <button
          onClick={() => { setFaceFilter('yes'); setPage(1); }}
          className={`bg-white rounded-xl border p-5 text-left transition-all hover:shadow-md ${faceFilter === 'yes' ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <ScanFace className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Rostros Registrados</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-green-700">{stats.withFace}</p>
                <span className="text-sm font-semibold text-green-600">{pctRegistered}%</span>
              </div>
            </div>
          </div>
          {stats.total > 0 && (
            <div className="mt-3 w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pctRegistered}%` }} />
            </div>
          )}
        </button>

        {/* Pending */}
        <button
          onClick={() => { setFaceFilter('no'); setPage(1); }}
          className={`bg-white rounded-xl border p-5 text-left transition-all hover:shadow-md ${faceFilter === 'no' ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Pendientes de Registro</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-red-600">{stats.withoutFace}</p>
                <span className="text-sm font-semibold text-red-400">{stats.total > 0 ? 100 - pctRegistered : 0}%</span>
              </div>
            </div>
          </div>
          {pendingNames.length > 0 && (
            <p className="text-xs text-gray-400 mt-2 truncate">
              Proximos: {pendingNames.join(', ')}{stats.withoutFace > 3 ? '...' : ''}
            </p>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => handleTabChange('STUDENT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'STUDENT'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Estudiantes
        </button>
        <button
          onClick={() => handleTabChange('TEACHER')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === 'TEACHER'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Docentes
        </button>
      </div>

      {/* List Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Lista de {tabLabel}</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <FileDown className="w-4 h-4" /> Exportar Reporte
          </button>
          <button
            onClick={() => { setForm({ ...emptyForm, role: activeTab }); setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--navy)' }}
          >
            <UserPlus className="w-4 h-4" />
            Agregar {activeTab === 'STUDENT' ? 'Estudiante' : 'Docente'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <select
          value={faceFilter}
          onChange={(e) => { setFaceFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Estado</option>
          <option value="yes">Registrado</option>
          <option value="no">Pendiente</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">
                ID {activeTab === 'STUDENT' ? 'Estudiante' : 'Docente'}
              </th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Nombre Completo</th>
              {activeTab === 'STUDENT' && (
                <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Carrera</th>
              )}
              <th className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Estado Biometrico</th>
              <th className="text-right px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={activeTab === 'STUDENT' ? 5 : 4} className="py-12 text-center text-gray-400">Cargando...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={activeTab === 'STUDENT' ? 5 : 4} className="py-12 text-center text-gray-400">
                No hay {tabLabel.toLowerCase()} registrados
              </td></tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                    !user.hasFaceRegistered ? 'bg-amber-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{user.controlNumber}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        user.hasFaceRegistered
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{user.fullName}</span>
                    </div>
                  </td>
                  {activeTab === 'STUDENT' && (
                    <td className="px-4 py-3 text-gray-600">{user.career?.code || '—'}</td>
                  )}
                  <td className="px-4 py-3">
                    {user.hasFaceRegistered ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle className="w-3.5 h-3.5" /> Registrado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                        <AlertTriangle className="w-3.5 h-3.5" /> Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!user.hasFaceRegistered ? (
                        <Link href={`/admin/users/${user.id}/enroll`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-colors"
                          style={{ backgroundColor: 'var(--navy)' }}
                        >
                          <Camera className="w-3 h-3" /> Registrar Rostro
                        </Link>
                      ) : (
                        <Link href={`/admin/users/${user.id}/enroll`}
                          className="p-1.5 rounded-md hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Re-registrar">
                          <Camera className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      <button onClick={() => handleEdit(user)}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Editar">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(user.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
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
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">{'|<'}</button>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">{'<'}</button>
            {Array.from({ length: Math.min(5, Math.ceil(total/15)) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                  p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => p+1)} disabled={page*15 >= total}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">{'>'}</button>
            <button onClick={() => setPage(Math.ceil(total/15))} disabled={page*15 >= total}
              className="px-2 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">{'>|'}</button>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar' : 'Nuevo'} {activeTab === 'STUDENT' ? 'Estudiante' : 'Docente'}
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
                  {editingId ? 'Guardar Cambios' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
