"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function GeneralSettingsPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    window.location.href = "/api/db/export";
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".db") && !file.name.endsWith(".sqlite") && !file.name.endsWith(".sqlite3")) {
      toast.error("Μη έγκυρο αρχείο. Παρακαλώ επιλέξτε ένα αρχείο βάσης δεδομένων (.db)");
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/db/import", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setShowRestartDialog(true);
      } else {
        const errorData = await response.json();
        toast.error(`Σφάλμα: ${errorData.error || "Αποτυχία εισαγωγής"}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Σφάλμα κατά την επικοινωνία με τον διακομιστή");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const closeApp = () => {
    // Attempt to close via Tauri API, fallback to just closing window or reloading
    if (window && (window as any).__TAURI_INTERNALS__) {
      (window as any).__TAURI_INTERNALS__.invoke("plugin:process|exit", { code: 0 })
        .catch(() => {
          // If plugin process is not available, just close the window
          window.close();
        });
    } else {
      window.close();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Γενικές Ρυθμίσεις</h3>
        <p className="text-sm text-muted-foreground">
          Βασικές ρυθμίσεις της εφαρμογής και του σχολείου.
        </p>
      </div>
      
      <div className="border-t pt-6 space-y-4">
        <div>
          <h4 className="text-md font-medium text-foreground flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-500" />
            Εξαγωγή Δεδομένων (Backup)
          </h4>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Αποθηκεύστε όλα τα δεδομένα της εφαρμογής (εκπαιδευτικούς, μαθήματα, προγράμματα) σε ένα τοπικό αρχείο .db για λόγους ασφαλείας.
          </p>
          <Button onClick={handleExport} variant="outline">
            Κατέβασμα Βάσης Δεδομένων
          </Button>
        </div>
      </div>

      <div className="border-t pt-6 space-y-4">
        <div>
          <h4 className="text-md font-medium text-foreground flex items-center gap-2">
            <Upload className="w-5 h-5 text-orange-500" />
            Εισαγωγή Δεδομένων (Restore)
          </h4>
          <p className="text-sm text-muted-foreground mt-1 mb-3">
            Επαναφέρετε δεδομένα από ένα προηγούμενο αντίγραφο ασφαλείας (.db). <br />
            <strong className="text-destructive font-medium">Προσοχή: </strong> 
            Αυτή η ενέργεια θα διαγράψει τα τρέχοντα δεδομένα και θα τα αντικαταστήσει!
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".db,.sqlite,.sqlite3" 
            className="hidden" 
          />
          <Button onClick={handleImportClick} variant="destructive" disabled={isImporting}>
            {isImporting ? "Εισαγωγή..." : "Αντικατάσταση & Εισαγωγή Βάσης"}
          </Button>
        </div>
      </div>

      <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              Επιτυχής Εισαγωγή
            </DialogTitle>
            <DialogDescription className="pt-2 text-base">
              Η βάση δεδομένων αντικαταστάθηκε επιτυχώς!
              <br /><br />
              Για να εφαρμοστούν οι αλλαγές, <strong>πρέπει να κλείσετε και να ξανανοίξετε την εφαρμογή</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button onClick={closeApp} className="w-full">
              Κλείσιμο Εφαρμογής
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
