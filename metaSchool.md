# Product Requirements Document (PRD): metaSchool
### Έκδοση 2.0 — Ενημερωμένο Οκτώβριος 2026

---

## 1. Project Overview & Goals

Η εφαρμογή **metaSchool** στοχεύει στην αυτοματοποιημένη δημιουργία ωρολογίου προγράμματος για σχολεία, καλύπτοντας από τις τυπικές ανάγκες ενός κλασικού ελληνικού σχολείου έως τις πολύπλοκες απαιτήσεις ενός Ειδικού Πειραματικού Δημοτικού.

**Βασικοί Στόχοι (Phase 1 — Ενεργή):**

* Ευελιξία στο "σπάσιμο" τμημάτων σε υπο-ομάδες για ταυτόχρονη διδασκαλία.
* Διαχείριση υποστηρικτικών ειδικοτήτων (Λογοθεραπεία, Ψυχολογική υποστήριξη).
* **Conditional Rule Engine**: ορισμός κανόνων τύπου ΟΤΑΝ→ΤΟΤΕ με AND/OR λογική.
* Local-first λειτουργία (SQLite) με προοπτική για Online/SaaS.

---

## 2. Tech Stack & Architecture (Τρέχουσα Κατάσταση)

| Layer | Τεχνολογία |
|-------|-----------|
| **Frontend / UI** | Next.js 15 (App Router, TypeScript), Tailwind CSS, shadcn/ui |
| **Desktop Wrapper** | Tauri (προοπτική — δεν έχει ενσωματωθεί ακόμα) |
| **Local Database** | SQLite μέσω **Drizzle ORM** (`metaschool.db`) |
| **Backend / Solver Sidecar** | Python με FastAPI (`http://127.0.0.1:8000`) |
| **Αλγόριθμος** | Google OR-Tools CP-SAT Solver |

---

## 3. Core Entities & Data Architecture (Πλήρες Schema)

### 3.1. Teachers (Εκπαιδευτικοί)

Πίνακας: `teachers`

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| `id` | text PK | UUID |
| `firstName` | text | Όνομα |
| `lastName` | text | Επώνυμο |
| `specialty` | text | Ειδικότητα (π.χ. "ΠΕ70") |
| `isSupport` | boolean | true = υποστηρικτική ειδικότητα |
| `shortName` | text? | Συντομογραφία για εμφάνιση |
| `isTeaching` | boolean | Αν διδάσκει ενεργά |
| `isOnCall` | boolean | Εφημερεύων |
| `isMorning` | boolean | Πρωινό ωράριο |
| `isAllDay` | boolean | Ολοήμερο ωράριο |
| `isActive` | boolean | Ενεργός/Ανενεργός |
| `maxWeeklyHours` | int | Μέγιστες εβδομαδιαίες ώρες |
| `color` | text | Χρώμα για UI |
| `constraints` | text (JSON) | Διαθεσιμότητες, όρια ωρών, κενά |
| `createdAt` / `updatedAt` | text | ISO timestamps |

**JSON `constraints` schema:**
```json
{
  "availability": { "0": [true, false, true, ...] },
  "availableDays": [0, 1, 2, 3, 4],
  "maxHoursPerDay": 5,
  "minHoursPerDay": 2,
  "maxConsecutiveHours": 4,
  "maxConsecutiveGaps": 1,
  "maxTotalGapsPerDay": 2,
  "maxTotalGapsPerWeek": 5
}
```

### 3.2. Subjects (Μαθήματα)

Πίνακας: `subjects`

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| `id` | text PK | UUID |
| `title` | text | Τίτλος μαθήματος |
| `code` | text | Κωδικός (π.χ. "MAT") |
| `color` | text | Χρώμα για grid |
| `allowedSpecialties` | text (JSON) | Λίστα ειδικοτήτων που μπορούν να διδάξουν |
| `defaultSpecialty` | text? | Κύρια ειδικότητα |
| `classHours` | text (JSON) | `{ classId: [min, max] }` ώρες ανά τμήμα |

### 3.3. Classes (Τμήματα)

Πίνακας: `classes`

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| `id` | text PK | UUID |
| `name` | text | Όνομα (π.χ. "Α1") |
| `grade` | text | Τάξη |
| `color` | text | Χρώμα τμήματος |
| `shortName` | text? | Σύντομο όνομα |
| `studentsCount` | int | Αριθμός μαθητών |
| `headTeacherId` | text? | Υπεύθυνος δάσκαλος |
| `room` | text? | Αίθουσα |
| `isAllDay` | boolean | Ολοήμερο τμήμα |
| `supportSpecialties` | text (JSON) | Ειδικότητες υποστήριξης που χρειάζεται |
| `weeklyHoursTarget` | int | Στόχος εβδομαδιαίων ωρών |
| `supportHoursMin` | int | Ελάχιστες ώρες υποστήριξης/εβδομάδα |
| `supportHoursMax` | int | Μέγιστες ώρες υποστήριξης/εβδομάδα |
| `orderIndex` | int | Σειρά εμφάνισης |

