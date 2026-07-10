/**
 * WMS TileLayer wrapper for react-leaflet v5
 * Uses createTileLayerComponent pattern for proper LayersControl integration
 */

'use client';

import { createLayerComponent } from '@react-leaflet/core';
import L from 'leaflet';

interface WMSLayerProps extends L.WMSOptions {
  url: string;
  params?: L.WMSParams;
}

export const WMSLayer = createLayerComponent<L.TileLayer.WMS, WMSLayerProps>(
  function createWMSLayer({ url, params, ...options }, ctx) {
    const layer = L.tileLayer.wms(url, { ...params, ...options });
    return { instance: layer, context: ctx };
  },
  function updateWMSLayer(layer, props, prevProps) {
    // Handle props updates if needed
  }
);
