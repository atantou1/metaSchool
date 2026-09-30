export interface PaletteColor {
  hex: string;
  name: string;
  group: string;
  textColor?: string;
  borderColor?: string;
}

export const TEACHER_50_PALETTE: readonly PaletteColor[] = [
  // 1. Κίτρινα & Ώχρες (1-5)
  { hex: "#fef08a", name: "Κίτρινο Λεμονί", group: "Κίτρινα", textColor: "#713f12", borderColor: "#eab308" },
  { hex: "#fde047", name: "Κίτρινο Ήλιος", group: "Κίτρινα", textColor: "#713f12", borderColor: "#ca8a04" },
  { hex: "#fef9c3", name: "Κίτρινο Κρέμα", group: "Κίτρινα", textColor: "#713f12", borderColor: "#facc15" },
  { hex: "#fde68a", name: "Κεχριμπάρι Απαλό", group: "Κίτρινα", textColor: "#78350f", borderColor: "#f59e0b" },
  { hex: "#fcd34d", name: "Ώχρα Χρυσή", group: "Κίτρινα", textColor: "#78350f", borderColor: "#d97706" },

  // 2. Πορτοκαλί & Βερικοκί (6-10)
  { hex: "#fed7aa", name: "Βερικοκί", group: "Πορτοκαλί", textColor: "#7c2d12", borderColor: "#f97316" },
  { hex: "#fdba74", name: "Μανταρινί", group: "Πορτοκαλί", textColor: "#7c2d12", borderColor: "#ea580c" },
  { hex: "#ffedd5", name: "Ροδακινί", group: "Πορτοκαλί", textColor: "#7c2d12", borderColor: "#fb923c" },
  { hex: "#fed7d7", name: "Σομόν Απαλό", group: "Πορτοκαλί", textColor: "#831843", borderColor: "#f43f5e" },
  { hex: "#fecdd3", name: "Κοραλλί Απαλό", group: "Πορτοκαλί", textColor: "#9f1239", borderColor: "#fb7185" },

  // 3. Κόκκινα & Ροζ (11-15)
  { hex: "#fda4af", name: "Τριανταφυλλί", group: "Ροζ", textColor: "#9f1239", borderColor: "#e11d48" },
  { hex: "#ffe4e6", name: "Ροζ Ανθός", group: "Ροζ", textColor: "#881337", borderColor: "#f43f5e" },
  { hex: "#f472b6", name: "Ροζ Φλαμίνγκο", group: "Ροζ", textColor: "#831843", borderColor: "#db2777" },
  { hex: "#f9a8d4", name: "Ροζ Παστέλ", group: "Ροζ", textColor: "#831843", borderColor: "#ec4899" },
  { hex: "#fbcfe8", name: "Ροζ Πούδρα", group: "Ροζ", textColor: "#831843", borderColor: "#f472b6" },

  // 4. Φούξια & Ορχιδέα (16-20)
  { hex: "#f5d0fe", name: "Φούξια Απαλό", group: "Φούξια", textColor: "#701a75", borderColor: "#d946ef" },
  { hex: "#e879f9", name: "Ορχιδέα", group: "Φούξια", textColor: "#701a75", borderColor: "#c026d3" },
  { hex: "#fae8ff", name: "Ίριδα", group: "Φούξια", textColor: "#701a75", borderColor: "#e879f9" },
  { hex: "#e9d5ff", name: "Λιλά", group: "Μωβ", textColor: "#581c87", borderColor: "#a855f7" },
  { hex: "#d8b4fe", name: "Μωβ Παστέλ", group: "Μωβ", textColor: "#581c87", borderColor: "#9333ea" },

  // 5. Βιολετί & Λεβάντα (21-25)
  { hex: "#ddd6fe", name: "Λεβάντα", group: "Βιολετί", textColor: "#5b21b6", borderColor: "#a78bfa" },
  { hex: "#c4b5fd", name: "Βιολετί Απαλό", group: "Βιολετί", textColor: "#4c1d95", borderColor: "#8b5cf6" },
  { hex: "#ede9fe", name: "Αμέθυστος", group: "Βιολετί", textColor: "#4c1d95", borderColor: "#a78bfa" },
  { hex: "#c7d2fe", name: "Περιβίνκλ", group: "Indigo", textColor: "#3730a3", borderColor: "#818cf8" },
  { hex: "#a5b4fc", name: "Indigo Απαλό", group: "Indigo", textColor: "#312e81", borderColor: "#6366f1" },

  // 6. Μπλε & Royal (26-30)
  { hex: "#bfdbfe", name: "Μπλε Απαλό", group: "Μπλε", textColor: "#1e3a8a", borderColor: "#60a5fa" },
  { hex: "#93c5fd", name: "Μπλε Ουρανού", group: "Μπλε", textColor: "#1e3a8a", borderColor: "#3b82f6" },
  { hex: "#dbeafe", name: "Μπλε Πάγου", group: "Μπλε", textColor: "#1e3a8a", borderColor: "#93c5fd" },
  { hex: "#bae6fd", name: "Σιέλ", group: "Σιέλ", textColor: "#0369a1", borderColor: "#38bdf8" },
  { hex: "#7dd3fc", name: "Αιγαίο", group: "Σιέλ", textColor: "#0c4a6e", borderColor: "#0284c7" },

  // 7. Κυανό & Τιρκουάζ (31-35)
  { hex: "#e0f2fe", name: "Γαλάζιο Νέφους", group: "Σιέλ", textColor: "#0369a1", borderColor: "#7dd3fc" },
  { hex: "#a5f3fc", name: "Κυανό", group: "Κυανό", textColor: "#164e63", borderColor: "#22d3ee" },
  { hex: "#67e8f9", name: "Τιρκουάζ Έντονο", group: "Κυανό", textColor: "#164e63", borderColor: "#06b6d4" },
  { hex: "#cffafe", name: "Κυανό Παστέλ", group: "Κυανό", textColor: "#164e63", borderColor: "#67e8f9" },
  { hex: "#99f6e4", name: "Ακουαμαρίνα", group: "Τιρκουάζ", textColor: "#115e59", borderColor: "#2dd4bf" },

  // 8. Σμαραγδί & Μέντα (36-40)
  { hex: "#5eead4", name: "Τιρκουάζ Θαλάσσης", group: "Τιρκουάζ", textColor: "#134e4a", borderColor: "#14b8a6" },
  { hex: "#ccfbf1", name: "Μέντα Πάγου", group: "Μέντα", textColor: "#134e4a", borderColor: "#5eead4" },
  { hex: "#a7f3d0", name: "Μέντα", group: "Μέντα", textColor: "#065f46", borderColor: "#34d399" },
  { hex: "#6ee7b7", name: "Σμαραγδί", group: "Σμαραγδί", textColor: "#064e3b", borderColor: "#10b981" },
  { hex: "#d1fae5", name: "Σμαραγδί Απαλό", group: "Σμαραγδί", textColor: "#064e3b", borderColor: "#6ee7b7" },

  // 9. Πράσινα & Λάιμ (41-45)
  { hex: "#bbf7d0", name: "Πράσινο Φιστικί", group: "Πράσινο", textColor: "#14532d", borderColor: "#4ade80" },
  { hex: "#86efac", name: "Πράσινο Ανοιχτό", group: "Πράσινο", textColor: "#14532d", borderColor: "#22c55e" },
  { hex: "#dcfce7", name: "Πράσινο Τσαγιού", group: "Πράσινο", textColor: "#14532d", borderColor: "#86efac" },
  { hex: "#d9f99d", name: "Λάιμ Παστέλ", group: "Λάιμ", textColor: "#3f6212", borderColor: "#a3e635" },
  { hex: "#bef264", name: "Λάιμ Φωτεινό", group: "Λάιμ", textColor: "#365314", borderColor: "#84cc16" },

  // 10. Χακί, Slate & Ουδέτερα (46-50)
  { hex: "#ecfccb", name: "Χακί Απαλό", group: "Χακί", textColor: "#365314", borderColor: "#bef264" },
  { hex: "#e2e8f0", name: "Slate Ασημί", group: "Slate", textColor: "#334155", borderColor: "#94a3b8" },
  { hex: "#cbd5e1", name: "Slate Γκρι", group: "Slate", textColor: "#1e293b", borderColor: "#64748b" },
  { hex: "#e4e4e7", name: "Zinc Ψυχρό", group: "Zinc", textColor: "#27272a", borderColor: "#a1a1aa" },
  { hex: "#f3f4f6", name: "Πλατινένιο", group: "Γκρι", textColor: "#1f2937", borderColor: "#d1d5db" },
] as const;

