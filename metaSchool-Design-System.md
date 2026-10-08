# metaSchool — Complete Design System & AI UI Prompt Specification

> **Οδηγός Χρήσης / Prompt Guide:** Αυτό το αρχείο περιέχει τις πλήρεις προδιαγραφές, αρχιτεκτονική, κανόνες styling, UI components, παλέτες χρωμάτων και πρότυπα διάταξης της εφαρμογής **metaSchool**. Μπορείτε να τροφοδοτήσετε ολόκληρο αυτό το αρχείο (ή τα επιμέρους τμήματά του) σε οποιοδήποτε AI εργαλείο/μοντέλο για να σχεδιάσει και να υλοποιήσει νέες σελίδες και components που ταιριάζουν 100% με την υπόλοιπη εφαρμογή.

---

## 1. Ταυτότητα & Σκοπός Εφαρμογής (Application Overview)

- **Όνομα Προϊόντος:** `metaSchool`
- **Αντικείμενο:** Σύστημα Διαχείρισης & Αυτοματοποιημένης Δημιουργίας Σχολικού Ωρολογίου Προγράμματος (με χρήση αλγορίθμων βελτιστοποίησης Google OR-Tools CP-SAT), καθώς και διαχείριση εκπαιδευτικών, τμημάτων, μαθημάτων, εφημεριών, αδειών και σχολικών ρυθμίσεων.
- **Κοινό / Χρήστες:** Διευθυντές σχολείων, υπεύθυνοι σύνταξης προγράμματος, εκπαιδευτικοί (ελληνικό εκπαιδευτικό σύστημα: Δημοτικά, Γυμνάσια, Λύκεια).
- **Γλώσσα Διεπαφής:** Ελληνικά (Greek UI).
- **Βασική Αισθητική:** Clean Minimalist, Dense Professional SaaS, Linear/Vercel-inspired, Neutral Grayscale με στοχευμένα Vibrant Accents και εξειδικευμένες παστέλ παλέτες για αναγνωρισιμότητα δεδομένων (matrix slots, chips, tags).

---

## 2. Τεχνολογικό Stack & Βιβλιοθήκες (Tech Stack)

```json
{
  "framework": "Next.js 16 (App Router)",
  "react": "React 19",
  "language": "TypeScript",
  "styling": "Tailwind CSS v4 (@tailwindcss/postcss + shadcn/tailwind.css)",
  "animations": "tw-animate-css",
  "componentLibrary": "shadcn/ui (style: base-nova, baseColor: neutral, @base-ui/react)",
  "icons": "lucide-react",
  "toasts": "sonner (richColors, top-right, light theme)",
  "fonts": {
    "sans": "Manrope (Google Fonts, latin + greek subsets)",
    "mono": "Geist Mono / font-mono"
  },
  "database/orm": "Drizzle ORM (better-sqlite3 / libsql)"
}
```

---

## 3. Σύστημα Τυπογραφίας & Γραμματοσειρές (Typography)

1. **Κύρια Γραμματοσειρά (Sans):** `Manrope` (`--font-manrope`, Google Font με πλήρη υποστήριξη Ελληνικών).
   - Εφαρμόζεται αυτόματα στο `body` και `html` (`font-sans`).
   - Χαρακτηριστικά: Καθαρή γεωμετρική sans-serif, εξαιρετικά ευανάγνωστη σε μικρά μεγέθη και πίνακες.
2. **Μονοδιάστατη Γραμματοσειρά (Mono):** `Geist Mono` / `font-mono`.
   - Χρήση: Κωδικοί μαθημάτων/ειδικοτήτων (π.χ. `ΠΕ70`, `ΠΕ11`), ώρες, στατιστικά, debug info, αριθμοί ωραρίου (`1η`, `2η`), σύμβολα κανόνων.
