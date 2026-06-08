"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Edit3, X, Check } from "lucide-react";
import { calculateGPA, percentToLetter, type Course } from "@/lib/gpa";

interface AssignmentOverride {
  courseId: string;
  courseName: string;
  assignmentId: string;
  assignmentName: string;
  originalScore: number | null;
  whatIfScore: number;
  maxScore: number;
}

interface Scenario {
  id: string;
  name: string;
  overrides: AssignmentOverride[];
  createdAt: string;
}

// Inline what-if assignment editor (no real grades fetched on this page)
// Users manually add overrides for "what if I get X on this test"
export default function WhatIfPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [newScenarioName, setNewScenarioName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingOverride, setEditingOverride] = useState<Partial<AssignmentOverride> | null>(null);

  useEffect(() => {
    fetchScenarios();
  }, []);

  async function fetchScenarios() {
    const res = await fetch("/api/what-if");
    if (res.ok) {
      const data = await res.json();
      setScenarios(data);
    }
  }

  async function createScenario() {
    if (!newScenarioName.trim()) return;
    const res = await fetch("/api/what-if", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newScenarioName.trim(), overrides: [] }),
    });
    if (res.ok) {
      const data = await res.json();
      setScenarios((prev) => [data, ...prev]);
      setActiveScenario(data);
      setNewScenarioName("");
      setCreating(false);
    }
  }

  async function saveScenario() {
    if (!activeScenario) return;
    setSaving(true);
    await fetch("/api/what-if", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: activeScenario.id,
        name: activeScenario.name,
        overrides: activeScenario.overrides,
      }),
    });
    setSaving(false);
    await fetchScenarios();
  }

  async function deleteScenario(id: string) {
    await fetch(`/api/what-if?id=${id}`, { method: "DELETE" });
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    if (activeScenario?.id === id) setActiveScenario(null);
  }

  function addOverride() {
    if (!editingOverride || !activeScenario) return;
    const override: AssignmentOverride = {
      courseId: editingOverride.courseId ?? "custom",
      courseName: editingOverride.courseName ?? "Custom Course",
      assignmentId: String(Date.now()),
      assignmentName: editingOverride.assignmentName ?? "Assignment",
      originalScore: editingOverride.originalScore ?? null,
      whatIfScore: editingOverride.whatIfScore ?? 0,
      maxScore: editingOverride.maxScore ?? 100,
    };
    setActiveScenario({
      ...activeScenario,
      overrides: [...activeScenario.overrides, override],
    });
    setEditingOverride(null);
  }

  function removeOverride(idx: number) {
    if (!activeScenario) return;
    setActiveScenario({
      ...activeScenario,
      overrides: activeScenario.overrides.filter((_, i) => i !== idx),
    });
  }

  // Summarize what-if GPA impact per course
  const courseImpact = activeScenario
    ? summarizeCourseImpact(activeScenario.overrides)
    : [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">What-If Scenarios</h1>
        <p className="text-slate-400 mt-1">
          Model hypothetical grades — "what if I get a 95 on the next test?" — and see how your GPA changes.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar: scenario list */}
        <div className="w-64 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Scenarios</h2>
            <button
              onClick={() => setCreating(true)}
              className="text-violet-400 hover:text-violet-300"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {creating && (
            <div className="flex gap-2 mb-3">
              <input
                autoFocus
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createScenario()}
                placeholder="Scenario name"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button onClick={createScenario} className="text-green-400"><Check className="w-4 h-4" /></button>
              <button onClick={() => setCreating(false)} className="text-slate-500"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {scenarios.length === 0 && (
              <p className="text-slate-500 text-sm">No scenarios yet. Create one!</p>
            )}
            {scenarios.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                  activeScenario?.id === s.id
                    ? "bg-violet-600/20 border border-violet-600/40"
                    : "hover:bg-slate-800 border border-transparent"
                }`}
                onClick={() => setActiveScenario(s)}
              >
                <span className="text-sm text-white truncate">{s.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteScenario(s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {!activeScenario ? (
            <div className="flex items-center justify-center h-64 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-center">
                <Edit3 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">Select or create a scenario to start</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">{activeScenario.name}</h2>
                <button
                  onClick={saveScenario}
                  className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>

              {courseImpact.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {courseImpact.map((c) => (
                    <div key={c.courseName} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
                      <p className="text-sm text-slate-400 truncate">{c.courseName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">{c.original.toFixed(1)}%</span>
                        <span className="text-slate-600">→</span>
                        <span className={`text-sm font-semibold ${c.whatIf > c.original ? "text-green-400" : c.whatIf < c.original ? "text-red-400" : "text-white"}`}>
                          {c.whatIf.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-white">Grade Overrides</h3>
                  <button
                    onClick={() => setEditingOverride({})}
                    className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"
                  >
                    <Plus className="w-4 h-4" />
                    Add Override
                  </button>
                </div>

                {editingOverride !== null && (
                  <div className="bg-slate-800 rounded-xl p-4 mb-4 flex flex-col gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        placeholder="Course name"
                        value={editingOverride.courseName ?? ""}
                        onChange={(e) => setEditingOverride({ ...editingOverride, courseName: e.target.value })}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                      <input
                        placeholder="Assignment name"
                        value={editingOverride.assignmentName ?? ""}
                        onChange={(e) => setEditingOverride({ ...editingOverride, assignmentName: e.target.value })}
                        className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Current score</label>
                        <input
                          type="number"
                          placeholder="null = ungraded"
                          value={editingOverride.originalScore ?? ""}
                          onChange={(e) => setEditingOverride({ ...editingOverride, originalScore: e.target.value === "" ? null : parseFloat(e.target.value) })}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">What-if score</label>
                        <input
                          type="number"
                          value={editingOverride.whatIfScore ?? 0}
                          onChange={(e) => setEditingOverride({ ...editingOverride, whatIfScore: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Max score</label>
                        <input
                          type="number"
                          value={editingOverride.maxScore ?? 100}
                          onChange={(e) => setEditingOverride({ ...editingOverride, maxScore: parseFloat(e.target.value) || 100 })}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingOverride(null)} className="text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg">Cancel</button>
                      <button onClick={addOverride} className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg">Add</button>
                    </div>
                  </div>
                )}

                {activeScenario.overrides.length === 0 ? (
                  <p className="text-slate-500 text-sm">No overrides yet. Add one above.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {activeScenario.overrides.map((o, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-800 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white">{o.assignmentName}</p>
                          <p className="text-xs text-slate-400">{o.courseName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-400">
                            {o.originalScore !== null ? `${o.originalScore}` : "—"}/{o.maxScore}
                            <span className="text-slate-600 mx-1">→</span>
                            <span className="text-violet-400">{o.whatIfScore}/{o.maxScore}</span>
                          </span>
                          <button onClick={() => removeOverride(idx)} className="text-slate-600 hover:text-red-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function summarizeCourseImpact(overrides: AssignmentOverride[]) {
  const map = new Map<string, { original: number[]; whatIf: number[]; max: number[] }>();
  for (const o of overrides) {
    if (!map.has(o.courseName)) map.set(o.courseName, { original: [], whatIf: [], max: [] });
    const entry = map.get(o.courseName)!;
    if (o.originalScore !== null) entry.original.push(o.originalScore);
    entry.whatIf.push(o.whatIfScore);
    entry.max.push(o.maxScore);
  }
  return Array.from(map.entries()).map(([courseName, { original, whatIf, max }]) => {
    const totalMax = max.reduce((a, b) => a + b, 0);
    const origTotal = original.reduce((a, b) => a + b, 0);
    const whatIfTotal = whatIf.reduce((a, b) => a + b, 0);
    return {
      courseName,
      original: totalMax > 0 ? (origTotal / totalMax) * 100 : 0,
      whatIf: totalMax > 0 ? (whatIfTotal / totalMax) * 100 : 0,
    };
  });
}
