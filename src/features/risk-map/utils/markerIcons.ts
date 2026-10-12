export function createTIVMarker(tiv?: number, maxTiv?: number, isTopN?: boolean) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');

  let size = 22;
  if (tiv && maxTiv && maxTiv > 0) {
    const ratio = Math.sqrt(Math.max(0, tiv) / maxTiv);
    size = Math.round(14 + ratio * 30);
  }

  const ring = isTopN ? '#f59e0b' : '#ffffff';
  const fill = isTopN
    ? 'radial-gradient(circle at 35% 35%, #fbbf24 0%, #f59e0b 60%, #d97706 100%)'
    : 'radial-gradient(circle at 35% 35%, #a78bfa 0%, #7c3aed 60%, #5b21b6 100%)';

  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${fill};
      border:2px solid ${ring};
      border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createCustomIcon() {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative;">
        <div style="
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          top: 6px;
          left: 6px;
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export function createEventIcon(eventType: string) {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const colors: Record<string, string> = {
    Typhoon: '#dc2626',
    Rainstorm: '#2563eb',
    Flood: '#0891b2',
    'Storm Surge': '#7c3aed',
    Landslide: '#ea580c',
  };
  const color = colors[eventType] || '#f97316';

  return L.divIcon({
    className: 'event-marker',
    html: `
      <div style="position: relative;">
        <div style="
          width: 24px;
          height: 24px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="color: white; font-size: 12px; font-weight: bold;">!</span>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}
