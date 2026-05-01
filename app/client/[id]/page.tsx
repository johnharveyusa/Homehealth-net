"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrimeFeature {
  attributes: { offense_type?: string; offense_description?: string; offense_date?: string; address?: string; };
}

interface ClientRecord {
  id: string; name: string; address: string; city: string;
  state: string; zip: string; phone: string;
  agency: string; lat?: number; lng?: number;
}

type RiskLevel = "green" | "yellow" | "red" | "unknown" | "loading";

interface CrimeData {
  source: "arcgis" | "spotcrime";
  count: number; features: CrimeFeature[];
  hasViolent: boolean; loaded: boolean; error: boolean;
}

// ─── Mock clients ─────────────────────────────────────────────────────────────

const MOCK_CLIENTS: Record<string, ClientRecord> = {
  "1": { id:"1", name:"Dorothy Langston",  address:"4128 Weymouth Cove", city:"Memphis", state:"TN", zip:"38116", phone:"(901) 555-0142", agency:"Compassion Home Health", lat:35.0234, lng:-90.0853 },
  "2": { id:"2", name:"Robert Tillman",    address:"2800 Spotswood Ave", city:"Memphis", state:"TN", zip:"38111", phone:"(901) 555-0198", agency:"Compassion Home Health", lat:35.1234, lng:-89.9853 },
  "3": { id:"3", name:"Evelyn Marsh",      address:"1645 Airways Blvd",  city:"Memphis", state:"TN", zip:"38114", phone:"(901) 555-0277", agency:"Compassion Home Health", lat:35.1050, lng:-90.0120 },
};

// ─── Violent keywords ─────────────────────────────────────────────────────────

const VIOLENT = ["aggravated assault","assault","robbery","homicide","murder","rape","sexual assault","shooting","stabbing","carjacking","kidnapping","domestic","battery","weapon","gun","knife"];
const isViolent = (s: string) => VIOLENT.some((k) => s.toLowerCase().includes(k));

// ─── Risk ─────────────────────────────────────────────────────────────────────

function calcRisk(a: CrimeData, s: CrimeData): RiskLevel {
  const p = (a.loaded && !a.error && a.count > 0) ? a : (s.loaded && !s.error ? s : null);
  if (!p) return "unknown";
  if (p.hasViolent || p.count >= 7) return "red";
  if (p.count >= 3) return "yellow";
  return "green";
}

// ─── Geocode ──────────────────────────────────────────────────────────────────

async function geocodeAddress(address: string, city: string, state: string) {
  try {
    const q = encodeURIComponent(`${address}, ${city}, ${state}`);
    const r = await fetch(`https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?SingleLine=${q}&f=json&maxLocations=1&outFields=`, { signal: AbortSignal.timeout(6000) });
    const d = await r.json();
    if (d.candidates?.length > 0) return { lat: d.candidates[0].location.y, lng: d.candidates[0].location.x };
  } catch {}
  return null;
}

// ─── ArcGIS MPD query ─────────────────────────────────────────────────────────

async function queryArcGIS(lat: number, lng: number): Promise<CrimeData> {
  const base = "https://services2.arcgis.com/saWmpKJIUAjyyNVc/arcgis/rest/services/MPD_Public_Safety_Incidents/FeatureServer/0/query";
  const d = 0.0072;
  const fourteenDaysAgo = new Date(Date.now() - 14 * 864e5).toISOString().replace("T"," ").split(".")[0];
  const params = new URLSearchParams({
    where: `offense_date >= timestamp '${fourteenDaysAgo}'`,
    geometry: `${lng-d},${lat-d},${lng+d},${lat+d}`,
    geometryType: "esriGeometryEnvelope", inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "offense_type,offense_description,offense_date,address",
    returnGeometry: "false", resultRecordCount: "200", f: "json",
  });
  try {
    const r = await fetch(`${base}?${params}`, { signal: AbortSignal.timeout(8000) });
    const d2 = await r.json();
    if (d2.error || !d2.features) return { source:"arcgis", count:0, features:[], hasViolent:false, loaded:true, error:true };
    const features: CrimeFeature[] = d2.features;
    const hasViolent = features.some((f) => isViolent(String(f.attributes.offense_type || f.attributes.offense_description || "")));
    return { source:"arcgis", count:features.length, features, hasViolent, loaded:true, error:false };
  } catch {
    return { source:"arcgis", count:0, features:[], hasViolent:false, loaded:true, error:true };
  }
}

