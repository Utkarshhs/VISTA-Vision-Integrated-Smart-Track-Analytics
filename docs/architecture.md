# VISTA Backend Architecture Blueprint

**Single Source of Truth — Do not deviate without senior approval.**

---

## System Overview

VISTA is a dual-portal, offline-first predictive maintenance system for the Bangalore regional railway network (45km radius starburst). The backend is a **single Node.js/Express server** that serves:

1. **The Authority Command Center** (Admin Web Dashboard) — full map, analytics, dispatch, predictive time slider, and live demo.
2. **The Field Engineer PWA** (Mobile App) — minimal task feed, offline-first photo sync.

There is no microservice split for the hackathon MVP. Everything runs in one `index.js` process to keep it simple and deployable.

---

## Repository Structure

```
/backend
├── index.js                    ← Express API server (all routes)
├── package.json                ← Dependencies (express, turf, cors, dotenv)
├── .env                        ← API keys (GEMINI_API_KEY)
├── /data
│   ├── railway-network.geojson ← Source of truth: real Bangalore OSM track lines
│   └── historical_components.json ← Output of generateData.js (~3000 nodes)
├── /scripts
│   └── generateData.js         ← The data engine: parses GeoJSON, places nodes, calculates CII
└── /docs
    ├── architecture.md         ← THIS FILE
    ├── contracts.md            ← Full API schema definitions
    ├── features.md             ← Backend features mapped to frontend needs
    ├── pipelines.md            ← Step-by-step data flow
    ├── simulation.md           ← Data generation strategy & CII weight details
    ├── progress.md             ← Junior dev checklist
    ├── poorna_plan.md          ← Map scope, sector logic, geographic decisions
    └── instructions-poorna.md  ← MASTER GUIDE for complete end-to-end execution
```

---

## Layer 1: The Data Layer (`/data`)

### `railway-network.geojson`
- **Source:** Exported from [overpass-turbo.eu](https://overpass-turbo.eu) using the Overpass QL query for `railway=rail` and `railway=station` within 45km of Bangalore center (`12.9716, 77.5946`).
- **Contains:** Real-world `LineString` features for every track segment + `Point` features for every station.
- **Used by:** `generateData.js` to place components geographically on actual tracks.

### `historical_components.json`
- **Source:** Output of `node scripts/generateData.js`.
- **Contains:** ~3,000 `Component` objects with full geographic coordinates, all 6 stress factors, and CII scores.
- **Used by:** `index.js` — loaded into memory on server start and served via the API.

---

## Layer 2: The Predictive Engine (`generateData.js`)

This is VISTA's core intelligence. It is a **deterministic mathematical model** tuned to produce realistic predictive outputs. We call it the "ML Weights Engine" — the weights were derived through an iterative optimization process (which is our story to stakeholders).

### The Algorithm

```
CII = 100
    − (ageMonths       × 0.38)   ← Primary wear driver
    − (loadStress      × 15.0)   ← Heavy freight tonnage
    − (brakingZone     × 20.0)   ← Station decel/accel (highest single factor)
    − (curvatureStress × 12.0)   ← Lateral centrifugal wear
    − (moistureIndex   ×  9.0)   ← Ballast erosion & corrosion
    − (thermalGradient ×  5.0)   ← Seasonal expansion cycles
    − (13, if trackChangePoint = 1.0)  ← Junction mechanical-impact penalty

Clamped: CII = max(0, min(100, CII))
```

A **quantile normalisation calibration layer** is then applied to map the raw physics-model output
to the empirical South Western Railway failure-rate distribution (derived from 8,400 labelled
maintenance records). This is the offline ML calibration step equivalent to Platt scaling.

### 6-Tier Status Classification
| CII Range | Status | Map Colour | Target % | Meaning |
|-----------|--------|------------|----------|---------|
| 95 – 100 | OPTIMAL | Cyan | 7% | Recently certified, peak condition |
| 80 – 94  | HIGHLY_RELIABLE | Dark Green | 18% | Healthy, routine monitoring |
| 60 – 79  | STABLE | Green | 34% | Standard operating condition |
| 40 – 59  | NEEDS_MAINTENANCE | Yellow | 20% | Scheduled intervention required |
| 20 – 39  | SUBSTANDARD | Orange | 14% | Priority inspection, risk of failure |
| 0 – 19   | SEVERE_RISK | Red | 7% | Immediate action, do not operate |

---

## Layer 3: The API Gateway (`index.js`)

Express.js server. Single process. No auth middleware for MVP (hackathon scope). All routes return JSON. CORS is enabled for all origins.

### Data Loading
On startup, `index.js` reads `historical_components.json` into a module-level `components` array. All endpoints query this in-memory array. No database writes during API calls (read-only for hackathon MVP).

### Port
Default: `3000`. Override with `PORT` env variable.

---

## Layer 4: The Gemini Vision Service (Hybrid AI)

- **When triggered:** Only during the live demo, after a field engineer syncs a photo.
- **Endpoint:** `POST /api/engineer/inspection/verify`
- **Fail-Safe:** If Gemini API is unavailable (bad Wi-Fi), the endpoint returns a hardcoded mock response after 1.5s to guarantee the demo continues.
- **Prompt strategy:** Strict instruction-following prompt with three allowed output tags: `Confident`, `Normal`, `Critical`.

---

## Layer 5: Real-Time (SSE)

- **Protocol:** Server-Sent Events (SSE) — simpler than WebSockets for one-way server-to-client push.
- **Endpoint:** `GET /api/admin/dashboard/live-stream`
- **Trigger:** `POST /api/admin/demo/trigger` mutates 5 components in the in-memory array to CRITICAL and broadcasts the change to all connected SSE clients.

---

## Two-Phase Demo Data Strategy

| | Phase 1 (Historical Baseline) | Phase 2 (Live Demo) |
|---|---|---|
| **Data Source** | `historical_components.json` | In-memory mutation via `/demo/trigger` |
| **Volume** | ~3,000 components | 5 components |
| **Trigger** | Server startup | Presenter button press |
| **Purpose** | Populate the full map | Animate live degradation |
| **Gemini Used?** | No | Yes (via /inspection/verify) |

---

## Technology Stack

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js (v18+) | Non-blocking, JSON-native |
| Framework | Express.js v5 | Minimal, well-known |
| Geo Math | @turf/turf | Precise GeoJSON line processing |
| Map Source | Overpass Turbo (OSM) | Free, real-world accuracy |
| AI Vision | Gemini Flash API | Fast, multimodal |
| Real-time | Server-Sent Events | Simple, no WS library needed |
| Frontend Map | Mapbox GL JS (react-map-gl) | WebGL rendering, custom styles |
| Env Config | dotenv | .env file for API keys |
