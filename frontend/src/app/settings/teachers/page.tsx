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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Teacher } from "@/types";
import { getEmploymentTypeLabel, formatTeacherAddress } from "@/lib/leave-documents";
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
  Upload,
  Trash2,
  PenTool,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

export default function SettingsTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Deletion modal state
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const signatureInputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    specialty: "ΠΕ70",
    afm: "",
    adt: "",
    am: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    fatherName: "",
    motherName: "",
    birthYear: "",
    employmentType: "permanent",
    signature: "",
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

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Παρακαλώ επιλέξτε αρχείο εικόνας (PNG, JPG)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData((prev) => ({
        ...prev,
        signature: dataUrl,
      }));
      toast.success("Η υπογραφή φορτώθηκε!");
    };
    reader.readAsDataURL(file);
  };

  const handleCreateClick = () => {
    setIsCreatingNew(true);
    setEditingTeacher(null);
    setFormData({
      firstName: "",
      lastName: "",
      specialty: "ΠΕ70",
      afm: "",
      adt: "",
      am: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      postalCode: "",
      fatherName: "",
      motherName: "",
      birthYear: "",
      employmentType: "permanent",
      signature: "",
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (t: Teacher) => {
    setIsCreatingNew(false);
    setEditingTeacher(t);
    setFormData({
      firstName: t.firstName || "",
      lastName: t.lastName || "",
      specialty: t.specialty || "ΠΕ70",
      afm: t.afm || "",
      adt: t.adt || "",
      am: t.am || "",
      phone: t.phone || "",
      email: t.email || "",
      address: t.address || "",
      city: t.city || "",
      postalCode: t.postalCode || "",
      fatherName: t.fatherName || "",
      motherName: t.motherName || "",
      birthYear: t.birthYear || "",
      employmentType: t.employmentType || "permanent",
      signature: t.signature || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (isCreatingNew) {
      if (!formData.lastName.trim() || !formData.firstName.trim()) {
        toast.error("Παρακαλώ συμπληρώστε Επώνυμο και Όνομα");
        return;
      }
    } else if (!editingTeacher) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = isCreatingNew
        ? {
            ...formData,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            specialty: formData.specialty.trim() || "ΠΕ70",
            color: "#3b82f6",
            isSupport: false,
            isTeaching: true,
            isActive: true,
          }
        : {
            ...editingTeacher,
            ...formData,
          };

      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          isCreatingNew
            ? "Ο εκπαιδευτικός προστέθηκε επιτυχώς!"
            : "Τα στοιχεία του εκπαιδευτικού ενημερώθηκαν επιτυχώς!"
        );
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

  const handleDeleteClick = (t: Teacher) => {
    setTeacherToDelete(t);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teacherToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/teachers?id=${teacherToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Ο/Η ${teacherToDelete.lastName} ${teacherToDelete.firstName} διαγράφηκε`);
        setIsDeleteModalOpen(false);
        setTeacherToDelete(null);
        loadTeachers();
      } else {
        toast.error(`Σφάλμα διαγραφής: ${json.error || "Αποτυχία"}`);
      }
    } catch (e: any) {
      toast.error("Σφάλμα σύνδεσης", { description: e.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = teachers.filter((t) => {
    const term = search.toLowerCase();
    return (
      t.lastName.toLowerCase().includes(term) ||
      t.firstName.toLowerCase().includes(term) ||
      t.specialty.toLowerCase().includes(term) ||
      (t.afm && t.afm.includes(term)) ||
      (t.city && t.city.toLowerCase().includes(term))
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
            Διαχείριση στοιχείων (Α.Φ.Μ., Α.Δ.Τ., Τηλέφωνα, Διευθύνσεις, Τ.Κ., Πόλη, Υπογραφές) για τις άδειες και τα έντυπα.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateClick}
            size="sm"
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Νέος Εκπαιδευτικός
          </Button>

          <Link href="/leaves">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Umbrella className="w-3.5 h-3.5 text-blue-600" />
              Μετάβαση στις Άδειες
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Αναζήτηση εκπαιδευτικού με όνομα, ειδικότητα, ΑΦΜ, πόλη..."
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
                <th className="py-2.5 px-3 font-semibold">Διεύθυνση / Πόλη</th>
                <th className="py-2.5 px-3 font-semibold">Κατάσταση</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => {
                const isComplete = Boolean(t.afm && t.phone);
                const addressFormatted = formatTeacherAddress(t);

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

                    <td className="py-2.5 px-3 text-muted-foreground max-w-[160px] truncate" title={addressFormatted}>
                      {addressFormatted !== "-" ? (
                        <span className="flex items-center gap-1 text-[11px] truncate">
                          <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                          <span className="truncate">{addressFormatted}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-400">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {t.signature && (
                          <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900 py-0 px-1">
                            ✓ Υπογραφή
                          </Badge>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(t)}
                          className="h-7 text-xs gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Επεξεργασία
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(t)}
                          className="h-7 w-7 p-0 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Διαγραφή Εκπαιδευτικού"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit / Create Details Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <IdCard className="w-4 h-4 text-blue-600" />
              {isCreatingNew
                ? "Προσθήκη Νέου Εκπαιδευτικού"
                : `Προσωπικά Στοιχεία: ${formData.lastName} ${formData.firstName}`}
            </DialogTitle>
          </DialogHeader>

          <div className="p-5 space-y-3 text-xs max-h-[75vh] overflow-y-auto">
            {/* Name and Specialty */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Επώνυμο *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="π.χ. Παπαδόπουλος"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Όνομα *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="π.χ. Νικόλαος"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Ειδικότητα *</Label>
                <Input
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="π.χ. ΠΕ70, ΠΕ11, ΠΕ06..."
                  className="h-8 text-xs mt-1"
                />
              </div>

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
                  placeholder="π.χ. Γεώργιος"
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs">Όνομα Μητέρας</Label>
                <Input
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  placeholder="π.χ. Μαρία"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Έτος Γέννησης</Label>
                <Input
                  value={formData.birthYear}
                  onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                  placeholder="π.χ. 1982"
                  className="h-8 text-xs mt-1"
                />
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
            </div>

            {/* 3 Separate Address Fields: Address (Street & No), Postal Code (T.K.), City */}
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-2.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Στοιχεία Διεύθυνσης Κατοικίας (Ξεχωριστά Πεδία για MySchool)
              </Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <Label className="text-[11px] text-muted-foreground">Διεύθυνση (Οδός & Αριθμός)</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="π.χ. Σωκράτους 12"
                    className="h-8 text-xs mt-1 bg-white dark:bg-zinc-950"
                  />
                </div>

                <div>
                  <Label className="text-[11px] text-muted-foreground">Τ.Κ.</Label>
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    placeholder="π.χ. 15344"
                    className="h-8 text-xs mt-1 bg-white dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">Πόλη / Περιοχή</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="π.χ. Γέρακας"
                  className="h-8 text-xs mt-1 bg-white dark:bg-zinc-950"
                />
              </div>
            </div>

            {/* Signature Uploader */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <PenTool className="w-3.5 h-3.5 text-blue-600" />
                Ψηφιακή Υπογραφή Εκπαιδευτικού (PNG/JPG)
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Εμφανίζεται αυτόματα στο κάτω μέρος της επίσημης Αίτησης Άδειας. Συνιστάται εικόνα με διαφανές φόντο.
              </p>

              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between gap-3">
                <div className="h-16 w-32 border border-dashed border-zinc-300 dark:border-zinc-700 rounded flex items-center justify-center bg-white dark:bg-zinc-950 overflow-hidden">
                  {formData.signature ? (
                    <img
                      src={formData.signature}
                      alt="Υπογραφή"
                      className="max-h-full max-w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-[10px] text-zinc-400 italic">
                      Χωρίς υπογραφή
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={signatureInputRef}
                  onChange={handleSignatureUpload}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signatureInputRef.current?.click()}
                    className="h-7 text-xs gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    {formData.signature ? "Αλλαγή" : "Μεταφόρτωση"}
                  </Button>
                  {formData.signature && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, signature: "" })}
                      className="h-7 text-xs text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
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
              {isSaving ? "Αποθήκευση..." : isCreatingNew ? "Προσθήκη" : "Αποθήκευση"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md p-5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-base text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Επιβεβαίωση Διαγραφής
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-2">
              Είστε βέβαιοι ότι θέλετε να διαγράψετε τον/την εκπαιδευτικό{" "}
              <strong>{teacherToDelete?.lastName} {teacherToDelete?.firstName}</strong> ({teacherToDelete?.specialty});
              <br />
              Η ενέργεια αυτή θα διαγράψει και τις συνδεδεμένες άδειες και αναθέσεις του εκπαιδευτικού.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              className="text-xs"
            >
              Ακύρωση
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? "Διαγραφή..." : "Διαγραφή"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
