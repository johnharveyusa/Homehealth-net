"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────────────────
interface Nurse {
  name: string;
  agency: string;
  agencyCode: string;
  code: string;
  loginTime: string;
}

type VisitStatus = "scheduled" | "active" | "done";

interface Client {
  id: string;
  name: string;
  lastName: string;
  firstName: string;
  addr: string;
  time: string;
  careTypes: string[];
  gate: string;
  parking: string;
  hazards: string;
  dob: string;
  status: VisitStatus;
  flagRisk?: boolean;
}

// ── Demo client roster ─────────────────────────────────────────────────────
const CLIENTS: Client[] = [
  { id:"1",  name:"Mary Johnson",    lastName:"Johnson",  firstName:"Mary",     addr:"1234 Poplar Ave, Memphis, TN",          time:"09:30", careTypes:["Skilled Nursing","Wound Care"],  gate:"#4412", parking:"Rear lot",  hazards:"Dog in yard",   dob:"1948-05-11", status:"done"      },
  { id:"2",  name:"Luis Rivera",     lastName:"Rivera",   firstName:"Luis",     addr:"901 S Main St, Memphis, TN",            time:"11:15", careTypes:["Physical Therapy"],              gate:"—",     parking:"Street",    hazards:"Steep steps",   dob:"1962-01-02", status:"active"    },
  { id:"3",  name:"Sara Brown",      lastName:"Brown",    firstName:"Sara",     addr:"2016 Union Ave, Memphis, TN",           time:"14:00", careTypes:["OT"],                            gate:"—",     parking:"Driveway",  hazards:"Poor lighting", dob:"1956-10-19", status:"scheduled", flagRisk:true },
  { id:"4",  name:"Angela Walker",   lastName:"Walker",   firstName:"Angela",   addr:"3000 Barron Ave, Memphis, TN",          time:"15:30", careTypes:["Skilled Nursing"],               gate:"—",     parking:"Street",    hazards:"—",             dob:"1953-04-12", status:"scheduled" },
  { id:"5",  name:"Robert Hayes",    lastName:"Hayes",    firstName:"Robert",   addr:"2800 Spotswood Ave, Memphis, TN",       time:"—",     careTypes:["Skilled Nursing"],               gate:"—",     parking:"Driveway",  hazards:"—",             dob:"1949-09-03", status:"scheduled" },
  { id:"6",  name:"Mary Ellis",      lastName:"Ellis",    firstName:"Mary",     addr:"4646 Poplar Ave, Memphis, TN",          time:"—",     careTypes:["Skilled Nursing"],               gate:"—",     parking:"Street",    hazards:"—",             dob:"1960-11-27", status:"scheduled" },
  { id:"7",  name:"Kevin Simmons",   lastName:"Simmons",  firstName:"Kevin",    addr:"1500 Pendleton St, Memphis, TN",        time:"—",     careTypes:["Skilled Nursing"],               gate:"—",     parking:"Street",    hazards:"—",             dob:"1957-02-14", status:"scheduled" },
  { id:"8",  name:"Patricia Moore",  lastName:"Moore",    firstName:"Patricia", addr:"1100 Semmes Ave, Memphis, TN",          time:"—",     careTypes:["Skilled Nursing"],               gate:"—",     parking:"Street",    hazards:"—",             dob:"1965-07-08", status:"scheduled" },
  { id:"9",  name:"Derrick Johnson", lastName:"Johnson",  firstName:"Derrick",  addr:"3000 Park Ave, Memphis, TN",            time:"—",     careTypes:["Skilled Nursing"],               gate:"—",     parking:"Street",    hazards:"—",             dob:"1951-12-19", status:"scheduled" },
  { id:"10", name:"Sharon Price",    lastName:"Price",    firstName:"Sharon",   addr:"3100 Larkspur Ln, Memphis, TN",         time:"—",     careTypes:["Skilled Nursing"],               gate:"—",     parking:"Street",    hazards:"—",             dob:"1953-04-12", status:"scheduled" },
];

function mapsUrl(addr: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
}

function statusIcon(s: VisitStatus) {
  if (s === "done")      return "✅";
  if (s === "active")    return "🔵";
  return "⬜";
}

