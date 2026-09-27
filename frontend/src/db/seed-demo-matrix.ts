export const DEMO_CLASSES = [
  { id: "cls-a1", name: "Α1", grade: "Α", supportHoursMin: 2, supportHoursMax: 4, orderIndex: 1 },
  { id: "cls-a2", name: "Α2", grade: "Α", supportHoursMin: 2, supportHoursMax: 3, orderIndex: 2 },
  { id: "cls-b1", name: "Β1", grade: "Β", supportHoursMin: 2, supportHoursMax: 4, orderIndex: 3 },
  { id: "cls-b2", name: "Β2", grade: "Β", supportHoursMin: 1, supportHoursMax: 3, orderIndex: 4 },
  { id: "cls-g1", name: "Γ1", grade: "Γ", supportHoursMin: 2, supportHoursMax: 4, orderIndex: 5 },
  { id: "cls-g2", name: "Γ2", grade: "Γ", supportHoursMin: 2, supportHoursMax: 3, orderIndex: 6 },
  { id: "cls-d1", name: "Δ1", grade: "Δ", supportHoursMin: 2, supportHoursMax: 4, orderIndex: 7 },
  { id: "cls-d2", name: "Δ2", grade: "Δ", supportHoursMin: 1, supportHoursMax: 3, orderIndex: 8 },
  { id: "cls-e1", name: "Ε1", grade: "Ε", supportHoursMin: 2, supportHoursMax: 4, orderIndex: 9 },
  { id: "cls-st1", name: "ΣΤ1", grade: "ΣΤ", supportHoursMin: 2, supportHoursMax: 4, orderIndex: 10 },
  { id: "cls-st2", name: "ΣΤ2", grade: "ΣΤ", supportHoursMin: 2, supportHoursMax: 4, orderIndex: 11 },
  { id: "cls-te", name: "Τ.Ε.", grade: "Ειδικό", supportHoursMin: 0, supportHoursMax: 0, orderIndex: 12 },
];

export const DEMO_TEACHERS = [
  { id: "tch-pap", lastName: "Παπαδάκης", firstName: "Εμμανουήλ", specialty: "ΠΕ70 - Δάσκαλος", isSupport: false, color: "#fef08a" },
  { id: "tch-nik", lastName: "Νικολάου", firstName: "Νικόλαος", specialty: "ΠΕ70 - Δάσκαλος", isSupport: false, color: "#fed7aa" },
  { id: "tch-dhm", lastName: "Δημητρίου", firstName: "Δημήτριος", specialty: "ΠΕ70 - Δάσκαλος", isSupport: false, color: "#bae6fd" },
  { id: "tch-kar", lastName: "Καραγιάννη", firstName: "Μαρία", specialty: "ΠΕ70 - Δασκάλα", isSupport: false, color: "#a7f3d0" },
  { id: "tch-spy", lastName: "Σπυρόπουλος", firstName: "Σπυρίδων", specialty: "ΠΕ86 - Πληροφορική", isSupport: false, color: "#ddd6fe" },
  { id: "tch-mix", lastName: "Μιχαηλίδης", firstName: "Μιχαήλ", specialty: "ΠΕ11 - Φυσική Αγωγή", isSupport: false, color: "#fecdd3" },
  { id: "tch-kwn", lastName: "Κωνσταντίνου", firstName: "Κωνσταντίνος", specialty: "ΠΕ06 - Αγγλικά", isSupport: false, color: "#99f6e4" },
  { id: "tch-ale", lastName: "Αλεξίου", firstName: "Αλέξανδρος", specialty: "ΠΕ08 - Εικαστικά", isSupport: false, color: "#d9f99d" },
  { id: "tch-zer", lastName: "Ζέρβας", firstName: "Ζήσης", specialty: "ΠΕ79 - Μουσική", isSupport: false, color: "#c7d2fe" },
  { id: "tch-vas", lastName: "Βασιλείου", firstName: "Βασιλική", specialty: "ΠΕ91 - Θεατρική Αγωγή", isSupport: false, color: "#fbcfe8" },
  { id: "tch-swt", lastName: "Σωτηρίου", firstName: "Σωτήριος", specialty: "ΠΕ71 - Ειδική Αγωγή / Παράλληλη", isSupport: true, color: "#f3e8ff" },
];

