"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Menu,
  ClipboardList,
  Umbrella,
  Settings,
  User,
} from "lucide-react";

interface SiteHeaderProps {
  rightActions?: React.ReactNode;
  schoolName?: string;
}

export function SiteHeader({ rightActions, schoolName = "1ο Πειραματικό Δημοτικό" }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="h-9 flex-none border-b border-zinc-200 bg-white px-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(true)}
            className="h-7 w-7 p-0 text-zinc-600 hover:bg-zinc-100 rounded-md -ml-1 mr-1"
          >
            <Menu className="w-4 h-4" />
          </Button>

          <div className="h-5 w-5 rounded bg-zinc-900 flex items-center justify-center text-white text-[11px] font-bold">
            <CalendarDays className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 hidden sm:inline-block">
            {schoolName}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono">
          {rightActions}
        </div>
      </header>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-white border-r border-zinc-200">
          <div className="h-14 flex items-center px-4 border-b border-zinc-100 flex-none">
            <div className="h-6 w-6 rounded bg-zinc-900 flex items-center justify-center text-white mr-2">
              <CalendarDays className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-zinc-800">metaSchool</span>
          </div>

          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname === "/" ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <CalendarDays className={`w-4 h-4 ${pathname === "/" ? "text-zinc-700" : "text-zinc-400"}`} />
              Πρόγραμμα
            </Link>
            <button className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
              <ClipboardList className="w-4 h-4 text-zinc-400" />
              Εφημερίες
            </button>
            <button className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
              <Umbrella className="w-4 h-4 text-zinc-400" />
              Άδειες
            </button>
          </div>

          <div className="border-t border-zinc-100 p-3 flex flex-col gap-1 flex-none">
            <Link
              href="/settings"
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                pathname.startsWith("/settings") ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <Settings className={`w-4 h-4 ${pathname.startsWith("/settings") ? "text-zinc-700" : "text-zinc-400"}`} />
              Ρυθμίσεις
            </Link>
            <div className="h-px bg-zinc-100 my-1 mx-2" />
            <button className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors">
              <User className="w-4 h-4 text-zinc-400" />
              <div className="flex flex-col items-start text-left">
                <span className="leading-none">Είσοδος</span>
                <span className="text-[10px] text-zinc-400 mt-1 font-normal">Δεν έχετε συνδεθεί</span>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
