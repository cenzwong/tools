/**
 * Device Motion & Accelerometer Module
 */

import { GRAVITY_MS2 } from "./utils.js";

export class MotionSensor {
  constructor(onMotionUpdate, onError) {
    this.onMotionUpdate = onMotionUpdate;
    this.onError = onError;
    this.isListening = false;
    this.permissionState = "unknown"; // "unknown" | "granted" | "denied" | "unsupported"

    // Calibration offsets for vertical mount (phone in portrait mode facing driver)
    this.offsets = {
      x: 0,
      y: 0,
      z: 0
    };

    this.handleMotion = this.handleMotion.bind(this);
  }

  isSupported() {
    return typeof window !== "undefined" && "DeviceMotionEvent" in window;
  }

  requiresPermission() {
    return (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    );
  }

  async requestPermission() {
    if (!this.isSupported()) {
      this.permissionState = "unsupported";
      return false;
    }

    if (this.requiresPermission()) {
      try {
        const response = await DeviceMotionEvent.requestPermission();
        if (response === "granted") {
          this.permissionState = "granted";
          return true;
        } else {
          this.permissionState = "denied";
          return false;
        }
      } catch (err) {
        console.warn("DeviceMotion permission request error:", err);
        this.permissionState = "denied";
        if (this.onError) this.onError(err);
        return false;
      }
    }

    this.permissionState = "granted";
    return true;
  }

  start() {
    if (!this.isSupported()) {
      this.permissionState = "unsupported";
      return false;
    }

    if (this.isListening) return true;

    window.addEventListener("devicemotion", this.handleMotion, true);
    this.isListening = true;
    return true;
  }

  stop() {
    if (this.isListening) {
      window.removeEventListener("devicemotion", this.handleMotion, true);
      this.isListening = false;
    }
  }

  calibrate() {
    this.offsets.x = this.lastRawX || 0;
    this.offsets.y = this.lastRawY || 0;
    this.offsets.z = this.lastRawZ || 0;
  }

  resetCalibration() {
    this.offsets = { x: 0, y: 0, z: 0 };
  }

  handleMotion(event) {
    const acc = event.acceleration || event.accelerationIncludingGravity;
    if (!acc) return;

    const rawX = acc.x || 0;
    const rawY = acc.y || 0;
    const rawZ = acc.z || 0;

    this.lastRawX = rawX;
    this.lastRawY = rawY;
    this.lastRawZ = rawZ;

    // Apply offset calibration
    const calX = rawX - this.offsets.x;
    const calY = rawY - this.offsets.y;
    const calZ = rawZ - this.offsets.z;

    // Default assume Phone mounted vertically in portrait:
    // - Lateral G (Left/Right): X-axis
    // - Longitudinal G (Accel/Brake): Y-axis
    // G-force units: 1 g = 9.80665 m/s²
    const lateralG = calX / GRAVITY_MS2;
    const longitudinalG = calY / GRAVITY_MS2;
    const verticalG = calZ / GRAVITY_MS2;

    const rot = event.rotationRate || {};

    const motionData = {
      x: calX,
      y: calY,
      z: calZ,
      lateralG,
      longitudinalG,
      verticalG,
      rotationRate: {
        alpha: rot.alpha || 0,
        beta: rot.beta || 0,
        gamma: rot.gamma || 0
      },
      timestamp: event.timeStamp || Date.now()
    };

    if (this.onMotionUpdate) {
      this.onMotionUpdate(motionData);
    }
  }
}
