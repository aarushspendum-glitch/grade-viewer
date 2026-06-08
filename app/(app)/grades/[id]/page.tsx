"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, X, RotateCcw, TrendingUp } from "lucide-react";
import type { GradebookData, CourseGrade, Assignment, GradingCategory } from "@/lib/studentvue/types";

// ── FCPS scale ────────────────────────────────────────────────────────────────
function pctToLetter(pct: number): string {
  if (pct >= 92.5) return "A";
  if (pct >= 89.5) return "A-";
  if (pct >= 86.5) return "B+";
  if (pct >= 82.5) return "B";
  if (pct >= 79.5) return "B-";
  if (pct >= 76.5) return "C+";
  if (pct >= 72.5) return "C";
  if (pct >= 69.5) return "C-";
  if (pct >= 59.5) return "D";
  return "F";
}

function letterStyle(letter: string) {
  const l = (letter || "N")[0];
  if (l === "A") return { ring: "ring-emerald-300", bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500" };
  if (l === "B") return { ring: "ring-blue-300",    bg: "bg-blue-50",    text: "text-blue-700",    bar: "bg-blue-500" };
  if (l === "C") return { ring: "ring-amber-300",   bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-400" };
  if (l === "D") return { ring: "ring-orange-300",  bg: "bg-orange-50",  text: "text-orange-700",  bar: "bg-orange-400" };
  return           { ring: "ring-red-300",          bg: "bg-red-50",     text: "text-red-700",     bar: "bg-red-500" };
}

function scoreColor(pct: number | null) {
  if (pct === null) return "text-gray-400";
  if (pct >= 90) return "text-emerald-600";
  if (pct >= 80) return "text-blue-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-500";
}

// ── GPA calculation ───────────────────────────────────────────────────────────
function calcGrade(
  assignments: Assignment[],
  overrides: Record<string, number | null>,
  categories: GradingCategory[]
): number | null {
  const active = assignments.filter(a => !a.isDropped);
  if (active.length === 0) return null;

  // dedupe categories by name
  const cats = categories.filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i);

  if (cats.length === 0) {
    let pts = 0, max = 0;
    for (const a of active) {
      const s = overrides[a.id] !== undefined ? overrides[a.id] : a.score;
      if (s !== null && s !== undefined) { pts += s; max += a.maxScore; }
    }
    return max > 0 ? (pts / max) * 100 : null;
  }

  let wSum = 0, wScore = 0;
  for (const cat of cats) {
    if (cat.name.toLowerCase() === "total") continue;
    const catA = active.filter(a => a.category.toLowerCase() === cat.name.toLowerCase());
    if (catA.length === 0) continue;
    let pts = 0, max = 0;
    for (const a of catA) {
      const s = overrides[a.id] !== undefined ? overrides[a.id] : a.score;
      if (s !== null && s !== undefined) { pts += s; max += a.maxScore; }
    }
    if (max === 0) continue;
    wScore += (pts / max) * cat.weight;
    wSum += cat.weight;
  }
  return wSum > 0 ? (wScore / wSum) * 100 : null;
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<CourseGrade | null>(null);
  const [whatIf, setWhatIf] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [hypothetical, setHypothetical] = useState<{ name: string; category: string; score: string; max: string }[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("gradebook");
    if (!raw) { router.push("/"); return; }
    const gb: GradebookData = JSON.parse(raw);
    const found = gb.courses.find(c => c.id === decodeURIComponent(id));
    if (!found) { router.push("/dashboard"); return; }
    setCourse(found);
  }, [id, router]);

  if (!course) return null;

  const displayLetter = course.letter !== "N/A" && course.letter
    ? course.letter : (course.grade !== null ? pctToLetter(course.grade) : "N/A");
  const style = letterStyle(displayLetter);

  // Deduplicate categories (remove TOTAL rows and dupes)
  const cats = course.categories
    .filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i)
    .filter(c => c.name.toLowerCase() !== "total");

  const allAssignments = [...course.assignments, ...hypothetical.map((h, i) => ({
    id: `hyp-${i}`,
    name: h.name || "New assignment",
    category: h.category,
    score: parseFloat(h.score) || null,
    maxScore: parseFloat(h.max) || 100,
    percentage: null,
    isDropped: false,
    dueDate: "",
    notes: "hypothetical",
  }))];

  const projGrade = whatIf ? calcGrade(allAssignments, overrides, course.categories) : course.grade;
  const projLetter = projGrade !== null ? pctToLetter(projGrade) : displayLetter;
  const projStyle = letterStyle(projLetter);
  const hasChanges = Object.keys(overrides).length > 0 || hypothetical.length > 0;

  function setOverride(id: string, val: string) {
    const n = val === "" ? null : parseFloat(val);
    setOverrides(p => ({ ...p, [id]: isNaN(n as number) ? null : n }));
  }

  function addHypothetical() {
    const firstCat = cats[0]?.name ?? (course?.assignments[0]?.category ?? "");
    setHypothetical(p => [...p, { name: "", category: firstCat, score: "", max: "100" }]);
  }

  function removeHypothetical(i: number) {
    setHypothetical(p => p.filter((_, j) => j !== i));
  }

  function reset() { setOverrides({}); setHypothetical([]); }

  // Group assignments by category
  const grouped = new Map<string, Assignment[]>();
  for (const a of course.assignments) {
    if (!grouped.has(a.category)) grouped.set(a.category, []);
    grouped.get(a.category)!.push(a);
  }

  const gradeDelta = whatIf && hasChanges && projGrade !== null && course.grade !== null
    ? projGrade - course.grade : null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Back */}
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to grades
      </button>

      {/* Course header */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-5">
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-xl ring-2 ${
            whatIf && hasChanges ? `${projStyle.bg} ${projStyle.text} ${projStyle.ring}` : `${style.bg} ${style.text} ${style.ring}`
          }`}>
            {whatIf && hasChanges ? projLetter : displayLetter}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{course.name}</h1>
            <p className="text-sm text-gray-400 mt-1">
              Period {course.period}{course.teacher ? ` · ${course.teacher}` : ""}{course.room ? ` · Room ${course.room}` : ""}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${whatIf && hasChanges ? projStyle.bar : style.bar}`}
                  style={{ width: `${Math.min((whatIf && hasChanges ? projGrade ?? 0 : course.grade ?? 0), 100)}%` }}
                />
              </div>
              <span className="text-sm font-bold tabular-nums text-gray-700 flex-shrink-0">
                {(whatIf && hasChanges ? projGrade : course.grade)?.toFixed(2) ?? "—"}%
                {gradeDelta !== null && (
                  <span className={`ml-1.5 text-xs font-semibold ${gradeDelta >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                    {gradeDelta >= 0 ? "+" : ""}{gradeDelta.toFixed(2)}%
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* What-if toggle */}
          <button
            onClick={() => { setWhatIf(!whatIf); if (whatIf) reset(); }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-colors flex-shrink-0 ${
              whatIf ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {whatIf ? <X className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            {whatIf ? "Exit What-if" : "What-if"}
          </button>
        </div>

        {/* Category breakdown */}
        {cats.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cats.map(cat => {
              const catPct = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0;
              return (
                <div key={cat.name} className="bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xs font-semibold text-gray-700">{cat.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold tabular-nums ${scoreColor(catPct)}`}>
                        {catPct.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-gray-400">{cat.weight}% wt</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      catPct >= 90 ? "bg-emerald-400" : catPct >= 80 ? "bg-blue-400" : catPct >= 70 ? "bg-amber-400" : "bg-red-400"
                    }`} style={{ width: `${Math.min(catPct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* What-if controls */}
      {whatIf && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              What-if mode — edit any score or add future assignments
            </p>
            <p className="text-xs text-indigo-500 mt-0.5">Changes are local only and won't affect your real grades.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addHypothetical}
              className="text-xs font-semibold px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              + Add assignment
            </button>
            {hasChanges && (
              <button onClick={reset} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hypothetical assignments */}
      {whatIf && hypothetical.length > 0 && (
        <div className="bg-white border border-indigo-100 rounded-2xl shadow-sm p-5 mb-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Hypothetical assignments</p>
          <div className="flex flex-col gap-2">
            {hypothetical.map((h, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_80px_80px_24px] gap-2 items-center">
                <input value={h.name} onChange={e => setHypothetical(p => p.map((x, j) => j===i ? {...x, name: e.target.value} : x))}
                  placeholder="Assignment name"
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <select value={h.category} onChange={e => setHypothetical(p => p.map((x, j) => j===i ? {...x, category: e.target.value} : x))}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {cats.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  {cats.length === 0 && <option value="">General</option>}
                </select>
                <input value={h.score} onChange={e => setHypothetical(p => p.map((x, j) => j===i ? {...x, score: e.target.value} : x))}
                  placeholder="Score" type="number" min={0}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <input value={h.max} onChange={e => setHypothetical(p => p.map((x, j) => j===i ? {...x, max: e.target.value} : x))}
                  placeholder="/ 100" type="number" min={1}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <button onClick={() => removeHypothetical(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assignments */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Assignments</h2>
          <span className="text-xs text-gray-400">{course.assignments.length} total</span>
        </div>

        {course.assignments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">No assignments yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Grouped by category */}
            {[...grouped.entries()].map(([catName, catAssignments]) => (
              <div key={catName}>
                {/* Category sub-header */}
                <div className="px-5 py-2 bg-gray-50/60 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{catName}</span>
                  {cats.find(c => c.name === catName) && (
                    <span className="text-[11px] text-gray-400">{cats.find(c => c.name === catName)?.weight}% of grade</span>
                  )}
                </div>

                {catAssignments.map(a => {
                  const override = overrides[a.id];
                  const displayScore = override !== undefined && override !== null ? override : a.score;
                  const displayPct = displayScore !== null && displayScore !== undefined
                    ? (displayScore / a.maxScore) * 100 : a.percentage;
                  const changed = override !== undefined && override !== null;

                  return (
                    <div key={a.id}
                      className={`flex items-center gap-4 px-5 py-3 ${a.isDropped ? "opacity-40" : ""} ${changed ? "bg-indigo-50/40" : ""}`}>
                      {/* Score dot */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        displayPct === null ? "bg-gray-200" :
                        displayPct >= 90 ? "bg-emerald-400" :
                        displayPct >= 80 ? "bg-blue-400" :
                        displayPct >= 70 ? "bg-amber-400" : "bg-red-400"
                      }`} />

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm text-gray-800 truncate ${a.isDropped ? "line-through text-gray-400" : ""}`}>
                          {a.name}
                        </p>
                        {a.dueDate && (
                          <p className="text-xs text-gray-400 mt-0.5">{a.dueDate}</p>
                        )}
                      </div>

                      {/* Score */}
                      {whatIf ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <input
                            type="number" min={0} max={a.maxScore}
                            value={override !== undefined && override !== null ? override : (a.score ?? "")}
                            onChange={e => setOverride(a.id, e.target.value)}
                            placeholder={a.score !== null ? String(a.score) : "—"}
                            className={`w-16 text-sm border rounded-lg px-2 py-1 text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                              changed ? "border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold" : "border-gray-200"
                            }`}
                          />
                          <span className="text-xs text-gray-400 w-10 flex-shrink-0">/ {a.maxScore}</span>
                          {changed && (
                            <button onClick={() => setOverrides(p => { const n = {...p}; delete n[a.id]; return n; })}
                              className="text-gray-300 hover:text-red-400 transition-colors">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {a.score !== null ? (
                            <>
                              <span className={`text-sm font-semibold tabular-nums ${scoreColor(displayPct)}`}>
                                {a.score}/{a.maxScore}
                              </span>
                              {displayPct !== null && (
                                <span className="text-xs text-gray-400 tabular-nums w-12 text-right">
                                  {displayPct.toFixed(1)}%
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