3. **Κλίμακα Μεγεθών Κειμένου (Micro-Typography Rule):**
   - Η εφαρμογή είναι **high-density**: Τα μεγέθη είναι συμπαγή για να χωρούν πολλά σχολικά δεδομένα στην οθόνη.
   - **Header / Nav Links:** `text-[10px]` έως `text-xs` (font-semibold ή font-medium).
   - **Page Headings:** `text-lg` έως `text-xl` (`font-bold`, `tracking-tight`).
   - **Card / Section Titles:** `text-sm` έως `text-base` (`font-semibold text-zinc-900`).
   - **Body / Table Cells / Inputs:** `text-xs` (`text-zinc-700` / `text-zinc-800`).
   - **Teacher Tiles & Abbreviations:** 4 κεφαλαία γράμματα χωρίς τόνους (π.χ. `ΠΑΠΑ`, `ΚΩΝΣ`, `ΓΕΩΡ`).
     - **Πρωινό Ωράριο (Default):** Στήλες `44px`, γραμματοσειρά `text-[11.5px] font-bold` (υποκελιά: `10px` / `9px`), με έντονους κάθετους διαχωριστές ημερών (`border-r-[3.5px] border-zinc-400 dark:border-zinc-500`) και ομοιόχρωμα παχιά οριζόντια χωρίσματα τμημάτων (`border-b-2 border-zinc-400 dark:border-zinc-500`).
     - **Πλήρες (+Ολοήμερο):** Στήλες `36px`, γραμματοσειρά `text-[10px] font-bold` (υποκελιά: `9px` / `8px`), λεπτά χωρίσματα `border-b border-zinc-200 dark:border-zinc-800`.
   - **Subtitles & Help Text:** `text-[11px]` έως `text-xs` (`text-zinc-500` / `text-muted-foreground`).

---

## 4. Χρωματική Παλέτα & Design Tokens (Color Palette & Variables)

### 4.1. Βασικά Ουδέτερα Χρώματα (Neutrals)
- **App Background:** `bg-zinc-50/50` (ή `bg-zinc-100/60` για slide-over backdrops).
- **Cards / Containers / Canvas:** `bg-white` με περίγραμμα `border-zinc-200` (εσωτερικά dividers: `border-zinc-100`).
- **Primary Text:** `text-zinc-900` / `text-zinc-800`.
- **Secondary / Muted Text:** `text-zinc-500` / `text-zinc-400`.
- **Primary Solid Action:** `bg-zinc-900 text-white hover:bg-zinc-800` (ή indigo gradient).
- **Secondary / Muted Action:** `bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border-zinc-200`.

### 4.2. Tokens CSS (`globals.css` - OKLCH Light & Dark Theme)
```css
/* Light Theme (Default) */
:root {
  --background: oklch(1 0 0);           /* #ffffff */
  --foreground: oklch(0.145 0 0);       /* #18181b zinc-900 */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);          /* zinc-900 */
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);         /* zinc-100 */
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0); /* zinc-500 */
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325); /* Red */
  --border: oklch(0.922 0 0);           /* zinc-200 */
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;                   /* 10px */
}

/* Dark Theme (.dark) - Full next-themes Support */
.dark {
  --background: oklch(0.145 0 0);       /* zinc-950/900 */
  --foreground: oklch(0.985 0 0);       /* zinc-50 */
  --card: oklch(0.205 0 0);             /* zinc-900 */
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);          /* zinc-100 */
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);        /* zinc-800 */
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);         /* zinc-800 equivalent */
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}
```

### 4.3. Ειδικές Παλέτες Εφαρμογής (Domain Palettes)

