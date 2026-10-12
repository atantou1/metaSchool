"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Teacher } from "@/types";
import { getEmploymentTypeLabel } from "@/lib/leave-documents";
import {
  Users,
  Search,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  MapPin,
  IdCard,
  Building,
  Save,
  ArrowRight,
  Umbrella,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    afm: "",
    adt: "",
    am: "",
    phone: "",
    email: "",
    address: "",
    fatherName: "",
    motherName: "",
    birthYear: "",
    employmentType: "permanent",
  });

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/teachers");
      const json = await res.json();
      if (json.success) {
        setTeachers(json.teachers || []);
      }
    } catch (e: any) {
      toast.error("Σφάλμα ανάγνωσης εκπαιδευτικών");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const handleEditClick = (t: Teacher) => {
    setEditingTeacher(t);
    setFormData({
      afm: t.afm || "",
      adt: t.adt || "",
      am: t.am || "",
      phone: t.phone || "",
      email: t.email || "",
      address: t.address || "",
      fatherName: t.fatherName || "",
      motherName: t.motherName || "",
      birthYear: t.birthYear || "",
      employmentType: t.employmentType || "permanent",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingTeacher) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingTeacher,
          ...formData,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Τα στοιχεία του εκπαιδευτικού ενημερώθηκαν επιτυχώς!");
        setIsModalOpen(false);
        loadTeachers();
      } else {
        toast.error(`Σφάλμα: ${json.error || "Αποτυχία ενημέρωσης"}`);
      }
    } catch (e: any) {
      toast.error("Σφάλμα επικοινωνίας", { description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = teachers.filter((t) => {
    const term = search.toLowerCase();
    return (
      t.lastName.toLowerCase().includes(term) ||
      t.firstName.toLowerCase().includes(term) ||
      t.specialty.toLowerCase().includes(term) ||
      (t.afm && t.afm.includes(term))
    );
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Προσωπικά & Διοικητικά Στοιχεία Εκπαιδευτικών
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Διαχείριση στοιχείων (Α.Φ.Μ., Α.Δ.Τ., Τηλέφωνα, Διευθύνσεις) που χρησιμοποιούνται στις άδειες και στα έντυπα.
          </p>
        </div>

        <Link href="/leaves">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Umbrella className="w-3.5 h-3.5 text-blue-600" />
            Μετάβαση στις Άδειες
          </Button>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Αναζήτηση εκπαιδευτικού με όνομα, ειδικότητα, ΑΦΜ..."
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Teachers Table */}
      <Card className="border-border">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground">
                <th className="py-2.5 px-3 font-semibold">Εκπαιδευτικός</th>
                <th className="py-2.5 px-3 font-semibold">Ειδικότητα</th>
                <th className="py-2.5 px-3 font-semibold">Σχέση Εργασίας</th>
                <th className="py-2.5 px-3 font-semibold">Α.Φ.Μ. / Α.Δ.Τ.</th>
                <th className="py-2.5 px-3 font-semibold">Τηλέφωνο</th>
                <th className="py-2.5 px-3 font-semibold">Κατάσταση Στοιχείων</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ενέργεια</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => {
                const isComplete = Boolean(t.afm && t.phone);

                return (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      {t.lastName} {t.firstName}
                    </td>

                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className="text-[10px]">
                        {t.specialty}
                      </Badge>
                    </td>

                    <td className="py-2.5 px-3 text-muted-foreground">
                      {getEmploymentTypeLabel(t.employmentType)}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {t.afm ? `ΑΦΜ: ${t.afm}` : <span className="text-muted-foreground">-</span>}
                      {t.adt && <span className="text-muted-foreground ml-2">/ {t.adt}</span>}
                    </td>

                    <td className="py-2.5 px-3 text-muted-foreground">
                      {t.phone || "-"}
                    </td>

                    <td className="py-2.5 px-3">
                      {isComplete ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Πλήρη
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Ελλιπή
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(t)}
                        className="h-7 text-xs gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Επεξεργασία
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit Details Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <IdCard className="w-4 h-4 text-blue-600" />
              Προσωπικά Στοιχεία: {editingTeacher?.lastName} {editingTeacher?.firstName}
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs max-h-[75vh] overflow-y-auto">
            <div>
              <Label className="text-xs">Σχέση Εργασίας</Label>
              <Select
                value={formData.employmentType}
                onValueChange={(val) => val && setFormData({ ...formData, employmentType: val })}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Μόνιμος Εκπαιδευτικός</SelectItem>
                  <SelectItem value="deputy_regular">Αναπληρωτής Τακτικού Προϋπολογισμού</SelectItem>
                  <SelectItem value="deputy_espa">Αναπληρωτής ΕΣΠΑ</SelectItem>
                  <SelectItem value="hourly">Ωρομίσθιος Εκπαιδευτικός</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Α.Φ.Μ.</Label>
                <Input
                  value={formData.afm}
                  onChange={(e) => setFormData({ ...formData, afm: e.target.value })}
                  placeholder="9ψήφιος ΑΦΜ"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Α.Δ.Τ.</Label>
                <Input
                  value={formData.adt}
                  onChange={(e) => setFormData({ ...formData, adt: e.target.value })}
                  placeholder="Αριθμός Ταυτότητας"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Α.Μ. (Αριθμός Μητρώου)</Label>
                <Input
                  value={formData.am}
                  onChange={(e) => setFormData({ ...formData, am: e.target.value })}
                  placeholder="Για μόνιμους"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Τηλέφωνο Επικοινωνίας</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Κινητό / Σταθερό"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Όνομα Πατέρα</Label>
                <Input
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Όνομα Μητέρας</Label>
                <Input
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@sch.gr"
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Διεύθυνση Κατοικίας</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Οδός, Αριθμός, Τ.Κ., Πόλη"
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)} className="text-xs">
              Ακύρωση
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isSaving ? "Αποθήκευση..." : "Αποθήκευση"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
