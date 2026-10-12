/**
 * Settings and LocalStorage module
 */

const STORAGE_KEY = "gps_speedometer_settings_v1";

export const DEFAULT_SETTINGS = {
  unit: "kmh",           // "kmh" | "mph"
  maxGaugeSpeed: 200,     // 120, 160, 200, 240
  smoothingLevel: "medium", // "low" (3), "medium" (5), "high" (8)
  keepScreenAwake: true,
  motionEnabled: true
};

export class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn("Could not load settings from LocalStorage:", e);
    }
    return this.settings;
  }

  save(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn("Could not save settings to LocalStorage:", e);
    }
    return this.settings;
  }

  get(key) {
    return this.settings[key];
  }

  getSmoothingWindowSize() {
    switch (this.settings.smoothingLevel) {
      case "low":
        return 3;
      case "high":
        return 8;
      case "medium":
      default:
        return 5;
    }
  }
}

export const settingsManager = new SettingsManager();
