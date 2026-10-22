# GPS Speedometer & Telemetry Web App

A privacy-first, mobile-first web application hosted on GitHub Pages that uses browser-accessible phone sensors to display real-time driving telemetry.

## Features

- **GPS Speedometer**: Large hybrid analogue & digital speedometer with SVG gauge and configurable speed limit scales (120, 160, 200, 240 km/h or mph).
- **Dual Speed Calculation**: Uses native `coords.speed` when available, falling back to Haversine distance over time when `coords.speed` is null.
- **Speed Smoothing**: Configurable rolling moving average filter (Low/Medium/High) to eliminate GPS jitter while maintaining low latency.
- **Secondary Telemetry Cards**:
  - Heading angle & cardinal direction (N, NE, E, SE, S, SW, W, NW)
  - Altitude (Mean Sea Level)
  - GPS Accuracy classification (Excellent, Good, Fair, Poor)
- **G-Force & Accelerometer**:
  - Longitudinal G (acceleration / braking)
  - Lateral G (cornering left / right)
  - Interactive 2D XY G-force plot
  - Sensor calibration / tare button
- **Trip Tracking**:
  - Maximum speed & average speed
  - Trip distance & duration timer
  - Start, Stop, and Reset trip controls
- **Visualisations**:
  - SVG analogue speedometer gauge
  - HTML5 Canvas 2D G-force XY dot plot
  - HTML5 Canvas rolling 60-second speed line graph
- **Demo / Simulation Mode**: Test all features on desktop or indoors by appending `?demo=true` to the URL or clicking "Demo / Simulation Mode" on the Start Screen.
- **PWA & Offline Support**: Web App Manifest and Service Worker for offline installation.
- **Screen Wake Lock**: Prevents phone display from sleeping during trip.
- **100% Privacy**: All processing runs client-side in the browser. Zero network calls or external telemetry.

## Project Structure

```text
tools/gps-speedometer/
├── index.html            # Main HTML layout & modal
├── manifest.json         # PWA Manifest
├── service-worker.js     # Offline caching service worker
├── styles/
│   └── main.css          # Mobile-first dark theme CSS
├── src/
│   ├── app.js            # App initialization & orchestrator
│   ├── gps.js            # Geolocation watchPosition & Haversine fallback
│   ├── motion.js         # Accelerometer & G-force calculations
│   ├── storage.js        # LocalStorage settings manager
│   ├── telemetry.js      # Telemetry state store & simulation engine
│   ├── ui.js             # SVG gauge, Canvas plots, & DOM renderer
│   └── utils.js          # Math, conversions, and moving average
└── README.md             # Documentation
```

## Running Locally

Serve the `tools/gps-speedometer/` directory using any static HTTP server:

```bash
npx serve tools/gps-speedometer
```

Then navigate to `http://localhost:3000` or append `?demo=true` for instant indoor testing.
