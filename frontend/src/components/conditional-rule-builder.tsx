"use client";

import React, { useState, useCallback } from "react";
import { TimetableData } from "@/types";
import {
  ConditionalRule,
  ConditionGroup,
  Condition,
  Action,
  WhenClause,
  GroupOperator,
  ConditionPredicate,
  ActionType,
  CONDITION_REGISTRY,
  ACTION_REGISTRY,
  CONDITION_CATEGORIES,
  ACTION_CATEGORIES,
  newCondition,
  newConditionGroup,
  newWhen,
  newAction,
  buildRuleSentence,
} from "@/lib/conditional-rules";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus, Trash2, Zap, ArrowRight, ChevronDown, ChevronUp,
  User, Clock, BookOpen, Layers, CalendarClock, Minus, MapPin,
  GripVertical, X, Check, Info,
} from "lucide-react";
import { toast } from "sonner";

const DAY_LABELS = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ"];
const PERIOD_LABELS = ["1η", "2η", "3η", "4η", "5η", "6η", "7η", "8η", "9η", "10η"];

interface ConditionalRuleBuilderProps {
  data: TimetableData;
  onSave: (rule: Omit<ConditionalRule, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onClose: () => void;
  editingRule?: ConditionalRule | null;
}

// ─── Multi-select chips component ────────────────────────────────────────────

function DayPicker({ value, onChange }: { value?: number[]; onChange: (v: number[]) => void }) {
  const selected = value ?? [];
  return (
    <div className="flex gap-1 flex-wrap">
      {DAY_LABELS.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(selected.includes(i) ? selected.filter(d => d !== i) : [...selected, i])}
          className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
            selected.includes(i)
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function PeriodPicker({ value, onChange, maxPeriods = 7 }: { value?: number[]; onChange: (v: number[]) => void; maxPeriods?: number }) {
  const selected = value ?? [];
  return (
    <div className="flex gap-1 flex-wrap">
      {PERIOD_LABELS.slice(0, maxPeriods).map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(selected.includes(i) ? selected.filter(p => p !== i) : [...selected, i])}
          className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
            selected.includes(i)
              ? "bg-violet-600 text-white border-violet-600"
              : "bg-white text-zinc-600 border-zinc-200 hover:border-violet-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Field renderer for condition/action params ───────────────────────────────

function FieldRenderer({
  fieldKey, fieldType, value, onChange, data, min, max, label, helpText,
}: {
  fieldKey: string;
  fieldType: string;
  value: any;
  onChange: (v: any) => void;
  data: TimetableData;
  min?: number;
  max?: number;
  label: string;
  helpText?: string;
}) {
  const numPeriods = data.schoolConfig?.periods?.length ?? 7;

  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">{label}</Label>
      {fieldType === "teacher" && (
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs bg-white">
            <SelectValue placeholder="Επιλέξτε εκπαιδευτικό..." />
          </SelectTrigger>
          <SelectContent>
            {data.teachers.filter(t => t.isActive !== false).map(t => (
              <SelectItem key={t.id} value={t.id} className="text-xs">
                {t.lastName} {t.firstName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {fieldType === "subject" && (
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs bg-white">
            <SelectValue placeholder="Επιλέξτε μάθημα..." />
          </SelectTrigger>
          <SelectContent>
            {data.subjects.map(s => (
              <SelectItem key={s.id} value={s.id} className="text-xs">{s.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {fieldType === "class" && (
        <Select value={value ?? ""} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-xs bg-white">
            <SelectValue placeholder="Επιλέξτε τμήμα..." />
          </SelectTrigger>
          <SelectContent>
            {data.classes.map(c => (
              <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {fieldType === "days" && (
        <DayPicker value={value} onChange={onChange} />
      )}
      {fieldType === "periods" && (
        <PeriodPicker value={value} onChange={onChange} maxPeriods={numPeriods} />
      )}
      {(fieldType === "number" || fieldType === "period_number") && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={min ?? 0}
            max={max ?? 10}
            value={value ?? ""}
            onChange={e => onChange(Number(e.target.value))}
            className="h-8 text-xs w-24 bg-white"
          />
          {fieldType === "period_number" && (
            <span className="text-[10px] text-zinc-400">
              {value !== undefined && value !== "" ? `(${PERIOD_LABELS[value] ?? "?"} ώρα)` : ""}
            </span>
          )}
        </div>
      )}
      {helpText && <p className="text-[10px] text-zinc-400 mt-0.5">{helpText}</p>}
    </div>
  );
}

// ─── Single Condition Card ───────────────────────────────────────────────────

function ConditionCard({
  condition, onChange, onRemove, data, canRemove,
}: {
  condition: Condition;
  onChange: (c: Condition) => void;
  onRemove: () => void;
  data: TimetableData;
  canRemove: boolean;
}) {
  const def = CONDITION_REGISTRY[condition.predicate];

  const handlePredicateChange = (p: ConditionPredicate) => {
    onChange({ id: condition.id, predicate: p });
  };

  const handleFieldChange = (key: keyof Condition, value: any) => {
    onChange({ ...condition, [key]: value });
  };

  const categoryGroups = Object.entries(CONDITION_CATEGORIES);

  return (
    <div className="bg-white border border-zinc-200 rounded-lg p-3 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <Select value={condition.predicate} onValueChange={(p) => p && handlePredicateChange(p as ConditionPredicate)}>
            <SelectTrigger className="h-8 text-xs bg-zinc-50 border-zinc-200 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {categoryGroups.map(([catKey, catInfo]) => {
                const defs = Object.values(CONDITION_REGISTRY).filter(d => d.category === catKey);
                if (!defs.length) return null;
                return (
                  <div key={catKey}>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-t border-zinc-100 first:border-0">
                      {catInfo.label}
                    </div>
                    {defs.map(d => (
                      <SelectItem key={d.predicate} value={d.predicate} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))}
                  </div>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {def && def.fields.length > 0 && (
        <div className="grid grid-cols-1 gap-2 pl-1">
          {def.fields.map(field => (
            <FieldRenderer
              key={field.key}
              fieldKey={field.key}
              fieldType={field.type}
              value={(condition as any)[field.key]}
              onChange={v => handleFieldChange(field.key as keyof Condition, v)}
              data={data}
              min={field.min}
              max={field.max}
              label={field.label}
              helpText={field.helpText}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Condition Group Card ─────────────────────────────────────────────────────

function ConditionGroupCard({
  group, onChange, onRemove, canRemove, data,
}: {
  group: ConditionGroup;
  onChange: (g: ConditionGroup) => void;
  onRemove: () => void;
  canRemove: boolean;
  data: TimetableData;
}) {
  const addCondition = () => {
    onChange({ ...group, conditions: [...group.conditions, newCondition()] });
  };

  const updateCondition = (idx: number, c: Condition) => {
    const newConds = [...group.conditions];
    newConds[idx] = c;
    onChange({ ...group, conditions: newConds });
  };

  const removeCondition = (idx: number) => {
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== idx) });
  };

  return (
    <div className="border border-indigo-200 rounded-xl bg-indigo-50/30 overflow-hidden">
      {/* Group header */}
      <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/60 border-b border-indigo-200/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Ομάδα συνθηκών</span>
          <Select
            value={group.operator}
            onValueChange={(v) => v && onChange({ ...group, operator: v as GroupOperator })}
          >
            <SelectTrigger className="h-6 w-20 text-[11px] bg-white border-indigo-200 font-bold text-indigo-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND" className="text-xs font-bold">AND</SelectItem>
              <SelectItem value="OR" className="text-xs font-bold">OR</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[10px] text-indigo-500">μεταξύ συνθηκών</span>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1 text-indigo-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Conditions list */}
      <div className="p-3 space-y-2">
        {group.conditions.map((cond, idx) => (
          <div key={cond.id}>
            {idx > 0 && (
              <div className="flex items-center gap-2 my-1.5">
                <div className="flex-1 h-px bg-indigo-200/50" />
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0 border-indigo-300 text-indigo-600 font-bold bg-white"
                >
                  {group.operator}
                </Badge>
                <div className="flex-1 h-px bg-indigo-200/50" />
              </div>
            )}
            <ConditionCard
              condition={cond}
              onChange={c => updateCondition(idx, c)}
              onRemove={() => removeCondition(idx)}
              data={data}
              canRemove={group.conditions.length > 1}
            />
          </div>
        ))}

        <button
          onClick={addCondition}
          className="w-full mt-1 border border-dashed border-indigo-300 rounded-lg py-2 text-xs text-indigo-500 hover:text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Προσθήκη συνθήκης
        </button>
      </div>
    </div>
  );
}

// ─── Single Action Card ───────────────────────────────────────────────────────

function ActionCard({
  action, onChange, onRemove, data, canRemove,
}: {
  action: Action;
  onChange: (a: Action) => void;
  onRemove: () => void;
  data: TimetableData;
  canRemove: boolean;
}) {
  const def = ACTION_REGISTRY[action.action];
  const catInfo = def ? ACTION_CATEGORIES[def.category] : null;

  const colorMap: Record<string, string> = {
    violet: "border-violet-200 bg-violet-50/30",
    blue: "border-blue-200 bg-blue-50/30",
    amber: "border-amber-200 bg-amber-50/30",
    green: "border-green-200 bg-green-50/30",
  };
  const bgClass = catInfo ? colorMap[catInfo.color] : "border-zinc-200 bg-zinc-50";

  const handleActionChange = (a: ActionType) => {
    onChange({ id: action.id, action: a });
  };

  const handleFieldChange = (key: keyof Action, value: any) => {
    onChange({ ...action, [key]: value });
  };

  const catGroups = Object.entries(ACTION_CATEGORIES);

  return (
    <div className={`border rounded-lg p-3 space-y-3 shadow-sm ${bgClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <Select value={action.action} onValueChange={(a) => a && handleActionChange(a as ActionType)}>
            <SelectTrigger className="h-8 text-xs bg-white border-zinc-200 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {catGroups.map(([catKey, catInfo]) => {
                const defs = Object.values(ACTION_REGISTRY).filter(d => d.category === catKey);
                if (!defs.length) return null;
                return (
                  <div key={catKey}>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider border-t border-zinc-100 first:border-0">
                      {catInfo.label}
                    </div>
                    {defs.map(d => (
                      <SelectItem key={d.action} value={d.action} className="text-xs">
                        {d.label}
                      </SelectItem>
                    ))}
                  </div>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {def && def.fields.length > 0 && (
        <div className="grid grid-cols-1 gap-2 pl-1">
          {def.fields.map(field => (
            <FieldRenderer
              key={field.key}
              fieldKey={field.key}
              fieldType={field.type}
              value={(action as any)[field.key]}
              onChange={v => handleFieldChange(field.key as keyof Action, v)}
              data={data}
              min={field.min}
              max={field.max}
              label={field.label}
              helpText={field.helpText}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Builder Component ───────────────────────────────────────────────────

export function ConditionalRuleBuilder({ data, onSave, onClose, editingRule }: ConditionalRuleBuilderProps) {
  const [name, setName] = useState(editingRule?.name ?? "");
  const [enforcement, setEnforcement] = useState<"hard" | "soft">(editingRule?.enforcement ?? "hard");
  const [weight, setWeight] = useState(editingRule?.weight ?? 80);
  const [when, setWhen] = useState<WhenClause>(editingRule?.params?.when ?? newWhen());
  const [then, setThen] = useState<Action[]>(editingRule?.params?.then ?? [newAction()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── When clause mutations ──────────────────────────────────────────────────
  const updateGroup = useCallback((idx: number, g: ConditionGroup) => {
    setWhen(w => ({ ...w, groups: w.groups.map((old, i) => i === idx ? g : old) }));
  }, []);

  const removeGroup = useCallback((idx: number) => {
    setWhen(w => ({ ...w, groups: w.groups.filter((_, i) => i !== idx) }));
  }, []);

  const addGroup = useCallback(() => {
    setWhen(w => ({ ...w, groups: [...w.groups, newConditionGroup()] }));
  }, []);

  const setWhenOperator = useCallback((op: GroupOperator) => {
    setWhen(w => ({ ...w, operator: op }));
  }, []);

  // ── Then action mutations ──────────────────────────────────────────────────
  const updateAction = useCallback((idx: number, a: Action) => {
    setThen(t => t.map((old, i) => i === idx ? a : old));
  }, []);

  const removeAction = useCallback((idx: number) => {
    setThen(t => t.filter((_, i) => i !== idx));
  }, []);

  const addActionHandler = useCallback(() => {
    setThen(t => [...t, newAction()]);
  }, []);

  // ── Live sentence preview ──────────────────────────────────────────────────
  const previewSentence = React.useMemo(() => {
    try {
      const fakeRule: ConditionalRule = {
        id: "preview",
        name,
        type: "CONDITIONAL",
        enforcement,
        isActive: true,
        source: "manual",
        createdAt: "",
        updatedAt: "",
        params: { when, then },
      };
      return buildRuleSentence(fakeRule, data.teachers, data.subjects, data.classes);
    } catch {
      return "...";
    }
  }, [when, then, name, data, enforcement]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Δώστε όνομα στον κανόνα.");
      return;
    }
    if (when.groups.length === 0 || when.groups.every(g => g.conditions.length === 0)) {
      toast.error("Προσθέστε τουλάχιστον μία συνθήκη (ΟΤΑΝ).");
      return;
    }
    if (then.length === 0) {
      toast.error("Προσθέστε τουλάχιστον ένα αποτέλεσμα (ΤΟΤΕ).");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name,
        type: "CONDITIONAL",
        enforcement,
        weight: enforcement === "soft" ? weight : undefined,
        isActive: true,
        source: "manual",
        params: { when, then },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Κατασκευαστής Κανόνων</h2>
            <p className="text-[11px] text-indigo-200">ΟΤΑΝ → ΤΟΤΕ με AND / OR</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Rule meta */}
        <div className="px-5 py-4 border-b border-zinc-100 bg-white">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide">Όνομα Κανόνα</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="π.χ. Γιώργης → Νίκος ταυτόχρονα Δευτέρα"
                className="h-8 text-sm bg-zinc-50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide">Αυστηρότητα</Label>
              <Select value={enforcement} onValueChange={(v: any) => setEnforcement(v)}>
                <SelectTrigger className="h-8 text-xs bg-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hard">
                    <span className="text-red-600 font-bold">Υποχρεωτικός (Hard)</span>
                  </SelectItem>
                  <SelectItem value="soft">
                    <span className="text-amber-600 font-bold">Προτίμηση (Soft)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {enforcement === "soft" && (
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wide">Βάρος (1-100)</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={weight}
                  onChange={e => setWeight(Number(e.target.value))}
                  className="h-8 text-xs bg-zinc-50"
                />
              </div>
            )}
          </div>
        </div>

        {/* WHEN section */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-[10px] font-black text-indigo-700">IF</span>
              </div>
              <h3 className="text-sm font-bold text-zinc-800">ΟΤΑΝ</h3>
              <span className="text-xs text-zinc-500">— Συνθήκες ενεργοποίησης</span>
            </div>
          </div>

          {/* Groups */}
          <div className="space-y-2">
            {when.groups.map((group, idx) => (
              <div key={group.id}>
                {idx > 0 && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-zinc-200" />
                    <Select value={when.operator} onValueChange={(op) => op && setWhenOperator(op as GroupOperator)}>
                      <SelectTrigger className="h-6 w-20 text-[11px] bg-white border-zinc-300 font-black text-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AND" className="text-xs font-bold">AND</SelectItem>
                        <SelectItem value="OR" className="text-xs font-bold">OR</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex-1 h-px bg-zinc-200" />
                  </div>
                )}
                <ConditionGroupCard
                  group={group}
                  onChange={g => updateGroup(idx, g)}
                  onRemove={() => removeGroup(idx)}
                  canRemove={when.groups.length > 1}
                  data={data}
                />
              </div>
            ))}
          </div>

          <button
            onClick={addGroup}
            className="w-full border-2 border-dashed border-indigo-200 rounded-xl py-2.5 text-xs text-indigo-500 hover:text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-1.5 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Νέα Ομάδα Συνθηκών
          </button>
        </div>

        {/* Arrow separator */}
        <div className="flex items-center gap-3 px-5 py-2 bg-gradient-to-r from-zinc-50 via-zinc-100 to-zinc-50 border-y border-zinc-200">
          <div className="flex-1 h-px bg-zinc-300" />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-full shadow-sm">
            <ArrowRight className="w-4 h-4 text-zinc-400" />
            <span className="text-xs font-bold text-zinc-500">ΤΟΤΕ</span>
          </div>
          <div className="flex-1 h-px bg-zinc-300" />
        </div>

        {/* THEN section */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
              <Zap className="w-3 h-3 text-violet-700" />
            </div>
            <h3 className="text-sm font-bold text-zinc-800">ΤΟΤΕ</h3>
            <span className="text-xs text-zinc-500">— Αποτελέσματα</span>
          </div>

          <div className="space-y-2">
            {then.map((action, idx) => (
              <div key={action.id}>
                {idx > 0 && (
                  <div className="flex items-center gap-2 my-1.5">
                    <div className="flex-1 h-px bg-zinc-200" />
                    <span className="text-[10px] font-bold text-zinc-400 px-2">ΚΑΙ</span>
                    <div className="flex-1 h-px bg-zinc-200" />
                  </div>
                )}
                <ActionCard
                  action={action}
                  onChange={a => updateAction(idx, a)}
                  onRemove={() => removeAction(idx)}
                  data={data}
                  canRemove={then.length > 1}
                />
              </div>
            ))}
          </div>

          <button
            onClick={addActionHandler}
            className="w-full border-2 border-dashed border-violet-200 rounded-xl py-2.5 text-xs text-violet-500 hover:text-violet-700 hover:border-violet-400 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-1.5 font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Νέο Αποτέλεσμα
          </button>
        </div>

        {/* Preview */}
        <div className="mx-5 mb-4 p-3 bg-zinc-800 rounded-xl border border-zinc-700">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Προεπισκόπηση</p>
              <p className="text-xs text-zinc-200 font-mono leading-relaxed">{previewSentence}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 py-4 border-t border-zinc-200 bg-white flex items-center justify-between">
        <Button variant="ghost" onClick={onClose} className="text-zinc-600 text-xs">
          Ακύρωση
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs shadow-md px-6 gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          {isSubmitting ? "Αποθήκευση..." : "Αποθήκευση Κανόνα"}
        </Button>
      </div>
    </div>
  );
}
