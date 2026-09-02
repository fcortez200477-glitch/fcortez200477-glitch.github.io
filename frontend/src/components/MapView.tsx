import { useEffect, useState } from 'react';
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

/**
 * Base cartografica. O padrao e o OpenStreetMap, gratuito e sem chave de API.
 * Para trocar de provedor (CARTO, MapTiler, Stadia, servidor proprio) basta
 * definir VITE_MAP_TILE_URL e VITE_MAP_ATTRIBUTION — nenhuma mudanca de codigo.
 * A politica de uso do OSM pede atribuicao visivel e desaconselha volume alto
 * de requisicoes: em producao, prefira um provedor dedicado.
 */
const TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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
  // Sem rede (ou com o provedor bloqueado) o Leaflet apenas nao pinta os tiles,
  // deixando um retangulo vazio sem explicacao. Avisamos explicitamente.
  const [tilesFailed, setTilesFailed] = useState(false);

  return (
    <div
      style={{ height }}
      className="relative overflow-hidden rounded-xl border border-slate-200"
    >
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} scrollWheelZoom>
        <TileLayer
          attribution={TILE_ATTRIBUTION}
          url={TILE_URL}
          eventHandlers={{
            tileerror: () => setTilesFailed(true),
            tileload: () => setTilesFailed(false),
          }}
        />
        <FitBounds bounds={bounds} />
        {children}
      </MapContainer>

      {tilesFailed && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex justify-center p-2">
          <p className="pointer-events-auto rounded-lg bg-amber-50/95 px-3 py-1.5 text-xs text-amber-900 shadow-sm ring-1 ring-amber-200">
            Base cartográfica indisponível — as posições continuam corretas. Verifique a
            conexão ou configure outro provedor em <code>VITE_MAP_TILE_URL</code>.
          </p>
        </div>
      )}
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
