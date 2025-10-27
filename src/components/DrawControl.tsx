"use client"

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';

interface DrawControlProps {
  onShapeDrawn: (layer: L.Layer, type: string, bounds: L.LatLngBounds) => void;
  onDrawStart?: () => void;
  enabled: boolean;
}

export default function DrawControl({ onShapeDrawn, onDrawStart, enabled }: DrawControlProps) {
  const map = useMap();
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());

  useEffect(() => {
    if (!map || !enabled) return;

    // Add feature group to map to store drawn shapes
    map.addLayer(drawnItemsRef.current);

    // Create draw control with circle, rectangle, and polygon
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polyline: false, // Disable line drawing
        marker: false,   // Disable marker
        circlemarker: false,
        circle: {
          shapeOptions: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            weight: 2
          }
        },
        rectangle: {
          shapeOptions: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            weight: 2
          }
        },
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#ef4444',
            message: '<strong>Error:</strong> Shape edges cannot cross!'
          },
          shapeOptions: {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.2,
            weight: 2
          }
        }
      },
      edit: {
        featureGroup: drawnItemsRef.current,
        remove: true
      }
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Handle shape creation
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      const type = e.layerType;
      
      // Clear previous shapes
      drawnItemsRef.current.clearLayers();
      
      // Add new shape
      drawnItemsRef.current.addLayer(layer);
      
      // Get bounds
      const bounds = layer.getBounds ? layer.getBounds() : layer.getLatLng().toBounds(1000);
      
      // Callback
      onShapeDrawn(layer, type, bounds);
    });

    // Handle draw start
    if (onDrawStart) {
      map.on(L.Draw.Event.DRAWSTART, onDrawStart);
    }

    // Cleanup
    return () => {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      map.removeLayer(drawnItemsRef.current);
      map.off(L.Draw.Event.CREATED);
      if (onDrawStart) {
        map.off(L.Draw.Event.DRAWSTART);
      }
    };
  }, [map, enabled, onShapeDrawn, onDrawStart]);

  return null;
}
