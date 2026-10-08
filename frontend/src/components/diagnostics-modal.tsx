"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConflictDiagnosticItem } from "@/types";
import {
  AlertTriangle,
  Users,
  GraduationCap,
  BookOpen,
  Sliders,
  ArrowRight,
  Lightbulb,
  Copy,
  Check,
  RotateCw,
  X,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosticItems: ConflictDiagnosticItem[];
  conflicts?: string[];
  onNavigateToTab?: (tab: "teachers" | "classes" | "subjects" | "rules", targetId?: string) => void;
  onRetrySolve?: () => void;
  onRunDeepDiagnostics?: () => void;
  isDeepDiagnosing?: boolean;
}

export function DiagnosticsModal({
  isOpen,
  onClose,
  diagnosticItems,
  conflicts = [],
  onNavigateToTab,
  onRetrySolve,
  onRunDeepDiagnostics,
  isDeepDiagnosing = false,
}: DiagnosticsModalProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  // If no structured items but conflicts array exists, create fallback items
  const items: ConflictDiagnosticItem[] = diagnosticItems && diagnosticItems.length > 0
    ? diagnosticItems
    : conflicts.map((c, i) => ({
        id: `conf_${i}`,
        category: "general" as const,
        title: "Εντοπισμός Ασυμβατότητας",
        description: c,
        suggestion: "Ελέγξτε τις ρυθμίσεις του προγράμματος και τις διαθεσιμότητες.",
        targetTab: "rules" as const,
        severity: "error" as const,
      }));

  const teacherCount = items.filter((it) => it.category === "teacher").length;
  const classCount = items.filter((it) => it.category === "class").length;
  const subjectCount = items.filter((it) => it.category === "subject").length;
  const generalCount = items.filter((it) => it.category === "general").length;

  const filteredItems = items.filter((it) => {
    if (activeCategory === "all") return true;
    return it.category === activeCategory;
  });

  const handleCopyReport = () => {
    const text = items
      .map(
        (it, idx) =>
          `[${idx + 1}] ${it.title}\nΠρόβλημα: ${it.description}\nΠρόταση: ${it.suggestion}\n`
      )
      .join("\n---\n\n");

    navigator.clipboard.writeText(`=== ΑΝΑΦΟΡΑ ΔΙΑΓΝΩΣΗΣ ΩΡΟΛΟΓΙΟΥ ΠΡΟΓΡΑΜΜΑΤΟΣ ===\n\n${text}`);
    setCopied(true);
    toast.success("Η αναφορά διάγνωσης αντιγράφηκε στο πρόχειρο!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "teacher":
        return (
          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] gap-1 py-0.5">
            <Users className="w-3 h-3" />
            Εκπαιδευτικός
          </Badge>
        );
      case "class":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 py-0.5">
            <GraduationCap className="w-3 h-3" />
            Τμήμα
          </Badge>
        );
      case "subject":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] gap-1 py-0.5">
            <BookOpen className="w-3 h-3" />
            Μάθημα
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] gap-1 py-0.5">
            <Sliders className="w-3 h-3" />
            Γενικός Κανόνας
          </Badge>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border border-zinc-200 shadow-2xl rounded-2xl">
        {/* Header with Warm Diagnostic Theme */}
        <div className="bg-gradient-to-r from-red-50/80 via-amber-50/50 to-orange-50/60 p-5 border-b border-zinc-200/80">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-100/90 text-red-600 flex items-center justify-center flex-none ring-4 ring-red-50 shadow-xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-zinc-900">
                  Διάγνωση Ασυμβατοτήτων Προγράμματος
                </DialogTitle>
                <Badge variant="outline" className="bg-red-500 text-white font-bold border-red-600 text-[10px] px-1.5 py-0">
                  {items.length} {items.length === 1 ? "Σύγκρουση" : "Συγκρούσεις"}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-zinc-600 mt-1 leading-relaxed">
                Ο αλγόριθμος δεν μπόρεσε να δημιουργήσει έγκυρο πρόγραμμα λόγω αντικρουόμενων περιορισμών. Παρακάτω παρατίθενται οι εντοπισμένες συγκρούσεις και προτάσεις άμεσης διόρθωσης.
              </DialogDescription>
            </div>
          </div>

          {/* Deep Diagnostics CTA (only show if not already probed) */}
          {!isDeepDiagnosing && onRunDeepDiagnostics && !items.some(i => i.id.startsWith("probe_") || i.id === "deep_no_single_cause") && (
            <div className="mt-4 bg-white/70 border border-amber-200/60 rounded-xl p-3 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-zinc-900">Δεν είναι ξεκάθαρο το πρόβλημα;</h4>
                  <p className="text-xs text-zinc-600 mt-0.5">Εκτελέστε Βαθιά Διάγνωση για να ελέγξει ο αλγόριθμος τους κανόνες έναν-έναν και να βρει ακριβώς τι φταίει.</p>
                </div>
                <Button 
                  onClick={onRunDeepDiagnostics} 
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm h-8"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Βαθιά Διάγνωση
                </Button>
              </div>
            </div>
          )}
          
          {/* Deep Diagnostics Loading State */}
          {isDeepDiagnosing && (
            <div className="mt-4 bg-white/70 border border-amber-200/60 rounded-xl p-4 shadow-xs flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-zinc-200 border-t-amber-500 rounded-full animate-spin" />
              <div className="text-center">
                <h4 className="text-sm font-bold text-zinc-900">Εκτέλεση Βαθιάς Διάγνωσης...</h4>
                <p className="text-xs text-zinc-600 mt-1">Ο αλγόριθμος αναλύει τις συγκρούσεις. Αυτό μπορεί να διαρκέσει λίγο (~30 δευτερόλεπτα).</p>
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-zinc-200/60 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === "all"
                  ? "bg-zinc-900 text-white shadow-xs"
                  : "bg-white/80 text-zinc-600 hover:bg-white border border-zinc-200/70"
              }`}
            >
              Όλα ({items.length})
            </button>

            {teacherCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory("teacher")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === "teacher"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "bg-white/80 text-sky-800 hover:bg-sky-50 border border-sky-200/70"
                }`}
              >
                <Users className="w-3 h-3" />
                Εκπαιδευτικοί ({teacherCount})
              </button>
            )}

            {classCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory("class")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === "class"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white/80 text-emerald-800 hover:bg-emerald-50 border border-emerald-200/70"
                }`}
              >
                <GraduationCap className="w-3 h-3" />
                Τμήματα ({classCount})
              </button>
            )}

            {subjectCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory("subject")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === "subject"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-white/80 text-purple-800 hover:bg-purple-50 border border-purple-200/70"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                Μαθήματα ({subjectCount})
              </button>
            )}

            {generalCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveCategory("general")}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  activeCategory === "general"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-white/80 text-amber-800 hover:bg-amber-50 border border-amber-200/70"
                }`}
              >
                <Sliders className="w-3 h-3" />
                Γενικά ({generalCount})
              </button>
            )}
          </div>
        </div>

        {/* Conflict Cards List */}
        <div className="max-h-[55vh] overflow-y-auto p-4 space-y-3 bg-zinc-50/50">
          {filteredItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs space-y-2.5 hover:border-zinc-300 transition-all"
            >
              {/* Card Header: Category Badge & Title */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {getCategoryBadge(item.category)}
                  <h4 className="font-bold text-xs text-zinc-900 leading-tight">
                    {item.title}
                  </h4>
                </div>
                {item.severity === "error" ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                    Κρίσιμο
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Προειδοποίηση
                  </span>
                )}
              </div>

              {/* Problem Description */}
              <p className="text-xs text-zinc-600 leading-relaxed pl-1">
                {item.description}
              </p>

              {/* Actionable Suggestion Box */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2.5 flex items-start gap-2 text-xs text-emerald-950">
                <Lightbulb className="w-3.5 h-3.5 text-emerald-600 flex-none mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <span className="font-semibold text-emerald-800">Προτεινόμενη Λύση: </span>
                  {item.suggestion}
                </div>
              </div>

              {/* Quick Navigation Button */}
              {item.targetTab && onNavigateToTab && (
                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onNavigateToTab(item.targetTab!, item.targetId);
                    }}
                    className="h-7 text-xs font-semibold text-zinc-800 border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer shadow-2xs"
                  >
                    Μετάβαση για Διόρθωση
                    <ArrowRight className="w-3.5 h-3.5 ml-1 text-zinc-600" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyReport}
            className="h-8 text-xs text-zinc-600 hover:text-zinc-900 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Αντιγράφηκε
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1" />
                Αντιγραφή Αναφοράς
              </>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs border-zinc-200 hover:bg-zinc-100 cursor-pointer"
            >
              Κλείσιμο
            </Button>

            {onRetrySolve && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onClose();
                  onRetrySolve();
                }}
                className="h-8 text-xs bg-zinc-900 text-white hover:bg-zinc-800 font-semibold cursor-pointer shadow-xs"
              >
                <RotateCw className="w-3.5 h-3.5 mr-1" />
                Επανάληψη Επίλυσης
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
