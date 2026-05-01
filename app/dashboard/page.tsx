"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface NurseSession {
  name: string;
  agency: string;
  agencyCode: string;
  code: string;
  loginTime: string;
}

interface Visit {
  id: string;
  patientName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  scheduledTime: string;
  status: "pending" | "en-route" | "arrived" | "completed" | "skipped";
  safetyScore?: number;
  crimeCount?: number;
  hasWarrant?: boolean;
  sexOffender?: boolean;
  notes?: string;
}

// ─── Mock visits for demo ─────────────────────────────────────────────────────
const DEMO_VISITS: Visit[] = [
  {
    id: "v1",
    patientName: "Robert Tatum",
    address: "4128 Weymouth Cove",
    city: "Memphis",
    state: "TN",
    zip: "38125",
    scheduledTime: "09:00",
    status: "pending",
  },
  {
    id: "v2",
    patientName: "Gloria Simmons",
    address: "2847 Lamar Ave",
    city: "Memphis",
    state: "TN",
    zip: "38114",
    scheduledTime: "11:30",
    status: "pending",
  },
  {
    id: "v3",
    patientName: "Earl Washington",
    address: "1190 Mississippi Blvd",
    city: "Memphis",
    state: "TN",
    zip: "38106",
    scheduledTime: "14:00",
    status: "pending",
  },
];

// ─── Safety color helper ──────────────────────────────────────────────────────
function safetyColor(score?: number) {
  if (score === undefined) return "text-slate-400";
  if (score >= 70) return "text-red-400";
  if (score >= 40) return "text-yellow-400";
  return "text-green-400";
}

function safetyLabel(score?: number) {
  if (score === undefined) return "Not checked";
  if (score >= 70) return "HIGH RISK";
  if (score >= 40) return "MODERATE";
  return "LOW RISK";
}