#### Α. Teacher 50 Palette (`src/lib/palette.ts`)
50 επιλεγμένα παστέλ χρώματα με προ-υπολογισμένο σκούρο κείμενο και διακριτό border για άριστο contrast:
- **Κίτρινα:** `#fef08a` (textColor: `#713f12`, border: `#eab308`), `#fde047`, `#fef9c3`
- **Πορτοκαλί / Βερικοκί:** `#fed7aa` (textColor: `#7c2d12`, border: `#f97316`), `#fdba74`, `#ffedd5`
- **Ροζ / Κοραλλί:** `#fda4af`, `#ffe4e6`, `#fbcfe8`
- **Μωβ / Λεβάντα:** `#ddd6fe` (textColor: `#5b21b6`, border: `#a78bfa`), `#c4b5fd`, `#ede9fe`
- **Indigo:** `#c7d2fe` (textColor: `#3730a3`, border: `#818cf8`), `#a5b4fc`
- **Σιέλ / Μπλε:** `#bae6fd` (textColor: `#0369a1`, border: `#38bdf8`), `#93c5fd`, `#bfdbfe`
- **Τιρκουάζ / Κυανό:** `#99f6e4` (textColor: `#115e59`, border: `#2dd4bf`), `#a5f3fc`, `#5eead4`
- **Μέντα / Σμαραγδί:** `#a7f3d0` (textColor: `#065f46`, border: `#34d399`), `#6ee7b7`, `#ccfbf1`
- **Λάιμ / Πράσινο:** `#d9f99d` (textColor: `#3f6212`, border: `#a3e635`), `#bbf7d0`, `#86efac`
- **Slate / Zinc:** `#e2e8f0`, `#cbd5e1`, `#e4e4e7`

#### Β. Class 15 Palette (`CLASS_15_PALETTE`)
15 έντονα διακριτά χρώματα για τμήματα (π.χ. Α1, Β2, Γ3):
- `#3b82f6` (Μπλε), `#10b981` (Σμαραγδί), `#f97316` (Πορτοκαλί), `#7c3aed` (Βιολετί), `#ec4899` (Ροζ), `#06b6d4` (Κυανό), `#eab308` (Χρυσό), `#ef4444` (Κόκκινο), κλπ.

#### Γ. Semantic Status Badges & Gradients
- **Υποχρεωτικός Κανόνας (Hard):** `bg-red-50 text-red-600 border-red-200`
- **Προτίμηση (Soft):** `bg-amber-50 text-amber-600 border-amber-200`
- **AI Rule:** `bg-purple-100 text-purple-700 border-purple-200`
- **Specialty Pill (Ειδικότητα):** `bg-zinc-100 text-zinc-700 border-zinc-200 font-mono`
- **Primary Action Gradient:** `bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white`
- **Success / Solver Complete:** `bg-emerald-50 text-emerald-700 border-emerald-200`
- **Warning / Unassigned:** `bg-zinc-100 text-zinc-500 border-dashed border-zinc-300`

---

## 5. Δομή Σελίδων & Layout Patterns (Layout Architectures)

Υπάρχουν 2 κύρια layout patterns στην εφαρμογή:

### Pattern A: Master Canvas Layout (Όπως στην αρχική σελίδα `/`)
Χρησιμοποιείται για οθόνες υψηλής πυκνότητας (π.χ. Ωρολόγιο Πρόγραμμα, Εφημερίες, Master Grid):
```tsx
<div className="h-screen w-full flex flex-col overflow-hidden bg-white font-sans text-xs selection:bg-zinc-800 selection:text-white">
  {/* Top Header: 36px (h-9) */}
  <SiteHeader schoolName="1ο Πειραματικό Δημοτικό" rightActions={<HeaderActions />} />

  {/* Main Content Area: High density, fill remaining space, scrollable */}
  <main className="flex-1 overflow-auto bg-white relative">
    {/* High density matrix, tables, or boards */}
  </main>

  {/* Status Footer: 24px (h-6) */}
  <footer className="h-6 flex-none border-t border-zinc-200 bg-zinc-50 px-3 flex items-center justify-between text-[10px] text-zinc-600 select-none z-30" />

  {/* Slide-over Fullscreen Management Sheets */}
  <Sheet open={Boolean(activeSheet)} onOpenChange={...}>
    <SheetContent side="right" className="!w-screen sm:!w-screen !max-w-none inset-0 rounded-none overflow-hidden p-0 flex flex-col bg-zinc-100/60 border-none">
      {/* Management Content (TeachersManager, ClassesManager, etc.) */}
    </SheetContent>
  </Sheet>
</div>
```

