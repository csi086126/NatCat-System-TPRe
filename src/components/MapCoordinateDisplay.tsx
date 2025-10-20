"use client"

import { useEffect, useState } from 'react';
import { useMapEvents, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

interface CoordinateInfo {
  lat: number;
  lng: number;
  elevation: number | null;
  address: string | null;
  building: string | null;
}

// 创建自定义标记图标
const createCustomIcon = () => {
  return L.divIcon({
    className: 'custom-location-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
        animation: pulse 2s infinite;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

export function MapCoordinateDisplay() {
  const [coords, setCoords] = useState<CoordinateInfo | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [isLoadingElevation, setIsLoadingElevation] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  const map = useMapEvents({
    mousemove: (e) => {
      const { lat, lng } = e.latlng;
      // 只显示鼠标悬停的坐标，不查询详细信息
      setHoverCoords({ lat, lng });
    },
    mouseout: () => {
      setHoverCoords(null);
    },
    click: async (e) => {
      const { lat, lng } = e.latlng;
      
      // 立即在点击位置显示标记点
      setMarkerPosition([lat, lng]);
      
      // 点击后显示完整信息
      setCoords({
        lat,
        lng,
        elevation: null,
        address: null,
        building: null,
      });

      // 获取地址信息（使用 Nominatim OpenStreetMap API）
      try {
        setIsLoadingAddress(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&zoom=18&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'FloodInsuranceSystem/1.0'
            }
          }
        );
        const data = await response.json();
        
        if (data && data.address) {
          const building = data.address.building || 
                         data.address.house || 
                         data.address.office || 
                         data.address.commercial || 
                         data.address.retail ||
                         data.name ||
                         null;
          
          const address = data.display_name || null;
          
          setCoords(prev => prev ? {
            ...prev,
            building,
            address,
          } : null);
        }
      } catch (error) {
        console.log('Address API unavailable:', error);
      } finally {
        setIsLoadingAddress(false);
      }

      // 获取海拔数据
      try {
        setIsLoadingElevation(true);
        const response = await fetch(
          `https://api.open-elevation.com/api/v1/lookup?locations=${lat.toFixed(6)},${lng.toFixed(6)}`
        );
        const data = await response.json();
        if (data.results && data.results[0]) {
          setCoords(prev => prev ? {
            ...prev,
            elevation: data.results[0].elevation
          } : null);
        }
      } catch (error) {
        console.log('Elevation API unavailable:', error);
      } finally {
        setIsLoadingElevation(false);
      }
    }
  });

  return (
    <>
      {/* 点击位置的标记点 */}
      {markerPosition && (
        <Marker 
          position={markerPosition} 
          icon={createCustomIcon()}
        >
          <Popup>
            <div className="text-xs">
              <strong>Selected Location</strong>
              <br />
              Click the × button to clear
            </div>
          </Popup>
        </Marker>
      )}

      {/* 鼠标悬停时显示简单坐标（右下角） */}
      {hoverCoords && !coords && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded shadow-md border border-gray-200">
          <div className="flex gap-3 text-xs font-mono text-gray-600">
            <span>Lat: {hoverCoords.lat.toFixed(6)}°</span>
            <span>Lon: {hoverCoords.lng.toFixed(6)}°</span>
            <span className="text-blue-600 font-semibold">Click to view details</span>
          </div>
        </div>
      )}

      {/* 点击后显示详细信息（右下角，更大的面板） */}
      {coords && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border border-gray-300 max-w-md">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">📍 Location Details</h3>
            <button
              onClick={() => {
                setCoords(null);
                setMarkerPosition(null);
              }}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors"
              title="Close and clear marker"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col gap-1.5 text-sm">
            {/* 精确坐标提示 */}
            <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1.5 mb-2">
              <div className="flex items-start gap-2 text-xs text-blue-700">
                <span className="mt-0.5">💡</span>
                <span>
                  The blue marker shows the exact clicked location. 
                  If this is not the intended building, click again on the correct location.
                </span>
              </div>
            </div>

            {/* 建筑物名称 */}
            {coords.building && (
              <div className="flex items-start gap-2 pb-2 border-b border-gray-200">
                <span className="text-gray-600 font-semibold whitespace-nowrap">🏢 Building:</span>
                <span className="text-purple-700 font-bold">{coords.building}</span>
              </div>
            )}
            
            {/* 地址信息 */}
            {coords.address && !coords.building && (
              <div className="flex items-start gap-2 pb-2 border-b border-gray-200">
                <span className="text-gray-600 font-semibold whitespace-nowrap">📍 Address:</span>
                <span className="text-gray-700 text-xs line-clamp-2">{coords.address}</span>
              </div>
            )}
            
            {/* 加载中提示 */}
            {isLoadingAddress && !coords.building && !coords.address && (
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-xs text-blue-600">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading location...</span>
              </div>
            )}
            
            {/* 坐标信息 */}
            <div className="flex flex-col gap-1 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-semibold w-12">Lat:</span>
                <span className="text-blue-700 font-medium">{coords.lat.toFixed(6)}°</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-semibold w-12">Lon:</span>
                <span className="text-blue-700 font-medium">{coords.lng.toFixed(6)}°</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-semibold w-12">Elev:</span>
                <span className="text-green-700 font-medium">
                  {coords.elevation !== null 
                    ? `${coords.elevation.toFixed(1)} m` 
                    : (isLoadingElevation ? 'Loading...' : 'N/A')
                  }
                </span>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 italic">
              ✨ Click anywhere on the map to update location
            </div>
          </div>
        </div>
      )}
    </>
  );
}
