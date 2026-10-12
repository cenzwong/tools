/**
 * UI Rendering and Animation Controller
 */

import {
  convertSpeed,
  formatSpeed,
  degreesToCardinal,
  getGpsAccuracyStatus,
  formatDistance,
  formatDuration
} from "./utils.js";

export class UIController {
  constructor(telemetryManager, settingsManager) {
    this.telemetry = telemetryManager;
    this.settings = settingsManager;

    this.wakeLock = null;
    this.animationFrameId = null;

    // Cache DOM Elements
    this.dom = {
      startScreen: document.getElementById("start-screen"),
      dashboardScreen: document.getElementById("dashboard-screen"),
      settingsModal: document.getElementById("settings-modal"),

      // Buttons
      startDashboardBtn: document.getElementById("btn-start-dashboard"),
      startDemoBtn: document.getElementById("btn-start-demo"),
      tripBtn: document.getElementById("btn-trip"),
      resetTripBtn: document.getElementById("btn-reset-trip"),
      calibrateBtn: document.getElementById("btn-calibrate"),
      settingsBtn: document.getElementById("btn-settings"),
      closeSettingsBtn: document.getElementById("btn-close-settings"),

      // Status & Header
      gpsStatusDot: document.getElementById("gps-status-dot"),
      gpsStatusText: document.getElementById("gps-status-text"),
      unitToggleBtn: document.getElementById("btn-unit-toggle"),

      // Speed Displays
      digitalSpeed: document.getElementById("digital-speed"),
      speedUnitLabel: document.getElementById("speed-unit-label"),
      gaugeNeedle: document.getElementById("gauge-needle"),
      gaugeArcProgress: document.getElementById("gauge-arc-progress"),
      gaugeTicksGroup: document.getElementById("gauge-ticks"),
      gaugeMaxLabel: document.getElementById("gauge-max-label"),

      // Telemetry Cards
      headingValue: document.getElementById("val-heading"),
      headingCardinal: document.getElementById("val-heading-cardinal"),
      altitudeValue: document.getElementById("val-altitude"),
      accuracyValue: document.getElementById("val-accuracy"),
      accuracyLabel: document.getElementById("val-accuracy-label"),

      // Acceleration & G-Force
      accelValue: document.getElementById("val-accel"),
      lateralGValue: document.getElementById("val-lateral-g"),
      gforceCanvas: document.getElementById("canvas-gforce"),

      // Trip Cards
      maxSpeedValue: document.getElementById("val-max-speed"),
      avgSpeedValue: document.getElementById("val-avg-speed"),
      tripDistanceValue: document.getElementById("val-trip-distance"),
      tripDurationValue: document.getElementById("val-trip-duration"),

      // Speed History Chart
      speedHistoryCanvas: document.getElementById("canvas-speed-history"),

      // Settings Inputs
      settingUnitSelect: document.getElementById("setting-unit"),
      settingMaxGaugeSelect: document.getElementById("setting-max-gauge"),
      settingSmoothingSelect: document.getElementById("setting-smoothing"),
      settingWakeLockToggle: document.getElementById("setting-wakelock"),
      settingMotionToggle: document.getElementById("setting-motion")
    };

    this.initGaugeTicks();
    this.setupEventListeners();
  }

  // --- Gauge SVG Generation ---
  initGaugeTicks() {
    if (!this.dom.gaugeTicksGroup) return;

    this.dom.gaugeTicksGroup.innerHTML = "";
    const maxSpeed = this.settings.get("maxGaugeSpeed");
    const numMajorTicks = 5; // e.g. 0, 50, 100, 150, 200
    const startAngle = -210; // degrees
    const endAngle = 30;     // degrees (240 deg sweep)
    const sweep = endAngle - startAngle;

    for (let i = 0; i <= numMajorTicks; i++) {
      const frac = i / numMajorTicks;
      const val = Math.round(frac * maxSpeed);
      const angle = startAngle + frac * sweep;
      const rad = (angle * Math.PI) / 180;

      // Tick line
      const x1 = 100 + 72 * Math.cos(rad);
      const y1 = 100 + 72 * Math.sin(rad);
      const x2 = 100 + 82 * Math.cos(rad);
      const y2 = 100 + 82 * Math.sin(rad);

      const tick = document.createElementNS("http://www.w3.org/2000/svg", "line");
      tick.setAttribute("x1", x1);
      tick.setAttribute("y1", y1);
      tick.setAttribute("x2", x2);
      tick.setAttribute("y2", y2);
      tick.setAttribute("stroke", "var(--text-muted)");
      tick.setAttribute("stroke-width", "2");

      this.dom.gaugeTicksGroup.appendChild(tick);

      // Number text label
      const tx = 100 + 60 * Math.cos(rad);
      const ty = 100 + 60 * Math.sin(rad) + 4;

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", tx);
      text.setAttribute("y", ty);
      text.setAttribute("fill", "var(--text-muted)");
      text.setAttribute("font-size", "9");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-weight", "bold");
      text.textContent = val;

      this.dom.gaugeTicksGroup.appendChild(text);
    }

    if (this.dom.gaugeMaxLabel) {
      this.dom.gaugeMaxLabel.textContent = `${maxSpeed} ${this.settings.get("unit")}`;
    }
  }