// ─── ArcGIS crime fetch ───────────────────────────────────────────────────────
// FIXED: was using incident_date (wrong field) and ISO date string (wrong format)
// Correct field is Offense_Datetime — epoch milliseconds comparison
async function fetchCrimeCount(lat: number, lng: number): Promise<number> {
  const radius = 804; // 0.5 miles in meters
  const cutoffMs = Date.now() - 14 * 24 * 60 * 60 * 1000;

  // FIXED: use Offense_Datetime with epoch ms — this is the confirmed working field
  const where = `Offense_Datetime >= ${cutoffMs}`;

  const url =
    `https://services2.arcgis.com/saWmpKJIUAjyyNVc/arcgis/rest/services/` +
    `MPD_Public_Safety_Incidents/FeatureServer/0/query` +
    `?where=${encodeURIComponent(where)}` +
    `&geometry=${lng},${lat}` +
    `&geometryType=esriGeometryPoint` +
    `&spatialRel=esriSpatialRelWithin` +
    `&distance=${radius}` +
    `&units=esriSRUnit_Meter` +
    `&returnCountOnly=true` +
    `&f=json`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

// ─── Geocode address via ESRI World GeocodeServer ─────────────────────────────
async function geocode(
  address: string,
  city: string,
  state: string
): Promise<{ lat: number; lng: number } | null> {
  const full = `${address}, ${city}, ${state}`;
  const url =
    `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/` +
    `findAddressCandidates?SingleLine=${encodeURIComponent(full)}&f=json&outFields=location`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const loc = data.candidates?.[0]?.location;
    if (!loc) return null;
    return { lat: loc.y, lng: loc.x };
  } catch {
    return null;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [nurse, setNurse] = useState<NurseSession | null>(null);
  const [visits, setVisits] = useState<Visit[]>(DEMO_VISITS);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [tab, setTab] = useState<"visits" | "map" | "settings">("visits");

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = sessionStorage.getItem("hh_nurse");
    if (!raw) { router.replace("/login"); return; }
    setNurse(JSON.parse(raw));
  }, [router]);

  // ── Run safety check on a visit ────────────────────────────────────────────
  const runSafetyCheck = async (visit: Visit) => {
    setChecking(visit.id);
    const coords = await geocode(visit.address, visit.city, visit.state);
    let crimeCount = 0;
    if (coords) {
      crimeCount = await fetchCrimeCount(coords.lat, coords.lng);
    }
    const score = Math.min(100, crimeCount * 4);
    setVisits((prev) =>
      prev.map((v) =>
        v.id === visit.id
          ? { ...v, crimeCount, safetyScore: score }
          : v
      )
    );
    setChecking(null);
  };

  // ── Update visit status ─────────────────────────────────────────────────────
  const setStatus = (id: string, status: Visit["status"]) => {
    setVisits((prev) => prev.map((v) => v.id === id ? { ...v, status } : v));
  };

  if (!nurse) return null;

  const pending = visits.filter((v) => v.status === "pending");
  const active  = visits.filter((v) => v.status === "en-route" || v.status === "arrived");
  const done    = visits.filter((v) => v.status === "completed" || v.status === "skipped");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* ── Header ── */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏥</span>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">Bloodhound</div>
            <div className="text-xs text-slate-400 leading-tight">{nurse.agency}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-300 font-medium">{nurse.name}</div>
            <div className="text-xs text-slate-500">{new Date().toLocaleDateString()}</div>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem("hh_nurse"); router.replace("/login"); }}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Tab bar ── */}
      <nav className="bg-slate-900 border-b border-slate-800 flex">
        {(["visits", "map", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              tab === t
                ? "text-blue-400 border-b-2 border-blue-500"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t === "visits" ? "My Visits" : t === "map" ? "Map" : "Settings"}
          </button>
        ))}
      </nav>

      {/* ── VISITS TAB ── */}
      {tab === "visits" && (
        <main className="px-4 py-4 max-w-2xl mx-auto">

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Pending", count: pending.length, color: "text-yellow-400" },
              { label: "Active",  count: active.length,  color: "text-blue-400"   },
              { label: "Done",    count: done.length,    color: "text-green-400"  },
            ].map((s) => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Visit cards */}
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-3 cursor-pointer hover:border-slate-600 transition-all"
              onClick={() => setSelectedVisit(visit === selectedVisit ? null : visit)}
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm truncate">{visit.patientName}</div>
                  <div className="text-slate-400 text-xs mt-0.5 truncate">{visit.address}</div>
                  <div className="text-slate-500 text-xs">{visit.city}, {visit.state} {visit.zip}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-slate-400">{visit.scheduledTime}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    visit.status === "completed" ? "bg-green-900 text-green-300" :
                    visit.status === "en-route"  ? "bg-blue-900 text-blue-300" :
                    visit.status === "arrived"   ? "bg-purple-900 text-purple-300" :
                    visit.status === "skipped"   ? "bg-slate-800 text-slate-500" :
                    "bg-yellow-900/50 text-yellow-300"
                  }`}>
                    {visit.status.replace("-", " ").toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Safety score row */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Safety:</span>
                  <span className={`text-xs font-bold ${safetyColor(visit.safetyScore)}`}>
                    {safetyLabel(visit.safetyScore)}
                  </span>
                  {visit.crimeCount !== undefined && (
                    <span className="text-xs text-slate-600">({visit.crimeCount} incidents nearby)</span>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); runSafetyCheck(visit); }}
                  disabled={checking === visit.id}
                  className="text-xs bg-blue-900/50 hover:bg-blue-800 text-blue-300 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                >
                  {checking === visit.id ? "Checking…" : "Check Safety"}
                </button>
              </div>

              {/* Expanded actions */}
              {selectedVisit?.id === visit.id && (
                <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap gap-2">
                  {visit.status === "pending" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setStatus(visit.id, "en-route"); }}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg"
                    >
                      En Route
                    </button>
                  )}
                  {visit.status === "en-route" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setStatus(visit.id, "arrived"); }}
                      className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg"
                    >
                      Arrived
                    </button>
                  )}
                  {(visit.status === "arrived" || visit.status === "en-route") && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setStatus(visit.id, "completed"); }}
                      className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-lg"
                    >
                      Complete
                    </button>
                  )}
                  {visit.status !== "completed" && visit.status !== "skipped" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setStatus(visit.id, "skipped"); }}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg"
                    >
                      Skip
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://maps.google.com/?q=${encodeURIComponent(
                        `${visit.address} ${visit.city} ${visit.state}`
                      )}`);
                    }}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg"
                  >
                    Google Maps
                  </button>
                </div>
              )}
            </div>
          ))}
        </main>
      )}

      {/* ── MAP TAB ── */}
      {tab === "map" && (
        <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
          Map view coming soon
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === "settings" && (
        <div className="px-4 py-6 max-w-2xl mx-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="text-sm font-semibold text-white mb-3">Session Info</div>
            <div className="space-y-2 text-xs text-slate-400">
              <div><span className="text-slate-500">Nurse:</span> {nurse.name}</div>
              <div><span className="text-slate-500">Agency:</span> {nurse.agency}</div>
              <div><span className="text-slate-500">Code:</span> {nurse.agencyCode}</div>
              <div><span className="text-slate-500">Login:</span> {new Date(nurse.loginTime).toLocaleString()}</div>
            </div>
            <button
              onClick={() => { sessionStorage.removeItem("hh_nurse"); router.replace("/login"); }}
              className="mt-4 text-xs bg-red-900/50 hover:bg-red-800 text-red-300 px-4 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
