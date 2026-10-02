# Rule Builder — Πλήρης Τεχνική Ανάλυση
### metaSchool — Conditional Rule Engine v2.0

---

## 1. Φιλοσοφία & Αρχιτεκτονική

Ο Rule Builder του metaSchool είναι ένα **Conditional Rule Engine** — κάθε κανόνας ακολουθεί τη λογική:

```
ΟΤΑΝ [Συνθήκη A  AND/OR  Συνθήκη B] → ΤΟΤΕ [Αποτέλεσμα 1]  ΚΑΙ  [Αποτέλεσμα 2]
```

Αποτελείται από **3 επίπεδα**:

```
Frontend UI (conditional-rule-builder.tsx)
        ↓  saves JSON
SQLite DB (rules table — params column)
        ↓  on /api/timetable/solve
Python OR-Tools (conditional_rules.py — reification)
```

---

## 2. JSON Payload Schema

Κάθε κανόνας αποθηκεύεται στη στήλη `params` (text/JSON) της `rules` table:

```json
{
  "when": {
    "operator": "AND",
    "groups": [
      {
        "id": "grp-uuid-1",
        "operator": "OR",
        "conditions": [
          {
            "id": "cond-uuid-1",
            "predicate": "teacher_has_subject",
            "teacherId": "t-abc123",
            "subjectId": "s-xyz789"
          },
          {
            "id": "cond-uuid-2",
            "predicate": "is_day",
            "days": [0, 2]
          }
        ]
      },
      {
        "id": "grp-uuid-2",
        "operator": "AND",
        "conditions": [
          {
            "id": "cond-uuid-3",
            "predicate": "teacher_daily_hours_gt",
            "teacherId": "t-abc123",
            "value": 4
          }
        ]
      }
    ]
  },
  "then": [
    {
      "id": "action-uuid-1",
      "action": "teacher_has_subject_same_slot",
      "teacherId": "t-def456",
      "subjectId": "s-math001"
    },
    {
      "id": "action-uuid-2",
      "action": "teacher_start_not_after",
      "teacherId": "t-ghi789",
      "period": 1
    }
  ]
}
```

---

## 3. Πλήρης Λίστα Συνθηκών (WHEN Predicates)

### Κατηγορία: Εκπαιδευτικός

| Predicate | Παράμετροι | Περιγραφή |
|-----------|-----------|-----------|
| `teacher_has_subject` | `teacherId`, `subjectId` | Ο εκπαιδευτικός διδάσκει το μάθημα Χ αυτή την ώρα |
| `teacher_in_class` | `teacherId`, `classId` | Ο εκπαιδευτικός είναι στο τμήμα Χ αυτή την ώρα |
| `teacher_has_lesson` | `teacherId` | Ο εκπαιδευτικός έχει οποιοδήποτε μάθημα |
| `teacher_is_free` | `teacherId` | Ο εκπαιδευτικός δεν έχει μάθημα |
| `teacher_daily_hours_gt` | `teacherId`, `value` | Συνολικές ώρες ημέρας > N |
| `teacher_daily_hours_lt` | `teacherId`, `value` | Συνολικές ώρες ημέρας < N |
| `teacher_daily_hours_eq` | `teacherId`, `value` | Συνολικές ώρες ημέρας = N (ακριβώς) |

### Κατηγορία: Ημέρα / Ώρα

| Predicate | Παράμετροι | Περιγραφή |
|-----------|-----------|-----------|
| `is_day` | `days: int[]` | Είναι μία από τις επιλεγμένες ημέρες (0=Δευ, 4=Παρ) |
| `is_period` | `periods: int[]` | Είναι μία από τις επιλεγμένες ώρες (0=1η) |
| `is_period_gte` | `periodFrom: int` | Ώρα ≥ N ("από Νη ώρα και μετά") |
| `is_period_lte` | `periodTo: int` | Ώρα ≤ N ("έως Νη ώρα") |
| `is_period_range` | `periodFrom`, `periodTo` | Ώρα μεταξύ N και M |

### Κατηγορία: Τμήμα / Μάθημα

| Predicate | Παράμετροι | Περιγραφή |
|-----------|-----------|-----------|
| `class_has_subject` | `classId`, `subjectId` | Το τμήμα έχει αυτό το μάθημα αυτή την ώρα |
| `class_has_support` | `classId` | Το τμήμα έχει υποστηρικτική ώρα |
| `class_is_free` | `classId` | Το τμήμα δεν έχει μάθημα αυτή την ώρα |
| `subject_is_scheduled` | `subjectId`, `classId?` | Το μάθημα είναι πλανοποιημένο κάπου αυτή την ώρα |

**Σύνολο: 16 predicates**

---

