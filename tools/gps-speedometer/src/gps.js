/**
 * GPS & Geolocation module
 */

import { haversineDistance } from "./utils.js";

export class GpsTracker {
  constructor(onLocationUpdate, onError) {
    this.onLocationUpdate = onLocationUpdate;
    this.onError = onError;
    this.watchId = null;
    this.lastPosition = null;
    this.isTracking = false;
  }

  isSupported() {
    return "geolocation" in navigator;
  }

  start() {
    if (!this.isSupported()) {
      if (this.onError) {
        this.onError({ code: -1, message: "Geolocation is not supported by your browser." });
      }
      return false;
    }

    if (this.isTracking) return true;

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
      options
    );

    this.isTracking = true;
    return true;
  }

  stop() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
    this.lastPosition = null;
  }

  handlePosition(position) {
    const coords = position.coords;
    const timestamp = position.timestamp || Date.now();

    const currentLat = coords.latitude;
    const currentLon = coords.longitude;
    const nativeSpeedMs = coords.speed; // m/s or null

    let calculatedSpeedMs = null;
    let distanceMovedMeters = 0;
    let timeElapsedSec = 0;

    if (this.lastPosition) {
      const prevCoords = this.lastPosition.coords;
      const prevTime = this.lastPosition.timestamp || Date.now();

      timeElapsedSec = (timestamp - prevTime) / 1000;

      if (timeElapsedSec > 0) {
        distanceMovedMeters = haversineDistance(
          prevCoords.latitude,
          prevCoords.longitude,
          currentLat,
          currentLon
        );

        // Fallback speed calculation
        calculatedSpeedMs = distanceMovedMeters / timeElapsedSec;
      }
    }

    // Determine raw speed (Source A native speed preferred, fallback to Source B calculated speed)
    let rawSpeedMs = 0;
    let speedSource = "none";

    if (nativeSpeedMs !== null && !isNaN(nativeSpeedMs) && nativeSpeedMs >= 0) {
      rawSpeedMs = nativeSpeedMs;
      speedSource = "native";
    } else if (calculatedSpeedMs !== null && !isNaN(calculatedSpeedMs) && calculatedSpeedMs >= 0) {
      rawSpeedMs = calculatedSpeedMs;
      speedSource = "calculated";
    }

    // Ignore tiny drift if stationary or poor accuracy
    if (coords.accuracy && coords.accuracy > 25 && rawSpeedMs < 1.0) {
      rawSpeedMs = 0;
    }

    const gpsData = {
      latitude: currentLat,
      longitude: currentLon,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      timestamp,
      nativeSpeedMs,
      calculatedSpeedMs,
      rawSpeedMs,
      speedSource,
      distanceMovedMeters,
      timeElapsedSec
    };

    this.lastPosition = position;

    if (this.onLocationUpdate) {
      this.onLocationUpdate(gpsData);
    }
  }

  handleError(error) {
    if (this.onError) {
      this.onError(error);
    }
  }
}
