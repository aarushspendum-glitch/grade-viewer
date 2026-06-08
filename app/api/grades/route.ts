import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GradebookData, CourseGrade, Assignment } from "@/lib/studentvue/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseStudentVueGradebook(raw: any): GradebookData {
  const gb = raw?.Gradebook;
  const reportingPeriod = gb?.["@_ReportPeriod"] ?? "Current";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawCourses: any[] = Array.isArray(gb?.Courses?.Course)
    ? gb.Courses.Course
    : gb?.Courses?.Course
    ? [gb.Courses.Course]
    : [];

  const courses: CourseGrade[] = rawCourses.map((c: any, idx: number) => {
    const mark = Array.isArray(c.Marks?.Mark) ? c.Marks.Mark[0] : c.Marks?.Mark;

    const rawAssignments: any[] = Array.isArray(mark?.Assignments?.Assignment)
      ? mark.Assignments.Assignment
      : mark?.Assignments?.Assignment
      ? [mark.Assignments.Assignment]
      : [];

    const assignments: Assignment[] = rawAssignments.map((a: any) => ({
      id: a["@_GradebookID"] ?? String(Math.random()),
      name: a["@_Measure"] ?? "Unknown",
      category: a["@_Type"] ?? "Assignment",
      score: a["@_Score"] === "Not Graded" || a["@_Score"] === "" ? null : parseFloat(a["@_Score"]),
      maxScore: parseFloat(a["@_ScoreType"] === "Raw Score" ? a["@_Points"] ?? "100" : "100"),
      percentage: a["@_Score"] === "Not Graded" || a["@_Score"] === "" ? null :
        (parseFloat(a["@_Score"]) / parseFloat(a["@_Points"] ?? "100")) * 100,
      isDropped: a["@_DropScoreFlag"] === "1",
      dueDate: a["@_DueDate"] ?? "",
      notes: a["@_Notes"] ?? "",
    }));

    const rawCategories: any[] = Array.isArray(mark?.GradeCalculationSummary?.AssignmentGradeCalc)
      ? mark.GradeCalculationSummary.AssignmentGradeCalc
      : mark?.GradeCalculationSummary?.AssignmentGradeCalc
      ? [mark.GradeCalculationSummary.AssignmentGradeCalc]
      : [];

    const categories = rawCategories.map((cat: any) => ({
      name: cat["@_Type"] ?? "Category",
      weight: parseFloat(cat["@_Weight"] ?? "0"),
      score: parseFloat(cat["@_Points"] ?? "0"),
      maxScore: parseFloat(cat["@_PointsPossible"] ?? "0"),
    }));

    const rawGrade = mark?.["@_CalculatedScoreRaw"];
    const grade = rawGrade !== undefined && rawGrade !== "" ? parseFloat(rawGrade) : null;

    return {
      id: c["@_ID"] ?? String(idx),
      name: c["@_Title"] ?? "Unknown Course",
      teacher: c["@_Staff"] ?? "",
      period: parseInt(c["@_Period"] ?? "0"),
      room: c["@_Room"] ?? "",
      grade,
      letter: mark?.["@_CalculatedScoreString"] ?? (grade !== null ? gradeToLetter(grade) : "N/A"),
      categories,
      assignments,
    };
  });

  return { reportingPeriod, courses };
}

function gradeToLetter(pct: number): string {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username, password, districtUrl } = await request.json();
  if (!username || !password || !districtUrl) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  try {
    // Dynamic import since studentvue is CJS
    const { StudentVue } = await import("studentvue");
    const client = new StudentVue(districtUrl, username, password);
    const raw = await client.getGradebook();
    const gradebook = parseStudentVueGradebook(raw);

    // Persist encrypted creds reference in supabase (we only store districtId, not plaintext password)
    await supabase.from("user_settings").upsert({
      user_id: user.id,
      district_url: districtUrl,
      stu_username: username,
    });

    return NextResponse.json(gradebook);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch grades";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("cached_grades")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) return NextResponse.json({ error: "No cached grades" }, { status: 404 });
  return NextResponse.json(data.gradebook);
}