### 3.4. SubGroups (Υπο-ομάδες)

Πίνακας: `sub_groups`

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| `id` | text PK | UUID |
| `classId` | text FK | → classes (cascade delete) |
| `name` | text | Όνομα (π.χ. "Α1-Α", "Α1-Β") |
| `isDefault` | boolean | true = ολομέλεια τμήματος |

Κάθε τμήμα έχει πάντα τουλάχιστον μία default subgroup (η ολομέλεια). Τα splits δημιουργούν επιπλέον subgroups.

### 3.5. LessonAssignments (Αναθέσεις)

Πίνακας: `lesson_assignments`

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| `id` | text PK | UUID |
| `teacherId` | text FK | → teachers |
| `subjectId` | text FK | → subjects |
| `subGroupId` | text FK | → sub_groups |
| `hours` | int | Ώρες/εβδομάδα |
| `isAllDay` | boolean | Ανήκει στο ολοήμερο |
| `concurrentGroupId` | text? | Κοινό ID για ταυτόχρονα μαθήματα (splits) |

### 3.6. TimetableSlots (Αποτέλεσμα Αλγορίθμου)

Πίνακας: `timetable_slots`

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| `id` | text PK | UUID |
| `day` | int | 0=Δευτέρα … 4=Παρασκευή |
| `period` | int | 0=1η ώρα, 1=2η, … |
| `assignmentId` | text FK | → lesson_assignments |
| `classId` | text FK | → classes |
| `subGroupId` | text FK | → sub_groups |
| `teacherId` | text FK | → teachers |
| `subjectId` | text FK | → subjects |
| `isSupport` | boolean | Layer 2 slot |
| `layer` | int | 1=Core, 2=Support |
| `isLocked` | boolean | Κλειδωμένο χειροκίνητα |

### 3.7. Rules (Κανόνες)

Πίνακας: `rules`

| Στήλη | Τύπος | Περιγραφή |
|-------|-------|-----------|
| `id` | text PK | UUID |
| `name` | text | Ανθρωποαναγνώσιμο όνομα |
| `description` | text? | Προαιρετική περιγραφή |
| `type` | text | `"CONDITIONAL"` (κύριος) ή legacy flat types |
| `enforcement` | text | `"hard"` \| `"soft"` |
| `weight` | int | 1-100, μόνο για soft rules |
| `params` | text (JSON) | `{ when: WhenClause, then: Action[] }` |
| `isActive` | boolean | Ενεργός/Ανενεργός |
| `source` | text | `"manual"` \| `"ai"` |
| `createdAt` / `updatedAt` | text | ISO timestamps |

### 3.8. AppSettings (Ρυθμίσεις)

Πίνακας: `app_settings`

Key-value store. Βασικό key: `"school_config"` με JSON:
```json
{
  "schoolName": "...",
  "schoolYear": "2026-2027",
  "days": ["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή"],
  "periods": [
    { "index": 0, "label": "1η Ώρα", "startTime": "08:15", "endTime": "09:00" },
    ...
  ],
  "allDayPeriods": []
}
```

---

## 4. Business Logic, Constraints & Rule Engine

### 4.1. Multi-Layer Scheduling

* **Layer 1 — Core Schedule:** Βασικό πρόγραμμα Core εκπαιδευτικών.
* **Layer 2 — Support Overlay:** Τοποθέτηση Pull-out ειδικοτήτων *(προσωρινά disabled στον solver — `if False`)*.

### 4.2. Conditional Rule Engine (ΝΕΟΣ — Phase 1 Ενεργό)

Αντικατέστησε το παλαιό flat Rule Builder. Δείτε `rule_builder_spec.md` για πλήρη ανάλυση.

Κάθε κανόνας ακολουθεί τη λογική:

```
ΟΤΑΝ [Συνθήκες με AND/OR groups] → ΤΟΤΕ [Αποτελέσματα]
```

Η εφαρμογή γίνεται μέσω OR-Tools **reification** (`OnlyEnforceIf`).

---

## 5. User Flow & UI/UX (Tabs)

