"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar, ExternalLink, Loader2, RefreshCw, AlertCircle,
  BookOpen, FlaskConical, ClipboardList, Star, ChevronLeft, ChevronRight,
  Plus, X, Check,
} from "lucide-react";
import type { CalEvent } from "@/app/api/schoology-ical/route";

const ICAL_KEY    = "upgrade_schoology_ical_url";
const CUSTOM_KEY  = "upgrade_custom_events";

const TYPE_CONFIG: Record<CalEvent["type"], {
  label: string; icon: React.ElementType;
  color: string; bg: string; pill: string;
}> = {
  test:       { label: "Test / Quiz", icon: FlaskConical,  color: "text-red-700",    bg: "bg-red-50",    pill: "bg-red-100 text-red-700 border-red-200" },
  assignment: { label: "Assignment",  icon: ClipboardList, color: "text-indigo-700", bg: "bg-indigo-50", pill: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  event:      { label: "Event",       icon: Star,          color: "text-amber-700",  bg: "bg-amber-50",  pill: "bg-amber-100 text-amber-700 border-amber-200" },
  other:      { label: "Other",       icon: BookOpen,      color: "text-gray-600",   bg: "bg-gray-50",   pill: "bg-gray-100 text-gray-600 border-gray-200" },
};

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function toLocalDay(isoStr: string): string {
  if (isoStr.endsWith("Z")) {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  return isoStr.slice(0, 10);
}

function formatTime(isoStr: string, allDay: boolean): string {
  if (allDay) return "All day";
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function loadCustomEvents(): CalEvent[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]"); } catch { return []; }
}
function saveCustomEvents(evs: CalEvent[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(evs));
}

export default function CalendarPage() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const [icalUrl,    setIcalUrl]    = useState("");
  const [inputUrl,   setInputUrl]   = useState("");
  const [icalEvents, setIcalEvents] = useState<CalEvent[]>([]);
  const [customEvents, setCustomEvents] = useState<CalEvent[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [viewYear,   setViewYear]   = useState(today.getFullYear());
  const [viewMonth,  setViewMonth]  = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string>(todayStr);

  // Add-event modal state
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate,  setNewDate]  = useState(todayStr);
  const [newType,  setNewType]  = useState<CalEvent["type"]>("assignment");
  const [newNote,  setNewNote]  = useState("");
  const [addSaved, setAddSaved] = useState(false);

  useEffect(() => {
    setCustomEvents(loadCustomEvents());
    const saved = localStorage.getItem(ICAL_KEY);
    if (saved) { setIcalUrl(saved); setInputUrl(saved); }
  }, []);

  const fetchCalendar = useCallback(async (url: string) => {
    if (!url) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/schoology-ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icalUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load calendar.");
      setIcalEvents(data.events as CalEvent[]);
      localStorage.setItem(ICAL_KEY, url);
      setIcalUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (icalUrl) fetchCalendar(icalUrl); }, [icalUrl, fetchCalendar]);

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    fetchCalendar(inputUrl.trim());
  }

  function addCustomEvent() {
    if (!newTitle.trim() || !newDate) return;
    const ev: CalEvent = {
      uid: `custom-${Date.now()}`,
      title: newTitle.trim(),
      description: newNote.trim(),
      start: newDate + "T12:00:00",
      end:   newDate + "T13:00:00",
      allDay: true,
      course: "",
      type: newType,
    };
    const updated = [...customEvents, ev];
    setCustomEvents(updated);
    saveCustomEvents(updated);
    setNewTitle(""); setNewNote(""); setNewDate(selectedDay || todayStr); setNewType("assignment");
    setShowAdd(false);
    setAddSaved(true);
    setTimeout(() => setAddSaved(false), 2000);
    setSelectedDay(toLocalDay(ev.start));
  }

  function removeCustomEvent(uid: string) {
    const updated = customEvents.filter(e => e.uid !== uid);
    setCustomEvents(updated);
    saveCustomEvents(updated);
  }

  // Merge iCal + custom events
  const allEvents = [...icalEvents, ...customEvents];
  const eventsByDay = new Map<string, CalEvent[]>();
  for (const ev of allEvents) {
    const day = toLocalDay(ev.start);
    if (!eventsByDay.has(day)) eventsByDay.set(day, []);
    eventsByDay.get(day)!.push(ev);
  }

  // Calendar grid
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDow     = firstOfMonth.getDay();
  const cells: (string | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() { if (viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1); }
  function nextMonth() { if (viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1); }

  const selectedEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : [];
  const upcoming    = allEvents.filter(ev => toLocalDay(ev.start) >= todayStr);
  const testCount   = upcoming.filter(e => e.type === "test").length;
  const assignCount = upcoming.filter(e => e.type === "assignment").length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-400 mt-1">Schoology iCal + your own events</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowAdd(true); setNewDate(selectedDay || todayStr); }}
            className="flex items-center gap-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add event
          </button>
          {icalUrl && (
            <button onClick={() => fetchCalendar(icalUrl)} disabled={loading}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Add-event modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">Add event</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addCustomEvent(); }}
                  placeholder="e.g. AP Chemistry Test"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                  <select value={newType} onChange={e => setNewType(e.target.value as CalEvent["type"])}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
                    {(Object.keys(TYPE_CONFIG) as CalEvent["type"][]).map(t => (
                      <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                <input value={newNote} onChange={e => setNewNote(e.target.value)}
                  placeholder="Any extra details…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={addCustomEvent} disabled={!newTitle.trim() || !newDate}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                  Add to calendar
                </button>
                <button onClick={() => setShowAdd(false)}
                  className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect card */}
      {!icalUrl && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Connect Schoology Calendar</h2>
              <p className="text-sm text-gray-500">Paste your personal iCal URL to see assignments and tests.</p>
            </div>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 text-sm text-indigo-800">
            <p className="font-medium mb-1">How to find your iCal URL:</p>
            <ol className="list-decimal list-inside space-y-1 text-indigo-700">
              <li>Go to <a href="https://lms.fcps.edu" target="_blank" rel="noreferrer" className="underline font-medium">lms.fcps.edu</a></li>
              <li>Click your profile photo → <strong>Account Settings</strong></li>
              <li>Scroll down to <strong>Share Your Calendar</strong></li>
              <li>Copy the URL (starts with <code className="bg-indigo-100 px-1 rounded text-xs">webcal://</code>)</li>
            </ol>
          </div>
          <form onSubmit={handleConnect} className="flex gap-2">
            <input value={inputUrl} onChange={e => setInputUrl(e.target.value)}
              placeholder="webcal://lms.fcps.edu/calendar/feed/ical/…/ical.ics"
              className="flex-1 border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button type="submit" disabled={loading || !inputUrl.trim()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors flex-shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Connect
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        </div>
      )}

      {/* Saved toast */}
      {addSaved && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 z-50">
          <Check className="w-4 h-4 text-emerald-400" /> Event added
        </div>
      )}

      {/* Stats */}
      {(icalUrl || customEvents.length > 0) && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Upcoming</p>
            <p className="text-3xl font-bold text-gray-900 tabular-nums">{upcoming.length}</p>
            <p className="text-xs text-gray-400 mt-1">events total</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-red-400 uppercase tracking-wide mb-1">Tests &amp; Quizzes</p>
            <p className="text-3xl font-bold text-red-600 tabular-nums">{testCount}</p>
            <p className="text-xs text-red-400 mt-1">coming up</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-1">Assignments</p>
            <p className="text-3xl font-bold text-indigo-700 tabular-nums">{assignCount}</p>
            <p className="text-xs text-indigo-400 mt-1">due upcoming</p>
          </div>
        </div>
      )}

      {error && icalUrl && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <p className="text-sm">Loading your Schoology calendar…</p>
        </div>
      )}

      {/* Calendar grid + day panel */}
      {!loading && (icalUrl || customEvents.length > 0) && (
        <div className="grid grid-cols-[1fr_300px] gap-4 items-start">

          {/* Monthly grid */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft className="w-4 h-4" /></button>
              <h2 className="font-semibold text-gray-900 text-sm">{MONTHS[viewMonth]} {viewYear}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 border-b border-gray-100">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((dayStr, idx) => {
                if (!dayStr) return <div key={`e${idx}`} className="min-h-[72px] border-b border-r border-gray-50" />;
                const dayEvents = eventsByDay.get(dayStr) ?? [];
                const isToday    = dayStr === todayStr;
                const isSelected = dayStr === selectedDay;
                const isPast     = dayStr < todayStr;
                const dayNum     = parseInt(dayStr.slice(8));
                return (
                  <button key={dayStr} onClick={() => setSelectedDay(dayStr)}
                    className={`min-h-[72px] p-1.5 border-b border-r border-gray-50 flex flex-col items-start transition-colors text-left
                      ${isSelected ? "bg-indigo-50" : "hover:bg-gray-50"}
                      ${(idx+1)%7===0 ? "border-r-0" : ""}`}>
                    <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 flex-shrink-0
                      ${isToday ? "bg-indigo-600 text-white" : isSelected ? "text-indigo-700" : isPast ? "text-gray-300" : "text-gray-700"}`}>
                      {dayNum}
                    </span>
                    <div className="flex flex-col gap-0.5 w-full">
                      {dayEvents.slice(0,2).map((ev, i) => {
                        const tc = TYPE_CONFIG[ev.type];
                        return (
                          <div key={i} className={`w-full px-1 py-0.5 rounded text-[10px] font-medium truncate leading-tight border ${tc.pill}`}>
                            {ev.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && <span className="text-[10px] text-gray-400 pl-1">+{dayEvents.length-2} more</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day panel */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedDay
                    ? new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                    : "Select a day"}
                </p>
                {selectedDay === todayStr && <span className="text-xs text-indigo-600 font-medium">Today</span>}
              </div>
              <button onClick={() => { setShowAdd(true); setNewDate(selectedDay || todayStr); }}
                className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-gray-400">No events</p>
                <button onClick={() => { setShowAdd(true); setNewDate(selectedDay || todayStr); }}
                  className="mt-2 text-xs text-indigo-500 hover:text-indigo-700 underline">
                  Add one
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[calc(100vh-360px)] overflow-y-auto">
                {selectedEvents.map(ev => {
                  const tc = TYPE_CONFIG[ev.type];
                  const Icon = tc.icon;
                  const isCustom = ev.uid.startsWith("custom-");
                  return (
                    <div key={ev.uid} className="px-4 py-3 flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${tc.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${tc.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{ev.title}</p>
                        {ev.description && !ev.description.startsWith("http") && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{ev.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${tc.pill}`}>{tc.label}</span>
                          <span className="text-xs text-gray-400">{formatTime(ev.start, ev.allDay)}</span>
                          {isCustom && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">custom</span>}
                        </div>
                        {ev.description?.startsWith("http") && (
                          <a href={ev.description} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-1.5">
                            <ExternalLink className="w-3 h-3" /> Open in Schoology
                          </a>
                        )}
                      </div>
                      {isCustom && (
                        <button onClick={() => removeCustomEvent(ev.uid)}
                          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 flex-shrink-0 transition-colors mt-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {icalUrl && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          Schoology calendar saved.{" "}
          <button onClick={() => { localStorage.removeItem(ICAL_KEY); setIcalUrl(""); setIcalEvents([]); setError(""); }}
            className="underline hover:text-gray-600">Disconnect</button>
        </p>
      )}
    </div>
  );
}