// ─── SpotCrime query ──────────────────────────────────────────────────────────

async function querySpotCrime(lat: number, lng: number): Promise<CrimeData> {
  try {
    const r = await fetch(`https://api.spotcrime.com/crimes.json?lat=${lat}&lon=${lng}&radius=0.5&key=spotcrime_public&days=14`, { signal: AbortSignal.timeout(8000) });
    const d = await r.json();
    if (!d || !Array.isArray(d)) return { source:"spotcrime", count:0, features:[], hasViolent:false, loaded:true, error:true };
    const features: CrimeFeature[] = d.map((c: { type?: string; date?: string; address?: string }) => ({
      attributes: { offense_type: c.type || "Unknown", offense_date: c.date || "", address: c.address || "" },
    }));
    const hasViolent = features.some((f) => isViolent(String(f.attributes.offense_type || "")));
    return { source:"spotcrime", count:features.length, features, hasViolent, loaded:true, error:false };
  } catch {
    return { source:"spotcrime", count:0, features:[], hasViolent:false, loaded:true, error:true };
  }
}

// ─── Risk config ──────────────────────────────────────────────────────────────

const RISK_CONFIG = {
  green:   { bg:"bg-emerald-900", border:"border-emerald-400", text:"text-emerald-300", badge:"bg-emerald-500",  label:"LOW RISK",          icon:"✓", message:"Area appears calm. Fewer than 3 incidents in the past 14 days. Proceed normally." },
  yellow:  { bg:"bg-amber-900",   border:"border-amber-400",   text:"text-amber-300",   badge:"bg-amber-500",    label:"MODERATE RISK",     icon:"⚠", message:"Elevated activity nearby. Stay alert, note exits, and keep your phone accessible." },
  red:     { bg:"bg-red-950",     border:"border-red-500",     text:"text-red-300",     badge:"bg-red-600",      label:"HIGH RISK",         icon:"!", message:"Significant criminal activity or violent offenses nearby. Contact your supervisor before entering." },
  unknown: { bg:"bg-slate-800",   border:"border-slate-500",   text:"text-slate-300",   badge:"bg-slate-500",    label:"DATA UNAVAILABLE",  icon:"?", message:"Could not retrieve crime data for this address. Use your best judgment." },
  loading: { bg:"bg-slate-800",   border:"border-slate-600",   text:"text-slate-400",   badge:"bg-slate-600",    label:"CHECKING AREA...", icon:"…", message:"Scanning crime data before you arrive. Please wait." },
};

// ─── Crime table sub-component ────────────────────────────────────────────────

