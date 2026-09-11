"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  X,
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
  ChevronDown,
  Banknote,
} from "lucide-react";

type NavChild = { href: string; label: string; icon: typeof LayoutDashboard };

const navItems: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  children?: NavChild[];
}[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/booking", icon: Calendar, label: "Booking" },
  { href: "/dashboard/user-management", icon: Users, label: "User Mgt" },
  { href: "/dashboard/transactions", icon: Receipt, label: "Transactions" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/dashboard/ride-map", icon: Map, label: "Ride Map" },
  { href: "/dashboard/settings", icon: Settings, label: "Account Settings" },
  { href: "/dashboard/wallet", icon: Wallet, label: "Wallet" },
  { href: "/dashboard/support", icon: Headphones, label: "Support" },
  { href: "/dashboard/broadcast", icon: Radio, label: "Broadcast" },
  { href: "/dashboard/emergency", icon: AlertTriangle, label: "Emergency" },
  {
    href: "/dashboard/driver-management",
    icon: Car,
    label: "Driver Management",
  },
  {
    href: "/dashboard/admin-management",
    icon: UserCog,
    label: "Admin Management",
    children: [
      {
        href: "/dashboard/admin-management",
        label: "Crt/Mgt Admin",
        icon: UserCog,
      },
      {
        href: "/dashboard/admin-management/pricing",
        label: "Manage Pricing",
        icon: Banknote,
      },
    ],
  },
];

// A single icon rendered at two sizes, one shown on desktop when the rail is
// collapsed and one shown everywhere else. Centralized here since every nav
// row (parent items, child items via their own icon, and Logout) needs it.
function NavIcon({
  icon: Icon,
  isCollapsed,
}: {
  icon: typeof LayoutDashboard;
  isCollapsed: boolean;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${
        isCollapsed ? "md:h-9 md:w-9" : "h-6 w-6"
      }`}
    >
      <Icon size={20} className={isCollapsed ? "md:hidden" : ""} />
      <Icon size={22} className={isCollapsed ? "hidden md:block" : "hidden"} />
    </span>
  );
}

function navRowClasses(isCollapsed: boolean, isActive: boolean) {
  return `flex items-center gap-3 rounded-lg px-4 py-3 transition ${
    isCollapsed ? "md:justify-center md:px-0" : ""
  } ${
    isActive
      ? "bg-blue-600 text-white"
      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
  }`;
}

// Nested items intentionally read lighter than top-level ones (a tinted
// background + colored text, not a solid fill) so the sidebar keeps a clear
// sense of hierarchy: "you're inside a section" looks different from
// "this is the current top-level page."
function childRowClasses(isActive: boolean) {
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
    isActive
      ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
  }`;
}

type DashboardSidebarProps = {
  isCollapsed: boolean;
  isMobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
};

export default function DashboardSidebar({
  isCollapsed,
  isMobileMenuOpen,
  onMobileMenuClose,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    const activeParent = navItems.find((item) =>
      item.children?.some((child) => pathname === child.href),
    );

    if (activeParent) {
      setOpenMenu(activeParent.href);
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    document.cookie = "isAuthenticated=; path=/; max-age=0"; // Clear cookie
    router.push("/");
  };

  return (
    <aside
      className={`sidebar-scroll fixed left-0 top-16 bottom-0 w-72 sm:w-80 bg-white dark:bg-gray-800 shadow-2xl md:shadow-none overflow-y-auto transition-all duration-300 z-50 ${
        isCollapsed ? "md:w-20" : "md:w-64"
      } ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
        <button
          type="button"
          onClick={onMobileMenuClose}
          aria-label="Close menu"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.children) {
            const isParentActive =
              pathname === item.href ||
              item.children.some((child) => pathname === child.href);
            const isOpen = openMenu === item.href;

            return (
              <div key={item.href}>
                {/* Desktop, collapsed rail: no room for a submenu, so this
                    is just a link to the section's landing page. Hidden
                    below md and whenever the rail isn't collapsed. */}
                <Link
                  href={item.href}
                  title={item.label}
                  onClick={onMobileMenuClose}
                  className={`hidden ${
                    isCollapsed ? "md:flex" : ""
                  } ${navRowClasses(true, isParentActive)}`}
                >
                  <NavIcon icon={Icon} isCollapsed />
                </Link>

                {/* Mobile (always) and desktop when expanded: full dropdown. */}
                <div className={isCollapsed ? "md:hidden" : ""}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMenu((current) =>
                        current === item.href ? null : item.href,
                      )
                    }
                    title={item.label}
                    className={`w-full ${navRowClasses(false, isParentActive)}`}
                  >
                    <NavIcon icon={Icon} isCollapsed={false} />
                    <span className="flex-1 text-left font-medium">
                      {item.label}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-4 dark:border-gray-700">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = pathname === child.href;

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onMobileMenuClose}
                            className={childRowClasses(isChildActive)}
                          >
                            <ChildIcon size={16} className="shrink-0" />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={onMobileMenuClose}
              className={navRowClasses(isCollapsed, isActive)}
            >
              <NavIcon icon={Icon} isCollapsed={isCollapsed} />
              <span className={`font-medium ${isCollapsed ? "md:hidden" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          title="Logout"
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition ${
            isCollapsed ? "md:justify-center" : ""
          }`}
        >
          <NavIcon icon={LogOut} isCollapsed={isCollapsed} />
          <span className={`font-medium ${isCollapsed ? "md:hidden" : ""}`}>
            Logout
          </span>
        </button>
      </div>

      <style jsx>{`
        /* Slim, low-key scrollbar */
        .sidebar-scroll {
          scrollbar-width: thin; /* Firefox */
          scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.4);
          border-radius: 9999px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.65);
        }
      `}</style>
    </aside>
  );
}