## 4. Πλήρης Λίστα Αποτελεσμάτων (THEN Actions)

### Κατηγορία: Ταυτοχρονισμός

| Action | Παράμετροι | Περιγραφή |
|--------|-----------|-----------|
| `teacher_has_subject_same_slot` | `teacherId`, `subjectId`, `classId?` | Ο εκπαιδευτικός κάνει το μάθημα **ταυτόχρονα** |
| `teacher_free_same_slot` | `teacherId` | Ο εκπαιδευτικός **δεν έχει** μάθημα ταυτόχρονα |
| `teacher_has_lesson_same_slot` | `teacherId` | Ο εκπαιδευτικός έχει οτιδήποτε ταυτόχρονα |

### Κατηγορία: Ωράριο (Day-Level)

| Action | Παράμετροι | Περιγραφή |
|--------|-----------|-----------|
| `teacher_start_not_before` | `teacherId`, `period` | Δεν ξεκινά νωρίτερα από την Νη ώρα εκείνη την ημέρα |
| `teacher_start_not_after` | `teacherId`, `period` | Ξεκινά το αργότερο στη Νη ώρα |
| `teacher_end_not_before` | `teacherId`, `period` | Δεν τελειώνει πριν τη Νη ώρα |
| `teacher_end_not_after` | `teacherId`, `period` | Τελειώνει το αργότερο στη Νη ώρα |
| `teacher_max_hours_day` | `teacherId`, `value` | Μέγιστο N ώρες εκείνη την ημέρα |
| `teacher_min_hours_day` | `teacherId`, `value` | Ελάχιστο N ώρες εκείνη την ημέρα |

### Κατηγορία: Κενά

| Action | Παράμετροι | Περιγραφή |
|--------|-----------|-----------|
| `teacher_max_gaps_day` | `teacherId`, `value` | Μέγιστο N κενά ώρες εκείνη την ημέρα |
| `teacher_no_gap_after` | `teacherId` | Αμέσως μετά από αυτό το slot, ο εκπαιδευτικός δεν έχει κενό |

### Κατηγορία: Τοποθέτηση Μαθήματος

| Action | Παράμετροι | Περιγραφή |
|--------|-----------|-----------|
| `subject_in_period` | `subjectId`, `classId?`, `periods[]` | Το μάθημα ΜΟΝΟ στις επιλεγμένες ώρες |
| `subject_on_day` | `subjectId`, `classId?`, `days[]` | Το μάθημα ΜΟΝΟ στις επιλεγμένες ημέρες |
| `subject_not_in_period` | `subjectId`, `classId?`, `periods[]` | Το μάθημα ΌΧΙ σε αυτές τις ώρες |
| `subject_not_on_day` | `subjectId`, `classId?`, `days[]` | Το μάθημα ΌΧΙ σε αυτές τις ημέρες |
| `class_free_slot` | `classId` | Το τμήμα ελεύθερο την ώρα που ενεργοποιείται η συνθήκη |

**Σύνολο: 15 actions**

---

## 5. AND/OR Λογική — Δομή

```
WhenClause
│
├── operator: "AND"  ← πώς συνδυάζονται τα groups μεταξύ τους
│
├── groups[0]
│   ├── operator: "OR"   ← πώς συνδυάζονται οι συνθήκες μέσα στο group
│   ├── conditions[0]:  teacher_has_subject(Γιώργης, Γλώσσα)
│   └── conditions[1]:  is_day([0])
│
└── groups[1]
    ├── operator: "AND"
    └── conditions[0]:  teacher_daily_hours_gt(Γιώργης, 4)

→  (A OR B) AND (C)
```

**Κανόνες:**
- Top-level operator: συνδυάζει groups μεταξύ τους
- Group operator: συνδυάζει conditions μέσα στο group
- Max βάθος: 2 επίπεδα (groups με conditions μέσα)
- Κάθε group έχει τουλάχιστον 1 condition

---

## 6. Backend — OR-Tools Reification

Αρχείο: `backend/app/conditional_rules.py`

### Κύρια μέθοδος

```python
apply_conditional_rules(
    model,        # CpModel
    x,            # Dict[(asg_id, day, period), BoolVar]
    rules,        # List[Dict] — parsed rule dicts
    assignments,  # all LessonAssignment objects
    teachers,     # all Teacher objects
    classes,      # all Class objects
    subgroups,    # all SubGroup objects
    num_days,
    num_periods,
    objective_terms,  # for soft rules
)
```

### Λογική Εκτέλεσης

```python
# 1. Για κάθε (day, period) slot:
when_holds[(d, p)] = evaluate_when_clause(...)

# 2. Για κάθε action στο THEN:
model.Add(constraint).OnlyEnforceIf(when_holds[(d, p)])
```