  setupEventListeners() {
    // Settings modal triggers
    if (this.dom.settingsBtn) this.dom.settingsBtn.addEventListener("click", () => this.openSettings());
    if (this.dom.closeSettingsBtn) this.dom.closeSettingsBtn.addEventListener("click", () => this.closeSettings());
    if (this.dom.unitToggleBtn) {
      this.dom.unitToggleBtn.addEventListener("click", () => {
        const currentUnit = this.settings.get("unit");
        const nextUnit = currentUnit === "kmh" ? "mph" : "kmh";
        this.settings.save({ unit: nextUnit });
        this.syncSettingsUI();
        this.initGaugeTicks();
      });
    }

    // Settings input changes
    if (this.dom.settingUnitSelect) {
      this.dom.settingUnitSelect.addEventListener("change", (e) => {
        this.settings.save({ unit: e.target.value });
        this.syncSettingsUI();
        this.initGaugeTicks();
      });
    }

    if (this.dom.settingMaxGaugeSelect) {
      this.dom.settingMaxGaugeSelect.addEventListener("change", (e) => {
        this.settings.save({ maxGaugeSpeed: Number(e.target.value) });
        this.initGaugeTicks();
      });
    }

    if (this.dom.settingSmoothingSelect) {
      this.dom.settingSmoothingSelect.addEventListener("change", (e) => {
        this.settings.save({ smoothingLevel: e.target.value });
        this.telemetry.updateSmoothingWindow();
      });
    }

    if (this.dom.settingWakeLockToggle) {
      this.dom.settingWakeLockToggle.addEventListener("change", (e) => {
        const active = e.target.checked;
        this.settings.save({ keepScreenAwake: active });
        if (active) {
          this.requestWakeLock();
        } else {
          this.releaseWakeLock();
        }
      });
    }

    if (this.dom.settingMotionToggle) {
      this.dom.settingMotionToggle.addEventListener("change", (e) => {
        this.settings.save({ motionEnabled: e.target.checked });
      });
    }
  }

  syncSettingsUI() {
    const unit = this.settings.get("unit");
    if (this.dom.settingUnitSelect) this.dom.settingUnitSelect.value = unit;
    if (this.dom.settingMaxGaugeSelect) this.dom.settingMaxGaugeSelect.value = this.settings.get("maxGaugeSpeed");
    if (this.dom.settingSmoothingSelect) this.dom.settingSmoothingSelect.value = this.settings.get("smoothingLevel");
    if (this.dom.settingWakeLockToggle) this.dom.settingWakeLockToggle.checked = this.settings.get("keepScreenAwake");
    if (this.dom.settingMotionToggle) this.dom.settingMotionToggle.checked = this.settings.get("motionEnabled");

    const labelText = unit === "mph" ? "mph" : "km/h";
    if (this.dom.unitToggleBtn) this.dom.unitToggleBtn.textContent = labelText.toUpperCase();
    if (this.dom.speedUnitLabel) this.dom.speedUnitLabel.textContent = labelText;
  }

  openSettings() {
    this.syncSettingsUI();
    if (this.dom.settingsModal) this.dom.settingsModal.classList.remove("hidden");
  }

  closeSettings() {
    if (this.dom.settingsModal) this.dom.settingsModal.classList.add("hidden");
  }

