'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PortfolioItem {
  id: string;
  address: string;
  region: string;
  sum_insured: number;
  occupancy: string;
  construction: string;
  year_built: string;
  location?: {
    lat: number;
    lng: number;
    formatted_address: string;
  };
}

interface PortfolioMapProps {
  data: PortfolioItem[];
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function PortfolioMap({ data }: PortfolioMapProps) {
  const [mounted, setMounted] = useState(false);
  const defaultCenter: [number, number] = [22.3193, 114.1694]; // Hong Kong

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-[600px] w-full bg-gray-100 animate-pulse flex items-center justify-center">Loading Map...</div>;

  // Filter valid locations
  const validData = data.filter(item => item.location && item.location.lat && item.location.lng);

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border shadow-sm z-0 relative">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {validData.map((item, idx) => (
          <Marker 
            key={idx} 
            position={[item.location!.lat, item.location!.lng]}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-sm mb-1">{item.id}</h3>
                <p className="text-xs text-gray-600 mb-2">{item.address}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-semibold">Sum Insured:</span>
                    <br />
                    HKD {Number(item.sum_insured).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold">Occupancy:</span>
                    <br />
                    {item.occupancy || 'N/A'}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
