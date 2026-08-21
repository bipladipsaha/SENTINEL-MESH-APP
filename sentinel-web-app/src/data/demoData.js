/*
 * SentinelMesh — Demo / Mock Data
 *
 * Provides realistic sample geo-fences, incident hotspots, simulated tourists,
 * and group data for demonstration without physical hardware.
 * All coordinates are around Kolkata / New Town area.
 */

// ============================================================
// GEO-FENCES
// ============================================================

export const DEMO_GEOFENCES = [
  {
    id: 'gf-safe-1',
    name: 'New Town Business Hub',
    type: 'safe',
    riskLevel: 5,
    coordinates: [
      [22.5810, 88.4650],
      [22.5810, 88.4750],
      [22.5730, 88.4750],
      [22.5730, 88.4650],
    ],
    activeFrom: '00:00',
    activeUntil: '23:59',
    status: 'active',
    actions: ['log'],
    description: 'Well-lit commercial district with 24/7 security.',
  },
  {
    id: 'gf-safe-2',
    name: 'Eco Park Tourist Zone',
    type: 'safe',
    riskLevel: 5,
    coordinates: [
      [22.6020, 88.4600],
      [22.6020, 88.4720],
      [22.5940, 88.4720],
      [22.5940, 88.4600],
    ],
    activeFrom: '06:00',
    activeUntil: '20:00',
    status: 'active',
    actions: ['log'],
    description: 'Major tourist attraction with designated safe paths.',
  },
  {
    id: 'gf-safe-3',
    name: 'City Hospital Zone',
    type: 'safe',
    riskLevel: 3,
    coordinates: [
      [22.5700, 88.3600],
      [22.5700, 88.3660],
      [22.5660, 88.3660],
      [22.5660, 88.3600],
    ],
    activeFrom: '00:00',
    activeUntil: '23:59',
    status: 'active',
    actions: ['log'],
    description: 'Hospital premises with emergency services.',
  },
  {
    id: 'gf-caution-1',
    name: 'Isolated Canal Area',
    type: 'caution',
    riskLevel: 55,
    coordinates: [
      [22.5850, 88.4400],
      [22.5850, 88.4500],
      [22.5780, 88.4500],
      [22.5780, 88.4400],
    ],
    activeFrom: '18:00',
    activeUntil: '06:00',
    status: 'active',
    actions: ['warning', 'log'],
    description: 'Poorly lit area near canals. Exercise caution after dark.',
  },
  {
    id: 'gf-caution-2',
    name: 'High-Crowd Market Zone',
    type: 'caution',
    riskLevel: 40,
    coordinates: [
      [22.5750, 88.3500],
      [22.5750, 88.3580],
      [22.5700, 88.3580],
      [22.5700, 88.3500],
    ],
    activeFrom: '10:00',
    activeUntil: '22:00',
    status: 'active',
    actions: ['warning', 'log'],
    description: 'Dense market area. Pickpocketing incidents reported.',
  },
  {
    id: 'gf-restricted-1',
    name: 'Construction Zone Alpha',
    type: 'restricted',
    riskLevel: 90,
    coordinates: [
      [22.5900, 88.4550],
      [22.5900, 88.4600],
      [22.5870, 88.4600],
      [22.5870, 88.4550],
    ],
    activeFrom: '00:00',
    activeUntil: '23:59',
    status: 'active',
    actions: ['warning', 'wearable_alert', 'authority_notification', 'log'],
    description: 'Active construction site. No entry permitted.',
  },
  {
    id: 'gf-restricted-2',
    name: 'Military Cantonment',
    type: 'restricted',
    riskLevel: 95,
    coordinates: [
      [22.5600, 88.3700],
      [22.5600, 88.3800],
      [22.5540, 88.3800],
      [22.5540, 88.3700],
    ],
    activeFrom: '00:00',
    activeUntil: '23:59',
    status: 'active',
    actions: ['warning', 'wearable_alert', 'authority_notification', 'log'],
    description: 'Military zone. Strictly no civilian entry.',
  },
];

// ============================================================
// INCIDENT HOTSPOTS
// ============================================================

export const DEMO_HOTSPOTS = [
  {
    id: 'hs-1',
    type: 'theft',
    severity: 'medium',
    lat: 22.5735,
    lon: 88.3540,
    incidentCount: 12,
    lastIncident: '2026-08-15T14:30:00',
    description: 'Multiple pickpocketing reports near the market.',
  },
  {
    id: 'hs-2',
    type: 'assault',
    severity: 'high',
    lat: 22.5830,
    lon: 88.4450,
    incidentCount: 5,
    lastIncident: '2026-08-10T22:15:00',
    description: 'Assault incidents reported in poorly lit canal area.',
  },
  {
    id: 'hs-3',
    type: 'road_accident',
    severity: 'high',
    lat: 22.5880,
    lon: 88.4580,
    incidentCount: 8,
    lastIncident: '2026-08-18T09:00:00',
    description: 'Frequent road accidents near construction zone.',
  },
  {
    id: 'hs-4',
    type: 'scam',
    severity: 'low',
    lat: 22.5980,
    lon: 88.4660,
    incidentCount: 20,
    lastIncident: '2026-08-20T16:00:00',
    description: 'Tourist scam reports near Eco Park entrance.',
  },
  {
    id: 'hs-5',
    type: 'wildlife',
    severity: 'medium',
    lat: 22.6000,
    lon: 88.4700,
    incidentCount: 3,
    lastIncident: '2026-08-12T07:00:00',
    description: 'Stray animal sightings in the park area.',
  },
];

