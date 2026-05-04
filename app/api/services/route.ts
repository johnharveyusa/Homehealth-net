import { NextRequest, NextResponse } from "next/server";

// ── Distance in miles (Haversine) ──────────────────────────────────────────
function distMi(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Query Overpass (OpenStreetMap) — free, no API key ─────────────────────
async function findNearest(
  lat: number,
  lng: number,
  amenity: "police" | "fire_station" | "hospital"
) {
  // Search 10 km radius; OSM has very good coverage of Memphis
  const radius = 10000;
  const query = `[out:json][timeout:10];
(
  node["amenity"="${amenity}"](around:${radius},${lat},${lng});
  way["amenity"="${amenity}"](around:${radius},${lat},${lng});
);
out center 10;`;

  const url =
    "https://overpass-api.de/api/interpreter?data=" +
    encodeURIComponent(query);

  const res = await fetch(url, {
    headers: { "User-Agent": "BloodhoundHomeHealth/1.0" },
    next: { revalidate: 3600 }, // cache 1 hour per position
  });

  if (!res.ok) return null;
  const json = await res.json();

  const elements: Array<{
    lat?: number; lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }> = json.elements ?? [];

  if (!elements.length) return null;

  // Normalize lat/lng (ways use .center)
  const normalized = elements.map((el) => ({
    lat: el.lat ?? el.center?.lat ?? 0,
    lon: el.lon ?? el.center?.lon ?? 0,
    tags: el.tags ?? {},
  })).filter(e => e.lat !== 0);

  // Sort by distance, take closest
  const sorted = normalized
    .map(e => ({ ...e, dist: distMi(lat, lng, e.lat, e.lon) }))
    .sort((a, b) => a.dist - b.dist);

  const best = sorted[0];
  const t = best.tags;

  const name =
    t.name ??
    t["name:en"] ??
    (amenity === "police"
      ? "Police Station"
      : amenity === "fire_station"
      ? "Fire Station"
      : "Hospital");

  const addrParts = [
    t["addr:housenumber"],
    t["addr:street"],
    t["addr:city"],
  ].filter(Boolean);
  const address = addrParts.length
    ? addrParts.join(" ")
    : `${best.lat.toFixed(5)}, ${best.lon.toFixed(5)}`;

  const phone = t.phone ?? t["contact:phone"] ?? null;

  return {
    name,
    address,
    phone,
    lat: best.lat,
    lng: best.lon,
    distanceMi: parseFloat(best.dist.toFixed(2)),
  };
}

// ── GET /api/services?lat=XX&lng=YY ───────────────────────────────────────
export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  const [police, fire, hospital] = await Promise.all([
    findNearest(lat, lng, "police"),
    findNearest(lat, lng, "fire_station"),
    findNearest(lat, lng, "hospital"),
  ]);

  return NextResponse.json({ police, fire, hospital });
}
