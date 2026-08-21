/*
 * SentinelMesh — Find Nearby Services Page
 * Reference: stitch_sentinel_mesh_safety_app/find_nearby_hospital
 *
 * Shows nearby hospitals or police stations using OpenStreetMap
 * Overpass API with 1-tap call and navigation.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import BottomNav from '../components/BottomNav';

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createServiceIcon(type) {
  const color = type === 'hospital' ? '#006b5d' : '#0051df';
  const icon = type === 'hospital' ? '🏥' : '🚔';
  return new L.DivIcon({
    className: 'custom-service-marker',
    html: `<div style="width:36px;height:36px;background:${color};border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px ${color}40;font-size:18px">${icon}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14);
  }, [center, map]);
  return null;
}

function DraggableLocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      const newLoc = { lat: e.latlng.lat, lon: e.latlng.lng };
      setPosition(newLoc);
      localStorage.setItem('manual_user_loc', JSON.stringify(newLoc));
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position ? (
    <Marker
      position={[position.lat, position.lon]}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          const newLoc = { lat: pos.lat, lon: pos.lng };
          setPosition(newLoc);
          localStorage.setItem('manual_user_loc', JSON.stringify(newLoc));
          map.flyTo(pos, map.getZoom());
        },
      }}
    >
      <Popup>Your Location. Drag or click map to change.</Popup>
    </Marker>
  ) : null;
}

export default function FindServices({ type }) {
  const navigate = useNavigate();
  const isHospital = type === 'hospital';
  const [userLoc, setUserLoc] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locError, setLocError] = useState(false);

  // Get user location with high accuracy
  useEffect(() => {
    // Check if user manually set their location recently
    const savedLoc = localStorage.getItem('manual_user_loc');
    if (savedLoc) {
      try {
        setUserLoc(JSON.parse(savedLoc));
        setLocError(false);
        return;
      } catch (e) {
        console.error("Failed to parse saved location");
      }
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          setLocError(false);
        },
        () => {
          setLocError(true);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocError(true);
      setLoading(false);
    }
  }, []);

  // Fetch nearby services via Overpass API (with mirror fallback)
  useEffect(() => {
    if (!userLoc) return;
    setLoading(true);

    const amenity = isHospital ? 'hospital' : 'police';
    const radius = 10000; // 10km
    const query = `[out:json][timeout:25];(node["amenity"="${amenity}"](around:${radius},${userLoc.lat},${userLoc.lon});way["amenity"="${amenity}"](around:${radius},${userLoc.lat},${userLoc.lon}););out center;`;

    // Try multiple Overpass API mirrors in order
    const OVERPASS_ENDPOINTS = [
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
      'https://overpass-api.de/api/interpreter',
    ];

    async function fetchFromOverpass() {
      for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(query)}`,
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (data.elements && data.elements.length > 0) return data;
        } catch {
          continue;
        }
      }
      return null;
    }

    fetchFromOverpass()
      .then((data) => {
        if (!data) {
          setServices([]);
          setLoading(false);
          return;
        }
        const results = data.elements
          .filter((el) => (el.lat || el.center?.lat)) // skip entries without coords
          .map((el) => ({
            id: el.id,
            name: el.tags?.name || `${isHospital ? 'Hospital' : 'Police Station'}`,
            lat: el.lat || el.center?.lat,
            lon: el.lon || el.center?.lon,
            phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
            address: el.tags?.['addr:full'] || el.tags?.['addr:street'] || '',
            emergency: el.tags?.emergency || null,
            opening: el.tags?.opening_hours || null,
          }))
          .map((s) => ({
            ...s,
            distance: getDistance(userLoc.lat, userLoc.lon, s.lat, s.lon),
          }))
          .sort((a, b) => a.distance - b.distance);

        setServices(results);
        setLoading(false);
      })
      .catch(() => {
        setServices([]);
        setLoading(false);
      });
  }, [userLoc, isHospital]);

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const center = userLoc ? [userLoc.lat, userLoc.lon] : [22.5726, 88.3639];
  const serviceIcon = createServiceIcon(type);

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full flex items-center justify-between px-5 py-4 bg-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-on-surface-variant">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="text-xl font-bold text-primary">Sentinel Mesh</span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined text-[28px]">notifications</span>
        </button>
      </header>

      <main className="max-w-xl mx-auto px-5 pb-32 animate-fade-in">
        {/* Location Warning */}
        {locError && (
          <div className="bg-error-container/40 rounded-2xl p-3 flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-error">location_off</span>
            <p className="text-sm text-error font-medium">
              Could not detect your location. Please allow location access in your browser and refresh.
            </p>
          </div>
        )}
        {/* Map */}
        <div className="w-full h-52 rounded-3xl overflow-hidden card-shadow mb-4 border border-surface-container bg-surface-container-low flex items-center justify-center">
          {userLoc ? (
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={true}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
              <RecenterMap center={center} />
              {/* User location marker */}
              <DraggableLocationMarker 
                position={userLoc ? userLoc : { lat: center[0], lon: center[1] }} 
                setPosition={setUserLoc} 
              />
              {/* Service markers */}
              {filtered.map((s) => (
                <Marker key={s.id} position={[s.lat, s.lon]} icon={serviceIcon}>
                  <Popup>
                    <strong>{s.name}</strong><br />
                    {s.address && <>{s.address}<br /></>}
                    {s.phone && <>📞 {s.phone}</>}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="text-center p-4">
              <span className="material-symbols-outlined text-outline text-4xl mb-2">map</span>
              <p className="text-on-surface-variant text-sm">Location required for map</p>
            </div>
          )}
        </div>
        <p className="text-xs text-on-surface-variant text-center mb-4 italic">
          Map showing wrong location? Click anywhere on the map or drag your pin to set your exact location.
        </p>

        {/* Search */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[20px]">search</span>
            <input
              type="text"
              placeholder={`Search ${isHospital ? 'hospitals' : 'police stations'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white border border-surface-container rounded-xl text-sm outline-none input-focus"
            />
          </div>
        </div>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Nearby Facilities</h2>
          <span className="text-sm font-semibold text-primary">{filtered.length} Found</span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-5 card-shadow">
                <div className="skeleton h-6 w-48 rounded mb-3" />
                <div className="skeleton h-4 w-64 rounded mb-2" />
                <div className="skeleton h-10 w-full rounded-xl mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Service Cards */}
        {!loading && (
          <div className="flex flex-col gap-4">
            {filtered.map((service) => (
              <div key={service.id} className="bg-white rounded-3xl p-5 card-shadow border border-surface-container">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-on-surface text-lg leading-tight">{service.name}</h3>
                    {service.address && (
                      <div className="flex items-start gap-1 mt-1">
                        <span className="material-symbols-outlined text-outline text-[16px] mt-0.5">location_on</span>
                        <p className="text-sm text-on-surface-variant">{service.address}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    {service.opening?.includes('24') && (
                      <span className="inline-block bg-secondary/10 text-secondary text-xs font-bold px-2.5 py-1 rounded-full mb-1">
                        OPEN 24/7
                      </span>
                    )}
                    <p className="text-lg font-bold text-primary">
                      {service.distance > 1000
                        ? `${(service.distance / 1000).toFixed(1)}`
                        : service.distance}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {service.distance > 1000 ? 'km away' : 'm away'}
                    </p>
                  </div>
                </div>

                {service.phone && (
                  <div className="bg-error-container/30 rounded-xl px-4 py-3 mb-4">
                    <p className="text-xs font-bold text-error uppercase tracking-wider">Emergency Direct</p>
                    <p className="text-lg font-bold text-error flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">emergency</span>
                      {service.phone}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${service.lat},${service.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 h-11 bg-surface-container-low text-on-surface font-semibold rounded-xl transition-all btn-press flex items-center justify-center gap-2 text-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">explore</span>
                    Navigate
                  </a>
                  <a
                    href={`tel:${service.phone || (isHospital ? '108' : '100')}`}
                    className="flex-1 h-11 bg-primary text-white font-semibold rounded-xl shadow-md btn-press transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">call</span>
                    Call Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav active="alerts" />
    </div>
  );
}
