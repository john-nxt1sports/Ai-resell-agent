"use client";

import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { AIAssistant } from "./AIAssistant";
import { cn } from "@/lib/utils";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-dark-950">
      <Navbar />
      <Sidebar />
      <AIAssistant />

      <main className={cn("pt-16 transition-all duration-300", "lg:pl-64")}>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
