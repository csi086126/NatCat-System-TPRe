"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";

export type LocationPoint = {
  key: string;
  label: string;
  latitude: number;
  longitude: number;
  details: Array<[string, string]>;
};

const defaultCenter: [number, number] = [22.3193, 114.1694];

function FitMapToPoints({ points }: { points: LocationPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = points.map((point) => [point.latitude, point.longitude] as [number, number]);
    if (bounds.length === 1) map.setView(bounds[0], 13);
    else map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
  }, [map, points]);

  return null;
}

export default function LocationMapCanvas({ points }: { points: LocationPoint[] }) {
  return (
    <MapContainer
      center={points.length ? [points[0].latitude, points[0].longitude] : defaultCenter}
      zoom={points.length ? 10 : 11}
      className="h-[30rem] w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <FitMapToPoints points={points} />
      {points.map((point) => (
        <CircleMarker
          key={point.key}
          center={[point.latitude, point.longitude]}
          radius={6}
          pathOptions={{ color: "#0369a1", fillColor: "#06b6d4", fillOpacity: 0.72, weight: 1 }}
        >
          <Popup>
            <div className="min-w-[180px] text-xs">
              <p className="mb-2 font-semibold text-slate-800">{point.label}</p>
              <div className="space-y-1">
                {point.details.map(([label, value]) => (
                  <div key={`${point.key}-${label}`} className="flex justify-between gap-4">
                    <span className="text-slate-500">{label}</span>
                    <span className="text-right font-medium text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
