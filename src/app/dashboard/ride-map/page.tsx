"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import {
  Map as MapIcon,
  Car,
  Navigation,
  CheckCircle,
  Clock,
  Maximize2,
  X,
  Loader2,
} from "lucide-react";
import { notify } from "@/lib/notify";
import { useAdminApi } from "@/lib/useAdminApi";
import type {
  RideMapDriver,
  RideMapDriversResponse,
} from "@/app/api/admin/ride-map-drivers/route";

type DriverFilter = "all" | "online" | "offline" | "unverified";

// Car marker icon. Place mapdrive-image.jpeg at public/assets/images/mapdrive-image.jpeg
const CAR_ICON_URL = "/assets/images/mapdrive-image.jpeg";
const CAR_ICON_SIZE = 24;

let googleMapsPromise: Promise<void> | null = null;
let googleMapsApiKey: string | null = null;

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("Google Maps can only load in the browser."),
    );
  }

  if (googleMapsPromise && googleMapsApiKey === apiKey) {
    return googleMapsPromise;
  }

  googleMapsApiKey = apiKey;
  setOptions({ key: apiKey, v: "weekly" });
  googleMapsPromise = Promise.all([
    importLibrary("maps"),
    importLibrary("places"),
  ]).then(() => undefined);
  return googleMapsPromise;
}

const getDriverDotColor = (driver: RideMapDriver) => {
  if (!driver.admin_verify) {
    return "#6b7280";
  }

  return driver.is_online ? "#22c55e" : "#f97316";
};

