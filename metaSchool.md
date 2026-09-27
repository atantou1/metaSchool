# Product Requirements Document (PRD): Εφαρμογή Δημιουργίας Σχολικού Προγράμματος (metaSchool)

## 1. Project Overview & Goals

Η εφαρμογή στοχεύει στην αυτοματοποιημένη δημιουργία ωρολογίου προγράμματος για σχολεία, καλύπτοντας από τις τυπικές ανάγκες ενός κλασικού ελληνικού σχολείου έως τις πολύπλοκες απαιτήσεις ενός Ειδικού Πειραματικού Δημοτικού. Το σύστημα διαχειρίζεται το πρωινό πρόγραμμα, το ολοήμερο (ως ενιαίο ή ξεχωριστό πρόβλημα) και σε δεύτερη φάση τις εφημερίες εκπαιδευτικών.

**Βασικοί Στόχοι (Phase 1):**

* Ευελιξία στο "σπάσιμο" τμημάτων σε υπο-ομάδες για ταυτόχρονη διδασκαλία διαφορετικών μαθημάτων (π.χ. Πληροφορική / Γλώσσα).
* Διαχείριση υποστηρικτικών ειδικοτήτων (Λογοθεραπεία, Ψυχολογική υποστήριξη) που αναλαμβάνουν μαθητές παράλληλα με το βασικό πρόγραμμα.
* Αντιμετώπιση των συνδιδασκαλιών ή διπλών τμημάτων ως ανεξάρτητων οντοτήτων στο σύστημα.
* Local-first λειτουργία με προοπτική για Online/SaaS.

## 2. Tech Stack & Architecture

* **Frontend / UI:** Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui
* **Desktop Wrapper:** Tauri (πακετάρισμα σε αυτόνομο `.exe` / `.dmg`)
* **Local Database:** SQLite (ORM: Prisma ή Drizzle) - Σχεδιασμός με γνώμονα τη μελλοντική μετάβαση σε Supabase (PostgreSQL).
* **Backend / Solver Sidecar:** Python με FastAPI
* **Αλγόριθμος Βελτιστοποίησης:** Google OR-Tools (CP-SAT Solver)

## 3. Core Entities & Data Architecture

**3.1. School Configuration (Ρυθμίσεις Σχολείου)**

* **Ημέρες Λειτουργίας:** π.χ. Δευτέρα έως Παρασκευή.
* **Περίοδοι (Periods):** Ορισμός συνολικού αριθμού ωρών (π.χ. 6ωρο, 7ωρο, Ολοήμερο).
* **Χρονοδιάγραμμα:** Έναρξη και λήξη κάθε ώρας (π.χ. 1η Ώρα: 08:15 - 09:00).

**3.2. Specialty Category (Κατηγορία Ειδικότητας)**

* **Core (Βασική):** Καταλαμβάνει τις επίσημες ώρες του ωρολογίου προγράμματος του τμήματος (π.χ. Δάσκαλοι, Πληροφορική, Μουσική).
* **Pull-out / Support (Υποστηρικτική):** Λειτουργεί παράλληλα με το πρόγραμμα. Οι ειδικότητες αυτές (π.χ. Λογοθεραπευτής, Ψυχολόγος) παίρνουν μαθητές εκτός τάξης χωρίς να ακυρώνουν το βασικό μάθημα.

**3.3. Teacher (Εκπαιδευτικός)**

* **Προσωπικά:** Όνομα, Ειδικότητα, Κατηγορία (Core ή Support).
* **Τοποθέτηση:** Συμμετοχή (Μόνο Πρωί / Μόνο Ολοήμερο / Και τα 2), Κατανομή ωρών.
* **Διαθεσιμότητα:** Πίνακας με διαθέσιμες Ημέρες & Ώρες.
* **Περιορισμοί (Nullable / "Αδιάφορο"):** Κάθε περιορισμός μπορεί να τεθεί ως "Αδιάφορο" για να μην μπλοκάρει τον Solver.
  * Μέγιστες/Ελάχιστες ώρες ανά ημέρα.
  * Μέγιστες συνεχόμενες ώρες μαθήματος.
  * Μέγιστα συνεχόμενα κενά ανά ημέρα.
  * Μέγιστα συνολικά κενά (ημέρας/εβδομάδας). 
    *(Σημείωση: Η καθυστερημένη έναρξη ή η πρόωρη λήξη ωραρίου δεν προσμετρώνται ως κενά).*

**3.4. Class / StudentGroup (Τμήμα & Υπο-ομάδες)**

* Αντιμετώπιση του σχολείου ως 10 ανεξάρτητα τμήματα.
* **Sub-groups:** Δυνατότητα διαχωρισμού (π.χ. "Τμήμα 1 - Ομάδα Α", "Τμήμα 1 - Ομάδα Β").
* **Support Requirements:** Λίστα με τις υποστηρικτικές ειδικότητες που χρειάζεται το τμήμα.

**3.5. Lesson Assignment (Ανάθεση / Απαίτηση Μαθήματος)**

* Ορίζει τη σχέση: `[Εκπαιδευτικός] -> [Μάθημα] -> [Υπο-ομάδα] -> [Αριθμός Ωρών]`.
* **Concurrent Link (Συγχρονισμός):** Αν δύο διαφορετικές αναθέσεις (π.χ. Πληροφορική Ομάδας Α και Γλώσσα Ομάδας Β) μοιράζονται το ίδιο `concurrentGroupId`, ο αλγόριθμος τα τοποθετεί αυστηρά την ίδια διδακτική ώρα.

