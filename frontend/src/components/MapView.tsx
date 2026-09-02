import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';

const DEFAULT_CENTER: LatLngExpression = (() => {
  const raw = import.meta.env.VITE_MAP_CENTER;
  if (typeof raw === 'string') {
    const [lat, lng] = raw.split(',').map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
  }
  return [-23.5505, -46.6333];
})();

const DEFAULT_ZOOM = Number(import.meta.env.VITE_MAP_ZOOM ?? 13) || 13;

/** Reenquadra o mapa quando o conjunto de pontos muda. */
function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [bounds, map]);
  return null;
}

export function MapView({
  children,
  bounds = null,
  height = 480,
}: {
  children?: ReactNode;
  bounds?: LatLngBoundsExpression | null;
  height?: number;
}) {
  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={bounds} />
        {children}
      </MapContainer>
    </div>
  );
}

/**
 * Marcadores desenhados via CSS (divIcon) — evita depender das imagens padrao
 * do Leaflet, que quebram em builds com bundler.
 */
export function dotIcon(color: string, size = 16, label?: string) {
  return divIcon({
    className: '',
    html: `<span style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};border:2px solid #fff;
      box-shadow:0 1px 4px rgba(15,23,42,.45);
      color:#fff;font:600 9px/1 Inter,sans-serif;
    ">${label ?? ''}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function vehicleIcon() {
  return dotIcon('#4338CA', 18);
}

export function sensorIcon(active: boolean) {
  return dotIcon(active ? '#0891B2' : '#94A3B8', 14);
}

export function incidentIcon(severity: 'low' | 'medium' | 'high' | 'critical') {
  const colors = { low: '#0EA5E9', medium: '#D97706', high: '#EA580C', critical: '#DC2626' };
  return dotIcon(colors[severity], severity === 'critical' ? 20 : 16, '!');
}
