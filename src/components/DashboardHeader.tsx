'use client';

import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import { Bell, Sun, Moon, LogOut, User, Menu, Calendar } from 'lucide-react';

type DashboardHeaderProps = {
  onMobileMenuToggle: () => void;
};

export default function DashboardHeader({ onMobileMenuToggle }: DashboardHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    document.cookie = 'isAuthenticated=; path=/; max-age=0'; // Clear cookie
    router.push('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-40">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onMobileMenuToggle}
            className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            aria-label="Toggle mobile menu"
          >
            <Menu size={20} className="text-gray-600 dark:text-gray-300" />
          </button>

          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative h-8 w-8 md:h-10 md:w-10 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
              <Image
                src="/limpopo-logo.png"
                alt="Limpopo logo"
                fill
                sizes="40px"
                className="object-contain p-1"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                Limpopo Ride
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Quick Bookings Button */}
          <button className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
            <Calendar size={18} />
            <span className="text-sm font-semibold">Quick Bookings</span>
          </button>

          {/* Wallet Balance */}
          <div className="hidden sm:flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <span className="text-sm md:text-base font-bold text-green-600 dark:text-green-400">₦</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              12,450.00
            </span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="hidden sm:block p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            {theme === 'dark' ? (
              <Sun size={20} className="text-yellow-500" />
            ) : (
              <Moon size={20} className="text-gray-600" />
            )}
          </button>

          {/* Profile Avatar */}
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <User size={16} className="md:w-5 md:h-5 text-white" />
          </div>

          {/* Logout - Hidden on mobile */}
          <button
            onClick={handleLogout}
            className="hidden md:block p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
            title="Logout"
          >
            <LogOut size={20} className="text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
