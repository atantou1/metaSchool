"use client";

import React, { useState, useMemo } from "react";
import { TimetableData, Rule } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  GraduationCap,
  BookOpen,
  Settings,
  Plus,
  Trash2,
  Zap,
  Info,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ConditionalRuleBuilder } from "@/components/conditional-rule-builder";
import {
  ConditionalRule,
  buildRuleSentence,
} from "@/lib/conditional-rules";

interface RulesManagerProps {
  data: TimetableData;
  onRefresh: () => void;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
  onClose?: () => void;
}

const ENFORCEMENT_LABELS: Record<string, { label: string; className: string }> = {
  hard: { label: "Υποχρεωτικός", className: "text-red-600 font-semibold" },
  soft: { label: "Προτίμηση", className: "text-amber-600 font-semibold" },
};

const ACTION_CATEGORY_COLORS: Record<string, string> = {
  simultaneity: "bg-violet-100 text-violet-700 border-violet-200",
  schedule: "bg-blue-100 text-blue-700 border-blue-200",
  gaps: "bg-amber-100 text-amber-700 border-amber-200",
  placement: "bg-green-100 text-green-700 border-green-200",
};

export const RulesManager: React.FC<RulesManagerProps> = ({
  data,
  onRefresh,
  activeTab = "rules",
  onTabChange,
  onClose,
}) => {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ConditionalRule | null>(null);

  // Cast existing rules to ConditionalRule for display (only CONDITIONAL types)
  const conditionalRules = useMemo(
    () =>
      (data.rules ?? []).filter((r) => r.type === "CONDITIONAL") as unknown as ConditionalRule[],
    [data.rules]
  );

  const legacyRules = useMemo(
    () => (data.rules ?? []).filter((r) => r.type !== "CONDITIONAL"),
    [data.rules]
  );

  const handleOpenCreate = () => {
    setEditingRule(null);
    setIsBuilderOpen(true);
  };

  const handleEdit = (rule: ConditionalRule) => {
    setEditingRule(rule);
    setIsBuilderOpen(true);
  };

  const handleSave = async (
    ruleData: Omit<ConditionalRule, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const payload = {
        id: editingRule?.id,
        name: ruleData.name,
        type: ruleData.type,
        enforcement: ruleData.enforcement,
        weight: ruleData.weight ?? 100,
        params: ruleData.params,
        isActive: ruleData.isActive,
        source: ruleData.source,
      };

      const res = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(editingRule ? "Ο κανόνας ενημερώθηκε!" : "Ο κανόνας δημιουργήθηκε!");
        setIsBuilderOpen(false);
        onRefresh();
      } else {
        const json = await res.json();
        toast.error("Σφάλμα αποθήκευσης", { description: json.error });
        throw new Error(json.error);
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
      throw e;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Διαγραφή αυτού του κανόνα;")) return;
    try {
      const res = await fetch(`/api/rules?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Ο κανόνας διαγράφηκε.");
        onRefresh();
      } else {
        toast.error("Σφάλμα διαγραφής.");
      }
    } catch (e: any) {
      toast.error("Σφάλμα διαγραφής", { description: e.message });
    }
  };

  const handleToggleActive = async (rule: Rule) => {
    try {
      const res = await fetch("/api/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, isActive: !rule.isActive }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch {
      toast.error("Σφάλμα ενημέρωσης.");
    }
  };

  const getSentence = (rule: ConditionalRule) => {
    try {
      return buildRuleSentence(rule, data.teachers, data.subjects, data.classes);
    } catch {
      return "—";
    }
  };

  const getThenActionCount = (rule: ConditionalRule) => rule.params?.then?.length ?? 0;
  const getConditionCount = (rule: ConditionalRule) =>
    (rule.params?.when?.groups ?? []).reduce((sum, g) => sum + g.conditions.length, 0);

  return (
    <div className="flex flex-col h-full w-full bg-zinc-50/50">
      {/* Header */}
      <div className="h-14 border-b border-zinc-200 bg-white px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200/80 shrink-0">
            <button
              onClick={() => onTabChange?.("teachers")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" /> Εκπαιδευτικοί
            </button>
            <button
              onClick={() => onTabChange?.("classes")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" /> Τμήματα
            </button>
            <button
              onClick={() => onTabChange?.("subjects")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" /> Μαθήματα
            </button>
            <button
              onClick={() => onTabChange?.("rules")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-zinc-900 shadow-sm border border-zinc-200/60 transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" /> Κανόνες
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="h-8 px-3 text-xs bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold cursor-pointer shadow-sm gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Νέος Κανόνας
          </Button>

          {onClose && (
            <>
              <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                title="Κλείσιμο (Esc)"
                aria-label="Κλείσιμο"
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-5">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Empty state */}
          {conditionalRules.length === 0 && legacyRules.length === 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12 flex flex-col items-center gap-4 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                <Zap className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-800 mb-1">Κανένας Κανόνας</h3>
                <p className="text-sm text-zinc-500 max-w-sm">
                  Δημιουργήστε τον πρώτο σας κανόνα με λογική{" "}
                  <strong>ΟΤΑΝ → ΤΟΤΕ</strong> για να εξειδικεύσετε το πρόγραμμα.
                </p>
              </div>
              <Button
                onClick={handleOpenCreate}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Νέος Κανόνας
              </Button>
            </div>
          )}

          {/* Conditional Rules Table */}
          {conditionalRules.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-zinc-800">
                  Conditional Rules ({conditionalRules.length})
                </h3>
                <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                  ΟΤΑΝ → ΤΟΤΕ
                </Badge>
              </div>
              <div className="divide-y divide-zinc-100">
                {conditionalRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`px-4 py-3.5 hover:bg-zinc-50 transition-colors ${!rule.isActive ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Rule name + badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-sm font-bold text-zinc-800">{rule.name}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              rule.enforcement === "hard"
                                ? "text-red-600 border-red-200 bg-red-50"
                                : "text-amber-600 border-amber-200 bg-amber-50"
                            }`}
                          >
                            {ENFORCEMENT_LABELS[rule.enforcement]?.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-500 border-zinc-200">
                            {getConditionCount(rule)} συνθήκ.
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-500 border-zinc-200">
                            {getThenActionCount(rule)} αποτελ.
                          </Badge>
                          {rule.source === "ai" && (
                            <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                              AI
                            </Badge>
                          )}
                        </div>

                        {/* Human-readable sentence */}
                        <p className="text-xs text-zinc-500 font-mono leading-relaxed line-clamp-2 bg-zinc-50 px-2 py-1 rounded border border-zinc-100">
                          {getSentence(rule)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleActive(rule as unknown as Rule)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                          title={rule.isActive ? "Απενεργοποίηση" : "Ενεργοποίηση"}
                        >
                          {rule.isActive
                            ? <ToggleRight className="w-4 h-4 text-indigo-600" />
                            : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(rule)}
                          className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors text-[11px] font-medium"
                        >
                          Επεξεργασία
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legacy rules (read-only for now) */}
          {legacyRules.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-bold text-zinc-600">
                  Παλαιοί Κανόνες ({legacyRules.length})
                </h3>
                <Badge variant="outline" className="text-[10px] text-zinc-400">legacy</Badge>
              </div>
              <Table>
                <TableHeader className="bg-zinc-50/50">
                  <TableRow>
                    <TableHead className="w-[280px] text-xs">Όνομα</TableHead>
                    <TableHead className="text-xs">Τύπος</TableHead>
                    <TableHead className="text-xs">Αυστηρότητα</TableHead>
                    <TableHead className="w-[80px] text-right text-xs">Ενέργειες</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {legacyRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium text-xs">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-zinc-50">
                          {rule.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs ${
                            ENFORCEMENT_LABELS[rule.enforcement]?.className ?? ""
                          }`}
                        >
                          {ENFORCEMENT_LABELS[rule.enforcement]?.label ?? rule.enforcement}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rule.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Builder Dialog — full height slide-in */}
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-2xl h-[90vh] p-0 overflow-hidden border-none shadow-2xl rounded-2xl flex flex-col">
          <ConditionalRuleBuilder
            data={data}
            onSave={handleSave}
            onClose={() => setIsBuilderOpen(false)}
            editingRule={editingRule}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
