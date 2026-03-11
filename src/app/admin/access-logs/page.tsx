'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, LogIn, LogOut, WifiOff, Calendar } from 'lucide-react';

interface AccessLogEntry {
  id: string;
  type: 'ENTRY' | 'EXIT';
  timestamp: string;
  confidence: number | null;
  punctuality: string | null;
  isOfflineSync: boolean;
  exitNote: string | null;
  user: { fullName: string; controlNumber: string; role: string; career: { code: string } | null };
  exitReason: { name: string; icon: string } | null;
}

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<AccessLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (typeFilter) params.set('type', typeFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const res = await fetch(`/api/access-logs?${params}`);
    const data = await res.json();
    setLogs(data.logs);
    setTotal(data.total);
    setLoading(false);
  }, [page, typeFilter, dateFrom, dateTo]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const punctualityBadge = (p: string | null) => {
    if (!p) return null;
    const styles: Record<string, string> = {
      ON_TIME: 'bg-green-50 text-green-700',
      LATE: 'bg-amber-50 text-amber-700',
      ABSENT: 'bg-red-50 text-red-700',
    };
    const labels: Record<string, string> = { ON_TIME: 'A tiempo', LATE: 'Retardo', ABSENT: 'Falta' };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[p] || ''}`}>{labels[p]}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Registros de Acceso</h1>
          <p className="text-sm text-gray-500">{total} registros</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20">
          <option value="">Todos los tipos</option>
          <option value="ENTRY">Entradas</option>
          <option value="EXIT">Salidas</option>
        </select>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
          <span className="text-gray-400">—</span>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Hora</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Tipo</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Usuario</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Carrera</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Puntualidad</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Motivo</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Confianza</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Sync</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Cargando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Sin registros</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600 tabular-nums">
                  {new Date(log.timestamp).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    log.type === 'ENTRY' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {log.type === 'ENTRY' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                    {log.type === 'ENTRY' ? 'Entrada' : 'Salida'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{log.user.fullName}</p>
                  <p className="text-xs text-gray-400">{log.user.controlNumber}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{log.user.career?.code || '—'}</td>
                <td className="px-4 py-3">{punctualityBadge(log.punctuality)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {log.exitReason ? `${log.exitReason.icon} ${log.exitReason.name}` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-500 tabular-nums">{log.confidence ? `${(log.confidence * 100).toFixed(0)}%` : '—'}</td>
                <td className="px-4 py-3">
                  {log.isOfflineSync && <WifiOff className="w-3.5 h-3.5 text-amber-500" title="Sincronizado offline" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 30 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">Mostrando {((page-1)*30)+1}–{Math.min(page*30, total)} de {total}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">Anterior</button>
            <button onClick={() => setPage(p => p+1)} disabled={page*30 >= total}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
