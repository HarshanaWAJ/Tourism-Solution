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