/** Get a color object by exact hex */
export function getPaletteColorByHex(hex?: string | null): PaletteColor | undefined {
  if (!hex) return undefined;
  const clean = hex.trim().toLowerCase();
  return TEACHER_50_PALETTE.find((c) => c.hex.toLowerCase() === clean);
}

/** Get a deterministic color from the 50 palette based on index or string hash */
export function getDeterministicPaletteColor(indexOrString: number | string): PaletteColor {
  if (typeof indexOrString === "number") {
    const idx = Math.abs(indexOrString) % TEACHER_50_PALETTE.length;
    return TEACHER_50_PALETTE[idx];
  }
  const clean = String(indexOrString).trim();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % TEACHER_50_PALETTE.length;
  return TEACHER_50_PALETTE[idx];
}

/** Get CSS styles (background, text color, border) for a teacher tile based on their color hex */
export function getTeacherTileStyle(teacherOrHex?: { color?: string } | string | null): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  const hex = typeof teacherOrHex === "string" ? teacherOrHex : teacherOrHex?.color;
  const found = getPaletteColorByHex(hex);
  if (found) {
    return {
      backgroundColor: found.hex,
      color: found.textColor || "#18181b",
      borderColor: found.borderColor || "rgba(0,0,0,0.18)",
    };
  }
  if (hex && hex.startsWith("#")) {
    return {
      backgroundColor: hex,
      color: "#18181b",
      borderColor: "rgba(0,0,0,0.18)",
    };
  }
  // Default fallback
  return {
    backgroundColor: "#fef08a",
    color: "#713f12",
    borderColor: "#eab308",
  };
}

