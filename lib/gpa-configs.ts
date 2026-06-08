export interface GPAConfig {
  name: string;
  // Grading scale: grade boundaries → quality points
  scale: { min: number; letter: string; points: number }[];
  // Weight bonuses added to base quality points
  weights: Record<"AP" | "IB" | "DE" | "Honors" | "Regular", number>;
  // Whether to cap weighted GPA at 5.0
  capAt5: boolean;
}

export const GPA_CONFIGS: Record<string, GPAConfig> = {
  // ── Fairfax County Public Schools ────────────────────────────────────────
  // Source: https://www.fcps.edu/resources/academics/grading-reporting
  // 10-point scale, AP/IB/DE +1.0, Honors +0.5
  fcps: {
    name: "Fairfax County Public Schools",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },

  // ── Loudoun County Public Schools ────────────────────────────────────────
  // 10-point scale, AP/DE +1.0, Honors +0.5
  lcps: {
    name: "Loudoun County Public Schools",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },

  // ── Prince William County Schools ────────────────────────────────────────
  // 10-point scale, AP/IB/DE +1.0, Honors +0.5
  pwcs: {
    name: "Prince William County Schools",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },

  // ── Arlington Public Schools ──────────────────────────────────────────────
  aps: {
    name: "Arlington Public Schools",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },

  // ── Montgomery County Public Schools (MD) ─────────────────────────────────
  // Source: MCPS Policy IKA  — A=90+, AP/IB +1.0, Honors +0.5
  mcps: {
    name: "Montgomery County Public Schools",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "E", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },

  // ── Prince George's County Schools (MD) ──────────────────────────────────
  pgcps: {
    name: "Prince George's County Schools",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 0.5, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },

  // ── Howard County Public Schools (MD) ────────────────────────────────────
  hcpss: {
    name: "Howard County Public Schools",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },

  // ── Bellevue / Lake Washington (WA) ──────────────────────────────────────
  // Washington state standard scale — A=93+
  bsd: {
    name: "Bellevue School District",
    scale: [
      { min: 93, letter: "A",  points: 4.0 },
      { min: 90, letter: "A-", points: 3.7 },
      { min: 87, letter: "B+", points: 3.3 },
      { min: 83, letter: "B",  points: 3.0 },
      { min: 80, letter: "B-", points: 2.7 },
      { min: 77, letter: "C+", points: 2.3 },
      { min: 73, letter: "C",  points: 2.0 },
      { min: 70, letter: "C-", points: 1.7 },
      { min: 67, letter: "D+", points: 1.3 },
      { min: 63, letter: "D",  points: 1.0 },
      { min: 60, letter: "D-", points: 0.7 },
      { min:  0, letter: "F",  points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },
  lwsd: {
    name: "Lake Washington School District",
    scale: [
      { min: 93, letter: "A",  points: 4.0 },
      { min: 90, letter: "A-", points: 3.7 },
      { min: 87, letter: "B+", points: 3.3 },
      { min: 83, letter: "B",  points: 3.0 },
      { min: 80, letter: "B-", points: 2.7 },
      { min: 77, letter: "C+", points: 2.3 },
      { min: 73, letter: "C",  points: 2.0 },
      { min: 70, letter: "C-", points: 1.7 },
      { min: 67, letter: "D+", points: 1.3 },
      { min: 63, letter: "D",  points: 1.0 },
      { min: 60, letter: "D-", points: 0.7 },
      { min:  0, letter: "F",  points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },

  // ── Los Angeles Unified / San Diego Unified (CA) ──────────────────────────
  // California typically uses A=90+, AP +1.0, Honors +0.5, capped at 5.0
  lausd: {
    name: "Los Angeles Unified",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: true,
  },
  sdusd: {
    name: "San Diego Unified",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: true,
  },

  // ── Arizona ───────────────────────────────────────────────────────────────
  dvusd: {
    name: "Deer Valley Unified",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },
  cusd: {
    name: "Chandler Unified",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },

  // ── Default fallback ──────────────────────────────────────────────────────
  default: {
    name: "Standard",
    scale: [
      { min: 90, letter: "A", points: 4.0 },
      { min: 80, letter: "B", points: 3.0 },
      { min: 70, letter: "C", points: 2.0 },
      { min: 60, letter: "D", points: 1.0 },
      { min:  0, letter: "F", points: 0.0 },
    ],
    weights: { AP: 1.0, IB: 1.0, DE: 1.0, Honors: 0.5, Regular: 0.0 },
    capAt5: false,
  },
};

export function getConfig(districtId: string): GPAConfig {
  return GPA_CONFIGS[districtId] ?? GPA_CONFIGS.default;
}

export function pctToPoints(pct: number, config: GPAConfig): number {
  for (const row of config.scale) {
    if (pct >= row.min) return row.points;
  }
  return 0;
}

// Returns a representative percentage for a letter grade (midpoint of range)
export function letterToMidPct(letter: string, config: GPAConfig): number {
  const idx = config.scale.findIndex(r => r.letter === letter);
  if (idx < 0) return 0;
  const min = config.scale[idx].min;
  const max = idx === 0 ? 100 : config.scale[idx - 1].min - 1;
  return Math.round((min + max) / 2);
}

export function pctToLetter(pct: number, config: GPAConfig): string {
  for (const row of config.scale) {
    if (pct >= row.min) return row.letter;
  }
  return "F";
}

export type CourseType = "AP" | "IB" | "DE" | "Honors" | "Regular";

export interface GPACourse {
  id: string;
  name: string;
  grade: number;        // numeric percentage
  credits: number;
  type: CourseType;
  year?: string;        // e.g. "2024-25"
  excluded?: boolean;   // P/E, lunch, etc.
}

export function calculateDistrictGPA(
  courses: GPACourse[],
  config: GPAConfig
): { unweighted: number; weighted: number; totalCredits: number } {
  const eligible = courses.filter((c) => !c.excluded);
  if (eligible.length === 0) return { unweighted: 0, weighted: 0, totalCredits: 0 };

  let totalCredits = 0;
  let uwSum = 0;
  let wSum = 0;

  for (const c of eligible) {
    const base = pctToPoints(c.grade, config);
    const bonus = config.weights[c.type] ?? 0;
    const weighted = config.capAt5 ? Math.min(base + bonus, 5.0) : base + bonus;
    totalCredits += c.credits;
    uwSum += base * c.credits;
    wSum += weighted * c.credits;
  }

  return {
    unweighted: uwSum / totalCredits,
    weighted: wSum / totalCredits,
    totalCredits,
  };
}

// Auto-detect course type from name
export function detectCourseType(name: string): CourseType {
  const n = name.toUpperCase();
  if (n.includes(" AP") || n.startsWith("AP ") || n.includes("(AP)")) return "AP";
  if (n.includes(" IB") || n.startsWith("IB ") || n.includes("(IB)")) return "IB";
  if (n.includes(" DE") || n.includes("DUAL ENROLL") || n.includes("COLLEGE")) return "DE";
  if (n.includes(" HN") || n.includes("HONORS") || n.endsWith(" H ") || / H$/.test(n) || n.includes("ADV ") || n.includes(" ADV")) return "Honors";
  return "Regular";
}

// Courses to exclude from GPA (non-academic)
export function shouldExclude(name: string): boolean {
  const n = name.toUpperCase();
  return (
    n.includes("PHYSICAL ED") || n.includes("P.E.") || n.includes("GYM") ||
    n.includes("LUNCH") || n.includes("STUDY HALL") || n.includes("HOMEROOM") ||
    n.includes("ADVISORY") || n.includes("AIDE") || n.includes("OFFICE")
  );
}
