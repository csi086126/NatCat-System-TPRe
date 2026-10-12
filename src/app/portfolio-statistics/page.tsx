'use client';

import { useState, useEffect, useRef } from 'react';
import AppHeader from '@/components/AppHeader';
import PortfolioStatistics from '@/components/portfolio/PortfolioStatistics';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Database, Layers, Map as MapIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";

// Dynamically import Leaflet components (SSR safe)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });
const MapCoordinateDisplay = dynamic(() => import('@/components/MapCoordinateDisplay').then(mod => mod.MapCoordinateDisplay), { ssr: false });

// TypeScript interface for geocoded portfolio data
interface GeocodedPolicy {
  policy_id: string;
  address: string;
  region: string;
  sum_insured: number;
  occupancy: string;
  construction_class: string;
  location?: {
    lat: number;
    lng: number;
    formatted_address?: string;
  };
  geocode_result?: {
    lat: number;
    lng: number;
    formatted_address?: string;
  };
  lat?: number;
  lng?: number;
  policy_start?: string;
  policy_end?: string;
  coverage_name?: string;
}

export default function PortfolioStatisticsPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [portfolioData, setPortfolioData] = useState<GeocodedPolicy[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const mapRef = useRef<any>(null);

  // Load geocoded portfolio data
  useEffect(() => {
    const loadPortfolioData = async () => {
      try {
        setIsLoadingData(true);
        console.log('[Portfolio Statistics] Starting to load geocoded data...');
        const response = await fetch('/data/tphk-geocoded-portfolio.json');
        console.log('[Portfolio Statistics] Fetch response status:', response.status);

        if (!response.ok) {
          throw new Error(`Failed to load portfolio data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[Portfolio Statistics] Loaded ${data.length} geocoded policies`);
        console.log('[Portfolio Statistics] First policy sample:', data[0]);
        setPortfolioData(data);
      } catch (error) {
        console.error('[Portfolio Statistics] Error loading data:', error);
        console.error('[Portfolio Statistics] Error details:', error instanceof Error ? error.message : String(error));
      } finally {
        setIsLoadingData(false);
      }
    };

    loadPortfolioData();
  }, []);

  // Filter policies based on selected year
  const filteredPolicies = portfolioData.filter(policy => {
    if (!selectedYear) return true;

    // Extract year from policy_start field
    if (policy.policy_start) {
      const policyYear = new Date(policy.policy_start).getFullYear();
      return policyYear === selectedYear;
    }
    return true;
  });

  // Get policies with valid coordinates
  const policiesWithCoords = filteredPolicies.filter(policy => {
    const lat = policy.location?.lat || policy.geocode_result?.lat || policy.lat;
    const lng = policy.location?.lng || policy.geocode_result?.lng || policy.lng;
    return lat && lng && !isNaN(lat) && !isNaN(lng);
  });

  console.log(`[Portfolio Statistics] Displaying ${policiesWithCoords.length} policies on map (filtered from ${filteredPolicies.length} total)`);

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `HKD ${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `HKD ${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `HKD ${(value / 1e3).toFixed(0)}K`;
    return `HKD ${value.toFixed(0)}`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AppHeader />

      <div className="flex-1 overflow-hidden">
        <div className="h-full w-full p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Layers className="h-8 w-8 text-blue-600" />
                    Portfolio Statistics
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Multi-dimensional analysis of TPHK Insurance Portfolio - 68,762 Policies
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Last Updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </div>
            </div>

            {/* Info Card */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-3">
                <Database className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">
                    Data Source Information
                  </h3>
                  <p className="text-xs text-blue-700">
                    Currently using mock sample data. Configure database connection in{' '}
                    <code className="bg-blue-100 px-1 py-0.5 rounded">portfolio_analytics.py</code>{' '}
                    to enable real-time statistics from PostgreSQL.
                  </p>
                </div>
              </div>
            </Card>

            {/* Year Filter & Map Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700">Filter by Year:</span>
                <div className="flex gap-2">
                  <Button
                    variant={selectedYear === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedYear(null)}
                  >
                    All Years
                  </Button>
                  {[2021, 2022, 2023, 2024].map(year => (
                    <Button
                      key={year}
                      variant={selectedYear === year ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedYear(year)}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                variant={showMap ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMap(!showMap)}
                className="flex items-center gap-2"
              >
                <MapIcon className="h-4 w-4" />
                {showMap ? 'Hide Map' : 'Show Map'}
              </Button>
            </div>

            {/* Map Display */}
            {showMap && (
              <Card className="p-0 overflow-hidden">
                <div className="h-[500px] relative">
                  {isLoadingData ? (
                    <div className="h-full flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading geocoded data...</p>
                      </div>
                    </div>
                  ) : (
                    <MapContainer
                      ref={mapRef}
                      center={[22.3193, 114.1694]}
                      zoom={11}
                      className="h-full w-full"
                      zoomControl={true}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      />

                      {/* Policy Markers */}
                      {policiesWithCoords.map((policy, index) => {
                        const lat = policy.location?.lat || policy.geocode_result?.lat || policy.lat;
                        const lng = policy.location?.lng || policy.geocode_result?.lng || policy.lng;

                        if (!lat || !lng) return null;

                        return (
                          <Marker
                            key={`${policy.policy_id}-${index}`}
                            position={[lat, lng]}
                          >
                            <Popup>
                              <div className="min-w-[260px]">
                                <div className="font-bold text-sm mb-2 text-blue-900">
                                  {policy.policy_id}
                                </div>
                                <div className="text-xs space-y-1.5 text-gray-700">
                                  <div>
                                    <span className="font-medium">Address:</span>
                                    <div className="text-gray-600 mt-0.5">{policy.address}</div>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t">
                                    <span className="text-gray-600">Region:</span>
                                    <span className="font-medium">{policy.region}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Sum Insured:</span>
                                    <span className="font-semibold text-green-700">
                                      {formatCurrency(policy.sum_insured)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Occupancy:</span>
                                    <span className="font-medium text-xs bg-blue-50 px-1.5 py-0.5 rounded">
                                      {policy.occupancy}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Construction:</span>
                                    <span className="font-medium text-xs">
                                      {policy.construction_class?.split('-')[1] || policy.construction_class}
                                    </span>
                                  </div>
                                  {policy.coverage_name && (
                                    <div className="flex justify-between pt-1 border-t">
                                      <span className="text-gray-600">Coverage:</span>
                                      <span className="font-medium">{policy.coverage_name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}

                      <MapCoordinateDisplay />
                    </MapContainer>
                  )}

                  {/* Map Statistics Overlay */}
                  {!isLoadingData && (
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur rounded-lg shadow-lg p-3 z-[1000]">
                      <div className="text-xs space-y-1">
                        <div className="font-semibold text-gray-900 mb-2">Map Statistics</div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Policies Shown:</span>
                          <span className="font-bold text-blue-600">{policiesWithCoords.length.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Total Filtered:</span>
                          <span className="font-medium">{filteredPolicies.length.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Total Dataset:</span>
                          <span className="font-medium">{portfolioData.length.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Statistics Component */}
            <Card className="p-6">
              <PortfolioStatistics selectedYear={selectedYear} />
            </Card>

            {/* Quick Links */}
            <Card className="p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h3>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/asset')}
                  className="justify-start"
                >
                  📊 Portfolio Management
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/riskmap')}
                  className="justify-start"
                >
                  🗺️ Risk Map
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!process.env.NEXT_PUBLIC_PORTFOLIO_API_URL}
                  onClick={() => {
                    const url = process.env.NEXT_PUBLIC_PORTFOLIO_API_URL;
                    if (!url) {
                      console.warn('Portfolio API URL 未配置 (NEXT_PUBLIC_PORTFOLIO_API_URL)');
                      return;
                    }
                    window.open(`${url.replace(/\/$/, '')}/docs`, '_blank');
                  }}
                  className="justify-start"
                >
                  🔧 API Documentation
                </Button>
              </div>
            </Card>

            {/* Footer Info */}
            <div className="text-center text-xs text-gray-500 pb-4">
              <p>Natural Catastrophe Risk Platform • Portfolio Statistics Module</p>
              <p className="mt-1">
                For technical support, check{' '}
                <span className="font-mono bg-gray-100 px-1 rounded">MD/DATABASE_CONFIGURATION_GUIDE.md</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
