# Data Processing Pipelines

This document describes the exact step-by-step data flow for every major pipeline in VISTA.

---

## Pipeline 1: Data Generation (One-Time Setup)

**Trigger:** Manual — run `node scripts/generateData.js` once before the demo.
**Input:** `data/railway-network.geojson` (from Overpass Turbo)
**Output:** `data/historical_components.json`

```
Step 1: Read railway-network.geojson
         └── Extract all LineString features (track segments)
         └── Extract all Point features where railway=station

Step 2: For each LineString (track segment):
         └── Use turf.length() to get the total length in km
         └── Loop from d=0 to d=lineLength, stepping by 0.3km (300m)
             └── Use turf.along(line, d) to get exact lat/lng ON the track

Step 3: For each point along the track:
         └── Calculate BRAKING STRESS
             └── Use turf.distance(point, nearestStation)
             └── If distance < 0.5km → brakingZone = 0.7 + random(0.3)
             └── Else → brakingZone = random(0.3)

         └── Calculate CURVATURE STRESS
             └── isCurve = Math.sin(d * 5) > 0.8  (periodic clustering)
             └── If isCurve → curvatureStress = 0.6 + random(0.4)
             └── Else → curvatureStress = random(0.3)

         └── Calculate LOAD STRESS
             └── Use turf.distance(point, bangaloreCenter)
             └── If distToCenter < 15km → loadStress = 0.7 + random(0.3)
             └── Else → loadStress = 0.2 + random(0.4)

         └── Calculate MOISTURE INDEX
             └── moistureIndex = 0.3 + (Math.sin(lng * 100) * 0.2) + random(0.1)
             └── (Geographic noise — varies by longitude)

         └── Calculate THERMAL GRADIENT
             └── thermalGradient = 0.4 + random(0.2)

         └── Calculate TRACK CHANGE POINT
             └── If distance to nearest station < 0.1km → 1.0 (it's a junction)
             └── Else → 0.0

Step 4: Run the CII Formula:
         CII = 100
             - (ageMonths × 0.30)
             - (loadStress × 15)
             - (brakingZone × 20)
             - (curvatureStress × 12)
             - (moistureIndex × 10)
             - (thermalGradient × 5)
             - (trackChangePoint × 15)  ← only applied if = 1.0
         CII = clamp(CII, 0, 100)

Step 5: Assign STATUS
         CII >= 70  → NOMINAL
         CII 40-69  → WARNING
         CII < 40   → CRITICAL

Step 6: Assign SECTOR using Geofencing
         └── Check which of the 6 bounding box polygons the point falls inside
         └── If none match → "Regional Outer"

Step 7: Build Component object and push to array

Step 8: Write full array to data/historical_components.json
```

**Expected output:** ~3,000 components (exact count depends on GeoJSON track density).

---

## Pipeline 2: API Request Flow (Runtime)

**Trigger:** Frontend makes an HTTP request to the Express server.

```
Frontend Request
      ↓
Express Router (index.js)
      ↓
Route Handler reads from in-memory `components` array (loaded at startup)
      ↓
Filters / aggregates as needed (no DB query, all in-memory)
      ↓
Returns JSON response to Frontend
```

**Key point:** There are NO database writes during normal API calls. The server is purely read-only against the pre-generated JSON file during the hackathon MVP.

---

## Pipeline 3: Offline Engineer Sync

**Trigger:** Field Engineer PWA calls `POST /api/engineer/sync` after regaining connectivity.

```
PWA sends batch payload → /api/engineer/sync
      ↓
Backend receives { engineer_id, inspections: [...] }
      ↓
Logs records_processed count
      ↓
Returns 200 OK { success: true, records_processed: N }
      ↓ (async)
[Future] For each inspection with image_base64:
      └── Forward to /api/engineer/inspection/verify
```

---

## Pipeline 4: Gemini Vision Verification

**Trigger:** `POST /api/engineer/inspection/verify` called with an image.

```
Request arrives with { image_base64 }
      ↓
[Check] Is GEMINI_API_KEY set in .env?
      ├── YES → Call Gemini Flash API with strict prompt
      │          └── Parse structured JSON response
      │          └── Return { tag, summary, confidence_score }
      └── NO (or API fails) → Fail-Safe: Wait 1.5s, return mock response
                              └── { tag: "Critical", summary: "...", confidence_score: 98 }

Final step: ticket.status set to:
      "Confident" → RESOLVED (auto-close)
      "Normal"    → NEEDS_MANUAL_REVIEW
      "Critical"  → NEEDS_MANUAL_REVIEW + dispatch alert
```

---

## Pipeline 5: Live Demo Trigger

**Trigger:** Presenter clicks hidden button → `POST /api/admin/demo/trigger`

```
Request arrives → /api/admin/demo/trigger
      ↓
Find first 5 components in memory where status === "NOMINAL"
      ↓
Mutate each one IN MEMORY:
      └── component.cii_score = 35.0
      └── component.status = "CRITICAL"
      └── component.factors.braking_zone = 0.95

      ↓
Build degraded array of 5 components
      ↓
For each connected SSE client:
      └── client.res.write(`data: ${JSON.stringify({ event: "COMPONENTS_DEGRADED", data: degraded })}\n\n`)

      ↓
Return 200 OK to the POST caller with the degraded components
```

---

## Pipeline 6: Predictive Time Slider

**Trigger:** Frontend slider moves → `GET /api/admin/predictive-map?monthsForward=12`

```
Request arrives with monthsForward query param
      ↓
Clone entire components array (do NOT mutate original)
      ↓
For each cloned component:
      └── newCii = component.cii_score - (monthsForward × 1.5)
      └── newCii = clamp(newCii, 0, 100)
      └── Recalculate status from newCii
      └── Set is_predicted = true

      ↓
Return full predicted array (same structure as normal components)
      ↓
Frontend re-renders dot colors on the map
```
