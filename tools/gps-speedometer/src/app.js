/**
 * Main Application Orchestrator
 */

import { GpsTracker } from "./gps.js";
import { MotionSensor } from "./motion.js";
import { TelemetryManager } from "./telemetry.js";
import { settingsManager } from "./storage.js";
import { UIController } from "./ui.js";

class App {
  constructor() {
    this.telemetry = new TelemetryManager();
    this.ui = new UIController(this.telemetry, settingsManager);

    this.gps = new GpsTracker(
      (data) => this.telemetry.updateGpsData(data),
      (err) => this.handleGpsError(err)
    );

    this.motion = new MotionSensor(
      (data) => this.telemetry.updateMotionData(data),
      (err) => this.handleMotionError(err)
    );

    this.bindEvents();
    this.checkURLParams();
    this.registerServiceWorker();
  }

  bindEvents() {
    // Start Dashboard Button
    this.ui.dom.startDashboardBtn.addEventListener("click", () => this.startDashboard());

    // Start Demo Mode Button
    this.ui.dom.startDemoBtn.addEventListener("click", () => this.startDemoMode());

    // Trip Start/Stop
    this.ui.dom.tripBtn.addEventListener("click", () => {
      if (this.telemetry.state.trip.active) {
        this.telemetry.stopTrip();
      } else {
        this.telemetry.startTrip();
      }
    });

    // Reset Trip
    this.ui.dom.resetTripBtn.addEventListener("click", () => {
      this.telemetry.resetTrip();
    });

    // Motion Calibration
    this.ui.dom.calibrateBtn.addEventListener("click", () => {
      this.motion.calibrate();
      alert("Motion sensors calibrated to current device orientation!");
    });
  }

  checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("demo") === "true") {
      this.startDemoMode();
    }
  }

  async startDashboard() {
    this.ui.dom.startScreen.classList.add("hidden");
    this.ui.dom.dashboardScreen.classList.remove("hidden");

    this.ui.startRenderLoop();
    this.ui.requestWakeLock();

    // 1. Start GPS Geolocation
    const gpsOk = this.gps.start();
    if (!gpsOk) {
      this.telemetry.state.sensors.gpsStatus = "Unavailable";
    }

    // 2. Motion Sensors (if enabled)
    if (settingsManager.get("motionEnabled")) {
      if (this.motion.requiresPermission()) {
        const granted = await this.motion.requestPermission();
        if (granted) {
          this.motion.start();
        }
      } else {
        this.motion.start();
      }
    }
  }

  startDemoMode() {
    this.ui.dom.startScreen.classList.add("hidden");
    this.ui.dom.dashboardScreen.classList.remove("hidden");

    this.telemetry.startDemoMode();
    this.ui.startRenderLoop();
    this.ui.requestWakeLock();
  }

  handleGpsError(err) {
    console.warn("GPS Geolocation Error:", err);
    if (err.code === 1) { // PERMISSION_DENIED
      this.telemetry.state.sensors.gpsStatus = "Permission Denied";
      this.telemetry.state.sensors.gpsPermission = "denied";
    } else if (err.code === 2) { // POSITION_UNAVAILABLE
      this.telemetry.state.sensors.gpsStatus = "Unavailable";
    } else if (err.code === 3) { // TIMEOUT
      this.telemetry.state.sensors.gpsStatus = "Timeout";
    } else {
      this.telemetry.state.sensors.gpsStatus = "Unavailable";
    }
  }

  handleMotionError(err) {
    console.warn("Motion Sensor Error:", err);
    this.telemetry.state.sensors.motionPermission = "denied";
  }

  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js").catch((err) => {
          console.warn("ServiceWorker registration failed: ", err);
        });
      });
    }
  }
}

// Initialize application
window.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
