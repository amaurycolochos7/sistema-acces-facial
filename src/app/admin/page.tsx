import {
  Users,
  LogIn,
  LogOut as LogOutIcon,
  UserCheck,
  WifiOff,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
  color: string;
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
          {trendUp ? (
            <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
          )}
          <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Summary Label */}
      <p className="text-sm font-medium text-gray-500 mb-3">Resumen del Día</p>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Entradas"
          value={0}
          icon={LogIn}
          trend="vs. ayer"
          trendUp={true}
          color="bg-green-50 text-green-600"
        />
        <MetricCard
          title="Total Salidas"
          value={0}
          icon={LogOutIcon}
          trend="vs. ayer"
          trendUp={false}
          color="bg-red-50 text-red-600"
        />
        <MetricCard
          title="Alumnos Adentro"
          value={0}
          icon={UserCheck}
          color="bg-blue-50 text-blue-600"
        />
        <MetricCard
          title="Registros Offline"
          value={0}
          icon={WifiOff}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Entries/Exits by Hour */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Entradas/Salidas por Hora</h3>
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p>Los datos aparecerán cuando haya registros</p>
            </div>
          </div>
        </div>

        {/* Top Temporary Exits */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Alumnos con más Salidas Temporales (Hoy)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-gray-500 font-medium">Nombre</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Carrera</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Total Salidas</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={3} className="py-8 text-center text-gray-400">
                    Sin registros hoy
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
