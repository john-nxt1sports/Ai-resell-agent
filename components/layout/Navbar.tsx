"use client";

import { useUIStore } from "@/store/uiStore";
import {
  Menu,
  X,
  Bell,
  User,
  Moon,
  Sun,
  Sparkles,
  Check,
  Package,
  DollarSign,
  TrendingUp,
  Crown,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

export function Navbar() {
  const { sidebarOpen, toggleSidebar, toggleAIAssistant } = useUIStore();
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      type: "sale",
      icon: DollarSign,
      iconBg: "bg-green-500",
      title: "Item Sold!",
      message: "Nike Air Jordan 1 sold for $249.99",
      time: "5m ago",
      unread: true,
    },
    {
      id: 2,
      type: "like",
      icon: TrendingUp,
      iconBg: "bg-blue-500",
      title: "New Likes",
      message: "Your listing received 12 new likes",
      time: "1h ago",
      unread: true,
    },
    {
      id: 3,
      type: "shipped",
      icon: Package,
      iconBg: "bg-purple-500",
      title: "Ready to Ship",
      message: "Apple AirPods Pro needs shipping",
      time: "2h ago",
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 w-full border-b border-dark-200 dark:border-dark-800 bg-white/95 dark:bg-dark-900/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AR</span>
            </div>
            <h1 className="hidden sm:block text-xl font-semibold text-dark-900 dark:text-dark-50">
              AI Resell Agent
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pricing"
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Crown className="h-4 w-4" />
            Upgrade
          </Link>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-dark-400" />
            ) : (
              <Moon className="h-5 w-5 text-dark-600" />
            )}
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={toggleNotifications}
              className="relative p-2 rounded-lg hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-dark-600 dark:text-dark-400" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-dark-900 rounded-xl shadow-2xl border border-dark-200 dark:border-dark-800 overflow-hidden z-50">
                {/* Header */}
                <div className="px-4 py-3 border-b border-dark-200 dark:border-dark-800 bg-dark-50 dark:bg-dark-800/50">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-dark-900 dark:text-dark-50">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-dark-50 dark:hover:bg-dark-800/50 cursor-pointer transition-colors border-b border-dark-100 dark:border-dark-800 last:border-b-0 ${
                          notification.unread
                            ? "bg-primary-50/50 dark:bg-primary-900/10"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`${notification.iconBg} p-2 rounded-lg flex-shrink-0`}
                          >
                            <notification.icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-sm text-dark-900 dark:text-dark-50">
                                {notification.title}
                              </p>
                              {notification.unread && (
                                <div className="h-2 w-2 bg-primary-500 rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>
                            <p className="text-sm text-dark-600 dark:text-dark-400 mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-xs text-dark-500 dark:text-dark-500 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-dark-100 dark:bg-dark-800 mb-3">
                        <Bell className="h-6 w-6 text-dark-400" />
                      </div>
                      <p className="text-sm text-dark-600 dark:text-dark-400">
                        No notifications yet
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-3 border-t border-dark-200 dark:border-dark-800 bg-dark-50 dark:bg-dark-800/50">
                    <button className="w-full text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                      Mark all as read
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={toggleAIAssistant}
            className="p-2 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white transition-all duration-200 hover:shadow-lg"
            aria-label="Toggle AI Assistant"
            title="AI Assistant"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