### Pattern B: Two-Column Settings Layout (Όπως στο `/settings`)
Χρησιμοποιείται για σελίδες ρυθμίσεων, φόρμες παραμέτρων, διαχειριστικά υπομενού:
```tsx
<div className="h-screen w-full flex flex-col overflow-hidden bg-zinc-50/50 font-sans text-xs">
  {/* Top Header */}
  <SiteHeader schoolName="metaSchool Ρυθμίσεις" />

  <div className="flex flex-1 w-full gap-6 p-6 overflow-hidden">
    {/* Left Navigation Card (w-64) */}
    <Card className="flex w-64 flex-col rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-zinc-100">
        <h2 className="text-xl font-bold tracking-tight">Ρυθμίσεις</h2>
        <p className="text-xs text-muted-foreground mt-1">Διαχείριση παραμέτρων σχολείου</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {/* Navigation Links with icon + label */}
        <Link href="/settings/..." className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-zinc-100 hover:text-zinc-900 transition-all">
          <Icon className="h-4 w-4" />
          Όνομα Ενότητας
        </Link>
      </nav>
      <div className="p-4 border-t border-zinc-100">
        <Link href="/" className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-all">
          <ArrowLeft className="h-4 w-4" />
          Επιστροφή στην εφαρμογή
        </Link>
      </div>
    </Card>

    {/* Right Main Content Card */}
    <div className="flex-1 flex flex-col min-w-0">
      <Card className="flex-1 p-6 overflow-auto border border-zinc-200 bg-white rounded-xl shadow-sm">
        {/* Settings Page Content */}
      </Card>
    </div>
  </div>
</div>
```

---

## 6. Βιβλιοθήκη UI Components & Συνταγές (Component Recipes)

### 6.1. Header Bar (`SiteHeader`)
- **Ύψος:** `h-9` (36px)
- **Background & Border:** `bg-white border-b border-zinc-200`
- **Στοιχεία Αριστερά:**
  - Hamburger Menu Icon Button (`h-7 w-7 p-0 text-zinc-600 hover:bg-zinc-100`)
  - App Icon Box (`h-5 w-5 rounded bg-zinc-900 text-white text-[11px] font-bold`)
  - School Pill Badge (`text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200`)
- **Στοιχεία Δεξιά:**
  - Compact Action Buttons (`h-6 px-2 text-[10px] font-sans border-zinc-200 text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100`)
  - Solve / Action Button (`h-6 px-2.5 text-[10px] bg-zinc-900 text-white hover:bg-zinc-800` με `Sparkles` icon).

### 6.2. Buttons (`src/components/ui/button.tsx`)
Χρησιμοποιήστε τα εξής τυποποιημένα μεγέθη και παραλλαγές:
- **Micro Button (για headers & compact bars):** `className="h-6 px-2 text-[10px] gap-1"`
- **Small Button (για πίνακες, actions, dialog headers):** `className="h-8 px-3 text-xs gap-1.5"`
- **Default Button (για φόρμες και settings):** `className="h-9 px-4 text-sm"`
- **Primary Style:** `bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg shadow-sm font-medium`
- **Secondary / Outline Style:** `border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 rounded-lg`
- **Ghost Style:** `hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 rounded-md`
- **Destructive Style:** `text-red-600 hover:bg-red-50 hover:text-red-700`

