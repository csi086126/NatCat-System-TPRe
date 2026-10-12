"use client"

import { useRef, useState } from 'react';
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
  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [markerPosition, setMarkerPosition] = useState<[number, number] | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsCoords, setDetailsCoords] = useState<CoordinateInfo | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isLoadingElevation, setIsLoadingElevation] = useState(false);
  const fetchIdRef = useRef(0);

  useMapEvents({
    mousemove: (e) => {
      const { lat, lng } = e.latlng;
      setHoverCoords({ lat, lng });
    },
    mouseout: () => {
      setHoverCoords(null);
    },
    click: (e) => {
      const { lat, lng } = e.latlng;
      // 在点击位置放置标记点(不弹位置详情面板)
      setMarkerPosition([lat, lng]);
      // 关闭可能打开着的旧详情面板,等用户主动点击 "Click to view details"
      setDetailsOpen(false);
    }
  });

  // 加载位置详情:优先用 marker 位置,否则用当前 hover 位置
  const handleViewDetails = async () => {
    const target = markerPosition
      ? { lat: markerPosition[0], lng: markerPosition[1] }
      : hoverCoords;
    if (!target) return;

    // 如果 marker 还没设,顺手放一个
    if (!markerPosition) setMarkerPosition([target.lat, target.lng]);

    const fetchId = ++fetchIdRef.current;
    setDetailsOpen(true);
    setDetailsCoords({ lat: target.lat, lng: target.lng, elevation: null, address: null, building: null });

    // 并发拉地址 + 高程
    try {
      setIsLoadingAddress(true);
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${target.lat.toFixed(6)}&lon=${target.lng.toFixed(6)}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'FloodInsuranceSystem/1.0' } },
      );
      const data = await resp.json();
      if (fetchId !== fetchIdRef.current) return;
      if (data?.address) {
        const building = data.address.building || data.address.house ||
                         data.address.office || data.address.commercial ||
                         data.address.retail || data.name || null;
        setDetailsCoords((prev) => prev ? { ...prev, building, address: data.display_name || null } : null);
      }
    } catch (err) {
      console.log('Address API unavailable:', err);
    } finally {
      if (fetchId === fetchIdRef.current) setIsLoadingAddress(false);
    }

    try {
      setIsLoadingElevation(true);
      const resp = await fetch(
        `https://api.open-elevation.com/api/v1/lookup?locations=${target.lat.toFixed(6)},${target.lng.toFixed(6)}`,
      );
      const data = await resp.json();
      if (fetchId !== fetchIdRef.current) return;
      if (data?.results?.[0]) {
        setDetailsCoords((prev) => prev ? { ...prev, elevation: data.results[0].elevation } : null);
      }
    } catch (err) {
      console.log('Elevation API unavailable:', err);
    } finally {
      if (fetchId === fetchIdRef.current) setIsLoadingElevation(false);
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setDetailsCoords(null);
    setMarkerPosition(null);
  };

  return (
    <>
      {/* 点击位置的标记点 (蓝色圆点) */}
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

      {/* 详情面板 (用户主动点了 click to view details 后才显示,会替换掉 hover label) */}
      {detailsOpen && detailsCoords && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg border border-gray-300 max-w-md">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">📍 Location Details</h3>
            <button
              onClick={handleCloseDetails}
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
            {detailsCoords.building && (
              <div className="flex items-start gap-2 pb-2 border-b border-gray-200">
                <span className="text-gray-600 font-semibold whitespace-nowrap">🏢 Building:</span>
                <span className="text-purple-700 font-bold">{detailsCoords.building}</span>
              </div>
            )}

            {/* 地址信息 */}
            {detailsCoords.address && !detailsCoords.building && (
              <div className="flex items-start gap-2 pb-2 border-b border-gray-200">
                <span className="text-gray-600 font-semibold whitespace-nowrap">📍 Address:</span>
                <span className="text-gray-700 text-xs line-clamp-2">{detailsCoords.address}</span>
              </div>
            )}

            {/* 加载中提示 */}
            {isLoadingAddress && !detailsCoords.building && !detailsCoords.address && (
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 text-xs text-blue-600">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading location...</span>
              </div>
            )}

            {/* 坐标信息 */}
            <div className="flex flex-col gap-1 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-semibold w-12">Lat:</span>
                <span className="text-blue-700 font-medium">{detailsCoords.lat.toFixed(6)}°</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-semibold w-12">Lon:</span>
                <span className="text-blue-700 font-medium">{detailsCoords.lng.toFixed(6)}°</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-semibold w-12">Elev:</span>
                <span className="text-green-700 font-medium">
                  {detailsCoords.elevation !== null
                    ? `${detailsCoords.elevation.toFixed(1)} m`
                    : (isLoadingElevation ? 'Loading...' : 'N/A')}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 italic">
              ✨ Click anywhere on the map to update location
            </div>
          </div>
        </div>
      )}

      {/* 鼠标悬停时显示简单坐标 + 可点击的 "Click to view details" (详情面板打开时隐藏,避免重叠) */}
      {hoverCoords && !detailsOpen && (
        <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded shadow-md border border-gray-200">
          <div className="flex gap-3 items-center text-xs font-mono text-gray-600">
            <span>Lat: {hoverCoords.lat.toFixed(6)}°</span>
            <span>Lon: {hoverCoords.lng.toFixed(6)}°</span>
            <button
              onClick={handleViewDetails}
              className="text-blue-600 font-semibold hover:text-blue-800 hover:underline transition-colors"
              title="View building / address / elevation for this point"
            >
              Click to view details
            </button>
          </div>
        </div>
      )}
    </>
  );
}