export interface RawMatrixSlot {
  classId: string;
  day: number;
  period: number;
  teachers: string[]; // ["tch-pap"] or ["tch-pap", "tch-swt"]
  subjectId?: string;
}

// 5 days x 10 periods schedule from the prototype
export const PROTOTYPE_RAW_MATRIX: RawMatrixSlot[] = [
  // --- CLASS A1 ---
  // Monday
  { classId: "cls-a1", day: 0, period: 0, teachers: ["tch-pap"] },
  { classId: "cls-a1", day: 0, period: 1, teachers: ["tch-pap", "tch-swt"] },
  { classId: "cls-a1", day: 0, period: 2, teachers: ["tch-dhm"] },
  { classId: "cls-a1", day: 0, period: 3, teachers: ["tch-kar", "tch-swt", "tch-ale"] },
  { classId: "cls-a1", day: 0, period: 4, teachers: ["tch-spy"] },
  { classId: "cls-a1", day: 0, period: 5, teachers: ["tch-mix"] },
  { classId: "cls-a1", day: 0, period: 6, teachers: ["tch-kwn"] },
  { classId: "cls-a1", day: 0, period: 7, teachers: ["tch-kwn"] },
  { classId: "cls-a1", day: 0, period: 8, teachers: ["tch-zer"] },
  // Tuesday
  { classId: "cls-a1", day: 1, period: 0, teachers: ["tch-dhm"] },
  { classId: "cls-a1", day: 1, period: 1, teachers: ["tch-pap"] },
  { classId: "cls-a1", day: 1, period: 2, teachers: ["tch-kwn"] },
  { classId: "cls-a1", day: 1, period: 3, teachers: ["tch-pap", "tch-nik", "tch-kar"] },
  { classId: "cls-a1", day: 1, period: 4, teachers: ["tch-pap"] },
  { classId: "cls-a1", day: 1, period: 5, teachers: ["tch-vas"] },
  { classId: "cls-a1", day: 1, period: 6, teachers: ["tch-swt"] },
  { classId: "cls-a1", day: 1, period: 7, teachers: ["tch-kar"] },
  // Wednesday
  { classId: "cls-a1", day: 2, period: 0, teachers: ["tch-pap"] },
  { classId: "cls-a1", day: 2, period: 1, teachers: ["tch-pap"] },
  { classId: "cls-a1", day: 2, period: 2, teachers: ["tch-dhm"] },
  { classId: "cls-a1", day: 2, period: 3, teachers: ["tch-kar"] },
  { classId: "cls-a1", day: 2, period: 4, teachers: ["tch-ale"] },
  { classId: "cls-a1", day: 2, period: 5, teachers: ["tch-zer"] },
  { classId: "cls-a1", day: 2, period: 6, teachers: ["tch-spy", "tch-kwn", "tch-swt"] },
  { classId: "cls-a1", day: 2, period: 7, teachers: ["tch-kwn"] },
  { classId: "cls-a1", day: 2, period: 8, teachers: ["tch-mix"] },
  // Thursday
  { classId: "cls-a1", day: 3, period: 0, teachers: ["tch-pap"] },
  { classId: "cls-a1", day: 3, period: 1, teachers: ["tch-pap", "tch-swt", "tch-dhm"] },
  { classId: "cls-a1", day: 3, period: 2, teachers: ["tch-dhm"] },
  { classId: "cls-a1", day: 3, period: 3, teachers: ["tch-spy"] },
  { classId: "cls-a1", day: 3, period: 4, teachers: ["tch-kar"] },
  { classId: "cls-a1", day: 3, period: 5, teachers: ["tch-pap"] },
  { classId: "cls-a1", day: 3, period: 6, teachers: ["tch-kwn"] },
  { classId: "cls-a1", day: 3, period: 7, teachers: ["tch-zer"] },
  // Friday
  { classId: "cls-a1", day: 4, period: 0, teachers: ["tch-dhm"] },
  { classId: "cls-a1", day: 4, period: 1, teachers: ["tch-pap", "tch-dhm"] },
  { classId: "cls-a1", day: 4, period: 2, teachers: ["tch-pap"] },
  { classId: "cls-a1", day: 4, period: 3, teachers: ["tch-kar"] },
  { classId: "cls-a1", day: 4, period: 4, teachers: ["tch-kwn"] },
  { classId: "cls-a1", day: 4, period: 5, teachers: ["tch-pap"] },
  { classId: "cls-a1", day: 4, period: 6, teachers: ["tch-swt"] },
  { classId: "cls-a1", day: 4, period: 7, teachers: ["tch-kwn"] },

  // --- CLASS A2 ---
  // Monday
  { classId: "cls-a2", day: 0, period: 0, teachers: ["tch-dhm"] },
  { classId: "cls-a2", day: 0, period: 1, teachers: ["tch-nik", "tch-swt", "tch-pap"] },
  { classId: "cls-a2", day: 0, period: 2, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 0, period: 3, teachers: ["tch-spy", "tch-kar"] },
  { classId: "cls-a2", day: 0, period: 4, teachers: ["tch-kar"] },
  { classId: "cls-a2", day: 0, period: 5, teachers: ["tch-kwn"] },
  { classId: "cls-a2", day: 0, period: 6, teachers: ["tch-pap"] },
  { classId: "cls-a2", day: 0, period: 7, teachers: ["tch-swt"] },
  // Tuesday
  { classId: "cls-a2", day: 1, period: 0, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 1, period: 1, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 1, period: 2, teachers: ["tch-dhm"] },
  { classId: "cls-a2", day: 1, period: 3, teachers: ["tch-mix"] },
  { classId: "cls-a2", day: 1, period: 4, teachers: ["tch-vas"] },
  { classId: "cls-a2", day: 1, period: 5, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 1, period: 6, teachers: ["tch-kar"] },
  { classId: "cls-a2", day: 1, period: 7, teachers: ["tch-kwn"] },
  // Wednesday
  { classId: "cls-a2", day: 2, period: 0, teachers: ["tch-dhm"] },
  { classId: "cls-a2", day: 2, period: 1, teachers: ["tch-kar"] },
  { classId: "cls-a2", day: 2, period: 2, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 2, period: 3, teachers: ["tch-nik", "tch-kar"] },
  { classId: "cls-a2", day: 2, period: 4, teachers: ["tch-ale"] },
  { classId: "cls-a2", day: 2, period: 5, teachers: ["tch-spy"] },
  { classId: "cls-a2", day: 2, period: 6, teachers: ["tch-pap"] },
  { classId: "cls-a2", day: 2, period: 7, teachers: ["tch-zer"] },
  // Thursday
  { classId: "cls-a2", day: 3, period: 0, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 3, period: 1, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 3, period: 2, teachers: ["tch-kar"] },
  { classId: "cls-a2", day: 3, period: 3, teachers: ["tch-dhm"] },
  { classId: "cls-a2", day: 3, period: 4, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 3, period: 5, teachers: ["tch-zer"] },
  { classId: "cls-a2", day: 3, period: 6, teachers: ["tch-spy"] },
  { classId: "cls-a2", day: 3, period: 7, teachers: ["tch-mix"] },
  // Friday
  { classId: "cls-a2", day: 4, period: 0, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 4, period: 1, teachers: ["tch-dhm"] },
  { classId: "cls-a2", day: 4, period: 2, teachers: ["tch-kwn"] },
  { classId: "cls-a2", day: 4, period: 3, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 4, period: 4, teachers: ["tch-nik"] },
  { classId: "cls-a2", day: 4, period: 5, teachers: ["tch-kar"] },
  { classId: "cls-a2", day: 4, period: 6, teachers: ["tch-pap"] },
  { classId: "cls-a2", day: 4, period: 7, teachers: ["tch-zer"] },

  // --- CLASS B1 ---
  // Monday
  { classId: "cls-b1", day: 0, period: 0, teachers: ["tch-pap"] },
  { classId: "cls-b1", day: 0, period: 1, teachers: ["tch-pap"] },
  { classId: "cls-b1", day: 0, period: 2, teachers: ["tch-dhm"] },
  { classId: "cls-b1", day: 0, period: 3, teachers: ["tch-kar", "tch-ale", "tch-swt"] },
  { classId: "cls-b1", day: 0, period: 4, teachers: ["tch-ale"] },
  { classId: "cls-b1", day: 0, period: 5, teachers: ["tch-spy"] },
  { classId: "cls-b1", day: 0, period: 6, teachers: ["tch-kwn"] },
  { classId: "cls-b1", day: 0, period: 7, teachers: ["tch-zer"] },

  // --- CLASS B2 ---
  // Monday
  { classId: "cls-b2", day: 0, period: 0, teachers: ["tch-nik", "tch-dhm"] },
  { classId: "cls-b2", day: 0, period: 1, teachers: ["tch-nik"] },
  { classId: "cls-b2", day: 0, period: 2, teachers: ["tch-kar"] },
  { classId: "cls-b2", day: 0, period: 3, teachers: ["tch-dhm"] },
  { classId: "cls-b2", day: 0, period: 4, teachers: ["tch-mix"] },
  { classId: "cls-b2", day: 0, period: 5, teachers: ["tch-spy"] },
  { classId: "cls-b2", day: 0, period: 6, teachers: ["tch-kwn"] },

  // --- CLASS G1 ---
  // Monday
  { classId: "cls-g1", day: 0, period: 0, teachers: ["tch-zer"] },
  { classId: "cls-g1", day: 0, period: 1, teachers: ["tch-zer"] },
  { classId: "cls-g1", day: 0, period: 2, teachers: ["tch-pap", "tch-zer"] },
  { classId: "cls-g1", day: 0, period: 3, teachers: ["tch-pap"] },
  { classId: "cls-g1", day: 0, period: 4, teachers: ["tch-dhm"] },
  { classId: "cls-g1", day: 0, period: 5, teachers: ["tch-kar"] },
  { classId: "cls-g1", day: 0, period: 6, teachers: ["tch-spy"] },
  { classId: "cls-g1", day: 0, period: 7, teachers: ["tch-mix"] },

  // --- CLASS G2 ---
  // Monday
  { classId: "cls-g2", day: 0, period: 0, teachers: ["tch-nik"] },
  { classId: "cls-g2", day: 0, period: 1, teachers: ["tch-nik"] },
  { classId: "cls-g2", day: 0, period: 2, teachers: ["tch-dhm"] },
  { classId: "cls-g2", day: 0, period: 3, teachers: ["tch-zer"] },
  { classId: "cls-g2", day: 0, period: 4, teachers: ["tch-kar"] },
  { classId: "cls-g2", day: 0, period: 5, teachers: ["tch-mix"] },
  { classId: "cls-g2", day: 0, period: 6, teachers: ["tch-nik"] },
  { classId: "cls-g2", day: 0, period: 7, teachers: ["tch-swt"] },

  // --- CLASS D1 ---
  // Monday
  { classId: "cls-d1", day: 0, period: 0, teachers: ["tch-dhm"] },
  { classId: "cls-d1", day: 0, period: 1, teachers: ["tch-ale"] },
  { classId: "cls-d1", day: 0, period: 2, teachers: ["tch-kar"] },
  { classId: "cls-d1", day: 0, period: 3, teachers: ["tch-pap"] },
  { classId: "cls-d1", day: 0, period: 4, teachers: ["tch-pap", "tch-dhm", "tch-zer"] },
  { classId: "cls-d1", day: 0, period: 5, teachers: ["tch-vas"] },
  { classId: "cls-d1", day: 0, period: 6, teachers: ["tch-spy"] },

  // --- CLASS D2 ---
  // Monday
  { classId: "cls-d2", day: 0, period: 0, teachers: ["tch-nik"] },
  { classId: "cls-d2", day: 0, period: 1, teachers: ["tch-nik", "tch-dhm", "tch-vas"] },
  { classId: "cls-d2", day: 0, period: 2, teachers: ["tch-dhm"] },
  { classId: "cls-d2", day: 0, period: 3, teachers: ["tch-kar"] },
  { classId: "cls-d2", day: 0, period: 4, teachers: ["tch-pap"] },
  { classId: "cls-d2", day: 0, period: 5, teachers: ["tch-mix"] },
  { classId: "cls-d2", day: 0, period: 6, teachers: ["tch-ale"] },

  // --- CLASS E1 ---
  // Monday
  { classId: "cls-e1", day: 0, period: 0, teachers: ["tch-nik"] },
  { classId: "cls-e1", day: 0, period: 1, teachers: ["tch-nik"] },
  { classId: "cls-e1", day: 0, period: 2, teachers: ["tch-ale"] },
  { classId: "cls-e1", day: 0, period: 3, teachers: ["tch-dhm"] },
  { classId: "cls-e1", day: 0, period: 4, teachers: ["tch-kar"] },
  { classId: "cls-e1", day: 0, period: 5, teachers: ["tch-kwn"] },
  { classId: "cls-e1", day: 0, period: 6, teachers: ["tch-spy"] },

  // --- CLASS ST1 ---
  // Monday
  { classId: "cls-st1", day: 0, period: 0, teachers: ["tch-pap"] },
  { classId: "cls-st1", day: 0, period: 1, teachers: ["tch-pap"] },
  { classId: "cls-st1", day: 0, period: 2, teachers: ["tch-dhm"] },
  { classId: "cls-st1", day: 0, period: 3, teachers: ["tch-ale"] },
  { classId: "cls-st1", day: 0, period: 4, teachers: ["tch-kar"] },
  { classId: "cls-st1", day: 0, period: 5, teachers: ["tch-spy"] },
  { classId: "cls-st1", day: 0, period: 6, teachers: ["tch-kwn"] },

  // --- CLASS ST2 ---
  // Monday
  { classId: "cls-st2", day: 0, period: 0, teachers: ["tch-nik"] },
  { classId: "cls-st2", day: 0, period: 1, teachers: ["tch-nik"] },
  { classId: "cls-st2", day: 0, period: 2, teachers: ["tch-dhm", "tch-spy", "tch-kar"] },
  { classId: "cls-st2", day: 0, period: 3, teachers: ["tch-spy"] },
  { classId: "cls-st2", day: 0, period: 4, teachers: ["tch-kar"] },
  { classId: "cls-st2", day: 0, period: 5, teachers: ["tch-ale"] },
  { classId: "cls-st2", day: 0, period: 6, teachers: ["tch-zer"] },

  // --- CLASS TE ---
  // Monday
  { classId: "cls-te", day: 0, period: 0, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 0, period: 1, teachers: ["tch-swt", "tch-pap"] },
  { classId: "cls-te", day: 0, period: 2, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 0, period: 4, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 0, period: 6, teachers: ["tch-swt"] },
  // Wednesday
  { classId: "cls-te", day: 2, period: 0, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 2, period: 1, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 2, period: 3, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 2, period: 4, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 2, period: 6, teachers: ["tch-swt"] },
  // Friday
  { classId: "cls-te", day: 4, period: 0, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 4, period: 1, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 4, period: 2, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 4, period: 4, teachers: ["tch-swt"] },
  { classId: "cls-te", day: 4, period: 6, teachers: ["tch-swt"] },
];
