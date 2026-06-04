"use client";

import { Cloud } from "lucide-react";
import { useEffect, useState } from "react";

type WeatherState = {
  temp: number | null;
  location: string;
  loading: boolean;
  error?: string | null;
};

export function HeaderWeatherWidget() {
  const [weather, setWeather] = useState<WeatherState>({
    temp: null,
    location: "Loading...",
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setWeather((prev) => ({
        ...prev,
        loading: false,
        error: "Location not available",
        location: "Location unavailable",
      }));
      return;
    }

    // Temporarily disable weather widget in development to prevent API errors
    if (process.env.NODE_ENV === 'development') {
      setWeather((prev) => ({
        ...prev,
        loading: false,
        temp: 23, // Mock temperature
        location: "Windhoek, NAM",
        error: null,
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const weatherUrl =
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
            "&current=temperature_2m,weather_code";

          const reverseGeocodeUrl = `/dashboard/performance/api/location-name?lat=${encodeURIComponent(
            latitude,
          )}&lon=${encodeURIComponent(longitude)}`;

          const [weatherRes, geoRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(reverseGeocodeUrl),
          ]);

          if (!weatherRes.ok) {
            throw new Error(`Weather API error: ${weatherRes.status}`);
          }

          const weatherData: any = await weatherRes.json();
          const current = weatherData.current || {};

          let locationName = "Your location";

          if (geoRes.ok) {
            try {
              const geoData: any = await geoRes.json();
              if (geoData?.name) {
                locationName = geoData.name;
              }
            } catch {
              // Fallback to default location name on geocoding parse errors
            }
          }

          const temp =
            typeof current.temperature_2m === "number"
              ? Math.round(current.temperature_2m)
              : null;

          setWeather({
            temp,
            location: locationName,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          // Don't spam console with weather API errors in development
          console.debug("[Weather] Failed to load weather data:", error?.message || error);
          setWeather((prev) => ({
            ...prev,
            loading: false,
            error: error?.message || "Failed to load weather",
            location: "Location unavailable",
          }));
        }
      },
      (err) => {
        setWeather((prev) => ({
          ...prev,
          loading: false,
          error: err.message || "Location permission denied",
          location: "Location denied",
        }));
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 8000,
      },
    );
  }, []);

  return (
    <div
      className="flex items-center gap-3"
      style={{
        height: "42px",
        borderRadius: "8px",
        padding: "8px 16px",
      }}
    >
      {/* Weather Icon */}
      <Cloud className="w-7 h-7" style={{ color: "#5B9EFF" }} fill="currentColor" />
      
      {/* Weather Info */}
      <div className="flex flex-col gap-0.5">
        <div className="text-lg font-bold text-white leading-none">
          {weather.temp !== null ? `${weather.temp}°C` : "--°C"}
        </div>
        <div className="text-xs leading-none" style={{ color: "rgba(255,255,255,0.7)" }}>
          {weather.loading ? "Loading..." : weather.location}
        </div>
      </div>
    </div>
  );
}