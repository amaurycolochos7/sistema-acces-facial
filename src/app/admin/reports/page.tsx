'use client';

import { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, Calendar, Filter, Clock,
  CheckCircle, AlertTriangle, XCircle, BarChart3,
} from 'lucide-react';

interface Career { id: string; name: string; code: string; }
interface ReportUser {
  userId: string; controlNumber: string; fullName: string; role: string;
  career: string; careerCode: string;
  summary: {
    daysPresent: number; daysOnTime: number; daysLate: number; daysAbsent: number;
    totalMinutes: number; totalHours: string; avgDailyMinutes: number; punctualityRate: number;
  };
}

export default function ReportsPage() {
  const [careers, setCareers] = useState<Career[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [careerId, setCareerId] = useState('');
  const [report, setReport] = useState<ReportUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    fetch('/api/careers').then(r => r.json()).then(setCareers).catch(() => {});
  }, []);

  const generateReport = async () => {
    setLoading(true);
    const params = new URLSearchParams({ dateFrom, dateTo });
    if (careerId) params.set('careerId', careerId);
    const res = await fetch(`/api/reports?${params}`);
    const data = await res.json();
    setReport(data.report || []);
    setGenerated(true);
    setLoading(false);
  };

  const downloadCSV = () => {
    const params = new URLSearchParams({ dateFrom, dateTo, format: 'csv' });
    if (careerId) params.set('careerId', careerId);
    window.open(`/api/reports?${params}`, '_blank');
  };

  const totalPresent = report.reduce((s, r) => s + r.summary.daysPresent, 0);
  const totalOnTime = report.reduce((s, r) => s + r.summary.daysOnTime, 0);
  const totalLate = report.reduce((s, r) => s + r.summary.daysLate, 0);
  const avgPunctuality = report.length > 0
    ? Math.round(report.reduce((s, r) => s + r.summary.punctualityRate, 0) / report.length)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-500">Horas efectivas y puntualidad por usuario</p>
        </div>
        {generated && report.length > 0 && (
          <button onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold"
            style={{ backgroundColor: 'var(--green)' }}>
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
            <select value={careerId} onChange={(e) => setCareerId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">Todas</option>
              {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button onClick={generateReport} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'var(--navy)' }}>
            <BarChart3 className="w-4 h-4" />
            {loading ? 'Generando...' : 'Generar Reporte'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {generated && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <FileSpreadsheet className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{report.length}</p>
            <p className="text-xs text-gray-500">Usuarios</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{totalOnTime}</p>
            <p className="text-xs text-gray-500">Días a Tiempo</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{totalLate}</p>
            <p className="text-xs text-gray-500">Retardos Totales</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <Clock className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{avgPunctuality}%</p>
            <p className="text-xs text-gray-500">Puntualidad Prom.</p>
          </div>
        </div>
      )}

      {/* Report Table */}
      {generated && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Control</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Carrera</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Días</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">A Tiempo</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Retardos</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Horas Tot.</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Hrs/Día</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Puntualidad</th>
              </tr>
            </thead>
            <tbody>
              {report.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400">Sin datos en el rango seleccionado</td></tr>
              ) : report.map((r) => (
                <tr key={r.userId} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.controlNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.fullName}</td>
                  <td className="px-4 py-3 text-gray-600">{r.careerCode}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{r.summary.daysPresent}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-green-700 font-medium">{r.summary.daysOnTime}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${r.summary.daysLate > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {r.summary.daysLate}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-700 font-medium">{r.summary.totalHours}h</td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {(r.summary.avgDailyMinutes / 60).toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${
                          r.summary.punctualityRate >= 80 ? 'bg-green-500' :
                          r.summary.punctualityRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        }`} style={{ width: `${r.summary.punctualityRate}%` }} />
                      </div>
                      <span className="text-xs font-medium text-gray-600">{r.summary.punctualityRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