## 4. Business Logic, Constraints & Rule Builder

**4.1. Multi-Layer Scheduling (Στρωματική Επίλυση)**

* **Layer 1 - Core Schedule:** Επίλυση του βασικού προγράμματος. Εξασφαλίζει ότι όλα τα τμήματα καλύπτονται πλήρως από τις "Core" ειδικότητες χωρίς επικαλύψεις και κενά.
* **Layer 2 - Support Overlay:** Τοποθέτηση των "Pull-out" ειδικοτήτων πάνω στο δομημένο πρόγραμμα. Μοναδικός αυστηρός περιορισμός: να μην υπάρχουν δύο θεραπευτές στο ίδιο τμήμα την ίδια ώρα.

**4.2. Custom Constraint Builder & AI Rule Engine**
Ένα σύστημα υπερίσχυσης των γενικών κανόνων για τη διαχείριση ειδικών περιπτώσεων.

* **Visual Builder:** Οπτική δημιουργία κανόνων μέσω UI.
* **AI-Assisted Rules:** Ενσωμάτωση LLM. Ο χρήστης περιγράφει την ανάγκη σε φυσική γλώσσα (π.χ. *"Ο Γιώργος θέλω την Τετάρτη να έχει 4ωρο τις 4 πρώτες ώρες"*). Το AI επιστρέφει ένα δομημένο JSON payload, το οποίο η Python/FastAPI μετατρέπει δυναμικά σε constraint για το OR-Tools.

## 5. User Flow & UI/UX

Η εφαρμογή ακολουθεί δομή ελεύθερης πλοήγησης (Dashboard/Tabs):

1. **Global Settings:** Ορισμός παραμέτρων σχολείου, ζωνών και ωραρίων.
2. **Directory:** Εισαγωγή εκπαιδευτικών και μαθημάτων (μελλοντικά μέσω CSV/Excel).
3. **Classes & Requirements:** Δημιουργία τμημάτων, ορισμός υπο-ομάδων (Splits) και αντιστοίχιση αναθέσεων.
4. **The Builder:** Εισαγωγή ειδικών/χειροκίνητων περιορισμών.
5. **Solver Execution:** Αποστολή JSON state στο FastAPI. Προβολή Loading Screen με τα στάδια επίλυσης του OR-Tools.
6. **Results (Master Grid):** 
   * Προβολή προγράμματος ανά Τμήμα και ανά Εκπαιδευτικό.
   * **Split Cells:** Οπτικός διαχωρισμός του κελιού στο UI όταν ένα τμήμα χωρίζεται σε υπο-ομάδες τη συγκεκριμένη ώρα.
   * Δυνατότητα Drag & Drop μικροαλλαγών με live έλεγχο ορθότητας (validation) από το backend.

## 6. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Teacher {
  id          String  @id @default(uuid())
  firstName   String
  lastName    String
  specialty   String
  isSupport   Boolean @default(false)
  constraints String? // JSON payload για μέγιστες ώρες, κενά, διαθεσιμότητα
  assignments LessonAssignment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Subject {
  id          String  @id @default(uuid())
  title       String
  color       String?
  assignments LessonAssignment[]
}

model Class {
  id          String  @id @default(uuid())
  name        String
  subGroups   SubGroup[]
}

model SubGroup {
  id          String  @id @default(uuid())
  classId     String
  name        String
  class       Class   @relation(fields: [classId], references: [id], onDelete: Cascade)
  assignments LessonAssignment[]
}

model LessonAssignment {
  id              String  @id @default(uuid())
  teacherId       String
  subjectId       String
  subGroupId      String
  hours           Int
  isAllDay        Boolean @default(false)
  concurrentGroupId String? // Κοινό ID για μαθήματα που πρέπει να γίνουν την ίδια ώρα
  teacher         Teacher  @relation(fields: [teacherId], references: [id])
  subject         Subject  @relation(fields: [subjectId], references: [id])
  subGroup        SubGroup @relation(fields: [subGroupId], references: [id])
}

model AppSettings {
  id          String  @id @default(uuid())
  key         String  @unique
  value       String  // JSON payload
}

model CustomRule {
  id          String  @id @default(uuid())
  name        String
  description String?
  rulePayload String  // Δομημένο JSON από το AI/Builder
  isActive    Boolean @default(true)
}





## 7. Development Roadmap

- **Phase 1: Core Engine & Local App (MVP)**
  
  - Tauri + Next.js (Frontend), Python/FastAPI (Backend).
  
  - Υλοποίηση βασικού αλγορίθμου OR-Tools (Χωρίς ολοήμερο στην αρχή).
  
  - Σύστημα υπο-ομάδων και Split Cells UI.

- **Phase 2: Επεκτάσεις & Εργαλεία**
  
  - Ενσωμάτωση Ολοήμερου Προγράμματος.
  
  - AI Rule Builder.
  
  - Data Import/Export (CSV/Excel).
  
  - Αλγόριθμος Εφημεριών (υπολογισμός βάσει παραχθέντος προγράμματος).

- **Phase 3: Cloud & SaaS**
  
  - Μετάβαση σε Supabase (PostgreSQL).
  
  - User Authentication & Multi-tenant architecture.
