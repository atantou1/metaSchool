"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TimetableSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings state
  const [forceExtremeHours, setForceExtremeHours] = useState(false);

  useEffect(() => {
    // Fetch initial settings
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings?keys=timetable.force_extreme_hours");
        const data = await res.json();
        
        if (data["timetable.force_extreme_hours"] !== undefined) {
          setForceExtremeHours(data["timetable.force_extreme_hours"] === "true" || data["timetable.force_extreme_hours"] === true);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast.error("Αποτυχία φόρτωσης ρυθμίσεων");
      } finally {
        setLoading(false);
      }
    }
    
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        "timetable.force_extreme_hours": forceExtremeHours,
      };

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success("Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Αποτυχία αποθήκευσης ρυθμίσεων");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Ρυθμίσεις Προγράμματος</h3>
        <p className="text-sm text-muted-foreground">
          Κανόνες και παράμετροι για την αυτόματη δημιουργία του ωρολογίου προγράμματος.
        </p>
      </div>
      
      <div className="border-t pt-6 space-y-8">
        
        {/* Specific Setting: Force Extreme Hours */}
        <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
          <div className="space-y-0.5">
            <Label className="text-base font-semibold">Εξαναγκασμός ακραίων ωρών σε διδασκαλία</Label>
            <p className="text-sm text-muted-foreground">
              Όταν ορίζεται το ωράριο διαθεσιμότητας ενός εκπαιδευτικού (π.χ. 1η έως 4η ώρα), ο αλγόριθμος θα απαιτεί 
              η πρώτη και η τελευταία ώρα αυτού του εύρους να είναι υποχρεωτικά ώρες διδασκαλίας. 
              Αν απενεργοποιηθεί, υπάρχει ελαστικότητα εφόσον καλύπτονται οι συνολικές ώρες.
            </p>
          </div>
          <div className="ml-4">
            <Switch
              checked={forceExtremeHours}
              onCheckedChange={setForceExtremeHours}
            />
          </div>
        </div>

      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Αποθήκευση Ρυθμίσεων
        </Button>
      </div>
    </div>
  );
}
