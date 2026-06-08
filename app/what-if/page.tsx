"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Edit3, X, Check } from "lucide-react";

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
  created_at: string;
}

export default function WhatIfPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addingOverride, setAddingOverride] = useState(false);
  const [draft, setDraft] = useState<Partial<AssignmentOverride>>({});

  useEffect(() => { fetchScenarios(); }, []);

  async function fetchScenarios() {
    const res = await fetch("/api/what-if");
    if (res.ok) setScenarios(await res.json());
  }

  async function createScenario() {
    if (!newName.trim()) return;
    const res = await fetch("/api/what-if", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), overrides: [] }),
    });
    if (res.ok) {
      const data = await res.json();
      setScenarios((p) => [data, ...p]);
      setActiveScenario(data);
      setNewName("");
      setCreating(false);
    }
  }

  async function save() {
    if (!activeScenario) return;
    setSaving(true);
    await fetch("/api/what-if", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeScenario.id, name: activeScenario.name, overrides: activeScenario.overrides }),
    });
    setSaving(false);
    fetchScenarios();
  }

  async function deleteScenario(id: string) {
    await fetch(`/api/what-if?id=${id}`, { method: "DELETE" });
    setScenarios((p) => p.filter((s) => s.id !== id));
    if (activeScenario?.id === id) setActiveScenario(null);
  }

  function confirmOverride() {
    if (!activeScenario) return;
    const override: AssignmentOverride = {
      courseId: draft.courseId ?? "custom",
      courseName: draft.courseName ?? "Custom Class",
      assignmentId: String(Date.now()),
      assignmentName: draft.assignmentName ?? "Assignment",
      originalScore: draft.originalScore ?? null,
      whatIfScore: draft.whatIfScore ?? 0,
      maxScore: draft.maxScore ?? 100,
    };
    setActiveScenario({ ...activeScenario, overrides: [...activeScenario.overrides, override] });
    setDraft({});
    setAddingOverride(false);
  }

  function removeOverride(idx: number) {
    if (!activeScenario) return;
    setActiveScenario({ ...activeScenario, overrides: activeScenario.overrides.filter((_, i) => i !== idx) });
  }

  // Per-class impact summary
  const courseImpact = activeScenario
    ? [...new Set(activeScenario.overrides.map((o) => o.courseName))].map((name) => {
        const items = activeScenario.overrides.filter((o) => o.courseName === name);
        const totalMax = items.reduce((a, b) => a + b.maxScore, 0);
        const origTotal = items.filter((o) => o.originalScore !== null).reduce((a, b) => a + (b.originalScore ?? 0), 0);
        const whatIfTotal = items.reduce((a, b) => a + b.whatIfScore, 0);
        return { name, orig: totalMax > 0 ? (origTotal / totalMax) * 100 : 0, whatIf: totalMax > 0 ? (whatIfTotal / totalMax) * 100 : 0 };
      })
    : [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">What-If Scenarios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Model any hypothetical score — see how it changes your average before the test.
        </p>
      </div>

      <div className="flex gap-6">
        {/* Scenario list */}
        <div className="w-56 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scenarios</p>
            <button onClick={() => setCreating(true)} className="text-indigo-500 hover:text-indigo-700">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {creating && (
            <div className="flex gap-1.5 mb-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createScenario()}
                placeholder="Name…"
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button onClick={createScenario} className="text-emerald-500 hover:text-emerald-700">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            {scenarios.length === 0 && !creating && (
              <p className="text-sm text-gray-400 px-1">No scenarios yet.</p>
            )}
            {scenarios.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveScenario(s)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeScenario?.id === s.id
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className="text-sm font-medium truncate">{s.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteScenario(s.id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 ml-1 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1">
          {!activeScenario ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white border border-gray-100 rounded-2xl shadow-sm text-center">
              <Edit3 className="w-8 h-8 text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Select a scenario or create a new one</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 text-lg">{activeScenario.name}</h2>
                <button
                  onClick={save}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>

              {/* Impact cards */}
              {courseImpact.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {courseImpact.map((c) => {
                    const diff = c.whatIf - c.orig;
                    return (
                      <div key={c.name} className="bg-white border border-gray-100 rounded-xl shadow-sm px-4 py-3">
                        <p className="text-sm text-gray-500 truncate mb-1">{c.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm tabular-nums">{c.orig.toFixed(1)}%</span>
                          <span className="text-gray-300 text-xs">→</span>
                          <span className={`font-semibold tabular-nums ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-500" : "text-gray-700"}`}>
                            {c.whatIf.toFixed(1)}%
                          </span>
                          {diff !== 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${diff > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                              {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Overrides list */}
              <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Grade overrides</h3>
                  <button
                    onClick={() => { setAddingOverride(true); setDraft({}); }}
                    className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add override
                  </button>
                </div>

                {addingOverride && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Class name</label>
                        <input
                          placeholder="e.g. AP Physics"
                          value={draft.courseName ?? ""}
                          onChange={(e) => setDraft({ ...draft, courseName: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Assignment name</label>
                        <input
                          placeholder="e.g. Unit 3 Test"
                          value={draft.assignmentName ?? ""}
                          onChange={(e) => setDraft({ ...draft, assignmentName: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Current score</label>
                        <input
                          type="number"
                          placeholder="Leave blank if ungraded"
                          value={draft.originalScore ?? ""}
                          onChange={(e) => setDraft({ ...draft, originalScore: e.target.value === "" ? null : parseFloat(e.target.value) })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">What-if score</label>
                        <input
                          type="number"
                          value={draft.whatIfScore ?? ""}
                          onChange={(e) => setDraft({ ...draft, whatIfScore: parseFloat(e.target.value) || 0 })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Out of</label>
                        <input
                          type="number"
                          value={draft.maxScore ?? 100}
                          onChange={(e) => setDraft({ ...draft, maxScore: parseFloat(e.target.value) || 100 })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setAddingOverride(false); setDraft({}); }}
                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmOverride}
                        className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-1.5 rounded-lg"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {activeScenario.overrides.length === 0 && !addingOverride ? (
                  <p className="text-sm text-gray-400">No overrides yet. Add an assignment to model.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {activeScenario.overrides.map((o, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{o.assignmentName}</p>
                          <p className="text-xs text-gray-400">{o.courseName}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm tabular-nums">
                            <span className="text-gray-400">{o.originalScore !== null ? `${o.originalScore}` : "—"}/{o.maxScore}</span>
                            <span className="text-gray-300 mx-1.5">→</span>
                            <span className="text-indigo-600 font-medium">{o.whatIfScore}/{o.maxScore}</span>
                          </span>
                          <button onClick={() => removeOverride(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
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
