import Link from "next/link";
import { Settings, CalendarClock, BriefcaseMedical, Palmtree, Users, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background text-foreground font-sans text-xs">
      <SiteHeader schoolName="metaSchool Ρυθμίσεις" />
      <div className="flex flex-1 w-full gap-6 p-6 overflow-hidden">
      {/* Sidebar Navigation */}
      <Card className="flex w-64 flex-col rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold">Ρυθμίσεις</h2>
          <p className="text-xs text-muted-foreground mt-1">Διαχείριση παραμέτρων σχολείου</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-primary"
          >
            <Settings className="h-4 w-4" />
            Γενικές
          </Link>
          <Link
            href="/settings/timetable"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-primary"
          >
            <CalendarClock className="h-4 w-4" />
            Πρόγραμμα
          </Link>
          <div
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/40 cursor-not-allowed select-none"
            title="Μη διαθέσιμο"
          >
            <BriefcaseMedical className="h-4 w-4" />
            <span>Εφημερίες</span>
          </div>
          <Link
            href="/settings/leaves"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-primary"
          >
            <Palmtree className="h-4 w-4" />
            Άδειες
          </Link>
          <Link
            href="/settings/teachers"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-primary"
          >
            <Users className="h-4 w-4" />
            Εκπαιδευτικοί
          </Link>
        </nav>
        <div className="p-4 border-t border-border">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-sm font-medium text-white dark:text-zinc-900 transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Επιστροφή στην εφαρμογή
          </Link>
        </div>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 p-6 overflow-auto">
          {children}
        </Card>
        </div>
      </div>
    </div>
  );
}
