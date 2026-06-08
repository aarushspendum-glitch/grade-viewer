export type LetterGrade = "A+" | "A" | "A-" | "B+" | "B" | "B-" | "C+" | "C" | "C-" | "D+" | "D" | "D-" | "F";

export const GRADE_POINTS: Record<LetterGrade, number> = {
  "A+": 4.0,
  "A":  4.0,
  "A-": 3.7,
  "B+": 3.3,
  "B":  3.0,
  "B-": 2.7,
  "C+": 2.3,
  "C":  2.0,
  "C-": 1.7,
  "D+": 1.3,
  "D":  1.0,
  "D-": 0.7,
  "F":  0.0,
};

export const WEIGHTED_BONUS: Record<"AP" | "IB" | "DE" | "Honors" | "Regular", number> = {
  AP: 1.0,
  IB: 1.0,
  DE: 1.0,
  Honors: 0.5,
  Regular: 0.0,
};

export function percentToLetter(pct: number): LetterGrade {
  if (pct >= 97) return "A+";
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 67) return "D+";
  if (pct >= 63) return "D";
  if (pct >= 60) return "D-";
  return "F";
}

export function letterToPoints(letter: LetterGrade): number {
  return GRADE_POINTS[letter] ?? 0;
}

export interface Course {
  id: string;
  name: string;
  grade: number;
  credits: number;
  type: "AP" | "IB" | "DE" | "Honors" | "Regular";
}

export function calculateGPA(courses: Course[]): { unweighted: number; weighted: number } {
  if (courses.length === 0) return { unweighted: 0, weighted: 0 };

  let totalCredits = 0;
  let unweightedSum = 0;
  let weightedSum = 0;

  for (const course of courses) {
    const letter = percentToLetter(course.grade);
    const pts = letterToPoints(letter);
    const bonus = WEIGHTED_BONUS[course.type];
    totalCredits += course.credits;
    unweightedSum += pts * course.credits;
    weightedSum += (pts + bonus) * course.credits;
  }

  return {
    unweighted: totalCredits > 0 ? unweightedSum / totalCredits : 0,
    weighted: totalCredits > 0 ? weightedSum / totalCredits : 0,
  };
}

export interface OptimizeTarget {
  courses: Course[];
  targetGPA: number;
  weighted: boolean;
}

export interface OptimizeSuggestion {
  courseId: string;
  courseName: string;
  currentGrade: number;
  neededGrade: number;
  improvement: number;
}

export function optimizeGPA(opts: OptimizeTarget): OptimizeSuggestion[] {
  const { courses, targetGPA, weighted } = opts;
  const current = calculateGPA(courses);
  const currentGPA = weighted ? current.weighted : current.unweighted;

  if (currentGPA >= targetGPA) return [];

  const suggestions: OptimizeSuggestion[] = [];

  for (const course of courses) {
    for (let grade = course.grade + 1; grade <= 100; grade++) {
      const testCourses = courses.map((c) =>
        c.id === course.id ? { ...c, grade } : c
      );
      const { unweighted, weighted: w } = calculateGPA(testCourses);
      const newGPA = weighted ? w : unweighted;
      if (newGPA >= targetGPA) {
        suggestions.push({
          courseId: course.id,
          courseName: course.name,
          currentGrade: course.grade,
          neededGrade: grade,
          improvement: grade - course.grade,
        });
        break;
      }
    }
  }

  return suggestions.sort((a, b) => a.improvement - b.improvement);
}