### Boolean Combination

```python
# AND:
model.AddBoolAnd([a, b]).OnlyEnforceIf(result)
model.AddBoolOr([a.Not(), b.Not()]).OnlyEnforceIf(result.Not())

# OR:
model.AddBoolOr([a, b]).OnlyEnforceIf(result)
model.AddBoolAnd([a.Not(), b.Not()]).OnlyEnforceIf(result.Not())
```

### Day-Level vs Slot-Level Actions

| Τύπος | Παράδειγμα | Ενεργοποίηση |
|-------|-----------|-------------|
| **Slot-level** | `teacher_has_subject_same_slot` | Ενεργοποιείται ανά (day, period) |
| **Day-level** | `teacher_start_not_after`, `teacher_max_hours_day` | Ενεργοποιείται αν οποιοδήποτε period της ημέρας trigger |

---

## 7. Frontend — TypeScript Types

Αρχείο: `frontend/src/lib/conditional-rules.ts`

### Βασικές interfaces

```typescript
interface Condition {
  id: string;               // React key
  predicate: ConditionPredicate;
  teacherId?: string;
  subjectId?: string;
  classId?: string;
  days?: number[];
  periods?: number[];
  periodFrom?: number;
  periodTo?: number;
  value?: number;
}

interface ConditionGroup {
  id: string;
  operator: "AND" | "OR";
  conditions: Condition[];
}

interface WhenClause {
  operator: "AND" | "OR";   // top-level group combinator
  groups: ConditionGroup[];
}

interface Action {
  id: string;               // React key
  action: ActionType;
  teacherId?: string;
  subjectId?: string;
  classId?: string;
  days?: number[];
  periods?: number[];
  period?: number;          // single period (start/end)
  value?: number;
}

interface ConditionalRule {
  id: string;
  name: string;
  type: "CONDITIONAL";
  enforcement: "hard" | "soft";
  weight?: number;
  isActive: boolean;
  source: "manual" | "ai";
  params: {
    when: WhenClause;
    then: Action[];
  };
}
```

### Registries

```typescript
CONDITION_REGISTRY: Record<ConditionPredicate, ConditionDef>
ACTION_REGISTRY: Record<ActionType, ActionDef>
```

Κάθε entry έχει:
- `label`: Ελληνική ετικέτα για το UI
- `description`: Περιγραφή λειτουργίας
- `category`: Ομάδα
- `fields`: Ποια πεδία εμφανίζει ο builder

---

## 8. Frontend — UI Builder

Αρχείο: `frontend/src/components/conditional-rule-builder.tsx`

### Δομή Οθόνης

```
┌─────────────────────────────────────────────────────┐
│  🎯 Header (gradient indigo→violet)                  │
│     Όνομα Κανόνα | Αυστηρότητα | Βάρος              │
├─────────────────────────────────────────────────────┤
│  IF section:                                         │
│  ┌─ Group [AND▼] ──────────────────────── [+][×] ─┐ │
│  │  [Τύπος Συνθήκης ▼]  [Εκπαιδευτικός▼] ...      │ │
│  │  ──── OR ────                                    │ │
│  │  [Τύπος Συνθήκης ▼]  [Ημέρα▼] [Δευ][Τρι]...   │ │
│  │  [+ Νέα Συνθήκη]                                │ │
│  └──────────────────────────────────────────────── ┘ │
│  ─── AND ───                                          │
│  ┌─ Group [OR▼] ──────────────────────── [+][×] ──┐ │
│  └──────────────────────────────────────────────── ┘ │
│  [+ Νέα Ομάδα]                                       │
├──────────── → ΤΟΤΕ ─────────────────────────────────┤
│  [Action▼]  [Εκπαιδευτικός▼]  [Παράμετρος...]       │
│  ──── ΚΑΙ ────                                       │
│  [Action▼]  [Παράμετρος...]                          │
│  [+ Νέο Αποτέλεσμα]                                  │
├─────────────────────────────────────────────────────┤
│  🖥 Preview (dark): "ΟΤΑΝ ... → ΤΟΤΕ ..."            │
├─────────────────────────────────────────────────────┤
│  [Ακύρωση]                    [Αποθήκευση Κανόνα]   │
└─────────────────────────────────────────────────────┘
```

### Field Types για τον Builder

| FieldType | Εμφάνιση |
|-----------|---------|
| `teacher` | Select από λίστα εκπαιδευτικών |
| `subject` | Select από λίστα μαθημάτων |
| `class` | Select από λίστα τμημάτων |
| `days` | Multi-select chip buttons (Δευ/Τρι/Τετ/Πεμ/Παρ) |
| `periods` | Multi-select chip buttons (1η-Νη ώρα) |
| `number` | Input `type="number"` |
| `period_number` | Input + εμφάνιση ετικέτας (π.χ. "3η ώρα") |

