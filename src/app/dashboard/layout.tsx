'use client';

import DashboardHeader from '@/components/DashboardHeader';
import DashboardSidebar from '@/components/DashboardSidebar';
import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const verifyDashboardAccess = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        localStorage.removeItem('isAuthenticated');
        document.cookie = 'isAuthenticated=; path=/; max-age=0';
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        notify.error('Please sign in again to continue');
        router.push('/');
        return;
      }

      const { data, error } = await supabase
        .from('admin_profile')
        .select('uuid, is_active')
        .eq('uuid', user.id)
        .limit(2);

      const adminProfile = data?.[0] ?? null;

      if (error || !adminProfile?.is_active || (data?.length ?? 0) !== 1) {
        await supabase.auth.signOut();
        localStorage.removeItem('isAuthenticated');
        document.cookie = 'isAuthenticated=; path=/; max-age=0';
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        notify.error('Your admin session is invalid. Please sign in again');
        router.push('/');
        return;
      }

      localStorage.setItem('isAuthenticated', 'true');
      document.cookie = 'isAuthenticated=true; path=/; max-age=86400; samesite=lax';
      setIsAuthenticated(true);
      setIsCheckingAuth(false);
    };

    verifyDashboardAccess();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader
        isSidebarCollapsed={isSidebarCollapsed}
        onSidebarToggle={() => setIsSidebarCollapsed((current) => !current)}
        onMobileMenuToggle={() => setIsMobileMenuOpen((current) => !current)}
      />
      <DashboardSidebar
        isCollapsed={isSidebarCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuClose={() => setIsMobileMenuOpen(false)}
      />
      <main
        className={`pt-16 transition-[margin] duration-300 ${
          isSidebarCollapsed ? 'ml-0 md:ml-20' : 'ml-0 md:ml-64'
        }`}
      >
        {children}
      </main>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
