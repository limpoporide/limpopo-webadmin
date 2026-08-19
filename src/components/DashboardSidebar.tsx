'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard,
  Calendar,
  Users,
  Receipt,
  BarChart3,
  Map,
  Settings,
  Wallet,
  Headphones,
  Radio,
  AlertTriangle,
  Car,
  UserCog,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/booking', icon: Calendar, label: 'Booking' },
  { href: '/dashboard/customers', icon: Users, label: 'Customers' },
  { href: '/dashboard/transactions', icon: Receipt, label: 'Transactions' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/ride-map', icon: Map, label: 'Ride Map' },
  { href: '/dashboard/settings', icon: Settings, label: 'Account Settings' },
  { href: '/dashboard/wallet', icon: Wallet, label: 'Wallet' },
  { href: '/dashboard/support', icon: Headphones, label: 'Support' },
  { href: '/dashboard/broadcast', icon: Radio, label: 'Broadcast' },
  { href: '/dashboard/emergency', icon: AlertTriangle, label: 'Emergency' },
  { href: '/dashboard/driver-management', icon: Car, label: 'Driver Management' },
  { href: '/dashboard/admin-management', icon: UserCog, label: 'Admin Management' },
];

type DashboardSidebarProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
};

export default function DashboardSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileMenuOpen,
  onMobileMenuClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    document.cookie = 'isAuthenticated=; path=/; max-age=0'; // Clear cookie
    router.push('/');
  };

  return (
    <aside
      className={`fixed left-0 top-16 bottom-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-all duration-300 z-50 ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 hidden md:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          {!isCollapsed && <span className="font-medium">Collapse</span>}
        </button>
      </div>

      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={onMobileMenuClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isCollapsed ? 'md:justify-center' : ''
              } ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon size={20} />
              <span className={`font-medium ${isCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          title="Logout"
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition ${
            isCollapsed ? 'md:justify-center' : ''
          }`}
        >
          <LogOut size={20} />
          <span className={`font-medium ${isCollapsed ? 'md:hidden' : ''}`}>Logout</span>
        </button>
      </div>
    </aside>
  );
}