| Tab | Περιεχόμενο |
|-----|------------|
| **Global Settings** | Σχολείο, ώρες, ημέρες |
| **Εκπαιδευτικοί** | Directory, constraints, availability grid |
| **Τμήματα** | Classes, subgroups, splits, support requirements |
| **Μαθήματα** | Subjects, ειδικότητες, classHours |
| **Αναθέσεις** | Assignments manager, concurrentGroupId |
| **Κανόνες** | Conditional Rule Builder (ΟΤΑΝ→ΤΟΤΕ) |
| **Solver** | Εκτέλεση, loading screen, diagnostics |
| **Master Grid** | Αποτέλεσμα, Drag & Drop, Split Cells, Lock |

---

## 6. API Endpoints

### Frontend → Backend (Next.js API Routes)

| Method | Path | Περιγραφή |
|--------|------|-----------|
| GET/POST/PATCH/DELETE | `/api/teachers` | CRUD εκπαιδευτικών |
| GET/POST/DELETE | `/api/subjects` | CRUD μαθημάτων |
| GET/POST/DELETE | `/api/classes` | CRUD τμημάτων |
| GET/POST/DELETE | `/api/subgroups` | CRUD υπο-ομάδων |
| GET/POST/DELETE | `/api/assignments` | CRUD αναθέσεων |
| GET/POST/PATCH/DELETE | `/api/rules` | CRUD κανόνων |
| GET/DELETE | `/api/timetable` | Εμφάνιση/Διαγραφή slots |
| POST | `/api/timetable/solve` | Εκκίνηση αλγορίθμου |
| POST | `/api/timetable/slots` | Validate/Save slots |

### Python Sidecar (FastAPI — `http://127.0.0.1:8000`)

| Method | Path | Περιγραφή |
|--------|------|-----------|
| POST | `/api/solve` | Κύρια επίλυση OR-Tools |
| POST | `/api/validate-move` | Drag & Drop validation |

---

## 7. Backend Python Structure

```
backend/app/
├── main.py              # FastAPI app, routes
├── models.py            # Pydantic input/output models
├── solver.py            # CP-SAT solver (Layer 1 + 2)
└── conditional_rules.py # Conditional Rule Engine handler (ΝΕΟΣ)
```

---

## 8. Frontend Structure

```
frontend/src/
├── app/
│   ├── page.tsx              # Main application shell
│   └── api/                  # Next.js API routes
├── components/
│   ├── teachers-manager.tsx
│   ├── classes-manager.tsx
│   ├── subjects-manager.tsx
│   ├── assignments-manager.tsx
│   ├── rules-manager.tsx         # Ενημερωμένο — χρησιμοποιεί νέο builder
│   ├── conditional-rule-builder.tsx  # ΝΕΟΣ — ΟΤΑΝ→ΤΟΤΕ UI
│   ├── master-matrix.tsx
│   ├── timetable-grid.tsx
│   ├── split-cell.tsx
│   └── move-slot-modal.tsx
├── db/
│   ├── schema.ts             # Drizzle ORM schema
│   ├── init.ts               # DB initialization & migrations
│   └── migrations/
├── lib/
│   ├── conditional-rules.ts  # ΝΕΟΣ — Type system & registries
│   ├── rules.ts              # Legacy flat rule types (υπάρχει ακόμα)
│   ├── specialties.ts
│   └── palette.ts
└── types/
    └── index.ts              # Shared TypeScript interfaces
```

---

## 9. Development Roadmap

### ✅ Phase 1 — Core Engine & Local App (MVP — Ολοκληρωμένο)
- [x] Next.js + FastAPI architecture
- [x] OR-Tools CP-SAT Layer 1 (Core Schedule)
- [x] Subgroups & Split Cells UI
- [x] Teacher constraints (availability, max/min hours, gaps, consecutive)
- [x] ConcurrentGroup synchronization
- [x] Fixed/Locked slots
- [x] Drag & Drop με validation
- [x] **Conditional Rule Engine** (ΟΤΑΝ→ΤΟΤΕ, AND/OR, 16 predicates, 15 actions)
- [x] Rule persistence στη SQLite
- [x] Rules → Solver integration (customRules στο solve payload)

### 🔄 Phase 2 — Επεκτάσεις (Σε εξέλιξη)
- [ ] Layer 2: Support Overlay (επανενεργοποίηση)
- [ ] Ολοήμερο Πρόγραμμα
- [ ] AI Rule Builder (φυσική γλώσσα → JSON)
- [ ] Data Import/Export (CSV/Excel)
- [ ] Αλγόριθμος Εφημεριών

### 🔮 Phase 3 — Cloud & SaaS
- [ ] Supabase (PostgreSQL) migration
- [ ] User Authentication & Multi-tenant