---

## 9. Rules Manager (Λίστα Κανόνων)

Αρχείο: `frontend/src/components/rules-manager.tsx`

### Λειτουργίες
- Εμφάνιση λίστας κανόνων με human-readable sentence
- Toggle ενεργός/ανενεργός
- Επεξεργασία υπάρχοντος κανόνα (edit mode)
- Διαγραφή
- Legacy rules section (backward compatible)

### Human-Readable Preview

Παράγεται από `buildRuleSentence()` (lib/conditional-rules.ts):

```
ΟΤΑΝ ο Παπαδόπουλος κάνει Γλώσσα → ΤΟΤΕ ο Νικολάου κάνει Μαθηματικά ταυτόχρονα
ΟΤΑΝ είναι Δευτέρα → ΤΟΤΕ ο Παπαδόπουλος ξεκινά το αργότερο 2η
ΟΤΑΝ (ο Α έχει > 4 ώρες OR είναι Τετάρτη) AND (το Τμ.3 έχει Γυμναστική) → ΤΟΤΕ ο Β είναι ελεύθερος
```

---

## 10. Solve Integration

Αρχείο: `frontend/src/app/api/timetable/solve/route.ts`

Κατά την επίλυση, τα active rules φορτώνονται από τη DB και στέλνονται στον Python solver:

```typescript
customRules: allRules
  .filter(r => r.isActive)
  .map(r => ({
    id: r.id,
    name: r.name,
    rulePayload: {
      type: r.type,           // "CONDITIONAL"
      enforcement: r.enforcement,
      weight: r.weight,
      params: JSON.parse(r.params),  // { when, then }
    },
    isActive: r.isActive,
  }))
```

---

## 11. Παραδείγματα Κανόνων

### Παράδειγμα 1: Ταυτόχρονη Ανάθεση
> Όταν ο Γιώργης κάνει Γλώσσα → ο Νίκος κάνει Μαθηματικά ταυτόχρονα

```json
{
  "when": { "operator": "AND", "groups": [{
    "operator": "AND", "conditions": [{
      "predicate": "teacher_has_subject",
      "teacherId": "t-giorgis",
      "subjectId": "s-glossa"
    }]
  }]},
  "then": [{ "action": "teacher_has_subject_same_slot",
    "teacherId": "t-nikos", "subjectId": "s-math" }]
}
```

### Παράδειγμα 2: Ωράριο βάσει ημέρας
> Κάθε Δευτέρα, ο Γιώργης ξεκινά το αργότερο 2η ώρα

```json
{
  "when": { "operator": "AND", "groups": [{
    "operator": "AND", "conditions": [{ "predicate": "is_day", "days": [0] }]
  }]},
  "then": [{ "action": "teacher_start_not_after",
    "teacherId": "t-giorgis", "period": 1 }]
}
```

### Παράδειγμα 3: Σύνθετη AND/OR συνθήκη
> Αν (είναι Δευτέρα ή Τετάρτη) ΚΑΙ ο Γ. έχει >3 ώρες → max 1 κενό

```json
{
  "when": {
    "operator": "AND",
    "groups": [
      { "operator": "OR", "conditions": [
        { "predicate": "is_day", "days": [0] },
        { "predicate": "is_day", "days": [2] }
      ]},
      { "operator": "AND", "conditions": [
        { "predicate": "teacher_daily_hours_gt", "teacherId": "t-g", "value": 3 }
      ]}
    ]
  },
  "then": [{ "action": "teacher_max_gaps_day", "teacherId": "t-g", "value": 1 }]
}
```

### Παράδειγμα 4: Αποκλεισμός μαθήματος από ώρες
> Γυμναστική ποτέ 1η ή 2η ώρα στο Τμ.1

```json
{
  "when": { "operator": "AND", "groups": [{
    "operator": "AND", "conditions": [{ "predicate": "is_day", "days": [0,1,2,3,4] }]
  }]},
  "then": [{ "action": "subject_not_in_period",
    "subjectId": "s-gym", "classId": "c-1", "periods": [0, 1] }]
}
```

---

## 12. Αρχεία & Εξαρτήσεις

```
lib/conditional-rules.ts
  ↑ import
components/conditional-rule-builder.tsx  (UI)
components/rules-manager.tsx             (Λίστα + Dialog)

backend/app/conditional_rules.py
  ↑ import
backend/app/solver.py                    (call: apply_conditional_rules)
  ↑ call
frontend/src/app/api/timetable/solve/route.ts  (passes customRules)
```
