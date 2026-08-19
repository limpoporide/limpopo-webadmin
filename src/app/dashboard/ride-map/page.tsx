'use client';

import { useState, useEffect, useRef } from 'react';
import { Map, Car, Navigation, CheckCircle, Clock, Maximize2, X } from 'lucide-react';

type VehicleStatus = 'available' | 'enroute' | 'booked';

type Vehicle = {
  id: number;
  type: string;
  status: VehicleStatus;
  location: string;
  lat: number;
  lng: number;
};

const sampleVehicles: Vehicle[] = [
  { id: 1, type: 'Limpopo Pro', status: 'available', location: 'Victoria Island', lat: 6.4281, lng: 3.4219 },
  { id: 2, type: 'Limpopo Pro-Max', status: 'enroute', location: 'Lekki', lat: 6.4474, lng: 3.4700 },
  { id: 3, type: 'Limpopo Pro', status: 'booked', location: 'Ikeja', lat: 6.6018, lng: 3.3515 },
  { id: 4, type: 'Limpopo Pro-Max', status: 'available', location: 'Surulere', lat: 6.4969, lng: 3.3615 },
  { id: 5, type: 'Limpopo Pro', status: 'enroute', location: 'Yaba', lat: 6.5074, lng: 3.3777 },
  { id: 6, type: 'Limpopo Pro', status: 'available', location: 'Ikoyi', lat: 6.4550, lng: 3.4350 },
  { id: 7, type: 'Limpopo Pro-Max', status: 'booked', location: 'Maryland', lat: 6.5629, lng: 3.3669 },
  { id: 8, type: 'Limpopo Pro', status: 'enroute', location: 'Apapa', lat: 6.4474, lng: 3.3597 },
];

export default function RideMapPage() {
  const [vehicles] = useState<Vehicle[]>(sampleVehicles);
  const [filter, setFilter] = useState<VehicleStatus | 'all'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const filteredVehicles = filter === 'all' 
    ? vehicles 
    : vehicles.filter(v => v.status === filter);

  const totalVehicles = vehicles.length;
  const availableCount = vehicles.filter(v => v.status === 'available').length;
  const enrouteCount = vehicles.filter(v => v.status === 'enroute').length;
  const bookedCount = vehicles.filter(v => v.status === 'booked').length;

  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'enroute': return 'bg-blue-500';
      case 'booked': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: VehicleStatus) => {
    switch (status) {
      case 'available': return 'Available';
      case 'enroute': return 'En Route';
      case 'booked': return 'Booked';
      default: return status;
    }
  };

  // Initialize Google Map
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      console.warn('Google Maps API key not configured');
      return;
    }

    // Load Google Maps Script
    const loadGoogleMapsScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (typeof google !== 'undefined' && google.maps) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps'));
        document.head.appendChild(script);
      });
    };

    loadGoogleMapsScript()
      .then(() => {
        if (mapRef.current && !googleMapRef.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: { lat: 6.5244, lng: 3.3792 }, // Lagos center
            zoom: 12,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
          });
          googleMapRef.current = map;

          // Add markers for vehicles
          addMarkersToMap();
        }
      })
      .catch((error) => {
        console.error('Error loading Google Maps:', error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when filter changes
  useEffect(() => {
    if (googleMapRef.current) {
      addMarkersToMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const addMarkersToMap = () => {
    if (!googleMapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    filteredVehicles.forEach(vehicle => {
      const marker = new google.maps.Marker({
        position: { lat: vehicle.lat, lng: vehicle.lng },
        map: googleMapRef.current,
        title: `${vehicle.type} - ${vehicle.location}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: vehicle.status === 'available' ? '#22c55e' : vehicle.status === 'enroute' ? '#3b82f6' : '#f97316',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <p style="font-weight: 600; margin-bottom: 4px;">${vehicle.type}</p>
            <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${vehicle.location}</p>
            <p style="font-size: 12px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${vehicle.status === 'available' ? '#22c55e' : vehicle.status === 'enroute' ? '#3b82f6' : '#f97316'}; margin-right: 4px;"></span>
              ${getStatusLabel(vehicle.status)}
            </p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current!, marker);
      });

      markersRef.current.push(marker);
    });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Map size={28} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ride Map - Lagos Inner City
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">Total Tracked</h3>
              <Car size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">{totalVehicles}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400">Available</h3>
              <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">{availableCount}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">En Route</h3>
              <Navigation size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{enrouteCount}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-orange-700 dark:text-orange-400">Booked</h3>
              <Clock size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{bookedCount}</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Car size={18} className="text-gray-600 dark:text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Filter Vehicles</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All Vehicles
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'available'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => setFilter('enroute')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'enroute'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              En Route
            </button>
            <button
              onClick={() => setFilter('booked')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'booked'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Booked
            </button>
          </div>
        </div>

        {/* Map Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="relative" style={{ height: '500px' }}>
            {/* Google Map Container */}
            <div ref={mapRef} className="absolute inset-0" />
            
            {/* Fullscreen Toggle Button */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="absolute top-4 right-4 z-10 p-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
            >
              {isFullscreen ? (
                <X size={20} className="text-gray-700 dark:text-gray-300" />
              ) : (
                <Maximize2 size={20} className="text-gray-700 dark:text-gray-300" />
              )}
            </button>

            {/* API Key Missing Fallback */}
            {(!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key_here') && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 z-0">
                <div className="text-center p-8 bg-white/90 dark:bg-gray-800/90 rounded-lg backdrop-blur-sm">
                  <Map size={48} className="mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Google Maps Integration Ready</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Add your Google Maps API key to .env.local
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900">
          <div className="h-full flex flex-col">
            {/* Fullscreen Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Map size={24} className="text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Ride Map - Full View ({filteredVehicles.length} vehicles)
                  </h2>
                </div>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <X size={24} className="text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
            
            {/* Fullscreen Map */}
            <div className="flex-1 relative">
              <div ref={mapRef} className="absolute inset-0" />
              
              {/* API Key Missing Fallback */}
              {(!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key_here') && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
                  <div className="text-center p-8 bg-white/90 dark:bg-gray-800/90 rounded-lg backdrop-blur-sm">
                    <Map size={64} className="mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Google Maps Integration Ready</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Add your Google Maps API key to .env.local to enable the map
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
