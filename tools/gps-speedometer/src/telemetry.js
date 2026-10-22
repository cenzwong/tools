/**
 * Telemetry State & Simulation Engine
 */

import { MovingAverage, convertSpeed } from "./utils.js";
import { settingsManager } from "./storage.js";

export class TelemetryManager {
  constructor() {
    this.movingAverage = new MovingAverage(settingsManager.getSmoothingWindowSize());

    this.state = {
      location: {
        latitude: null,
        longitude: null,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null
      },
      speed: {
        rawMs: 0,
        smoothedMs: 0,
        source: "none" // "native" | "calculated" | "demo" | "none"
      },
      motion: {
        x: 0,
        y: 0,
        z: 0,
        lateralG: 0,
        longitudinalG: 0,
        verticalG: 0
      },
      trip: {
        active: false,
        startTime: null,
        elapsedSeconds: 0,
        distanceMeters: 0,
        maxSpeedMs: 0,
        averageSpeedMs: 0
      },
      sensors: {
        gpsPermission: "unknown", // "unknown" | "granted" | "denied" | "unsupported"
        motionPermission: "unknown", // "unknown" | "granted" | "denied" | "unsupported"
        gpsStatus: "Waiting" // "Waiting" | "Good" | "Fair" | "Poor" | "Unavailable" | "Permission Denied" | "Demo Mode"
      },
      history: [] // [{ timestamp, speedMs }] max 60 seconds
    };

    this.timerInterval = null;
    this.demoMode = false;
    this.demoInterval = null;
  }

  updateSmoothingWindow() {
    const windowSize = settingsManager.getSmoothingWindowSize();
    this.movingAverage.size = windowSize;
  }

  updateGpsData(gpsData) {
    this.state.location.latitude = gpsData.latitude;
    this.state.location.longitude = gpsData.longitude;
    this.state.location.accuracy = gpsData.accuracy;
    this.state.location.altitude = gpsData.altitude;
    this.state.location.altitudeAccuracy = gpsData.altitudeAccuracy;
    this.state.location.heading = gpsData.heading;

    this.state.sensors.gpsPermission = "granted";

    // Update GPS status string based on accuracy
    if (gpsData.accuracy <= 10) {
      this.state.sensors.gpsStatus = "Good";
    } else if (gpsData.accuracy <= 25) {
      this.state.sensors.gpsStatus = "Fair";
    } else {
      this.state.sensors.gpsStatus = "Poor";
    }

    const rawMs = gpsData.rawSpeedMs;
    const smoothedMs = this.movingAverage.add(rawMs);

    this.state.speed.rawMs = rawMs;
    this.state.speed.smoothedMs = smoothedMs < 0.3 ? 0 : smoothedMs; // noise floor
    this.state.speed.source = gpsData.speedSource;

    this.recordSpeedHistory(this.state.speed.smoothedMs);

    // Update Trip data
    if (this.state.trip.active) {
      // Do not add stationary GPS drift to distance
      if (gpsData.accuracy && gpsData.accuracy <= 30 && gpsData.distanceMovedMeters > 0.5 && rawMs > 0.5) {
        this.state.trip.distanceMeters += gpsData.distanceMovedMeters;
      }

      if (this.state.speed.smoothedMs > this.state.trip.maxSpeedMs) {
        this.state.trip.maxSpeedMs = this.state.speed.smoothedMs;
      }
    }
  }

  updateMotionData(motionData) {
    this.state.motion.x = motionData.x;
    this.state.motion.y = motionData.y;
    this.state.motion.z = motionData.z;
    this.state.motion.lateralG = motionData.lateralG;
    this.state.motion.longitudinalG = motionData.longitudinalG;
    this.state.motion.verticalG = motionData.verticalG;

    this.state.sensors.motionPermission = "granted";
  }