### 6.3. Cards & Sections
```tsx
<div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
  {/* Card Header */}
  <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-indigo-600" />
      <h3 className="text-sm font-bold text-zinc-800">Τίτλος Κάρτας</h3>
      <Badge variant="outline" className="text-[10px] bg-zinc-50">Ετικέτα</Badge>
    </div>
    <div className="flex items-center gap-2">
      {/* Actions */}
    </div>
  </div>

  {/* Card Content */}
  <div className="p-4 space-y-4">
    {/* Body content */}
  </div>
</div>
```

### 6.4. Form Settings Row (Πρότυπο Ρύθμισης / Διακόπτη)
```tsx
<div className="flex flex-row items-center justify-between rounded-lg border border-zinc-200 p-4 shadow-sm bg-white hover:border-zinc-300 transition-all">
  <div className="space-y-0.5 max-w-xl">
    <Label className="text-sm font-semibold text-zinc-900">Τίτλος Ρύθμισης</Label>
    <p className="text-xs text-zinc-500 leading-relaxed">
      Αναλυτική περιγραφή της λειτουργίας της ρύθμισης και πώς επηρεάζει το πρόγραμμα.
    </p>
  </div>
  <div className="ml-4 flex items-center gap-3">
    <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
  </div>
</div>
```

### 6.5. Tables & List Data Rows
- Χρησιμοποιήστε `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableCell` από `@/components/ui/table`.
- **Header styling:** `bg-zinc-50/70 border-b border-zinc-200 text-zinc-600 text-xs font-semibold`.
- **Row styling:** `hover:bg-zinc-50/80 transition-colors border-b border-zinc-100 text-xs text-zinc-800`.
- **Empty States:** Κεντραρισμένο container με εικονίδιο σε gradient box (`w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center`), τίτλο `text-sm font-bold` και επεξηγηματικό κείμενο `text-xs text-zinc-500`.

### 6.6. Toasts & Feedback (`sonner`)
- `toast.success("Οι ρυθμίσεις αποθηκεύτηκαν επιτυχώς")`
- `toast.error("Σφάλμα σύνδεσης", { description: "Λεπτομέρειες σφάλματος..." })`
- `toast.warning("Προσοχή: Μη έγκυρες παράμετροι")`

---

## 7. Εικονίδια (`lucide-react`) & Αντιστοιχίσεις

Χρησιμοποιείτε αποκλειστικά εικονίδια από τη βιβλιοθήκη `lucide-react`:
- **Πρόγραμμα / Ημερολόγιο:** `CalendarDays`, `CalendarClock`
- **Εκπαιδευτικοί:** `Users`, `UserCheck`, `GraduationCap`
- **Τμήματα:** `GraduationCap`, `School`, `DoorOpen`
- **Μαθήματα:** `BookOpen`, `BookMarked`
- **Κανόνες / Αυτοματισμοί:** `Zap`, `Sparkles`, `Sliders`
- **Εφημερίες:** `ClipboardList`, `BriefcaseMedical`, `ShieldCheck`
- **Άδειες:** `Palmtree`, `Umbrella`, `Clock`
- **Ρυθμίσεις:** `Settings`, `SlidersHorizontal`
- **Ενέργειες:** `Plus`, `Trash2`, `Edit2`, `Copy`, `Check`, `X`, `Search`, `Filter`, `ArrowLeft`, `ChevronDown`, `Loader2` (με `animate-spin`).

---

## 8. Κανόνες Γλώσσας & Ορολογίας (Greek UI Copywriting Rules)

1. **Συνέπεια Ορολογίας:**
   - Να χρησιμοποιείται πάντα **"Ωρολόγιο Πρόγραμμα"** (όχι schedule / timetable).
   - Να χρησιμοποιείται **"Εκπαιδευτικοί"** (όχι καθηγητές / δάσκαλοι μόνοι τους).
   - Να χρησιμοποιείται **"Τμήματα"** για τις τάξεις (π.χ. Α1, Β2).
   - Να χρησιμοποιείται **"Ειδικότητα"** (π.χ. ΠΕ70 - Δάσκαλοι, ΠΕ11 - Φυσική Αγωγή, ΠΕ06 - Αγγλικά).
   - Να χρησιμοποιείται **"Εφημερίες"** και **"Άδειες"**.
   - Να χρησιμοποιείται **"Επίλυση"** (για τη λειτουργία του Solver).
