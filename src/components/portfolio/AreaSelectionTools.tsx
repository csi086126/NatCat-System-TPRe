/**
 * Area Selection Tools Component
 * Allows users to draw shapes (circle, rectangle, polygon) on the map
 * to select and analyze portfolio data within the selected area
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Circle, Square, Pentagon, Trash2, DollarSign, Building2, TrendingUp, MapPin } from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  sum_insured: number;
  address: string;
  region: string;
  policy_id: string;
  occupancy?: string;
}

interface AreaStats {
  count: number;
  totalExposure: number;
  avgExposure: number;
  minExposure: number;
  maxExposure: number;
  byRegion: Record<string, { count: number; total: number }>;
  byOccupancy: Record<string, { count: number; total: number }>;
  topPolicies: LocationData[];
  areaType: 'circle' | 'rectangle' | 'polygon';
}

interface AreaSelectionToolsProps {
  allLocations: LocationData[];
  onAreaSelected?: (stats: AreaStats | null) => void;
}

export default function AreaSelectionTools({ allLocations, onAreaSelected }: AreaSelectionToolsProps) {
  const map = useMap();
  const [drawnItems] = useState(new L.FeatureGroup());
  const [areaStats, setAreaStats] = useState<AreaStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const drawControlRef = useRef<L.Control.Draw | null>(null);

  useEffect(() => {
    // Add the drawn items layer to the map
    map.addLayer(drawnItems);

    // Initialize draw control
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polyline: false, // Disable polyline
        marker: false, // Disable marker
        circlemarker: false, // Disable circle marker
        circle: {
          shapeOptions: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            weight: 2,
          },
        },
        rectangle: {
          shapeOptions: {
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.2,
            weight: 2,
          },
        },
        polygon: {
          shapeOptions: {
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.2,
            weight: 2,
          },
          allowIntersection: false,
        },
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Event handler for when a shape is created
    const onDrawCreated = (e: any) => {
      const layer = e.layer;
      const type = e.layerType;

      // Clear previous drawings
      drawnItems.clearLayers();

      // Add new layer
      drawnItems.addLayer(layer);

      // Calculate statistics for the selected area
      calculateAreaStats(layer, type);
    };

    // Event handler for when a shape is deleted
    const onDrawDeleted = () => {
      setAreaStats(null);
      setShowStats(false);
      if (onAreaSelected) {
        onAreaSelected(null);
      }
    };

    // Event handler for when a shape is edited
    const onDrawEdited = (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: any) => {
        // Recalculate stats for edited layer
        const type = layer instanceof L.Circle ? 'circle' :
                     layer instanceof L.Rectangle ? 'rectangle' : 'polygon';
        calculateAreaStats(layer, type);
      });
    };

    map.on(L.Draw.Event.CREATED, onDrawCreated);
    map.on(L.Draw.Event.DELETED, onDrawDeleted);
    map.on(L.Draw.Event.EDITED, onDrawEdited);

    // Cleanup
    return () => {
      map.off(L.Draw.Event.CREATED, onDrawCreated);
      map.off(L.Draw.Event.DELETED, onDrawDeleted);
      map.off(L.Draw.Event.EDITED, onDrawEdited);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, drawnItems, allLocations, onAreaSelected]);

  // Calculate statistics for locations within the drawn area
  const calculateAreaStats = (layer: any, type: string) => {
    const locationsInArea: LocationData[] = [];

    allLocations.forEach((location) => {
      const point = L.latLng(location.lat, location.lng);
      let isInside = false;

      if (layer instanceof L.Circle) {
        // Check if point is within circle radius
        const distance = layer.getLatLng().distanceTo(point);
        isInside = distance <= layer.getRadius();
      } else if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
        // Check if point is within polygon/rectangle bounds
        const latLngs = layer.getLatLngs()[0]; // Get first ring for polygons
        const polygon = L.polygon(latLngs);

        // First do a quick bounding box check for performance
        const inBounds = polygon.getBounds().contains(point);

        // Only do precise check if within bounding box
        if (inBounds) {
          isInside = isPointInPolygon(point, latLngs);
        }
      }

      if (isInside) {
        locationsInArea.push(location);
      }
    });

    if (locationsInArea.length === 0) {
      setAreaStats(null);
      setShowStats(false);
      if (onAreaSelected) {
        onAreaSelected(null);
      }
      return;
    }

    // Calculate statistics
    const exposures = locationsInArea.map((l) => l.sum_insured);
    const totalExposure = exposures.reduce((sum, v) => sum + v, 0);

    // Group by region
    const byRegion: Record<string, { count: number; total: number }> = {};
    locationsInArea.forEach((loc) => {
      const region = loc.region || 'Unknown';
      if (!byRegion[region]) {
        byRegion[region] = { count: 0, total: 0 };
      }
      byRegion[region].count++;
      byRegion[region].total += loc.sum_insured;
    });

    // Group by occupancy
    const byOccupancy: Record<string, { count: number; total: number }> = {};
    locationsInArea.forEach((loc) => {
      const occ = loc.occupancy || 'Unknown';
      if (!byOccupancy[occ]) {
        byOccupancy[occ] = { count: 0, total: 0 };
      }
      byOccupancy[occ].count++;
      byOccupancy[occ].total += loc.sum_insured;
    });

    // Get top 5 by exposure
    const topPolicies = [...locationsInArea]
      .sort((a, b) => b.sum_insured - a.sum_insured)
      .slice(0, 5);

    const stats: AreaStats = {
      count: locationsInArea.length,
      totalExposure,
      avgExposure: totalExposure / locationsInArea.length,
      minExposure: Math.min(...exposures),
      maxExposure: Math.max(...exposures),
      byRegion,
      byOccupancy,
      topPolicies,
      areaType: type as 'circle' | 'rectangle' | 'polygon',
    };

    setAreaStats(stats);
    setShowStats(true);

    if (onAreaSelected) {
      onAreaSelected(stats);
    }
  };

  // Point-in-polygon algorithm (ray casting)
  const isPointInPolygon = (point: L.LatLng, polygon: L.LatLng[]): boolean => {
    let inside = false;
    const x = point.lat;
    const y = point.lng;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat;
      const yi = polygon[i].lng;
      const xj = polygon[j].lat;
      const yj = polygon[j].lng;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `HKD ${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `HKD ${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `HKD ${(value / 1e3).toFixed(2)}K`;
    } else {
      return `HKD ${value.toLocaleString()}`;
    }
  };

  const clearDrawings = () => {
    drawnItems.clearLayers();
    setAreaStats(null);
    setShowStats(false);
    if (onAreaSelected) {
      onAreaSelected(null);
    }
  };

  const getAreaIcon = () => {
    if (!areaStats) return <MapPin className="h-4 w-4" />;
    switch (areaStats.areaType) {
      case 'circle':
        return <Circle className="h-4 w-4 text-blue-600" />;
      case 'rectangle':
        return <Square className="h-4 w-4 text-green-600" />;
      case 'polygon':
        return <Pentagon className="h-4 w-4 text-orange-600" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Statistics Panel */}
      {showStats && areaStats && (
        <Card className="absolute top-20 right-4 z-[1000] w-96 bg-white/95 backdrop-blur-sm shadow-lg border-gray-200 max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                {getAreaIcon()}
                Area Selection Statistics
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDrawings}
                className="h-7 px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Total Policies */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-gray-600">Policies</span>
                </div>
                <div className="text-xl font-bold text-gray-900">
                  {areaStats.count.toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  In selected area
                </p>
              </div>

              {/* Total Exposure */}
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-gray-600">Exposure</span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(areaStats.totalExposure)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Total sum insured
                </p>
              </div>

              {/* Average Exposure */}
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-gray-600">Average</span>
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(areaStats.avgExposure)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Per policy
                </p>
              </div>

              {/* Range */}
              <div className="bg-orange-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-gray-600">Range</span>
                </div>
                <div className="text-xs font-bold text-gray-900">
                  {formatCurrency(areaStats.minExposure)}
                </div>
                <div className="text-xs font-bold text-gray-900">
                  {formatCurrency(areaStats.maxExposure)}
                </div>
              </div>
            </div>

            {/* By Region */}
            {Object.keys(areaStats.byRegion).length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2 text-gray-700">By District</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {Object.entries(areaStats.byRegion)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([region, data]) => (
                      <div
                        key={region}
                        className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                      >
                        <span className="text-gray-700 font-medium truncate flex-1">
                          {region}
                        </span>
                        <div className="text-right ml-2">
                          <div className="font-bold text-gray-900">{data.count}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatCurrency(data.total)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* By Occupancy */}
            {Object.keys(areaStats.byOccupancy).length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2 text-gray-700">By Occupancy</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {Object.entries(areaStats.byOccupancy)
                    .sort((a, b) => b[1].total - a[1].total)
                    .slice(0, 5)
                    .map(([occ, data]) => (
                      <div
                        key={occ}
                        className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                      >
                        <span className="text-gray-700 truncate flex-1">{occ}</span>
                        <div className="text-right ml-2">
                          <div className="font-medium text-gray-900">{data.count}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatCurrency(data.total)}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Top Policies */}
            {areaStats.topPolicies.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-2 text-gray-700">Top 5 by Exposure</div>
                <div className="space-y-2">
                  {areaStats.topPolicies.map((policy, idx) => (
                    <div key={idx} className="text-xs bg-gradient-to-r from-gray-50 to-white p-2.5 rounded border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-blue-600">#{idx + 1}</span>
                        <span className="font-bold text-gray-900">
                          {formatCurrency(policy.sum_insured)}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {policy.address}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {policy.region} • {policy.occupancy || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Button */}
            <div className="mt-4 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={clearDrawings}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