/** 15 Maximally-spaced distinct colors for Classes */
export const CLASS_15_PALETTE: readonly PaletteColor[] = [
  { hex: "#3b82f6", name: "Μπλε", group: "Μπλε", textColor: "#ffffff", borderColor: "#1d4ed8" },
  { hex: "#10b981", name: "Σμαραγδί", group: "Πράσινο", textColor: "#ffffff", borderColor: "#047857" },
  { hex: "#f97316", name: "Πορτοκαλί", group: "Πορτοκαλί", textColor: "#ffffff", borderColor: "#c2410c" },
  { hex: "#7c3aed", name: "Βιολετί", group: "Μωβ", textColor: "#ffffff", borderColor: "#5b21b6" },
  { hex: "#ec4899", name: "Ροζ / Φούξια", group: "Ροζ", textColor: "#ffffff", borderColor: "#be185d" },
  { hex: "#06b6d4", name: "Κυανό / Ocean", group: "Σιέλ", textColor: "#ffffff", borderColor: "#0e7490" },
  { hex: "#eab308", name: "Κίτρινο Χρυσό", group: "Κίτρινο", textColor: "#713f12", borderColor: "#a16207" },
  { hex: "#ef4444", name: "Κόκκινο", group: "Κόκκινο", textColor: "#ffffff", borderColor: "#b91c1c" },
  { hex: "#14b8a6", name: "Τιρκουάζ", group: "Τιρκουάζ", textColor: "#ffffff", borderColor: "#0f766e" },
  { hex: "#9f1239", name: "Μπορντό / Βαθύ Κερασί", group: "Κόκκινο", textColor: "#ffffff", borderColor: "#881337" },
  { hex: "#84cc16", name: "Λάιμ", group: "Λάιμ", textColor: "#365314", borderColor: "#4d7c0f" },
  { hex: "#4338ca", name: "Indigo / Ναυτικό", group: "Indigo", textColor: "#ffffff", borderColor: "#312e81" },
  { hex: "#b45309", name: "Κεχριμπάρι / Χάλκινο", group: "Πορτοκαλί", textColor: "#ffffff", borderColor: "#78350f" },
  { hex: "#059669", name: "Πράσινο Δάσους", group: "Πράσινο", textColor: "#ffffff", borderColor: "#064e3b" },
  { hex: "#64748b", name: "Slate / Ατσάλι", group: "Slate", textColor: "#ffffff", borderColor: "#334155" },
] as const;

export function getClassPaletteColorByHex(hex?: string | null): PaletteColor | undefined {
  if (!hex) return undefined;
  const clean = hex.trim().toLowerCase();
  return CLASS_15_PALETTE.find((c) => c.hex.toLowerCase() === clean);
}

