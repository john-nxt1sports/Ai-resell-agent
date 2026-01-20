"use client";

import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  Settings,
  TrendingUp,
  HelpCircle,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Listing", href: "/listings/new", icon: PlusCircle },
  { name: "Bulk Upload", href: "/listings/bulk", icon: Upload },
  { name: "All Listings", href: "/listings", icon: Package },
  { name: "Analytics", href: "/analytics", icon: TrendingUp },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen } = useUIStore();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-dark-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => useUIStore.getState().toggleSidebar()}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 transform border-r border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <nav className="flex flex-col h-full p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                    : "text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}

          <div className="flex-1" />

          <Link
            href="/help"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === "/help"
                ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                : "text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800"
            )}
          >
            <HelpCircle className="h-5 w-5" />
            Contact Support
          </Link>
        </nav>
      </aside>
    </>
  );
}
