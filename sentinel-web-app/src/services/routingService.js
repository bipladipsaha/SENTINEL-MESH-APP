/*
 * SentinelMesh — Routing Service (Modular)
 *
 * Provides road-based routing via OSRM.
 * Designed to be swappable — replace the fetchRoute implementation
 * with Mapbox/Google/etc. without changing the consumer API.
 */

const OSRM_BASE = 'https://router.project-osrm.org';

/**
 * Fetch a road-snapped route between waypoints using OSRM.
 *
 * @param {Array<[number, number]>} waypoints - Array of [lat, lon] pairs.
 * @returns {Promise<{ coordinates: Array<[number, number]>, distance: number, duration: number }>}
 *   coordinates = array of [lat, lon] along the route
 *   distance = total meters
 *   duration = total seconds
 */
export async function fetchRoute(waypoints) {
  if (!waypoints || waypoints.length < 2) {
    throw new Error('At least 2 waypoints required');
  }

  // OSRM expects lon,lat format (reversed from our lat,lon)
  const coords = waypoints.map(([lat, lon]) => `${lon},${lat}`).join(';');
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OSRM request failed: ${res.status}`);
  }

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(`OSRM returned no routes: ${data.code}`);
  }

  const route = data.routes[0];
  // OSRM returns [lon, lat], we convert back to [lat, lon]
  const coordinates = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

  return {
    coordinates,
    distance: route.distance, // meters
    duration: route.duration, // seconds
  };
}

/**
 * Calculate the perpendicular distance from a point to the nearest segment
 * of a route polyline, in meters.
 *
 * Uses @turf/turf for accuracy.
 *
 * @param {[number, number]} point - [lat, lon]
 * @param {Array<[number, number]>} routeCoords - Array of [lat, lon]
 * @returns {number} Distance in meters
 */
export function distanceToRoute(point, routeCoords) {
  // Lazy-import turf to keep initial bundle small
  const turf = window.__turf;
  if (!turf) {
    console.warn('Turf not loaded, falling back to simple distance');
    return simpleFallbackDistance(point, routeCoords);
  }

  // turf expects [lon, lat]
  const pt = turf.point([point[1], point[0]]);
  const line = turf.lineString(routeCoords.map(([lat, lon]) => [lon, lat]));
  const nearest = turf.nearestPointOnLine(line, pt, { units: 'meters' });
  return nearest.properties.dist;
}

/**
 * Get the route deviation status based on distance from route.
 */
export function getDeviationStatus(distanceMeters, corridorWidth = 100) {
  if (distanceMeters <= corridorWidth) return 'on_route';
  if (distanceMeters <= corridorWidth * 2) return 'minor_deviation';
  if (distanceMeters <= corridorWidth * 5) return 'significant_deviation';
  return 'critical_deviation';
}

/**
 * Simple fallback for when turf is not available.
 */
function simpleFallbackDistance(point, routeCoords) {
  if (!routeCoords || routeCoords.length === 0) return Infinity;

  let minDist = Infinity;
  for (const coord of routeCoords) {
    const d = haversine(point[0], point[1], coord[0], coord[1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
