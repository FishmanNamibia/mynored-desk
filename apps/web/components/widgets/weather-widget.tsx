"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind } from "lucide-react";
import { useEffect, useState } from "react";

type WeatherState = {
  temp: number | null;
  condition: string;
  location: string;
  humidity: number | null;
  wind: number | null;
  loading: boolean;
  error?: string | null;
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherState>({
    temp: null,
    condition: "Loading...",
    location: "Detecting location...",
    humidity: null,
    wind: null,
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

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const weatherUrl =
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
            "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code";

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
          const humidity =
            typeof current.relative_humidity_2m === "number"
              ? Math.round(current.relative_humidity_2m)
              : null;
          const wind =
            typeof current.wind_speed_10m === "number"
              ? Math.round(current.wind_speed_10m)
              : null;
          const code = current.weather_code as number | undefined;

          const condition = mapWeatherCodeToCondition(code);

          setWeather({
            temp,
            condition: condition || "Weather available",
            location: locationName,
            humidity,
            wind,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          setWeather((prev) => ({
            ...prev,
            loading: false,
            error: error?.message || "Failed to load weather",
            condition: "Weather unavailable",
            location: "Location unavailable",
          }));
        }
      },
      (err) => {
        setWeather((prev) => ({
          ...prev,
          loading: false,
          error: err.message || "Location permission denied",
          condition: "Weather unavailable",
          location: "Location permission denied",
        }));
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 8000,
      },
    );
  }, []);

  const mapWeatherCodeToCondition = (code?: number): string => {
    if (code === undefined || code === null) return "Unknown";

    if ([0].includes(code)) return "Sunny";
    if ([1, 2, 3].includes(code)) return "Partly Cloudy";
    if ([45, 48].includes(code)) return "Foggy";
    if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rainy";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
    if ([95, 96, 99].includes(code)) return "Storm";
    return "Cloudy";
  };

  // Calculate feels like temperature (simplified heat index approximation)
  const getFeelsLike = () => {
    if (weather.temp === null || weather.humidity === null) return null;
    const temp = weather.temp;
    const humidity = weather.humidity;
    // Simple feels-like calculation
    if (temp >= 27) {
      return Math.round(temp + 0.33 * humidity * 0.1 - 4);
    }
    return temp;
  };

  const feelsLike = getFeelsLike();

  return (
    <Card 
      className="relative overflow-hidden border-0 h-full"
      style={{
        borderRadius: "12px",
        background: "linear-gradient(135deg, #4A90E2 0%, #2E5BFF 100%)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        fontFamily: "Inter, 'SF Pro Display', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      {/* Decorative cloud - bottom right */}
      <div className="absolute -bottom-8 -right-8 opacity-20">
        <Cloud className="w-48 h-48 text-white" strokeWidth={1} />
      </div>

      <CardContent className="p-8 h-full flex flex-col justify-between relative z-10">
        <div>
          {/* Weather Status Label */}
          <p className="text-xs font-medium uppercase tracking-widest text-white/60 mb-1">
            Weather Status
          </p>
          
          {/* Location */}
          <p className="text-lg font-semibold text-white mb-3">
            {weather.location}
          </p>
          
          {/* Temperature Display */}
          <div className="flex items-start gap-4">
            <p 
              className="text-5xl font-bold text-white"
              style={{ lineHeight: 1 }}
            >
              {weather.temp !== null ? `${weather.temp}°C` : "--°C"}
            </p>
            <div className="mt-1">
              <p className="text-sm font-medium text-white/90">
                {weather.condition}
              </p>
              <p className="text-xs text-white/70">
                {feelsLike !== null ? `Feels like ${feelsLike}°C` : ""}
              </p>
            </div>
          </div>
        </div>
        
        {/* Bottom Stats */}
        <div className="flex items-center gap-6 mt-4 text-sm text-white/80">
          <span className="flex items-center gap-1.5">
            <Wind className="w-4 h-4" />
            {weather.wind !== null ? `${weather.wind} km/h` : "--"}
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4" />
            </svg>
            {weather.humidity !== null ? `${weather.humidity}%` : "--"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