// ── Client accordion card ──────────────────────────────────────────────────
function ClientCard({
  client,
  isOpen,
  onToggle,
  onMarkDone,
  onStartVisit,
}: {
  client: Client;
  isOpen: boolean;
  onToggle: () => void;
  onMarkDone: () => void;
  onStartVisit: (client: Client) => void;
}) {
  const borderClass =
    client.status === "active"
      ? "border-blue-700/60 ring-1 ring-blue-700/40"
      : "border-slate-800";
  const opacity = client.status === "done" ? "opacity-60" : "";

  return (
    <div className={`rounded-2xl border bg-slate-900/40 shadow ${borderClass} ${opacity}`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg">{statusIcon(client.status)}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">
              {client.lastName}, {client.firstName}
              {client.flagRisk && (
                <span className="ml-2 text-xs rounded-full bg-amber-900/40 border border-amber-700/40 text-amber-200 px-2 py-0.5">
                  Fall Risk
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400">
              {client.time} · {client.careTypes[0]}
            </div>
          </div>
        </div>
        <span className={`text-slate-500 text-xs transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
          ▶
        </span>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="px-4 pb-4">
          <div className="text-xs text-slate-400 mb-3">{client.addr}</div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div><span className="text-slate-500">Gate:</span> <span className="text-slate-300 font-mono">{client.gate}</span></div>
            <div><span className="text-slate-500">Parking:</span> <span className="text-slate-300">{client.parking}</span></div>
            <div><span className="text-slate-500">Hazards:</span> <span className="text-slate-300">{client.hazards}</span></div>
            <div><span className="text-slate-500">DOB:</span> <span className="text-slate-300">{client.dob}</span></div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {client.careTypes.map(t => (
              <span key={t} className="rounded-full bg-slate-800 px-3 py-1 text-xs">{t}</span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={mapsUrl(client.addr)}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800"
            >
              🗺 Directions
            </a>
            <button
              onClick={() => onStartVisit(client)}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500"
            >
              ▶ Start Visit
            </button>
            {client.status !== "done" && (
              <button
                onClick={onMarkDone}
                className="rounded-xl border border-emerald-700 text-emerald-300 px-3 py-2 text-xs hover:bg-emerald-900/20"
              >
                ✓ Mark Done
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [nurse, setNurse]       = useState<Nurse | null>(null);
  const [clients, setClients]   = useState<Client[]>(CLIENTS);
  const [openId, setOpenId]     = useState<string | null>(null);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("hh_nurse");
    if (!stored) { router.push("/login"); return; }
    setNurse(JSON.parse(stored));
    // Auto-open active client
    const active = CLIENTS.find(c => c.status === "active");
    if (active) setOpenId(active.id);
  }, [router]);

  function toggle(id: string) {
    setOpenId(prev => prev === id ? null : id);
  }

  function markDone(id: string) {
    setClients(prev =>
      prev.map(c => c.id === id ? { ...c, status: "done" as VisitStatus } : c)
    );
    setOpenId(null);
  }

  function startVisit(client: Client) {
    const p = new URLSearchParams({
      id:   client.id,
      name: client.name,
      addr: client.addr,
    });
    router.push(`/visit?${p.toString()}`);
  }

  function signOut() {
    sessionStorage.removeItem("hh_nurse");
    router.push("/login");
  }

  const filtered = clients.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.addr.toLowerCase().includes(q);
  });

  const doneCount = clients.filter(c => c.status === "done").length;

  if (!nurse) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-800 grid place-items-center font-bold text-sm">HH</div>
            <div>
              <div className="text-sm font-semibold leading-4">Bloodhound Home Health</div>
              <div className="text-xs text-slate-400">{nurse.agency}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm font-semibold">{nurse.name}</span>
            <button
              onClick={signOut}
              className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">

        {/* Nurse banner */}
        <div className="mb-5 rounded-2xl border border-blue-800/40 bg-blue-950/20 px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Logged in as</div>
            <div className="text-xl font-semibold mt-0.5">{nurse.name}</div>
            <div className="text-xs text-slate-400 mt-1">
              {nurse.agency} · {doneCount} of {clients.length} visits complete today
            </div>
          </div>
        </div>

        {/* Desktop: 2-col | Mobile: 1-col */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6">

          {/* LEFT — Accordion list */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">My Clients</h2>
              <span className="text-xs text-slate-400">{doneCount} of {clients.length} complete</span>
            </div>

            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm"
              placeholder="Search clients…"
            />

            <div className="space-y-2">
              {filtered.map(client => (
                <ClientCard
                  key={client.id}
                  client={client}
                  isOpen={openId === client.id}
                  onToggle={() => toggle(client.id)}
                  onMarkDone={() => markDone(client.id)}
                  onStartVisit={startVisit}                />
              ))}
            </div>
          </div>

          {/* RIGHT — Desktop detail panel */}
          <div className="hidden lg:block lg:col-span-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow sticky top-20">
              {!openId ? (
                <div className="text-center py-20 text-slate-500">
                  <div className="text-5xl mb-4">👈</div>
                  <div className="text-sm">Select a client to see full detail</div>
                </div>
              ) : (() => {
                const c = clients.find(x => x.id === openId);
                if (!c) return null;
                return (
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div>
                        <h3 className="text-2xl font-semibold">{c.name}</h3>
                        <div className="text-sm text-slate-400 mt-1">{c.addr}</div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <a
                          href={mapsUrl(c.addr)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
                        >
                          🗺 Directions
                        </a>
                        <button
                          onClick={() => startVisit(c)}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
                        >
                          ▶ Start Visit
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-5">
                      {[
                        ["Gate / Entry", c.gate],
                        ["Parking",      c.parking],
                        ["Hazards",      c.hazards],
                        ["Appointment",  c.time],
                        ["DOB",          c.dob],
                        ["Status",       c.status.charAt(0).toUpperCase() + c.status.slice(1)],
                      ].map(([label, val]) => (
                        <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                          <div className="text-xs text-slate-500 mb-1">{label}</div>
                          <div className="font-mono text-slate-200">{val}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-5">
                      {c.careTypes.map(t => (
                        <span key={t} className="rounded-full bg-slate-800 px-3 py-1 text-xs">{t}</span>
                      ))}
                      {c.flagRisk && (
                        <span className="rounded-full bg-amber-900/40 border border-amber-700/40 text-amber-200 px-3 py-1 text-xs">
                          ⚠ Fall Risk
                        </span>
                      )}
                    </div>

                    <button className="w-full rounded-xl border border-amber-700 text-amber-200 px-4 py-2 text-sm hover:bg-amber-900/20">
                      🛡 Check Public Safety Events
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