// ============================================================
// SIMULATED TOURISTS
// ============================================================

export const DEMO_TOURISTS = [
  {
    id: 'T-1001',
    name: 'Alice Johnson',
    lat: 22.5770,
    lon: 88.4680,
    battery: 82,
    gpsStatus: 'connected',
    loraStatus: 'connected',
    gsmStatus: 'connected',
    sos: false,
    groupId: 'group-trek-2026',
    riskScore: 15,
    currentZone: 'gf-safe-1',
    routeStatus: 'on_route',
  },
  {
    id: 'T-1002',
    name: 'Bob Kumar',
    lat: 22.5780,
    lon: 88.4700,
    battery: 65,
    gpsStatus: 'connected',
    loraStatus: 'connected',
    gsmStatus: 'disconnected',
    sos: false,
    groupId: 'group-trek-2026',
    riskScore: 35,
    currentZone: 'gf-safe-1',
    routeStatus: 'on_route',
  },
  {
    id: 'T-1003',
    name: 'Carol Sharma',
    lat: 22.5820,
    lon: 88.4470,
    battery: 45,
    gpsStatus: 'connected',
    loraStatus: 'disconnected',
    gsmStatus: 'connected',
    sos: false,
    groupId: 'group-trek-2026',
    riskScore: 62,
    currentZone: 'gf-caution-1',
    routeStatus: 'minor_deviation',
  },
  {
    id: 'T-1004',
    name: 'David Lee',
    lat: 22.5890,
    lon: 88.4575,
    battery: 20,
    gpsStatus: 'connected',
    loraStatus: 'connected',
    gsmStatus: 'connected',
    sos: true,
    groupId: null,
    riskScore: 92,
    currentZone: 'gf-restricted-1',
    routeStatus: 'critical_deviation',
  },
  {
    id: 'T-1005',
    name: 'Eve Banerjee',
    lat: 22.5995,
    lon: 88.4650,
    battery: 90,
    gpsStatus: 'connected',
    loraStatus: 'connected',
    gsmStatus: 'connected',
    sos: false,
    groupId: null,
    riskScore: 8,
    currentZone: 'gf-safe-2',
    routeStatus: 'on_route',
  },
];

// ============================================================
// GROUPS
// ============================================================

export const DEMO_GROUPS = [
  {
    id: 'group-trek-2026',
    name: 'College Trek 2026',
    members: ['T-1001', 'T-1002', 'T-1003'],
    maxSeparationDistance: 500, // meters
    adminTouristId: 'T-1001',
  },
];

// ============================================================
// PLANNED ROUTES
// ============================================================

export const DEMO_ROUTES = [
  {
    id: 'route-1',
    name: 'New Town Heritage Walk',
    touristId: 'T-1001',
    waypoints: [
      [22.5770, 88.4680], // start (hotel)
      [22.5820, 88.4700], // attraction 1
      [22.5900, 88.4680], // attraction 2
      [22.5980, 88.4660], // Eco Park entrance
    ],
    corridorWidth: 100, // meters
    status: 'active',
  },
];

// ============================================================
// HELPERS
// ============================================================

export const ZONE_COLORS = {
  safe: { fill: '#22c55e', stroke: '#16a34a', fillOpacity: 0.15 },
  caution: { fill: '#eab308', stroke: '#ca8a04', fillOpacity: 0.2 },
  restricted: { fill: '#ef4444', stroke: '#dc2626', fillOpacity: 0.25 },
  emergency: { fill: '#f97316', stroke: '#ea580c', fillOpacity: 0.3 },
};

export const RISK_LEVELS = {
  safe: { min: 0, max: 30, label: 'SAFE', color: '#22c55e', icon: 'verified_user' },
  caution: { min: 31, max: 60, label: 'CAUTION', color: '#eab308', icon: 'warning' },
  high: { min: 61, max: 80, label: 'HIGH RISK', color: '#f97316', icon: 'error' },
  critical: { min: 81, max: 100, label: 'CRITICAL', color: '#ef4444', icon: 'emergency' },
};

export function getRiskLevel(score) {
  if (score <= 30) return RISK_LEVELS.safe;
  if (score <= 60) return RISK_LEVELS.caution;
  if (score <= 80) return RISK_LEVELS.high;
  return RISK_LEVELS.critical;
}

export const HOTSPOT_ICONS = {
  theft: '🕵️',
  assault: '⚠️',
  road_accident: '🚗',
  scam: '💰',
  wildlife: '🐾',
  fire: '🔥',
  flood: '🌊',
};

export const ROUTE_STATUS = {
  on_route: { label: 'ON ROUTE', color: '#22c55e' },
  minor_deviation: { label: 'MINOR DEVIATION', color: '#eab308' },
  significant_deviation: { label: 'SIGNIFICANT DEVIATION', color: '#f97316' },
  critical_deviation: { label: 'CRITICAL DEVIATION', color: '#ef4444' },
};
