export interface Assignment {
  id: string;
  name: string;
  category: string;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  isDropped: boolean;
  dueDate: string;
  notes: string;
}

export interface GradingCategory {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
}

export interface CourseGrade {
  id: string;
  name: string;
  teacher: string;
  period: number;
  room: string;
  grade: number | null;
  letter: string;
  categories: GradingCategory[];
  assignments: Assignment[];
}

export interface GradebookData {
  reportingPeriod: string;
  courses: CourseGrade[];
}

export interface StudentInfo {
  name: string;
  grade: string;
  school: string;
  studentId: string;
  photo?: string;
}
