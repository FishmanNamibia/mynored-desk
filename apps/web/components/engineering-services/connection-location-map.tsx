"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

interface MapCanvasProps {
  center: { lat: number; lng: number };
  selectedPoint: { lat: number; lng: number } | null;
  onSelect: (lat: number, lng: number) => void;
}

function MapEvents({
  center,
  selectedPoint,
  onSelect,
}: MapCanvasProps) {
  const map = useMap();

  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
  }, [center.lat, center.lng, map]);

  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });

  if (!selectedPoint) {
    return null;
  }

  return (
    <CircleMarker
      center={[selectedPoint.lat, selectedPoint.lng]}
      radius={10}
      pathOptions={{
        color: "#b91c1c",
        fillColor: "#ef4444",
        fillOpacity: 0.45,
        weight: 2,
      }}
    >
      <Popup>Selected connection location</Popup>
    </CircleMarker>
  );
}

export function ConnectionLocationMap({
  center,
  selectedPoint,
  onSelect,
}: MapCanvasProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={selectedPoint ? 14 : 6}
      scrollWheelZoom
      className="h-[320px] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents center={center} selectedPoint={selectedPoint} onSelect={onSelect} />
    </MapContainer>
  );
}
