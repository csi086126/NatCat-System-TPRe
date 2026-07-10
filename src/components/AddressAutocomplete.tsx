'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface AddressSuggestion {
  description: string;
  placeId?: string;
  location?: {
    lat: number;
    lng: number;
  };
  source: 'google' | 'amap' | 'nominatim';
  rawData?: any;
}

interface AddressAutocompleteProps {
  placeholder?: string;
  onSelectAddress: (suggestion: AddressSuggestion) => void;
  googleApiKey?: string;
  amapApiKey?: string;
  className?: string;
  disabled?: boolean;
  onSuggestionsChange?: (suggestions: AddressSuggestion[], isLoading: boolean) => void;
  onInputChange?: (value: string) => void;
}

// Declare Google Maps types
declare global {
  interface Window {
    google?: any;
    initGoogleMaps?: () => void;
  }
}

export default function AddressAutocomplete({
  placeholder = "输入地址搜索... / Enter address...",
  onSelectAddress,
  googleApiKey,
  amapApiKey,
  className = "",
  disabled = false,
  onSuggestionsChange,
  onInputChange,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  // Load Google Maps Script
  useEffect(() => {
    if (!googleApiKey || typeof window === 'undefined') return;

    // Check if already loaded
    if (window.google?.maps?.places) {
      setGoogleMapsLoaded(true);
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      // Create a dummy div for PlacesService
      const dummyDiv = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
      return;
    }

    // Suppress Google Maps errors by overriding console methods
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      // Suppress Google Maps API errors
      if (args[0]?.toString().includes('Google Maps') || args[0]?.toString().includes('DeletedApiProjectMapError')) {
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      // Suppress Google Maps API warnings
      if (args[0]?.toString().includes('Google Maps')) {
        return;
      }
      originalWarn.apply(console, args);
    };

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places&language=zh-CN`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleMapsLoaded(true);
      if (window.google?.maps?.places) {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement('div');
        placesServiceRef.current = new window.google.maps.places.PlacesService(dummyDiv);
      }
    };
    script.onerror = () => {
      // Silently fail - will use Amap/Nominatim instead
      console.log('Google Maps failed to load - using alternative geocoding services');
    };
    document.head.appendChild(script);

    return () => {
      // Restore original console methods
      console.error = originalError;
      console.warn = originalWarn;

      // Cleanup script if component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [googleApiKey]);

  // Detect if query contains Chinese characters
  const containsChinese = (text: string) => {
    return /[\u4e00-\u9fa5]/.test(text);
  };

  // Fetch suggestions from Google Places Autocomplete (using client-side SDK)
  const fetchGoogleSuggestions = async (query: string): Promise<AddressSuggestion[]> => {
    if (!googleMapsLoaded || !autocompleteServiceRef.current) {
      console.log('Google Maps not loaded or service not available');
      return [];
    }

    return new Promise((resolve) => {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          language: 'zh-CN',
        },
        (predictions: any, status: any) => {
          console.log('Google Places API status:', status);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const suggestions = predictions.slice(0, 5).map((prediction: any) => ({
              description: prediction.description,
              placeId: prediction.place_id,
              source: 'google' as const,
              rawData: prediction,
            }));
            console.log(`Google returned ${suggestions.length} results`);
            resolve(suggestions);
          } else {
            console.warn('Google Places API returned status:', status);
            resolve([]);
          }
        }
      );
    });
  };

  // Get place details from Google
  const getGooglePlaceDetails = (placeId: string): Promise<{ lat: number; lng: number; address: string } | null> => {
    if (!placesServiceRef.current) return Promise.resolve(null);

    return new Promise((resolve) => {
      placesServiceRef.current.getDetails(
        {
          placeId: placeId,
          fields: ['geometry', 'formatted_address'],
        },
        (place: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            resolve({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              address: place.formatted_address || '',
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  };

  // Fetch suggestions from Amap Input Tips
  const fetchAmapSuggestions = async (query: string): Promise<AddressSuggestion[]> => {
    if (!amapApiKey) {
      console.log('Amap API key not configured');
      return [];
    }

    try {
      console.log('Fetching from Amap:', query);

      // Detect Hong Kong/Macau keywords
      const hkKeywords = ['香港', '九龍', '九龙', '新界', 'hong kong', 'hongkong', 'hk', '中環', '中环', '銅鑼灣', '铜锣湾', '尖沙咀', '旺角', '北角', 'north point', 'central', 'causeway bay', 'tsim sha tsui', 'mong kok', 'king wha'];
      const moKeywords = ['澳門', '澳门', 'macau', 'macao', '氹仔', '路環', '路环', 'taipa', 'coloane'];
      const isHKQuery = hkKeywords.some(kw => query.toLowerCase().includes(kw.toLowerCase()));
      const isMOQuery = moKeywords.some(kw => query.toLowerCase().includes(kw.toLowerCase()));

      // Use Amap's Input Tips API with city parameter for HK/MO
      let url = `https://restapi.amap.com/v3/assistant/inputtips?keywords=${encodeURIComponent(query)}&key=${amapApiKey}&output=json`;

      if (isHKQuery) {
        url += '&city=香港';
        console.log('🇭🇰 Hong Kong query detected in Amap Input Tips');
      } else if (isMOQuery) {
        url += '&city=澳门';
        console.log('🇲🇴 Macau query detected in Amap Input Tips');
      } else {
        url += '&city=';
      }

      const response = await fetch(url);
      const data = await response.json();

      console.log('Amap Input Tips response:', data);

      if (data.status === '1' && data.tips) {
        const results = data.tips
          .filter((tip: any) => tip.location && tip.location !== '')
          .slice(0, 5)
          .map((tip: any) => {
            const [lng, lat] = tip.location.split(',').map(Number);
            return {
              description: tip.name + (tip.district ? ` - ${tip.district}` : ''),
              location: { lat, lng },
              source: 'amap' as const,
              rawData: tip,
            };
          });
        console.log(`Amap Input Tips returned ${results.length} results`);
        return results;
      }
    } catch (error) {
      console.warn('Amap Input Tips failed:', error);
    }
    return [];
  };

  // Fetch suggestions from Nominatim (OpenStreetMap)
  const fetchNominatimSuggestions = async (query: string): Promise<AddressSuggestion[]> => {
    try {
      console.log('Fetching from Nominatim:', query);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NatCatPlatform/1.0',
        },
      });
      const data = await response.json();

      console.log('Nominatim response:', data);

      if (Array.isArray(data)) {
        const results = data.slice(0, 5).map((result: any) => ({
          description: result.display_name,
          location: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
          },
          source: 'nominatim' as const,
          rawData: result,
        }));
        console.log(`Nominatim returned ${results.length} results`);
        return results;
      }
    } catch (error) {
      console.warn('Nominatim autocomplete failed:', error);
    }
    return [];
  };

  // Fetch all suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    const isChinese = containsChinese(query);

    console.log('=== Starting address search ===');
    console.log('Query:', query);
    console.log('Is Chinese:', isChinese);
    console.log('Google Maps loaded:', googleMapsLoaded);
    console.log('Amap API key:', amapApiKey ? 'configured' : 'not configured');

    try {
      let allSuggestions: AddressSuggestion[] = [];

      // Strategy: Use appropriate service based on language and availability
      if (isChinese) {
        // For Chinese input, prioritize Amap, then try Nominatim as fallback
        const [amapResults, googleResults, nominatimResults] = await Promise.all([
          fetchAmapSuggestions(query),
          fetchGoogleSuggestions(query),
          fetchNominatimSuggestions(query),
        ]);
        console.log('Results - Amap:', amapResults.length, 'Google:', googleResults.length, 'Nominatim:', nominatimResults.length);
        allSuggestions = [...amapResults, ...googleResults, ...nominatimResults];
      } else {
        // For English input, try all services
        const [googleResults, nominatimResults, amapResults] = await Promise.all([
          fetchGoogleSuggestions(query),
          fetchNominatimSuggestions(query),
          fetchAmapSuggestions(query),
        ]);
        console.log('Results - Google:', googleResults.length, 'Nominatim:', nominatimResults.length, 'Amap:', amapResults.length);
        allSuggestions = [...googleResults, ...nominatimResults, ...amapResults];
      }

      // Remove duplicates and limit to 8 suggestions
      const uniqueSuggestions = allSuggestions
        .filter((item, index, self) =>
          index === self.findIndex((t) => t.description === item.description)
        )
        .slice(0, 8);

      console.log('Total unique suggestions:', uniqueSuggestions.length);
      console.log('Setting suggestions:', uniqueSuggestions);
      setSuggestions(uniqueSuggestions);
      setShowSuggestions(uniqueSuggestions.length > 0);
      console.log('Show suggestions set to:', uniqueSuggestions.length > 0);

      // Notify parent component of suggestions change
      if (onSuggestionsChange) {
        onSuggestionsChange(uniqueSuggestions, false);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [googleMapsLoaded, googleApiKey, amapApiKey, onSuggestionsChange]);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setSelectedIndex(-1);

    // Notify parent of input change
    if (onInputChange) {
      onInputChange(value);
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer (300ms debounce)
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);

    // If location is already available (Amap, Nominatim), use it directly
    if (suggestion.location) {
      onSelectAddress(suggestion);
      return;
    }

    // If it's a Google Place, fetch details
    if (suggestion.source === 'google' && suggestion.placeId) {
      try {
        setIsLoading(true);
        const details = await getGooglePlaceDetails(suggestion.placeId);

        if (details) {
          onSelectAddress({
            ...suggestion,
            location: { lat: details.lat, lng: details.lng },
            description: details.address || suggestion.description,
          });
        } else {
          alert('无法获取该地址的详细位置信息');
        }
      } catch (error) {
        console.error('Failed to fetch place details:', error);
        alert('获取地址详情失败');
      } finally {
        setIsLoading(false);
      }
    } else {
      onSelectAddress(suggestion);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>
    </div>
  );
}

// Export the AddressSuggestion type for use in parent component
export type { AddressSuggestion };
