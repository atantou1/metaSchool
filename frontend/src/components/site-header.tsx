"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Menu,
  ClipboardList,
  Umbrella,
  Settings,
  User,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";

interface SiteHeaderProps {
  rightActions?: React.ReactNode;
  schoolName?: string;
  activeScheduleName?: string | null;
}

export function SiteHeader({ rightActions, schoolName = "1ο Πειραματικό Δημοτικό", activeScheduleName }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header className="h-9 flex-none border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(true)}
            className="h-7 w-7 p-0 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md -ml-1 mr-1"
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="h-5 w-5 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-[11px] font-bold">
            <CalendarDays className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 hidden sm:inline-flex items-center">
            {schoolName}
            {activeScheduleName ? (
              <>
                <span className="mx-1.5 text-zinc-400 dark:text-zinc-600">/</span>
                <span className="font-normal text-zinc-600 dark:text-zinc-400">
                  {activeScheduleName}
                </span>
              </>
            ) : (
              <>
                <span className="mx-1.5 text-zinc-400 dark:text-zinc-600">/</span>
                <span className="font-normal italic text-zinc-500 dark:text-zinc-500">
                  Μη αποθηκευμένο (Νέο)
                </span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono">
          {rightActions}
        </div>
      </header>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
          <div className="h-14 flex items-center px-4 border-b border-zinc-100 dark:border-zinc-800 flex-none">
            <div className="h-6 w-6 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 mr-2">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">metaSchool</span>
          </div>

          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <CalendarDays className={`w-4 h-4 ${pathname === "/" ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-500"}`} />
              Πρόγραμμα
            </Link>
            <button className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-left">
              <ClipboardList className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              Εφημερίες
            </button>
            <Link
              href="/leaves"
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/leaves"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Umbrella className={`w-4 h-4 ${pathname === "/leaves" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"}`} />
              Άδειες
            </Link>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 p-3 flex flex-col gap-2 flex-none">
            {/* Theme Selector Toggle */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {mounted && theme === "dark" ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                ) : mounted && theme === "light" ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>Θέμα</span>
              </div>
              <div className="flex items-center gap-0.5 bg-zinc-200/70 dark:bg-zinc-800 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setTheme("light")}
                  className={`p-1 rounded text-xs transition-all ${
                    mounted && theme === "light"
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                  title="Φωτεινό"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("dark")}
                  className={`p-1 rounded text-xs transition-all ${
                    mounted && theme === "dark"
                      ? "bg-zinc-700 text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                  title="Σκούρο"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme("system")}
                  className={`p-1 rounded text-xs transition-all ${
                    mounted && theme === "system"
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }`}
                  title="Αυτόματο (Σύστημα)"
                >
                  <Laptop className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <Link
              href="/settings"
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith("/settings")
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              <Settings className={`w-4 h-4 ${pathname.startsWith("/settings") ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-500"}`} />
              Ρυθμίσεις
            </Link>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-0.5 mx-2" />

            <button className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors text-left">
              <User className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <div className="flex flex-col items-start text-left">
                <span className="leading-none text-xs font-medium">Είσοδος</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 font-normal">Δεν έχετε συνδεθεί</span>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
