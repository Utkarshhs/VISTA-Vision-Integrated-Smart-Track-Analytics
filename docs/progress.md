# Backend Build Progress & Checklist (Updated)

**For Junior Developers:** Follow this checklist strictly and in order. Each item has a clear definition of done.

---

## Status Legend
- `[ ]` Not started
- `[/]` In progress
- `[x]` Completed and verified

---

## Phase 0: Prerequisites (Before Writing Any Code)

- `[x]` Node.js v18+ installed on the development machine.
- `[x]` `npm install` run inside `/backend` — all dependencies installed.
- `[x]` Create a `.env` file in `/backend` with PORT and GEMINI_API_KEY.
- `[x]` Download the Bangalore railway GeoJSON from Overpass Turbo and save as `/backend/data/railway-network.geojson`.

---

## Phase 1: Data Generation

- `[x]` `scripts/generateData.js` written and uses Turf.js.
- `[x]` Implements the 300m spacing rule via `turf.along()`.
- `[x]` Calculates all 6 stress factors based on geography.
- `[x]` Applies the CII formula, ML quantile calibration, and assigns 6-tier status (OPTIMAL -> SEVERE_RISK).
- `[x]` Assigns each component to one of the **12 named sectors** via bounding box geofencing.
- `[x]` Outputs `data/historical_components.json` with 3,769 realistic components.

---

## Phase 2: Core API Server

- `[x]` `index.js` created with Express + CORS.
- `[x]` Loads `historical_components.json` into memory on startup.
- `[x]` `GET /api/admin/dashboard/map` — sector aggregation with 6-tier counts.
- `[x]` `GET /api/admin/map/sector/:sectorId` — filtered sector components.
- `[x]` `GET /api/admin/component/:id` — single component deep dive.
- `[x]` `GET /api/engineer/tasks` — SEVERE_RISK and SUBSTANDARD components as task feed.
- `[x]` `POST /api/engineer/sync` — offline batch sync acknowledgement.

---

## Phase 3: Killer Features & Deployment

- `[x]` `GET /api/admin/predictive-map?monthsForward=X` — time slider decay with dynamic 6-tier thresholding.
- `[x]` `GET /api/admin/dashboard/live-stream` — SSE connection endpoint.
- `[x]` `POST /api/admin/demo/trigger` — live demo degradation trigger targeting Bangalore Central.
- `[x]` `POST /api/engineer/inspection/verify` — Gemini fail-safe mock response.
- `[x]` All endpoints fully tested and responding successfully under smoke tests.
- `[x]` **Dockerization:** Added `Dockerfile` and `docker-compose.yml` for instant MVP deployment.

---

## Phase 4: Frontend Integration (NEXT STEPS)

- `[ ]` Align Backend API to Frontend OpenAPI Spec (Translation Layer in `index.js`).
- `[ ]` Update frontend API base URL to `http://localhost:3000`.
- `[ ]` Connect Mapbox sector polygons to the dashboard endpoints.
- `[ ]` Connect Time Slider to predictive decay endpoints.
- `[ ]` Connect SSE stream listener for real-time map degradation triggers.

---

## Phase 5: Demo Rehearsal

- `[ ]` Run full data flow: `generateData.js` → `node index.js` → open dashboard.
- `[ ]` Verify map loads with colored sector polygons.
- `[ ]` Click each sector → verify dots appear on correct track lines.
- `[ ]` Click a dot → verify inspector popup shows correct data.
- `[ ]` Drag time slider to +12 months → verify dots visibly shift toward red.
- `[ ]` Click "Trigger Demo" → verify 5 dots turn red in real-time.
- `[ ]` Upload a test image → verify Gemini/fallback response appears in 1.5s.
