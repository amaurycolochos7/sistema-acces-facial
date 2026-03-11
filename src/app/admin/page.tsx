'use client';

import { useState, useEffect } from 'react';
import {
  LogIn, LogOut as LogOutIcon, UserCheck, WifiOff, Clock,
  ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

interface DashboardData {
  metrics: {
    todayEntries: number; todayExits: number; todayLate: number;
    insideCount: number; offlineSync: number;
    entryTrend: string; exitTrend: string;
    entryTrendUp: boolean; exitTrendUp: boolean;
  };
  hourlyData: { hour: string; entries: number; exits: number }[];
  punctuality: { onTime: number; late: number; absent: number };
  topExitUsers: { name: string; career: string; exits: number }[];
  recentLogs: {
    id: string; type: string; timestamp: string; punctuality: string | null;
    confidence: number | null; userName: string; controlNumber: string;
    career: string; exitReason: string | null;
  }[];
}

const COLORS = ['#22C55E', '#F59E0B', '#EF4444'];

function MetricCard({ title, value, icon: Icon, trend, trendUp, color }: {
  title: string; value: string | number; icon: React.ElementType;
  trend?: string; trendUp?: boolean; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          {trendUp ? <ArrowUpRight className="w-3.5 h-3.5 text-green-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
          <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>{trend}</span>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard');
        setData(await res.json());
      } catch { /* empty */ }
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Cargando dashboard...</div>;
  }

  const punctualityData = [
    { name: 'A tiempo', value: data.punctuality.onTime },
    { name: 'Retardo', value: data.punctuality.late },
    { name: 'Falta', value: data.punctuality.absent },
  ].filter(d => d.value > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Resumen del día — se actualiza cada 30 segundos</p>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard title="Total Entradas" value={data.metrics.todayEntries} icon={LogIn}
          trend={data.metrics.entryTrend} trendUp={data.metrics.entryTrendUp}
          color="bg-green-50 text-green-600" />
        <MetricCard title="Total Salidas" value={data.metrics.todayExits} icon={LogOutIcon}
          trend={data.metrics.exitTrend} trendUp={data.metrics.exitTrendUp}
          color="bg-red-50 text-red-600" />
        <MetricCard title="Retardos Hoy" value={data.metrics.todayLate} icon={Clock}
          color="bg-amber-50 text-amber-600" />
        <MetricCard title="Adentro Ahora" value={data.metrics.insideCount} icon={UserCheck}
          color="bg-blue-50 text-blue-600" />
        <MetricCard title="Sync Offline" value={data.metrics.offlineSync} icon={WifiOff}
          color="bg-gray-100 text-gray-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Hourly Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Entradas / Salidas por Hora</h3>
          {data.hourlyData.some(d => d.entries > 0 || d.exits > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.hourlyData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="entries" name="Entradas" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="exits" name="Salidas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              Sin registros hoy. Los datos aparecerán al usar el kiosco.
            </div>
          )}
        </div>

        {/* Punctuality Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Puntualidad</h3>
          {punctualityData.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={punctualityData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                    paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                    {punctualityData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {[
                  { label: 'A tiempo', color: '#22C55E', value: data.punctuality.onTime },
                  { label: 'Retardo', color: '#F59E0B', value: data.punctuality.late },
                  { label: 'Falta', color: '#EF4444', value: data.punctuality.absent },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-600">{item.label}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Exits */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Alumnos con más Salidas (Hoy)</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Nombre</th>
                <th className="text-left py-2 text-gray-500 font-medium">Carrera</th>
                <th className="text-right py-2 text-gray-500 font-medium">Salidas</th>
              </tr>
            </thead>
            <tbody>
              {data.topExitUsers.length === 0 ? (
                <tr><td colSpan={3} className="py-8 text-center text-gray-400">Sin registros hoy</td></tr>
              ) : data.topExitUsers.map((u, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2.5 font-medium text-gray-900">{u.name}</td>
                  <td className="py-2.5 text-gray-600">{u.career}</td>
                  <td className="py-2.5 text-right">
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">{u.exits}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Últimos Registros</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.recentLogs.length === 0 ? (
              <p className="py-8 text-center text-gray-400 text-sm">Sin registros hoy</p>
            ) : data.recentLogs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  log.type === 'ENTRY' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {log.type === 'ENTRY' ? <LogIn className="w-3.5 h-3.5 text-green-600" /> : <LogOutIcon className="w-3.5 h-3.5 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{log.userName}</p>
                  <p className="text-xs text-gray-400">{log.controlNumber} · {log.career}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {log.punctuality === 'LATE' && <span className="text-xs text-amber-600 font-medium">Retardo</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