function CrimeTable({ data }: { data: CrimeData }) {
  if (!data.features.length) return null;
  return (
    <div className="rounded-xl overflow-hidden border border-slate-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-900 text-slate-400 text-xs uppercase tracking-wider">
            <th className="text-left px-3 py-2">Type</th>
            <th className="text-left px-3 py-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {data.features.slice(0, 40).map((f, i) => {
            const type = String(f.attributes.offense_type || f.attributes.offense_description || "Unknown");
            const date = f.attributes.offense_date ? new Date(f.attributes.offense_date).toLocaleDateString() : "—";
            const violent = isViolent(type);
            return (
              <tr key={i} className={`border-t border-slate-800 ${violent ? "bg-red-950/40" : i % 2 === 0 ? "bg-slate-950" : "bg-slate-900/50"}`}>
                <td className="px-3 py-2 text-slate-200">
                  {violent && <span className="text-red-400 mr-1">⚡</span>}
                  {type}
                </td>
                <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">{date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ClientArrivalPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = String(params.id);

  const [client,         setClient]         = useState<ClientRecord|null>(null);
  const [coords,         setCoords]         = useState<{lat:number;lng:number}|null>(null);
  const [arcgis,         setArcgis]         = useState<CrimeData>({ source:"arcgis",    count:0, features:[], hasViolent:false, loaded:false, error:false });
  const [spotcrime,      setSpotcrime]      = useState<CrimeData>({ source:"spotcrime", count:0, features:[], hasViolent:false, loaded:false, error:false });
  const [activeTab,      setActiveTab]      = useState<"arcgis"|"spotcrime">("arcgis");
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [risk,           setRisk]           = useState<RiskLevel>("loading");

  useEffect(() => {
    const c = MOCK_CLIENTS[clientId];
    if (c) setClient(c);
  }, [clientId]);

  const fireCrimeQueries = useCallback(async (lat: number, lng: number) => {
    setRisk("loading");
    setAlertDismissed(false);

    // Fire BOTH simultaneously — don't wait for one before starting the other
    const [ag, sc] = await Promise.all([queryArcGIS(lat, lng), querySpotCrime(lat, lng)]);

    setArcgis(ag);
    setSpotcrime(sc);

    // Default to whichever tab has data; prefer ArcGIS
    if (ag.loaded && !ag.error && ag.count > 0) setActiveTab("arcgis");
    else if (sc.loaded && !sc.error && sc.count > 0) setActiveTab("spotcrime");

    setRisk(calcRisk(ag, sc));
  }, []);

  useEffect(() => {
    if (!client) return;
    const run = async () => {
      if (client.lat && client.lng) {
        setCoords({ lat: client.lat, lng: client.lng });
        await fireCrimeQueries(client.lat, client.lng);
      } else {
        const geo = await geocodeAddress(client.address, client.city, client.state);
        if (geo) { setCoords(geo); await fireCrimeQueries(geo.lat, geo.lng); }
        else setRisk("unknown");
      }
    };
    run();
  }, [client, fireCrimeQueries]);

  const showArcgis   = arcgis.loaded   && !arcgis.error   && arcgis.count > 0;
  const showSpotcrime = spotcrime.loaded && !spotcrime.error && spotcrime.count > 0;
  const showBothTabs  = showArcgis && showSpotcrime;
  const riskConfig    = RISK_CONFIG[risk];

  if (!client) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <p className="text-slate-400">Client not found.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white text-lg transition-colors" aria-label="Back">←</button>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Visit</p>
          <h1 className="text-base font-semibold text-white truncate">{client.name}</h1>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-500">{client.agency}</p>
          <p className="text-xs text-slate-400">{client.city}, {client.state}</p>
        </div>
      </header>

      {/* Arrival Alert Banner */}
      {!alertDismissed && (
        <div className={`${riskConfig.bg} border-b-2 ${riskConfig.border} px-4 py-4`}>
          <div className="max-w-lg mx-auto flex items-start gap-3">
            <div className={`${riskConfig.badge} text-white font-black text-xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
              {riskConfig.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-xs font-bold tracking-widest uppercase ${riskConfig.text}`}>{riskConfig.label}</span>
                {risk !== "loading" && (
                  <button onClick={() => setAlertDismissed(true)} className="text-slate-500 hover:text-slate-300 text-xs transition-colors flex-shrink-0">Dismiss</button>
                )}
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{riskConfig.message}</p>
              {risk !== "loading" && risk !== "unknown" && (
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                  {showArcgis    && <span>MPD: <strong className="text-white">{arcgis.count}</strong> incidents</span>}
                  {showSpotcrime && <span>SpotCrime: <strong className="text-white">{spotcrime.count}</strong> incidents</span>}
                  {(arcgis.hasViolent || spotcrime.hasViolent) && <span className="text-red-400 font-semibold">⚡ Violent offenses reported</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Info */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="max-w-lg mx-auto bg-slate-900 rounded-xl p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-slate-400 text-xs mb-1">Address</p>
            <p className="text-white font-medium">{client.address}</p>
            <p className="text-slate-400 text-sm">{client.city}, {client.state} {client.zip}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-slate-400 text-xs mb-1">Phone</p>
            <a href={`tel:${client.phone}`} className="text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors">{client.phone}</a>
          </div>
        </div>
      </div>

      {/* Crime Data */}
      <div className="px-4 py-4">
        <div className="max-w-lg mx-auto">

          {/* Loading */}
          {risk === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Scanning crime data for this address…</p>
              <p className="text-slate-600 text-xs">Checking MPD and SpotCrime simultaneously</p>
            </div>
          )}

          {/* No data */}
          {risk !== "loading" && !showArcgis && !showSpotcrime && (
            <div className="text-center py-10">
              <p className="text-slate-500 text-sm">No crime data found within 0.5 miles in the past 14 days.</p>
              {coords && (
                <a href={`https://spotcrime.com/map?lat=${coords.lat}&lon=${coords.lng}`} target="_blank" rel="noopener noreferrer"
                  className="inline-block mt-3 text-blue-400 hover:text-blue-300 text-sm underline">
                  View SpotCrime Map →
                </a>
              )}
            </div>
          )}

          {/* Data display */}
          {risk !== "loading" && (showArcgis || showSpotcrime) && (
            <>
              {/* Tab selector — only shown when BOTH sources have data */}
              {showBothTabs && (
                <div className="flex gap-1 mb-4 bg-slate-900 rounded-lg p-1">
                  <button onClick={() => setActiveTab("arcgis")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === "arcgis" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
                    MPD / ArcGIS <span className="ml-1 text-xs opacity-75">({arcgis.count})</span>
                  </button>
                  <button onClick={() => setActiveTab("spotcrime")}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === "spotcrime" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
                    SpotCrime <span className="ml-1 text-xs opacity-75">({spotcrime.count})</span>
                  </button>
                </div>
              )}

              {/* Single source label */}
              {!showBothTabs && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-slate-500 uppercase tracking-widest">{showArcgis ? "MPD / ArcGIS Data" : "SpotCrime Data"}</span>
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-xs text-slate-500">{showArcgis ? arcgis.count : spotcrime.count} incidents · 14 days · 0.5 mi</span>
                </div>
              )}

              {/* ArcGIS table */}
              {(activeTab === "arcgis" || !showBothTabs) && showArcgis && <CrimeTable data={arcgis} />}

              {/* SpotCrime iframe + table */}
              {(activeTab === "spotcrime" || (!showArcgis && showSpotcrime)) && showSpotcrime && coords && (
                <div className="space-y-4">
                  <iframe
                    src={`https://spotcrime.com/map?lat=${coords.lat}&lon=${coords.lng}`}
                    className="w-full h-64 rounded-xl border border-slate-700"
                    title="SpotCrime Map"
                  />
                  <CrimeTable data={spotcrime} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-10 pt-2">
        <div className="max-w-lg mx-auto grid grid-cols-3 gap-3">
          <a href="tel:911"
            className="bg-red-700 hover:bg-red-600 text-white rounded-xl py-3 px-2 text-center text-sm font-semibold transition-colors">
            📞 Call 911
          </a>
          <a href={`https://maps.google.com/?q=${encodeURIComponent(client.address+", "+client.city+", "+client.state)}`}
            target="_blank" rel="noopener noreferrer"
            className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 px-2 text-center text-sm font-semibold transition-colors">
            🗺 Directions
          </a>
          <button onClick={() => coords && fireCrimeQueries(coords.lat, coords.lng)}
            className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 px-2 text-center text-sm font-semibold transition-colors">
            ↻ Refresh
          </button>
        </div>
      </div>

    </div>
  );
}
