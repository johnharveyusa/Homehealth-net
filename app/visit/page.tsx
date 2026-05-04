"use client";

import { useEffect, useRef, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface Nurse { name: string; role: string; territory: string; }
interface GpsCoords { lat: number; lng: number; accuracy: number; }
interface ServiceResult {
  name: string; address: string; phone: string | null;
  lat: number; lng: number; distanceMi: number;
}
interface Services { police: ServiceResult | null; fire: ServiceResult | null; hospital: ServiceResult | null; }
type VisitPhase = "pre" | "active" | "sos" | "done";

const FALLBACK: Services = {
  police:   { name: "MPD Tillman Station",   address: "1725 N Tillman St, Memphis", phone: "(901) 636-3000", lat: 35.1327, lng: -90.0234, distanceMi: 0 },
  fire:     { name: "MFD Station 4",         address: "2765 Lamar Ave, Memphis",    phone: null,            lat: 35.1501, lng: -90.0453, distanceMi: 0 },
  hospital: { name: "Regional One Health",   address: "877 Jefferson Ave, Memphis", phone: "(901) 545-7100", lat: 35.1396, lng: -90.0299, distanceMi: 0 },
};

function fmt(secs: number) {
  return `${Math.floor(secs/60).toString().padStart(2,"0")}:${(secs%60).toString().padStart(2,"0")}`;
}
function nowTime() {
  return new Date().toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
}
function gMapsDir(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
function gMapsPos(lat: number, lng: number) {
  return `https://maps.google.com/?q=${lat},${lng}`;
}

const SVC = {
  police:   { icon:"🚔", label:"Police",   border:"border-blue-700/60",    bg:"bg-blue-950/20",    text:"text-blue-300"    },
  fire:     { icon:"🚒", label:"Fire",     border:"border-red-700/60",     bg:"bg-red-950/20",     text:"text-red-300"     },
  hospital: { icon:"🏥", label:"Hospital", border:"border-emerald-700/60", bg:"bg-emerald-950/20", text:"text-emerald-300" },
} as const;

function VisitInner() {
  const router     = useRouter();
  const params     = useSearchParams();
  const clientName = params.get("name") ?? "Client";
  const clientAddr = params.get("addr") ?? "";

  const [nurse, setNurse]               = useState<Nurse | null>(null);
  const [phase, setPhase]               = useState<VisitPhase>("pre");
  const [gps, setGps]                   = useState<GpsCoords | null>(null);
  const [gpsError, setGpsError]         = useState<string | null>(null);
  const [services, setServices]         = useState<Services>(FALLBACK);
  const [svcLoading, setSvcLoading]     = useState(false);
  const [timerMins, setTimerMins]       = useState(30);
  const [remaining, setRemaining]       = useState(30 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [arrivalTime, setArrivalTime]   = useState<string | null>(null);
  const [departureTime, setDepartureTime] = useState<string | null>(null);
  const [notes, setNotes]               = useState("");
  const [sosTime, setSosTime]           = useState<string | null>(null);
  const watchIdRef    = useRef<number | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const svcFetchedRef = useRef(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("nurse");
    if (!stored) { router.push("/login"); return; }
    setNurse(JSON.parse(stored));
  }, [router]);

  const fetchServices = useCallback(async (lat: number, lng: number) => {
    if (svcFetchedRef.current) return;
    svcFetchedRef.current = true;
    setSvcLoading(true);
    try {
      const res = await fetch(`/api/services?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data: Services = await res.json();
        setServices({
          police:   data.police   ?? FALLBACK.police,
          fire:     data.fire     ?? FALLBACK.fire,
          hospital: data.hospital ?? FALLBACK.hospital,
        });
      }
    } catch { /* keep fallback */ }
    finally { setSvcLoading(false); }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setGpsError("GPS not available"); return; }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c: GpsCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setGps(c);
        setGpsError(null);
        fetchServices(c.lat, c.lng);
      },
      (err) => { setGpsError(err.message); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [fetchServices]);

  useEffect(() => {
    if (!timerRunning) return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setTimerRunning(false);
          setSosTime(nowTime());
          setPhase("sos");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [timerRunning]);

  function handleArrive() { setArrivalTime(nowTime()); setRemaining(timerMins*60); setTimerRunning(true); setPhase("active"); }
  function handleAddTime(m: number) { setRemaining(p => p + m*60); }
  function handleSOS() { clearInterval(intervalRef.current!); setTimerRunning(false); setSosTime(nowTime()); setPhase("sos"); }
  function handleCheckOut() { clearInterval(intervalRef.current!); setTimerRunning(false); setDepartureTime(nowTime()); setPhase("done"); }
  function handleCancelSOS() { setPhase("active"); setSosTime(null); setTimerRunning(true); }

  const pct = remaining / (timerMins * 60);
  const timerColor = phase==="sos"?"text-red-400":pct>0.5?"text-emerald-400":pct>0.2?"text-amber-400":"text-red-400";
  const timerRing  = phase==="sos"?"border-red-500":pct>0.5?"border-emerald-500":pct>0.2?"border-amber-500":"border-red-500";
  const sosMapLink = gps ? gMapsPos(gps.lat, gps.lng)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientAddr)}`;

  if (!nurse) return null;

  function SvcCard({ type, big = false }: { type: keyof Services; big?: boolean }) {
    const svc = services[type];
    const cfg = SVC[type];
    if (!svc) return null;
    return (
      <div className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} px-4 py-3`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={big ? "text-2xl" : "text-xl"}>{cfg.icon}</span>
          <div>
            <div className={`${big?"text-sm":"text-xs"} font-bold ${cfg.text}`}>
              {cfg.label}
              {svc.distanceMi > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">{svc.distanceMi.toFixed(1)} mi</span>
              )}
            </div>
            <div className="text-xs text-slate-300">{svc.name}</div>
            <div className="text-xs text-slate-500">{svc.address}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={gMapsDir(svc.lat, svc.lng)} target="_blank" rel="noreferrer"
            className={`flex-1 text-center rounded-xl border ${cfg.border} ${cfg.text} 
                        py-2 ${big?"text-sm":"text-xs"} font-semibold hover:opacity-80 transition-opacity`}>
            🗺 Directions
          </a>
          {svc.phone && (
            <a href={`tel:${svc.phone.replace(/\D/g,"")}`}
              className={`flex-1 text-center rounded-xl border ${cfg.border} ${cfg.text}
                          py-2 ${big?"text-sm":"text-xs"} font-semibold hover:opacity-80 transition-opacity`}>
              📞 {svc.phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button onClick={() => router.push("/dashboard")}
            className="rounded-xl border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-900">
            ← Back
          </button>
          <div className="text-sm font-semibold">Visit Check-In</div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${gps?"bg-emerald-400 animate-pulse":"bg-slate-600"}`} />
            <span className={gps?"text-emerald-400":"text-slate-500"}>{gps?"GPS Live":"No GPS"}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">

        {/* Client card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4">
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Client</div>
          <div className="text-xl font-semibold">{clientName}</div>
          <div className="text-sm text-slate-400 mt-0.5">{clientAddr}</div>
          {gps && (
            <div className="mt-1.5 text-xs text-slate-500">
              📍 {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
              <span className={`ml-1 font-mono ${gps.accuracy<50?"text-emerald-500":"text-amber-500"}`}>
                ±{Math.round(gps.accuracy)}m
              </span>
            </div>
          )}
          {gpsError && <div className="mt-1.5 text-xs text-amber-500">⚠ {gpsError} — address fallback active</div>}
          {(arrivalTime || departureTime) && (
            <div className="mt-2 flex gap-4 text-xs text-slate-400">
              {arrivalTime && <span>🕐 Arrived: <span className="text-slate-200 font-mono">{arrivalTime}</span></span>}
              {departureTime && <span>🚪 Departed: <span className="text-slate-200 font-mono">{departureTime}</span></span>}
            </div>
          )}
        </div>

        {/* Emergency Services — always visible */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-slate-500 uppercase tracking-wider">Nearest Emergency Services</div>
            <div className="text-xs">
              {svcLoading
                ? <span className="text-slate-500 animate-pulse">Locating via GPS…</span>
                : gps
                  ? <span className="text-emerald-500">✓ GPS-ranked</span>
                  : <span className="text-slate-600">Address fallback</span>}
            </div>
          </div>
          <div className="space-y-2">
            <SvcCard type="police" />
            <SvcCard type="fire" />
            <SvcCard type="hospital" />
          </div>
        </div>

        {/* PRE */}
        {phase === "pre" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Expected Visit Duration</div>
              <div className="flex gap-2 flex-wrap">
                {[15,30,45,60,90].map(m => (
                  <button key={m} onClick={() => setTimerMins(m)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold border transition-all ${
                      timerMins===m ? "bg-blue-600 border-blue-500 text-white" : "border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}>{m} min</button>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Timer auto-triggers SOS at 00:00 if you don&apos;t check out first.
              </div>
            </div>
            <button onClick={handleArrive}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95
                         transition-all py-5 text-lg font-bold shadow-lg shadow-blue-900/40">
              ▶ I Have Arrived — Start Timer
            </button>
          </div>
        )}

        {/* ACTIVE */}
        {phase === "active" && (
          <div className="space-y-4">
            <div className={`rounded-2xl border-2 ${timerRing} bg-slate-900/50 px-5 py-6 text-center`}>
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Time Remaining</div>
              <div className={`text-6xl font-mono font-bold tabular-nums ${timerColor}`}>{fmt(remaining)}</div>
              <div className="text-xs text-slate-500 mt-2">Auto-SOS fires at 00:00</div>
              <div className="flex justify-center gap-2 mt-4">
                {[10,15,30].map(m => (
                  <button key={m} onClick={() => handleAddTime(m)}
                    className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs hover:bg-slate-800">
                    +{m} min
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Visit Notes</div>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                placeholder="Clinical observations, patient condition, follow-up needed…"
                className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600
                           border border-slate-700 rounded-xl px-3 py-2 resize-none
                           focus:outline-none focus:border-blue-600" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleCheckOut}
                className="rounded-2xl border border-emerald-700 text-emerald-300 py-4
                           text-sm font-semibold hover:bg-emerald-900/20 active:scale-95 transition-all">
                ✓ Check Out
              </button>
              <button onClick={handleSOS}
                className="rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 transition-all
                           py-4 text-sm font-bold text-white shadow-lg shadow-red-900/40">
                🚨 I Need Help
              </button>
            </div>
          </div>
        )}

        {/* SOS */}
        {phase === "sos" && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-red-500 bg-red-950/30 px-5 py-6 text-center animate-pulse">
              <div className="text-5xl mb-3">🚨</div>
              <div className="text-2xl font-bold text-red-300">SOS ACTIVATED</div>
              {sosTime && <div className="text-sm text-red-400 mt-1">Triggered at {sosTime}</div>}
            </div>
            <div className="rounded-2xl border border-red-800/50 bg-slate-900/50 px-5 py-4">
              <div className="text-xs text-red-400 uppercase tracking-wider font-semibold mb-2">Your Location</div>
              <div className="text-sm font-semibold">{clientName}</div>
              <div className="text-sm text-slate-400">{clientAddr}</div>
              {gps && (
                <div className="text-xs text-emerald-400 font-mono mt-1">
                  GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                  <span className="text-slate-500 ml-1">±{Math.round(gps.accuracy)}m</span>
                </div>
              )}
              <a href={sosMapLink} target="_blank" rel="noreferrer"
                className="mt-3 inline-block rounded-xl border border-slate-700 px-3 py-2 text-xs hover:bg-slate-800">
                📍 Open My Location in Maps
              </a>
            </div>
            <a href="tel:911"
              className="flex items-center justify-center gap-2 w-full rounded-2xl bg-red-700
                         hover:bg-red-600 active:scale-95 transition-all py-5 text-xl font-bold text-white
                         shadow-lg shadow-red-900/50">
              📞 Call 911
            </a>
            <div className="space-y-2">
              <SvcCard type="police" big />
              <SvcCard type="fire"   big />
              <SvcCard type="hospital" big />
            </div>
            <a href="tel:+19015551234"
              className="flex items-center justify-center gap-2 w-full rounded-2xl border
                         border-amber-700 text-amber-200 py-3 text-sm font-semibold hover:bg-amber-900/20">
              📞 Call Supervisor
            </a>
            <button onClick={handleCancelSOS}
              className="w-full rounded-2xl border border-slate-700 text-slate-300 py-3
                         text-sm hover:bg-slate-900 active:scale-95 transition-all">
              ✓ I&apos;m Safe — Cancel SOS
            </button>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/20 px-5 py-8 text-center">
              <div className="text-5xl mb-3">✅</div>
              <div className="text-xl font-bold text-emerald-300">Visit Complete</div>
              <div className="text-sm text-slate-400 mt-2">
                {arrivalTime && `Arrived ${arrivalTime}`}{departureTime && ` · Departed ${departureTime}`}
              </div>
            </div>
            {notes.trim() && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-4">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Notes Logged</div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{notes}</p>
              </div>
            )}
            <button onClick={() => router.push("/dashboard")}
              className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all py-4 text-sm font-bold">
              ← Return to My Clients
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function VisitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <VisitInner />
    </Suspense>
  );
}
