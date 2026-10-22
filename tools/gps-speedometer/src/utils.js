/**
 * Utility functions for GPS Speedometer
 */

export const EARTH_RADIUS_METERS = 6371000;
export const MS_TO_KMH = 3.6;
export const MS_TO_MPH = 2.23694;
export const GRAVITY_MS2 = 9.80665;

/**
 * Calculates the Haversine distance in meters between two lat/lon coordinates.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null || lon1 === null || lat2 === null || lon2 === null ||
    isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
  ) {
    return 0;
  }

  const toRad = (angle) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Converts speed in m/s to target unit ("kmh" or "mph").
 */
export function convertSpeed(speedMs, unit = "kmh") {
  if (speedMs === null || isNaN(speedMs) || speedMs < 0) return 0;
  return unit === "mph" ? speedMs * MS_TO_MPH : speedMs * MS_TO_KMH;
}

/**
 * Formats speed number with specified decimal precision.
 */
export function formatSpeed(speedValue, decimals = 0) {
  if (speedValue === null || isNaN(speedValue) || speedValue < 0) return "0";
  return speedValue.toFixed(decimals);
}

/**
 * Converts heading degrees (0-360) to cardinal direction string.
 */
export function degreesToCardinal(deg) {
  if (deg === null || isNaN(deg)) return "—";
  const normalized = ((deg % 360) + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

/**
 * Classifies GPS accuracy into status category and label.
 */
export function getGpsAccuracyStatus(accuracyMeters) {
  if (accuracyMeters === null || isNaN(accuracyMeters)) {
    return { status: "unknown", label: "Unknown", color: "var(--text-muted)" };
  }
  if (accuracyMeters <= 5) {
    return { status: "excellent", label: "Excellent", color: "#10b981" }; // green
  }
  if (accuracyMeters <= 10) {
    return { status: "good", label: "Good", color: "#3b82f6" }; // blue
  }
  if (accuracyMeters <= 25) {
    return { status: "fair", label: "Fair", color: "#f59e0b" }; // amber
  }
  return { status: "poor", label: "Poor", color: "#ef4444" }; // red
}

/**
 * Formats distance in meters to localized unit string.
 */
export function formatDistance(distanceMeters, unit = "kmh") {
  if (!distanceMeters || isNaN(distanceMeters) || distanceMeters < 0) {
    return unit === "mph" ? "0.0 mi" : "0.0 km";
  }
  if (unit === "mph") {
    const miles = distanceMeters / 1609.344;
    return `${miles.toFixed(2)} mi`;
  } else {
    const km = distanceMeters / 1000;
    return `${km.toFixed(2)} km`;
  }
}

/**
 * Formats elapsed seconds into hh:mm:ss format.
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return "00:00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

/**
 * Rolling Moving Average Calculator
 */
export class MovingAverage {
  constructor(size = 5) {
    this.size = size;
    this.buffer = [];
  }

  reset() {
    this.buffer = [];
  }

  add(value) {
    if (value === null || isNaN(value)) return this.get();
    this.buffer.push(value);
    if (this.buffer.length > this.size) {
      this.buffer.shift();
    }
    return this.get();
  }

  get() {
    if (this.buffer.length === 0) return 0;
    const sum = this.buffer.reduce((acc, val) => acc + val, 0);
    return sum / this.buffer.length;
  }
}
