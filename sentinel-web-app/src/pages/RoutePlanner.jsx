/*
 * SentinelMesh — Route Planner Page
 *
 * Allows tourists/admins to plan a route with START → DESTINATION
 * using OSRM road-based routing. Shows the planned route on the map
 * with a configurable safety corridor, and displays route deviation status.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Circle, useMapEvents, Popup } from 'react-leaflet';
import L from 'leaflet';
import { fetchRoute } from '../services/routingService';
import { ROUTE_STATUS } from '../data/demoData';
import BottomNav from '../components/BottomNav';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const startIcon = new L.DivIcon({
  className: 'start-marker',
  html: `<div style="width:32px;height:32px;background:#22c55e;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="color:white;font-size:16px">A</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const endIcon = new L.DivIcon({
  className: 'end-marker',
  html: `<div style="width:32px;height:32px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"><span style="color:white;font-size:16px">B</span></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function MapClickHandler({ onMapClick, enabled }) {
  useMapEvents({
    click(e) {
      if (enabled) onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function RoutePlanner() {
  const navigate = useNavigate();
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [waypoints, setWaypoints] = useState([]); // extra waypoints
  const [routeCoords, setRouteCoords] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [placingMode, setPlacingMode] = useState('start'); // 'start' | 'end' | 'waypoint' | null
  const [corridorWidth, setCorridorWidth] = useState(100); // meters

  function handleMapClick(latlng) {
    if (placingMode === 'start') {
      setStartPoint(latlng);
      setPlacingMode('end');
      setRouteCoords(null);
    } else if (placingMode === 'end') {
      setEndPoint(latlng);
      setPlacingMode(null);
    } else if (placingMode === 'waypoint') {
      setWaypoints((prev) => [...prev, latlng]);
    }
  }

  async function calculateRoute() {
    if (!startPoint || !endPoint) return;
    setLoading(true);
    setError(null);

    try {
      const allPoints = [startPoint, ...waypoints, endPoint];
      const result = await fetchRoute(allPoints);
      setRouteCoords(result.coordinates);
      setRouteInfo({
        distance: result.distance,
        duration: result.duration,
      });
    } catch (e) {
      console.error('Route error:', e);
      setError('Failed to calculate route. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-calculate when both points are set
  useEffect(() => {
    if (startPoint && endPoint) {
      calculateRoute();
    }
  }, [startPoint, endPoint, waypoints]);

  function resetRoute() {
    setStartPoint(null);
    setEndPoint(null);
    setWaypoints([]);
    setRouteCoords(null);
    setRouteInfo(null);
    setError(null);
    setPlacingMode('start');
  }

  const center = [22.5800, 88.4650];

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full flex items-center justify-between px-5 py-4 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-on-surface-variant">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-xl font-bold text-primary">Route Planner</span>
        </div>
        <button onClick={resetRoute} className="text-primary text-sm font-semibold">
          Reset
        </button>
      </header>

      <main className="max-w-xl mx-auto px-5 pb-32 animate-fade-in">
        {/* Instructions */}
        <div className="bg-white rounded-2xl p-4 card-shadow mb-4 border border-surface-container">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary">route</span>
            <span className="font-bold text-on-surface">Plan Your Route</span>
          </div>
          {placingMode === 'start' && (
            <p className="text-sm text-on-surface-variant">👆 Click on the map to set your <strong className="text-[#22c55e]">START</strong> point.</p>
          )}
          {placingMode === 'end' && (
            <p className="text-sm text-on-surface-variant">👆 Click on the map to set your <strong className="text-error">DESTINATION</strong> point.</p>
          )}
          {!placingMode && routeCoords && (
            <p className="text-sm text-[#22c55e] font-semibold">✓ Route calculated! Road-based routing via OSRM.</p>
          )}
        </div>

        {/* Map */}
        <div className="w-full h-72 rounded-3xl overflow-hidden card-shadow mb-4 border border-surface-container">
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={true}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <MapClickHandler onMapClick={handleMapClick} enabled={!!placingMode} />

            {/* Route line */}
            {routeCoords && (
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: '#0051df', weight: 5, opacity: 0.8 }}
              />
            )}

            {/* Safety corridor visualization (simplified as circles along route) */}
            {routeCoords && routeCoords.filter((_, i) => i % 10 === 0).map((coord, i) => (
              <Circle
                key={i}
                center={coord}
                radius={corridorWidth}
                pathOptions={{ color: '#0051df', fillColor: '#0051df', fillOpacity: 0.05, weight: 0.5 }}
              />
            ))}

            {/* Start marker */}
            {startPoint && (
              <Marker position={startPoint} icon={startIcon}>
                <Popup>Start Point</Popup>
              </Marker>
            )}

            {/* End marker */}
            {endPoint && (
              <Marker position={endPoint} icon={endIcon}>
                <Popup>Destination</Popup>
              </Marker>
            )}

            {/* Waypoint markers */}
            {waypoints.map((wp, i) => (
              <Marker key={i} position={wp}>
                <Popup>Waypoint {i + 1}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Route Info */}
        {routeInfo && (
          <div className="bg-white rounded-2xl p-4 card-shadow mb-4 border border-surface-container">
            <h3 className="font-bold text-on-surface mb-3">Route Details</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-surface-container-low rounded-xl p-3 text-center">
                <p className="text-xs text-on-surface-variant">Distance</p>
                <p className="text-xl font-bold text-primary">
                  {routeInfo.distance > 1000
                    ? `${(routeInfo.distance / 1000).toFixed(1)} km`
                    : `${Math.round(routeInfo.distance)} m`}
                </p>
              </div>
              <div className="bg-surface-container-low rounded-xl p-3 text-center">
                <p className="text-xs text-on-surface-variant">Est. Time</p>
                <p className="text-xl font-bold text-secondary">
                  {routeInfo.duration > 3600
                    ? `${Math.round(routeInfo.duration / 3600)} hr ${Math.round((routeInfo.duration % 3600) / 60)} min`
                    : `${Math.round(routeInfo.duration / 60)} min`}
                </p>
              </div>
            </div>

            {/* Corridor Width */}
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-outline uppercase">Safety Corridor</span>
                <span className="text-sm font-bold text-primary">{corridorWidth}m</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={corridorWidth}
                onChange={(e) => setCorridorWidth(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-outline">
                <span>50m</span>
                <span>500m</span>
              </div>
            </div>

            {/* Route Status Legend */}
            <div className="border-t border-surface-container pt-3">
              <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Deviation Thresholds</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span>On Route (0-{corridorWidth}m)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#eab308]" />
                  <span>Minor ({corridorWidth}-{corridorWidth * 2}m)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#f97316]" />
                  <span>Significant ({corridorWidth * 2}-{corridorWidth * 5}m)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
                  <span>Critical (&gt;{corridorWidth * 5}m)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-2" />
            <p className="text-sm text-on-surface-variant">Calculating route via OSRM...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-error-container/30 rounded-xl p-3 flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-error">error</span>
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* Add Waypoint */}
        {startPoint && endPoint && !placingMode && (
          <button
            onClick={() => setPlacingMode('waypoint')}
            className="w-full h-12 bg-surface-container-low text-on-surface font-semibold rounded-xl transition-all btn-press mb-3 flex items-center justify-center gap-2 border border-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">add_location</span>
            Add Waypoint
          </button>
        )}

        {placingMode === 'waypoint' && (
          <button
            onClick={() => setPlacingMode(null)}
            className="w-full h-12 bg-primary text-white font-semibold rounded-xl shadow-md btn-press transition-all mb-3 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
            Done Adding Waypoints
          </button>
        )}
      </main>

      <BottomNav active="home" />
    </div>
  );
}