  recordSpeedHistory(speedMs) {
    const now = Date.now();
    this.state.history.push({ timestamp: now, speedMs });

    // Prune entries older than 60 seconds
    const cutoff = now - 60000;
    while (this.state.history.length > 0 && this.state.history[0].timestamp < cutoff) {
      this.state.history.shift();
    }
  }

  startTrip() {
    this.state.trip.active = true;
    this.state.trip.startTime = Date.now();
    this.state.trip.elapsedSeconds = 0;
    this.state.trip.distanceMeters = 0;
    this.state.trip.maxSpeedMs = 0;
    this.state.trip.averageSpeedMs = 0;

    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.state.trip.active) {
        this.state.trip.elapsedSeconds += 1;
        if (this.state.trip.elapsedSeconds > 0) {
          this.state.trip.averageSpeedMs =
            this.state.trip.distanceMeters / this.state.trip.elapsedSeconds;
        }
      }
    }, 1000);
  }

  stopTrip() {
    this.state.trip.active = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetTrip() {
    this.stopTrip();
    this.state.trip.startTime = null;
    this.state.trip.elapsedSeconds = 0;
    this.state.trip.distanceMeters = 0;
    this.state.trip.maxSpeedMs = 0;
    this.state.trip.averageSpeedMs = 0;
  }

  // --- DEMO / SIMULATION MODE ---
  startDemoMode() {
    this.demoMode = true;
    this.state.sensors.gpsStatus = "Demo Mode";
    this.state.sensors.gpsPermission = "granted";
    this.state.sensors.motionPermission = "granted";

    let time = 0;
    let baseLat = 37.7749;
    let baseLon = -122.4194;

    if (this.demoInterval) clearInterval(this.demoInterval);

    this.demoInterval = setInterval(() => {
      time += 0.5;

      // Simulate vehicle speed 0 - 90 km/h (~0 to 25 m/s) with sine curves and acceleration
      const speedKmh = 45 + 35 * Math.sin(time * 0.1) + 10 * Math.cos(time * 0.25);
      const simulatedSpeedMs = Math.max(0, speedKmh / 3.6);

      const heading = (120 + Math.sin(time * 0.05) * 60 + 360) % 360;
      const altitude = 150 + Math.sin(time * 0.02) * 20;

      // Move coords based on speed and heading
      baseLat += (simulatedSpeedMs * 0.5 * Math.cos((heading * Math.PI) / 180)) / 111111;
      baseLon += (simulatedSpeedMs * 0.5 * Math.sin((heading * Math.PI) / 180)) / (111111 * Math.cos((baseLat * Math.PI) / 180));

      const fakeGps = {
        latitude: baseLat,
        longitude: baseLon,
        accuracy: 4 + Math.sin(time) * 2,
        altitude,
        altitudeAccuracy: 3,
        heading,
        timestamp: Date.now(),
        nativeSpeedMs: simulatedSpeedMs,
        calculatedSpeedMs: simulatedSpeedMs,
        rawSpeedMs: simulatedSpeedMs,
        speedSource: "demo",
        distanceMovedMeters: simulatedSpeedMs * 0.5,
        timeElapsedSec: 0.5
      };

      this.updateGpsData(fakeGps);

      // Simulate G-Forces
      const lateralG = Math.sin(time * 0.2) * 0.45;
      const longitudinalG = Math.cos(time * 0.1) * 0.35;

      const fakeMotion = {
        x: lateralG * 9.80665,
        y: longitudinalG * 9.80665,
        z: 9.80665,
        lateralG,
        longitudinalG,
        verticalG: 1.0,
        rotationRate: { alpha: 0, beta: 0, gamma: 0 },
        timestamp: Date.now()
      };

      this.updateMotionData(fakeMotion);
    }, 500);
  }

  stopDemoMode() {
    this.demoMode = false;
    if (this.demoInterval) {
      clearInterval(this.demoInterval);
      this.demoInterval = null;
    }
    this.state.sensors.gpsStatus = "Waiting";
  }
}
