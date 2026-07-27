// Uses OSRM (Open Source Routing Machine) over OpenStreetMap data — no API
// key required. Defaults to the public demo server, which is fine for
// development/low volume but is rate-limited and not meant for production
// traffic; see README.md ("OpenStreetMap / OSRM") for how to self-host.
const OSRM_BASE_URL = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";

/**
 * @param {{lat:number,lng:number}} pickup
 * @param {{lat:number,lng:number}} destination
 * @returns {Promise<{distanceMeters:number, durationSeconds:number, geometry:number[][]}>}
 */
export async function getRoute(pickup, destination) {
  const coords = `${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}`;
  const url = `${OSRM_BASE_URL}/route/v1/driving/${coords}?overview=full&geometries=geojson`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`Could not reach the routing service: ${err.message}`);
  }
  if (!res.ok) throw new Error(`Routing service returned ${res.status}`);

  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No route could be found between pickup and destination");
  }

  const route = data.routes[0];
  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    geometry: route.geometry.coordinates, // [[lng, lat], ...]
  };
}

/** Straight-line fallback distance (meters), used only if OSRM is unreachable. */
export function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters) {
  if (!meters || meters < 0) return "0 km";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = (meters / 1000).toFixed(1);
  return `${km.endsWith(".0") ? Math.round(meters / 1000) : km} km`;
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "0 min";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"}`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (remMins === 0) return `${hrs} hr${hrs === 1 ? "" : "s"}`;
  return `${hrs} hr${hrs === 1 ? "" : "s"} ${remMins} min${remMins === 1 ? "" : "s"}`;
}

/**
 * Get travel distance & duration between two points with automatic fallback.
 */
export async function getTravelInfo(origin, destination) {
  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    return { distanceMeters: 0, durationSeconds: 0, distanceText: "0 km", durationText: "0 min" };
  }

  // If points are virtually identical (< 500 meters)
  const straightDist = haversineMeters(origin, destination);
  if (straightDist < 500) {
    return {
      distanceMeters: Math.round(straightDist),
      durationSeconds: 300, // ~5 mins walk/drive
      distanceText: formatDistance(straightDist),
      durationText: "5 mins",
    };
  }

  try {
    const route = await getRoute(origin, destination);
    return {
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      distanceText: formatDistance(route.distanceMeters),
      durationText: formatDuration(route.durationSeconds),
    };
  } catch (err) {
    // OSRM fallback using Haversine & Sri Lankan average speed (~45 km/h driving speed)
    const fallbackMeters = straightDist * 1.35; // account for road winding factor
    const fallbackSeconds = (fallbackMeters / (45 * 1000)) * 3600;

    return {
      distanceMeters: Math.round(fallbackMeters),
      durationSeconds: Math.round(fallbackSeconds),
      distanceText: formatDistance(fallbackMeters),
      durationText: formatDuration(fallbackSeconds),
    };
  }
}