  async requestWakeLock() {
    if (!this.settings.get("keepScreenAwake")) return;
    if ("wakeLock" in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request("screen");
      } catch (err) {
        console.warn("Screen Wake Lock error:", err);
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  startRenderLoop() {
    const render = () => {
      this.updateDashboard();
      this.renderGForceCanvas();
      this.renderSpeedHistoryCanvas();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  stopRenderLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  updateDashboard() {
    const state = this.telemetry.state;
    const unit = this.settings.get("unit");
    const maxGaugeSpeed = this.settings.get("maxGaugeSpeed");

    // 1. Speed
    const currentSpeedVal = convertSpeed(state.speed.smoothedMs, unit);
    const speedStr = formatSpeed(currentSpeedVal, 0);

    if (this.dom.digitalSpeed) this.dom.digitalSpeed.textContent = speedStr;

    // Needle & Arc Rotation (-210deg to +30deg = 240deg total sweep)
    const clampedSpeed = Math.min(currentSpeedVal, maxGaugeSpeed);
    const fraction = clampedSpeed / maxGaugeSpeed;
    const angle = -210 + fraction * 240;

    if (this.dom.gaugeNeedle) {
      this.dom.gaugeNeedle.setAttribute("transform", `rotate(${angle} 100 100)`);
    }

    if (this.dom.gaugeArcProgress) {
      // Circumference for r=80 is 2 * PI * 80 = 502.65
      // 240 deg arc corresponds to (240/360) * 502.65 = 335.1
      const totalArcLength = 335.1;
      const strokeDashoffset = totalArcLength * (1 - fraction);
      this.dom.gaugeArcProgress.style.strokeDashoffset = strokeDashoffset;
    }

    // 2. GPS Status Indicator
    const gpsStatus = state.sensors.gpsStatus;
    if (this.dom.gpsStatusText) this.dom.gpsStatusText.textContent = `GPS ● ${gpsStatus}`;
    let dotColor = "var(--color-warn)";
    if (gpsStatus === "Good" || gpsStatus === "Demo Mode") dotColor = "var(--color-accent)";
    else if (gpsStatus === "Fair") dotColor = "#f59e0b";
    else if (gpsStatus === "Poor" || gpsStatus === "Permission Denied") dotColor = "#ef4444";
    if (this.dom.gpsStatusDot) this.dom.gpsStatusDot.style.backgroundColor = dotColor;

    // 3. Telemetry Cards
    // Heading
    if (state.location.heading !== null && !isNaN(state.location.heading)) {
      if (this.dom.headingValue) this.dom.headingValue.textContent = `${Math.round(state.location.heading)}°`;
      if (this.dom.headingCardinal) this.dom.headingCardinal.textContent = degreesToCardinal(state.location.heading);
    } else {
      if (this.dom.headingValue) this.dom.headingValue.textContent = "—";
      if (this.dom.headingCardinal) this.dom.headingCardinal.textContent = "—";
    }

    // Altitude
    if (state.location.altitude !== null && !isNaN(state.location.altitude)) {
      if (this.dom.altitudeValue) this.dom.altitudeValue.textContent = `${Math.round(state.location.altitude)} m`;
    } else {
      if (this.dom.altitudeValue) this.dom.altitudeValue.textContent = "—";
    }

    // Accuracy
    if (state.location.accuracy !== null && !isNaN(state.location.accuracy)) {
      const acc = Math.round(state.location.accuracy);
      if (this.dom.accuracyValue) this.dom.accuracyValue.textContent = `±${acc} m`;
      const accInfo = getGpsAccuracyStatus(acc);
      if (this.dom.accuracyLabel) {
        this.dom.accuracyLabel.textContent = accInfo.label;
        this.dom.accuracyLabel.style.color = accInfo.color;
      }
    } else {
      if (this.dom.accuracyValue) this.dom.accuracyValue.textContent = "—";
      if (this.dom.accuracyLabel) {
        this.dom.accuracyLabel.textContent = "Unavailable";
        this.dom.accuracyLabel.style.color = "var(--text-muted)";
      }
    }

    // 4. Motion & G-Force values
    const longG = state.motion.longitudinalG;
    const latG = state.motion.lateralG;
    const accelSign = longG >= 0 ? "+" : "";
    if (this.dom.accelValue) this.dom.accelValue.textContent = `${accelSign}${longG.toFixed(2)} g`;
    if (this.dom.lateralGValue) this.dom.lateralGValue.textContent = `${latG >= 0 ? "+" : ""}${latG.toFixed(2)} g`;

    // 5. Trip Cards
    const maxTripSpeedVal = convertSpeed(state.trip.maxSpeedMs, unit);
    const avgTripSpeedVal = convertSpeed(state.trip.averageSpeedMs, unit);

    if (this.dom.maxSpeedValue) this.dom.maxSpeedValue.textContent = `${formatSpeed(maxTripSpeedVal, 0)} ${unit === "mph" ? "mph" : "km/h"}`;
    if (this.dom.avgSpeedValue) this.dom.avgSpeedValue.textContent = `${formatSpeed(avgTripSpeedVal, 0)} ${unit === "mph" ? "mph" : "km/h"}`;
    if (this.dom.tripDistanceValue) this.dom.tripDistanceValue.textContent = formatDistance(state.trip.distanceMeters, unit);
    if (this.dom.tripDurationValue) this.dom.tripDurationValue.textContent = formatDuration(state.trip.elapsedSeconds);

    // Trip Button text state
    if (this.dom.tripBtn) {
      if (state.trip.active) {
        this.dom.tripBtn.textContent = "Stop Trip";
        this.dom.tripBtn.classList.add("btn-danger");
      } else {
        this.dom.tripBtn.textContent = "Start Trip";
        this.dom.tripBtn.classList.remove("btn-danger");
      }
    }
  }

  // --- Render 2D G-Force Canvas Plot ---
  renderGForceCanvas() {
    const canvas = this.dom.gforceCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const scale = (width / 2) * 0.8; // Max scale +/- 1.0 g

    ctx.clearRect(0, 0, width, height);

    // Grid lines & circles
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, height - 10);
    ctx.moveTo(10, cy);
    ctx.lineTo(width - 10, cy);
    ctx.stroke();

    // Concentric circles (0.5g and 1.0g)
    ctx.beginPath();
    ctx.arc(cx, cy, scale * 0.5, 0, 2 * Math.PI);
    ctx.arc(cx, cy, scale * 1.0, 0, 2 * Math.PI);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = "#64748b";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Brake", cx, 12);
    ctx.fillText("Accel", cx, height - 4);
    ctx.textAlign = "left";
    ctx.fillText("Left", 4, cy + 3);
    ctx.textAlign = "right";
    ctx.fillText("Right", width - 4, cy + 3);

    // Current G-force Dot
    const latG = this.telemetry.state.motion.lateralG;      // X axis
    const longG = this.telemetry.state.motion.longitudinalG;  // Y axis (Braking up, Accel down)

    // Clamp dot to max +/- 1.2 g
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
    const px = cx + clamp(latG, -1.2, 1.2) * scale;
    const py = cy - clamp(longG, -1.2, 1.2) * scale;

    // Draw G Dot
    ctx.fillStyle = "#00f2fe";
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // --- Render Rolling 60-second Speed History Chart ---
  renderSpeedHistoryCanvas() {
    const canvas = this.dom.speedHistoryCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const history = this.telemetry.state.history;
    if (!history || history.length < 2) {
      ctx.fillStyle = "#64748b";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for speed data...", width / 2, height / 2);
      return;
    }

    const unit = this.settings.get("unit");
    const now = Date.now();
    const windowMs = 60000; // 60 seconds
    const maxGaugeSpeed = this.settings.get("maxGaugeSpeed");

    // Grid lines (Speed increments)
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;

    for (let s = 0; s <= maxGaugeSpeed; s += Math.round(maxGaugeSpeed / 4)) {
      const y = height - (s / maxGaugeSpeed) * (height - 20) - 10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Line Path
    ctx.beginPath();
    ctx.strokeStyle = "#00f2fe";
    ctx.lineWidth = 2;

    let started = false;
    for (let i = 0; i < history.length; i++) {
      const point = history[i];
      const ageMs = now - point.timestamp;
      if (ageMs > windowMs) continue;

      const x = width - (ageMs / windowMs) * width;
      const speedVal = convertSpeed(point.speedMs, unit);
      const clampedSpeed = Math.min(speedVal, maxGaugeSpeed);
      const y = height - (clampedSpeed / maxGaugeSpeed) * (height - 20) - 10;

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}
