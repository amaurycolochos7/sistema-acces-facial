'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  Clock,
  CalendarDays,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

const menuItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Usuarios', href: '/admin/users', icon: Users },
  { label: 'Registros', href: '/admin/access-logs', icon: ClipboardList },
  { label: 'Motivos de Salida', href: '/admin/exit-reasons', icon: DoorOpen },
  { label: 'Carreras', href: '/admin/careers', icon: GraduationCap },
  { label: 'Horarios', href: '/admin/schedules', icon: Clock },
  { label: 'Períodos', href: '/admin/periods', icon: CalendarDays },
  { label: 'Administradores', href: '/admin/admins', icon: UserCog },
  { label: 'Reportes', href: '/admin/reports', icon: BarChart3 },
  { label: 'Configuración', href: '/admin/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] flex flex-col"
      style={{ backgroundColor: 'var(--navy)' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">TecNM</p>
            <p className="text-white/60 text-xs">Venustiano Carranza</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/15 text-white border-l-2 border-white'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/8 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
