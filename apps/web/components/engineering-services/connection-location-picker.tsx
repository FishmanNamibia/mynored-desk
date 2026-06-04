"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Target } from "lucide-react";
import { newConnectionApiBase } from "@/lib/engineering-services/new-connection-management";

const DynamicLocationMap = dynamic(
  () =>
    import("@/components/engineering-services/connection-location-map").then(
      (mod) => mod.ConnectionLocationMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-xl border border-red-100 bg-red-50/30 text-sm text-muted-foreground">
        Loading map picker...
      </div>
    ),
  },
);

const defaultCenter = { lat: -22.5609, lng: 17.0658 };

interface SearchResult {
  name: string;
  lat: number;
  lon: number;
}

interface ConnectionLocationPickerProps {
  coordinates: string;
  locality: string;
  onCoordinatesChange: (value: string) => void;
  onCoordinateSourceChange: (value: string) => void;
}

function parseCoordinates(value: string) {
  const match = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) {
    return null;
  }

  return {
    lat: Number(match[1]),
    lng: Number(match[2]),
  };
}

function formatCoordinates(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function ConnectionLocationPicker({
  coordinates,
  locality,
  onCoordinatesChange,
  onCoordinateSourceChange,
}: ConnectionLocationPickerProps) {
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(
    parseCoordinates(coordinates),
  );
  const [detectedLocation, setDetectedLocation] = useState("");
  const [searchQuery, setSearchQuery] = useState(locality);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    setSelectedPoint(parseCoordinates(coordinates));
  }, [coordinates]);

  useEffect(() => {
    if (!searchQuery && locality) {
      setSearchQuery(locality);
    }
  }, [locality, searchQuery]);

  const mapCenter = useMemo(() => selectedPoint ?? defaultCenter, [selectedPoint]);

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const response = await fetch(
        `${newConnectionApiBase}/location-name?lat=${lat}&lon=${lng}`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as { name?: string };
      if (data.name) {
        setDetectedLocation(data.name);
      }
    } catch {
      // Ignore lookup failures and keep the selected coordinates.
    }
  }

  function applySelectedPoint(lat: number, lng: number, source: string) {
    setSelectedPoint({ lat, lng });
    onCoordinatesChange(formatCoordinates(lat, lng));
    onCoordinateSourceChange(source);
    void reverseGeocode(lat, lng);
  }

  async function searchLocations() {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${newConnectionApiBase}/location-search?q=${encodeURIComponent(query)}`,
      );
      const data = (await response.json()) as { results?: SearchResult[] };
      setSearchResults(data.results ?? []);

      if (data.results?.[0]) {
        applySelectedPoint(data.results[0].lat, data.results[0].lon, "Map picker");
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applySelectedPoint(position.coords.latitude, position.coords.longitude, "Current location");
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-red-100 bg-red-50/30 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Map location picker</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Search for a place, use your current position, or click directly on the map to fill the
            connection coordinates.
          </p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-red-700 shadow-sm">
          {selectedPoint ? formatCoordinates(selectedPoint.lat, selectedPoint.lng) : "No point selected yet"}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_auto_auto]">
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search town, village, street, or area"
          className="border-red-100 bg-white"
        />
        <Button
          type="button"
          onClick={searchLocations}
          disabled={isSearching}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          <Search className="h-4 w-4" />
          {isSearching ? "Searching..." : "Find on map"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={useCurrentLocation}
          disabled={isLocating}
          className="border-red-200 bg-white text-foreground hover:bg-red-50"
        >
          <Target className="h-4 w-4" />
          {isLocating ? "Locating..." : "Use current location"}
        </Button>
      </div>

      <DynamicLocationMap
        center={mapCenter}
        selectedPoint={selectedPoint}
        onSelect={(lat, lng) => applySelectedPoint(lat, lng, "Map picker")}
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-red-100 bg-white p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <MapPin className="h-4 w-4 text-red-600" />
            Selected area
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {detectedLocation || "Pick a point on the map to detect the location name."}
          </p>
        </div>

        <div className="rounded-xl border border-red-100 bg-white p-3">
          <p className="text-sm font-semibold text-foreground">Search results</p>
          <div className="mt-2 space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Search results will appear here and the first match will center the map.
              </p>
            ) : (
              searchResults.slice(0, 3).map((result) => (
                <button
                  key={`${result.lat}-${result.lon}-${result.name}`}
                  type="button"
                  onClick={() => applySelectedPoint(result.lat, result.lon, "Map picker")}
                  className="w-full rounded-lg border border-red-100 bg-red-50/40 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-red-100/50"
                >
                  {result.name}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