export default function RideMapPage() {
  const adminApi = useAdminApi();
  const [drivers, setDrivers] = useState<RideMapDriver[]>([]);
  const [filter, setFilter] = useState<DriverFilter>("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Record<string, google.maps.Marker>>({});
  const infoWindowsRef = useRef<Record<string, google.maps.InfoWindow>>({});
  const hasFitBoundsRef = useRef(false);

  const apiKey = useMemo(() => process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, []);

  const driversWithCoords = useMemo(
    () =>
      drivers.filter(
        (driver) =>
          typeof driver.location_lat === "number" &&
          typeof driver.location_lng === "number",
      ),
    [drivers],
  );

  const filteredDrivers = useMemo(() => {
    if (filter === "all") {
      return driversWithCoords;
    }

    if (filter === "online") {
      return driversWithCoords.filter(
        (driver) => driver.admin_verify && driver.is_online,
      );
    }

    if (filter === "offline") {
      return driversWithCoords.filter(
        (driver) => driver.admin_verify && !driver.is_online,
      );
    }

    return driversWithCoords.filter((driver) => !driver.admin_verify);
  }, [driversWithCoords, filter]);

  const totalDrivers = driversWithCoords.length;
  const onlineCount = driversWithCoords.filter(
    (driver) => driver.admin_verify && driver.is_online,
  ).length;
  const offlineCount = driversWithCoords.filter(
    (driver) => driver.admin_verify && !driver.is_online,
  ).length;
  const unverifiedCount = driversWithCoords.filter(
    (driver) => !driver.admin_verify,
  ).length;

  const getDriverStatusLabel = useCallback((driver: RideMapDriver) => {
    if (!driver.admin_verify) {
      return "Unverified";
    }

    return driver.is_online ? "Online" : "Offline";
  }, []);

  const infoWindowContent = useCallback(
    (driver: RideMapDriver) => `
       <div style="padding: 8px;">
         <p style="font-weight: 600; margin-bottom: 4px;">${driver.first_name} ${driver.last_name}</p>
         <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${driver.vehicle_type ?? "Driver"}</p>
         <p style="font-size: 12px; color: #666; margin-bottom: 4px;">${driver.phone_num}</p>
         <p style="font-size: 12px;">
           <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${getDriverDotColor(driver)}; margin-right: 4px;"></span>
           ${getDriverStatusLabel(driver)}
         </p>
       </div>
     `,
    [getDriverStatusLabel],
  );

  // Sync markers with the current (filtered) vehicle list. Reuses existing
  // markers — moving them with setPosition for a smooth glide — instead of
  // tearing everything down and rebuilding it on every render.
  const syncMarkers = useCallback(
    (list: RideMapDriver[]) => {
      const map = googleMapRef.current;
      if (!map) return;

      const activeIds = new Set(list.map((driver) => driver.uuid));

      Object.entries(markersRef.current).forEach(([idStr, marker]) => {
        const id = idStr;
        if (!activeIds.has(id)) {
          marker.setMap(null);
          delete markersRef.current[id];
          delete infoWindowsRef.current[id];
        }
      });

      list.forEach((driver) => {
        if (driver.location_lat === null || driver.location_lng === null) {
          return;
        }

        const position = { lat: driver.location_lat, lng: driver.location_lng };
        let marker = markersRef.current[driver.uuid];

        if (!marker) {
          marker = new google.maps.Marker({
            position,
            map,
            title: `${driver.first_name} ${driver.last_name}`,
            icon: {
              url: CAR_ICON_URL,
              scaledSize: new google.maps.Size(CAR_ICON_SIZE, CAR_ICON_SIZE),
              anchor: new google.maps.Point(
                CAR_ICON_SIZE / 2,
                CAR_ICON_SIZE / 2,
              ),
            },
          });

          const infoWindow = new google.maps.InfoWindow({
            content: infoWindowContent(driver),
          });
          marker.addListener("click", () => {
            infoWindow.open(map, marker);
          });

          markersRef.current[driver.uuid] = marker;
          infoWindowsRef.current[driver.uuid] = infoWindow;
        } else {
          marker.setPosition(position);
          infoWindowsRef.current[driver.uuid]?.setContent(
            infoWindowContent(driver),
          );
        }
      });
    },
    [infoWindowContent],
  );

  // Load Google Maps and create the map instance
  useEffect(() => {
    if (!apiKey || apiKey === "your_google_maps_api_key_here") {
      notify.warning("Google Maps API key is not configured");
      setMapLoading(false);
      setMapError("missing-key");
      return;
    }

    setMapLoading(true);
    setMapError(null);

    loadGoogleMaps(apiKey)
      .then(() => {
        if (!mapRef.current || googleMapRef.current) {
          setMapLoading(false);
          return;
        }

        if (typeof google.maps?.Map !== "function") {
          throw new Error(
            "Google Maps failed to initialize. Check API restrictions (HTTP referrers), billing, and enabled APIs.",
          );
        }

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 6.5244, lng: 3.3792 },
          zoom: 12,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });
        googleMapRef.current = map;

        // Force a resize/recenter once the container has settled — without
        // this, the map can render as a blank grey box the first time the
        // container's real dimensions are applied after mount.
        google.maps.event.addListenerOnce(map, "idle", () => {
          setMapLoading(false);
        });
        requestAnimationFrame(() => {
          google.maps.event.trigger(map, "resize");
          map.setCenter({ lat: 6.5244, lng: 3.3792 });
        });

        syncMarkers(filteredDrivers);
        if (!hasFitBoundsRef.current && filteredDrivers.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          for (const driver of filteredDrivers) {
            if (driver.location_lat !== null && driver.location_lng !== null) {
              bounds.extend({
                lat: driver.location_lat,
                lng: driver.location_lng,
              });
            }
          }
          if (!bounds.isEmpty()) {
            map.fitBounds(bounds, 80);
            hasFitBoundsRef.current = true;
          }
        }
      })
      .catch((error) => {
        const message =
          error instanceof Error ? error.message : "Could not load Google Maps";
        notify.error(message);
        setMapError(message);
        setMapLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, filteredDrivers, syncMarkers]);

  // Re-trigger resize whenever the fullscreen layout toggles, since the
  // container's dimensions change without the map instance being recreated.
  useEffect(() => {
    const map = googleMapRef.current;
    if (!map) return;
    requestAnimationFrame(() => {
      google.maps.event.trigger(map, "resize");
    });
  }, [isFullscreen]);

  // Keep markers in sync with the active filter / vehicle data
  useEffect(() => {
    syncMarkers(filteredDrivers);
  }, [filteredDrivers, syncMarkers]);

  useEffect(() => {
    if (!adminApi.ready) {
      return;
    }

    let mounted = true;
    let interval: number | null = null;

    const fetchDrivers = async (force?: boolean) => {
      setDriversError(null);
      setDriversLoading(true);

      try {
        const payload = await adminApi.getJsonCached<RideMapDriversResponse>(
          "ride-map-drivers:v1",
          "/api/admin/ride-map-drivers",
          { ttlMs: 10_000, force: Boolean(force) },
        );

        if (!mounted) {
          return;
        }

        setDrivers(payload.drivers);
      } catch (error) {
        if (!mounted) {
          return;
        }

        setDriversError(
          error instanceof Error ? error.message : "Could not load drivers.",
        );
        setDrivers([]);
      } finally {
        if (mounted) {
          setDriversLoading(false);
        }
      }
    };

    void fetchDrivers(true);
    interval = window.setInterval(() => void fetchDrivers(false), 10_000);

    return () => {
      mounted = false;
      if (interval !== null) {
        window.clearInterval(interval);
      }
    };
  }, [adminApi]);

  const showKeyFallback = !apiKey || apiKey === "your_google_maps_api_key_here";

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <MapIcon size={28} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Ride Map - Lagos Inner City
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-purple-700 dark:text-purple-400">
                Total Tracked
              </h3>
              <Car size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
              {totalDrivers}
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400">
                Online
              </h3>
              <CheckCircle
                size={20}
                className="text-green-600 dark:text-green-400"
              />
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">
              {onlineCount}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-orange-700 dark:text-orange-400">
                Offline
              </h3>
              <Navigation
                size={20}
                className="text-orange-600 dark:text-orange-400"
              />
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">
              {offlineCount}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/40 dark:to-gray-800/20 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-400">
                Unverified
              </h3>
              <Clock size={20} className="text-gray-600 dark:text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-300">
              {unverifiedCount}
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Car size={18} className="text-gray-600 dark:text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Filter Drivers
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === "all"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              All Drivers
            </button>
            <button
              onClick={() => setFilter("online")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === "online"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Online
            </button>
            <button
              onClick={() => setFilter("offline")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === "offline"
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Offline
            </button>
            <button
              onClick={() => setFilter("unverified")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === "unverified"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Unverified
            </button>
          </div>
        </div>

        {/* Map Display */}
        <div
          className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden ${
            isFullscreen ? "fixed inset-0 z-50 rounded-none" : "rounded-lg"
          }`}
        >
          {isFullscreen && (
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapIcon
                    size={24}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Ride Map - Full View ({filteredDrivers.length} drivers)
                  </h2>
                </div>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                  title="Exit Fullscreen"
                >
                  <X size={24} className="text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>
          )}

          <div
            className="relative"
            style={{ height: isFullscreen ? "calc(100vh - 73px)" : "500px" }}
          >
            <div ref={mapRef} className="absolute inset-0" />

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="absolute top-4 right-4 z-10 p-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 transition"
              title={isFullscreen ? "Exit Fullscreen" : "View Fullscreen"}
            >
              {isFullscreen ? (
                <X size={20} className="text-gray-700 dark:text-gray-300" />
              ) : (
                <Maximize2
                  size={20}
                  className="text-gray-700 dark:text-gray-300"
                />
              )}
            </button>

            {/* Loading overlay while the map spins up */}
            {!showKeyFallback && mapLoading && !mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 z-0">
                <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                  <Loader2 size={28} className="animate-spin" />
                  <p className="text-sm">Loading live map…</p>
                </div>
              </div>
            )}

            {/* API key missing */}
            {showKeyFallback && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 z-0">
                <div className="text-center p-8 bg-white/90 dark:bg-gray-800/90 rounded-lg backdrop-blur-sm">
                  <MapIcon
                    size={48}
                    className="mx-auto mb-4 text-blue-600 dark:text-blue-400"
                  />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Google Maps Integration Ready
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Add your Google Maps API key to .env.local
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
                    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
                  </p>
                </div>
              </div>
            )}

            {/* Map failed to initialize for a reason other than a missing key */}
            {!showKeyFallback && mapError && mapError !== "missing-key" && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-950/20 z-0">
                <div className="text-center p-8 bg-white/90 dark:bg-gray-800/90 rounded-lg backdrop-blur-sm max-w-md">
                  <MapIcon size={48} className="mx-auto mb-4 text-red-500" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    Map failed to load
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {mapError}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
