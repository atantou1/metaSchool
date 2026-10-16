"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LeaveTypeConfig,
  LeaveDecisionTemplate,
} from "@/types";
import {
  getDefaultTemplateForLeaveType,
  TEMPLATE_VARIABLES,
} from "@/lib/leave-templates";
import {
  FileText,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Check,
  Copy,
  ArrowUp,
  ArrowDown,
  Info,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

interface LeaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveType: LeaveTypeConfig | null;
  onSave: (updated: LeaveTypeConfig) => void;
}

export function LeaveTemplateModal({
  isOpen,
  onClose,
  leaveType,
  onSave,
}: LeaveTemplateModalProps) {
  const [activeTab, setActiveTab] = useState<"permanent" | "deputy">("permanent");
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Editable state for Permanent
  const [permLegalBasis, setPermLegalBasis] = useState<string[]>([]);
  const [permDecisionText, setPermDecisionText] = useState<string>("");
  const [permNotifications, setPermNotifications] = useState<string[]>([]);

  // Editable state for Deputy
  const [deputyLegalBasis, setDeputyLegalBasis] = useState<string[]>([]);
  const [deputyDecisionText, setDeputyDecisionText] = useState<string>("");
  const [deputyNotifications, setDeputyNotifications] = useState<string[]>([]);

  // Protocol prefix state (e.g. "Φ.12/")
  const [protocolPrefix, setProtocolPrefix] = useState<string>("");

  useEffect(() => {
    if (!leaveType) return;

    setProtocolPrefix(leaveType.protocolPrefix ?? (leaveType.id === "regular" ? "Φ.12/" : ""));

    // Load Permanent
    const defaultPerm = getDefaultTemplateForLeaveType(leaveType.id, false);
    const existingPerm = leaveType.permanentTemplate;
    setPermLegalBasis(
      existingPerm && existingPerm.legalBasis?.length > 0
        ? [...existingPerm.legalBasis]
        : [...defaultPerm.legalBasis]
    );
    setPermDecisionText(
      existingPerm?.decisionText || defaultPerm.decisionText
    );
    setPermNotifications(
      existingPerm && Array.isArray(existingPerm.notifications) && existingPerm.notifications.length > 0
        ? [...existingPerm.notifications]
        : [...(defaultPerm.notifications || [])]
    );

    // Load Deputy
    const defaultDeputy = getDefaultTemplateForLeaveType(leaveType.id, true);
    const existingDeputy = leaveType.deputyTemplate;
    setDeputyLegalBasis(
      existingDeputy && existingDeputy.legalBasis?.length > 0
        ? [...existingDeputy.legalBasis]
        : [...defaultDeputy.legalBasis]
    );
    setDeputyDecisionText(
      existingDeputy?.decisionText || defaultDeputy.decisionText
    );
    setDeputyNotifications(
      existingDeputy && Array.isArray(existingDeputy.notifications) && existingDeputy.notifications.length > 0
        ? [...existingDeputy.notifications]
        : [...(defaultDeputy.notifications || [])]
    );
  }, [leaveType, isOpen]);

  if (!leaveType) return null;

  // Active getters and setters based on tab
  const legalBasis = activeTab === "permanent" ? permLegalBasis : deputyLegalBasis;
  const setLegalBasis = activeTab === "permanent" ? setPermLegalBasis : setDeputyLegalBasis;

  const decisionText = activeTab === "permanent" ? permDecisionText : deputyDecisionText;
  const setDecisionText = activeTab === "permanent" ? setPermDecisionText : setDeputyDecisionText;

  const notifications = activeTab === "permanent" ? permNotifications : deputyNotifications;
  const setNotifications = activeTab === "permanent" ? setPermNotifications : setDeputyNotifications;

  // Handlers for legal basis
  const handleUpdateLegalBasis = (idx: number, val: string) => {
    setLegalBasis((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleAddLegalBasis = () => {
    setLegalBasis((prev) => [...prev, ""]);
  };

  const handleDeleteLegalBasis = (idx: number) => {
    setLegalBasis((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveLegalBasis = (idx: number, dir: -1 | 1) => {
    setLegalBasis((prev) => {
      const copy = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= copy.length) return prev;
      const tmp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = tmp;
      return copy;
    });
  };

  // Handlers for notifications
  const handleUpdateNotification = (idx: number, val: string) => {
    setNotifications((prev) => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleAddNotification = () => {
    setNotifications((prev) => [...prev, ""]);
  };

  const handleDeleteNotification = (idx: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== idx));
  };

  // Copy variable tag to clipboard
  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    toast.info(`Αντιγράφηκε: ${tag}`);
    setTimeout(() => setCopiedTag(null), 1800);
  };

  // Reset to default
  const handleResetToDefault = () => {
    const isDeputy = activeTab === "deputy";
    const def = getDefaultTemplateForLeaveType(leaveType.id, isDeputy);
    if (isDeputy) {
      setDeputyLegalBasis([...def.legalBasis]);
      setDeputyDecisionText(def.decisionText);
      setDeputyNotifications([...(def.notifications || [])]);
    } else {
      setPermLegalBasis([...def.legalBasis]);
      setPermDecisionText(def.decisionText);
      setPermNotifications([...(def.notifications || [])]);
    }
    toast.success(
      `Επαναφέρθηκαν οι προεπιλογές για ${isDeputy ? "Αναπληρωτές" : "Μόνιμους"}`
    );
  };

  // Save changes
  const handleSave = () => {
    const permTemplate: LeaveDecisionTemplate = {
      legalBasis: permLegalBasis.filter((s) => s.trim().length > 0),
      decisionText: permDecisionText,
      notifications: permNotifications.filter((s) => s.trim().length > 0),
    };

    const deputyTemplate: LeaveDecisionTemplate = {
      legalBasis: deputyLegalBasis.filter((s) => s.trim().length > 0),
      decisionText: deputyDecisionText,
      notifications: deputyNotifications.filter((s) => s.trim().length > 0),
    };

    const updated: LeaveTypeConfig = {
      ...leaveType,
      protocolPrefix: protocolPrefix.trim(),
      permanentTemplate: permTemplate,
      deputyTemplate: deputyTemplate,
    };

    onSave(updated);
    toast.success("Το πρότυπο της απόφασης αποθηκεύτηκε επιτυχώς!");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border-border">
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border bg-card flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Πρότυπο Απόφασης: {leaveType.name}
              <Badge
                variant="outline"
                className="ml-2 font-bold"
                style={{ borderColor: leaveType.color, color: leaveType.color }}
              >
                {leaveType.shortName}
              </Badge>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Διαμορφώστε το κείμενο και τις διατάξεις που εκδίδονται στην επίσημη απόφαση για {leaveType.name.toLowerCase()}.
            </p>
          </div>

          {/* Tab Switcher: Μόνιμοι vs Αναπληρωτές */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveTab("permanent")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "permanent"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Μόνιμοι
            </button>
            <button
              onClick={() => setActiveTab("deputy")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "deputy"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Αναπληρωτές
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-muted/20">
          {/* Protocol prefix setting */}
          <div className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-foreground">
                Πρόθεμα Αρ. Πρωτοκόλλου / Φάκελος
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Συμπληρώνεται αυτόματα πριν από τον αριθμό πρωτοκόλλου στην απόφαση (π.χ. <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">Φ.12/</code>).
              </p>
            </div>
            <div className="w-full sm:w-36 shrink-0">
              <Input
                value={protocolPrefix}
                onChange={(e) => setProtocolPrefix(e.target.value)}
                placeholder="π.χ. Φ.12/"
                className="h-8 text-xs font-mono font-semibold"
              />
            </div>
          </div>

          {/* Tab Indicator Banner */}
          <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                Επεξεργασία προτύπου για: <strong>{activeTab === "permanent" ? "Μόνιμους Εκπαιδευτικούς" : "Αναπληρωτές Εκπαιδευτικούς"}</strong>.
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetToDefault}
              className="text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 h-7 gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Επαναφορά Προεπιλογών
            </Button>
          </div>

          {/* 1. ΕΧΟΝΤΑΣ ΥΠΟΨΗ (LEGAL BASIS) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <span>1. Έχοντας υπόψη: (Νομική Βάση & Διατάξεις)</span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                  {legalBasis.length} σημεία
                </Badge>
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddLegalBasis}
                className="h-7 text-xs gap-1 border-dashed"
              >
                <Plus className="w-3 h-3" />
                Προσθήκη Διάταξης
              </Button>
            </div>

            <div className="space-y-2">
              {legalBasis.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-md bg-card border border-border group hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
                >
                  <span className="text-xs font-mono font-bold text-muted-foreground pt-1.5 w-6 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <Textarea
                    value={item}
                    onChange={(e) => handleUpdateLegalBasis(idx, e.target.value)}
                    rows={2}
                    placeholder="π.χ. Τις διατάξεις του Νόμου..."
                    className="text-xs resize-y min-h-[42px] leading-relaxed"
                  />
                  <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      onClick={() => handleMoveLegalBasis(idx, -1)}
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      title="Μετακίνηση επάνω"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === legalBasis.length - 1}
                      onClick={() => handleMoveLegalBasis(idx, 1)}
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      title="Μετακίνηση κάτω"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteLegalBasis(idx)}
                      className="h-5 w-5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Διαγραφή διάταξης"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. ΚΕΙΜΕΝΟ ΑΠΟΦΑΣΗΣ (DECISION STATEMENT) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              2. Κείμενο Απόφασης («Α Π Ο Φ Α Σ Ι Ζ Ο Υ Μ Ε»)
            </Label>
            <div className="p-2 rounded-md bg-card border border-border">
              <Textarea
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                rows={4}
                className="text-xs resize-y font-mono leading-relaxed"
                placeholder="Χορηγούμε {{teacher_prep_title}} {{teacher_full_name}}..."
              />
            </div>
          </div>

          {/* 3. ΚΟΙΝΟΠΟΙΗΣΗ (NOTIFICATIONS) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                3. Κοινοποίηση (Αποδέκτες)
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddNotification}
                className="h-7 text-xs gap-1 border-dashed"
              >
                <Plus className="w-3 h-3" />
                Προσθήκη Αποδέκτη
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {notifications.map((notif, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 p-1.5 rounded bg-card border border-border"
                >
                  <Input
                    value={notif}
                    onChange={(e) => handleUpdateNotification(idx, e.target.value)}
                    className="h-7 text-xs"
                    placeholder="π.χ. 1. Π.Μ.Υ."
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteNotification(idx)}
                    className="h-7 w-7 text-red-500 shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 4. ΟΔΗΓΟΣ ΜΕΤΑΒΛΗΤΩΝ (PLACEHOLDERS PALETTE) */}
          <div className="p-3 rounded-lg border border-border bg-card space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold">
                Διαθέσιμες Μεταβλητές (Κάντε κλικ για αντιγραφή):
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Μπορείτε να εισάγετε οποιαδήποτε μεταβλητή στο κείμενο της απόφασης ή στις διατάξεις. Κατά την έκδοση, το σύστημα θα τη συμπληρώσει αυτόματα με τα πραγματικά δεδομένα.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => handleCopyTag(v.tag)}
                  title={v.label}
                  className="px-2 py-1 rounded bg-muted hover:bg-muted/80 border border-border text-[11px] font-mono flex items-center gap-1 transition-colors text-foreground"
                >
                  <span>{v.tag}</span>
                  {copiedTag === v.tag ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-muted-foreground opacity-60" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 bg-card border-t border-border flex items-center justify-between sm:justify-between w-full">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Ακύρωση
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 font-semibold"
          >
            <Save className="w-3.5 h-3.5" />
            Αποθήκευση Προτύπου
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