2. **Μηνύματα Ενεργειών:**
   - "Αποθήκευση Ρυθμίσεων", "Αποθήκευση Αλλαγών", "Ακύρωση", "Διαγραφή", "Επεξεργασία", "Δημιουργία Νέου...".
   - "Φόρτωση δεδομένων...", "Υπολογισμός σε εξέλιξη...".
3. **Τόνος:** Επαγγελματικός, ευγενικός, λιτός και σαφής (SaaS-grade Greek UI).

---

## 9. Πρότυπο Starter Template για Νέα Σελίδα (Next.js Page Boilerplate)

Όταν ζητάτε από το AI να υλοποιήσει μια νέα σελίδα, μπορεί να χρησιμοποιήσει αυτό το boilerplate ως αρχική βάση:

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle2,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";

export default function NewFeaturePage() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Τίτλος Νέας Σελίδας
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Περιγραφή και διαχείριση της λειτουργίας.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 px-3 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-lg shadow-sm gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Προσθήκη
          </Button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input
            placeholder="Αναζήτηση..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs bg-white border-zinc-200 rounded-lg"
          />
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50/70 border-b border-zinc-200">
            <TableRow>
              <TableHead className="text-xs font-semibold text-zinc-700">Όνομα</TableHead>
              <TableHead className="text-xs font-semibold text-zinc-700">Κατάσταση</TableHead>
              <TableHead className="w-[100px] text-right text-xs font-semibold text-zinc-700">Ενέργειες</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-zinc-50/80 transition-colors">
              <TableCell className="font-medium text-zinc-900">Δείγμα Στοιχείου</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                  Ενεργό
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-700">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
```

---

## 10. System Prompt Εντολής προς AI (Copy-Paste Ready)

Όταν θέλετε ένα AI να σας σχεδιάσει ή να γράψει κώδικα για μια νέα σελίδα του **metaSchool**, δώστε του την εξής οδηγία:

> **AI Instruction Prompt:**
> "Είσαι senior frontend μηχανικός και UI/UX designer. Θέλω να σχεδιάσεις και να υλοποιήσεις μια νέα σελίδα για την εφαρμογή **metaSchool** σύμφωνα με τις αυστηρές προδιαγραφές του παραπάνω Design System. 
> 
> **Κανόνες που ΠΡΕΠΕΙ να ακολουθήσεις πιστά:**
> 1. Χρησιμοποίησε Next.js (App Router, Client Component `"use client"` όπου απαιτείται state), React 19, TypeScript.
> 2. Χρησιμοποίησε Tailwind CSS v4 με tokens από το shadcn/ui (`@/components/ui/...`).
> 3. Χρησιμοποίησε γραμματοσειρά Manrope (`font-sans`), συμπαγή μεγέθη κειμένου (`text-xs`, `text-[10px]`, `text-sm`), και καθαρή διάταξη με `border-zinc-200`, `bg-white`, και `bg-zinc-50/50`.
> 4. Χρησιμοποίησε αποκλειστικά εικονίδια από το `lucide-react`.
> 5. Όλα τα κείμενα διεπαφής (labels, placeholders, buttons, toasts) να είναι στα **Ελληνικά** με άψογη επαγγελματική ορολογία.
> 6. Χρησιμοποίησε `sonner` (`toast.success`, `toast.error`) για ενημερώσεις στον χρήστη.
> 7. Φρόντισε η σελίδα να έχει responsive σχεδιασμό, άψογη πυκνότητα πληροφορίας (high-density layout), καθαρά empty states, και smooth micro-interactions."
