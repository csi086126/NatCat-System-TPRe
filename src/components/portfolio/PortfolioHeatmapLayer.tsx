'use client';

import React, { useState } from 'react';
import { CircleMarker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import { LocationData } from '@/types/portfolio';

export default function PortfolioHeatmapLayer({ data }: { data: LocationData[] }) {
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  if (!data || data.length === 0) return null;

  const maxExposure = Math.max(...data.map(d => d.sum_insured));

  // Calculate percentile thresholds for risk classification
  const sortedExposures = [...data.map(d => d.sum_insured)].sort((a, b) => a - b);
  const p50Index = Math.floor(sortedExposures.length * 0.5);
  const p90Index = Math.floor(sortedExposures.length * 0.9);
  const p50Threshold = sortedExposures[p50Index] || 0;
  const p90Threshold = sortedExposures[p90Index] || 0;

  // Calculate radius and color based on exposure percentile
  const getCircleStyle = (exposure: number) => {
    const normalizedExposure = exposure / maxExposure;
    const radius = 5 + Math.sqrt(normalizedExposure) * 20;

    let color;
    if (exposure < p50Threshold) {
      // Light green for low exposure
      color = `rgba(134, 239, 172, ${0.5 + normalizedExposure * 0.3})`;
    } else if (exposure < p90Threshold) {
      // Medium green for medium exposure
      color = `rgba(74, 222, 128, ${0.6 + normalizedExposure * 0.3})`;
    } else {
      // Dark green for high exposure
      color = `rgba(21, 128, 61, ${0.7 + normalizedExposure * 0.2})`;
    }

    return { radius, color };
  };

  // Find all policies at the same location
  const getPoliciesAtLocation = (lat: number, lng: number) => {
    return data.filter(p => p.lat === lat && p.lng === lng);
  };

  // Create location key for tracking expanded state
  const getLocationKey = (lat: number, lng: number) => `${lat},${lng}`;

  // Calculate spread positions in a circle around center
  const calculateSpreadPositions = (centerLat: number, centerLng: number, count: number, radiusMeters: number = 50) => {
    // Convert meters to degrees (approximate, varies by latitude)
    // At equator: 1 degree ≈ 111km, so 50m ≈ 0.00045 degrees
    // Adjust for latitude
    const latRadiusDeg = radiusMeters / 111000;
    const lngRadiusDeg = radiusMeters / (111000 * Math.cos(centerLat * Math.PI / 180));

    const positions: Array<[number, number]> = [];
    const angleStep = (2 * Math.PI) / count;

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const lat = centerLat + latRadiusDeg * Math.sin(angle);
      const lng = centerLng + lngRadiusDeg * Math.cos(angle);
      positions.push([lat, lng]);
    }

    return positions;
  };

  // Handle click on circle to expand/collapse
  const handleCircleClick = (lat: number, lng: number, e: any) => {
    console.log('🔵 Circle clicked!', { lat, lng, currentExpanded: expandedLocation });
    e.originalEvent.stopPropagation();
    const locationKey = getLocationKey(lat, lng);
    const newState = expandedLocation === locationKey ? null : locationKey;
    console.log('🔵 Setting expanded to:', newState);
    setExpandedLocation(newState);
  };

  // Map click handler to collapse expanded location
  const MapClickHandler = () => {
    useMapEvents({
      click: () => {
        setExpandedLocation(null);
      },
    });
    return null;
  };

  // Group data by location
  const locationGroups = new Map<string, LocationData[]>();
  data.forEach(point => {
    const key = getLocationKey(point.lat, point.lng);
    if (!locationGroups.has(key)) {
      locationGroups.set(key, []);
    }
    locationGroups.get(key)!.push(point);
  });

  // Debug: Always log basic info
  console.log('🔵 [Heatmap] Total data points:', data.length);
  console.log('🔵 [Heatmap] Unique locations:', locationGroups.size);

  // Debug: Log locations with multiple policies
  const multiPolicyLocations = Array.from(locationGroups.entries()).filter(([_, policies]) => policies.length > 1);
  if (multiPolicyLocations.length > 0) {
    console.log('🔵 [Heatmap] Found', multiPolicyLocations.length, 'locations with multiple policies');
    console.log('🔵 [Heatmap] Sample:', multiPolicyLocations.slice(0, 3).map(([key, policies]) => ({
      location: key,
      count: policies.length
    })));
  } else {
    console.log('🔵 [Heatmap] No locations with multiple policies found');
    console.log('🔵 [Heatmap] Try increasing sample size (e.g., Top 500 or Top 1k)');
  }

  return (
    <>
      <MapClickHandler />

      {Array.from(locationGroups.entries()).map(([locationKey, policies]) => {
        const centerLat = policies[0].lat;
        const centerLng = policies[0].lng;
        const isExpanded = expandedLocation === locationKey;
        const isMultiplePolicies = policies.length > 1;

        // Debug: Log expanded state
        if (isExpanded) {
          console.log('🔵 [Heatmap] Rendering expanded location:', locationKey, 'with', policies.length, 'policies');
        }

        // Calculate spread positions if expanded
        const spreadPositions = isExpanded && isMultiplePolicies
          ? calculateSpreadPositions(centerLat, centerLng, policies.length)
          : [];

        return (
          <React.Fragment key={locationKey}>
            {/* Render connecting lines when expanded */}
            {isExpanded && isMultiplePolicies && spreadPositions.map((pos, idx) => (
              <Polyline
                key={`line-${idx}`}
                positions={[[centerLat, centerLng], pos]}
                pathOptions={{
                  color: '#6b7280',
                  weight: 1,
                  opacity: 0.6,
                  dashArray: '4, 4'
                }}
              />
            ))}

            {/* Render circles */}
            {policies.map((point, idx) => {
              const style = getCircleStyle(point.sum_insured);
              const position: [number, number] = isExpanded && isMultiplePolicies
                ? spreadPositions[idx]
                : [centerLat, centerLng];

              return (
                <CircleMarker
                  key={`${locationKey}-${idx}`}
                  center={position}
                  radius={style.radius}
                  fillColor={style.color}
                  color={style.color}
                  weight={1}
                  fillOpacity={0.6}
                  eventHandlers={{
                    click: (e) => handleCircleClick(centerLat, centerLng, e)
                  }}
                >
                  <Popup maxHeight={400}>
                    <div className="p-2 min-w-[250px] max-w-[350px] font-sans">
                      {isMultiplePolicies && !isExpanded ? (
                        // Multiple policies - show summary
                        <>
                          <div className="mb-2 pb-2 border-b border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-gray-500">📍 LOCATION</span>
                              <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
                                {policies.length} Policies
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 truncate" title={point.address}>
                              {point.address}
                            </p>
                            <div className="mt-1 text-xs">
                              <span className="font-semibold text-gray-500">Total Exposure: </span>
                              <span className="font-bold text-blue-600">
                                HKD {policies.reduce((sum, p) => sum + p.sum_insured, 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-center text-gray-500 italic">
                            💡 Click to expand and see individual policies
                          </div>
                        </>
                      ) : (
                        // Single policy or expanded individual policy
                        <>
                          <div className="mb-2 pb-1 border-b border-gray-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">PORTFOLIO</span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Active</span>
                          </div>
                          <h3 className="font-bold text-sm mb-1">{point.policy_id}</h3>
                          <p className="text-xs text-gray-600 mb-2 truncate" title={point.address}>{point.address}</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-500">Region:</span>
                              <span>{point.region}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-semibold text-gray-500">Sum Insured:</span>
                              <span className="font-medium text-blue-600">
                                HKD {point.sum_insured.toLocaleString()}
                              </span>
                            </div>
                            {point.occupancy && (
                              <div className="flex justify-between">
                                <span className="font-semibold text-gray-500">Occupancy:</span>
                                <span>{point.occupancy}</span>
                              </div>
                            )}
                            {point.coverage && (
                              <div className="flex justify-between">
                                <span className="font-semibold text-gray-500">Coverage:</span>
                                <span>{point.coverage}</span>
                              </div>
                            )}
                          </div>
                          {isExpanded && isMultiplePolicies && (
                            <div className="mt-2 pt-2 border-t text-xs text-center text-gray-500 italic">
                              💡 Click again to collapse
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Center marker when expanded */}
            {isExpanded && isMultiplePolicies && (
              <CircleMarker
                center={[centerLat, centerLng]}
                radius={4}
                fillColor="#374151"
                color="#374151"
                weight={2}
                fillOpacity={0.8}
                eventHandlers={{
                  click: (e) => handleCircleClick(centerLat, centerLng, e)
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
