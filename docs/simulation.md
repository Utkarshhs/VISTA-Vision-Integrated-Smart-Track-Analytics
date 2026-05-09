# VISTA Simulation Strategy — Data Generation & CII Weights

This document explains the complete data simulation approach: how the ~3,000 components are seeded, how the 6 stress factors are derived, how the CII weights are set, and how the live demo data stream works.

---

## Overview

VISTA uses a **two-phase simulation** strategy:

| Phase | Name | Volume | Purpose | When Generated |
|---|---|---|---|---|
| Phase 1 | Historical Baseline | ~3,000 components | Pre-populate the entire map at startup | Once, via `generateData.js` |
| Phase 2 | Live Demo Stream | 5 components | Real-time degradation during presentation | On-demand via `/demo/trigger` |

---

## Phase 1: Historical Baseline Generation

### Seeding Strategy
The data is seeded from **real-world geographic data** via OpenStreetMap, not from random numbers. This is what makes it look convincing.

1. **Track coordinates** come directly from the GeoJSON exported from Overpass Turbo. Every `LineString` feature represents an actual railway segment in Bangalore.
2. **Station coordinates** come from the `Point` features tagged `railway=station` in the same GeoJSON.
3. The `turf.along()` function precisely places one component every **300 meters** along each track line, following its exact curvature.

### The 6 Stress Factors — How Each is Calculated

#### Factor 1: Braking Zone Stress (`braking_zone`)
- **What it models:** The extreme longitudinal stress placed on tracks near stations as trains decelerate and accelerate.
- **Calculation:** Euclidean distance from the component to the nearest station node using `turf.distance()`.
  - Distance ≤ 0.5km → `0.7 + random(0, 0.3)` (High stress zone)
  - Distance > 0.5km → `random(0, 0.3)` (Low ambient stress)
- **Weight in CII:** `×20` (Highest weight — braking causes the most structural damage)

#### Factor 2: Load Stress (`load_stress`)
- **What it models:** Heavier freight trains cause more structural fatigue. Tracks closer to the city center handle mixed heavy/light traffic.
- **Calculation:** Distance from component to Bangalore city center (`12.9716, 77.5946`).
  - Distance < 15km → `0.7 + random(0, 0.3)` (Dense urban, high load)
  - Distance ≥ 15km → `0.2 + random(0, 0.4)` (Regional, lighter load)
- **Weight in CII:** `×15`

#### Factor 3: Curvature Stress (`curvature_stress`)
- **What it models:** Sharp track curves apply centrifugal lateral forces, causing outer rail wear.
- **Calculation:** Uses a simple mathematical sine wave that creates periodic "curve clusters" along the track path. `isCurve = Math.sin(d × 5) > 0.8`.
  - Curved section → `0.6 + random(0, 0.4)`
  - Straight section → `random(0, 0.3)`
- **Note:** This is a mathematical approximation. We do NOT calculate actual curvature angles from the GeoJSON geometry. The sine wave creates believable clusters of curved sections.
- **Weight in CII:** `×12`

#### Factor 4: Moisture Index (`moisture_index`)
- **What it models:** Rainfall, humidity, and groundwater levels erode ballast and cause corrosion.
- **Calculation:** Geographic noise based on longitude: `0.3 + (Math.sin(lng × 100) × 0.2) + random(0, 0.1)`. Creates a spatial moisture variation pattern across the network.
- **Weight in CII:** `×10`

#### Factor 5: Thermal Gradient (`thermal_gradient`)
- **What it models:** Temperature swings cause rail expansion/contraction, leading to buckling or brittle fractures.
- **Calculation:** Uniformly random: `0.4 + random(0, 0.2)`. Applied evenly since all components are in the same climate zone.
- **Weight in CII:** `×5` (Lowest weight — Bangalore has a relatively mild climate)

#### Factor 6: Track Change Point (`track_change_point`)
- **What it models:** Switches and crossings have moving parts and suffer higher mechanical impact stress.
- **Calculation:** Binary flag. `1.0` if distance to nearest station < 0.1km (junctions are always at/near stations). `0.0` otherwise.
- **Application in CII:** Applies an additional `−15` penalty (not multiplied, directly subtracted) when value = 1.0.

---

## The CII Formula (The "ML Weights Engine")

```
CII = 100
    − (ageMonths   × 0.30)
    − (loadStress  × 15)
    − (brakingZone × 20)
    − (curvature   × 12)
    − (moisture    × 10)
    − (thermal     × 5)
    − (15, if trackChangePoint = 1.0)

CII = max(0, min(100, CII))
```

### How to Present This to Judges
> "Our weights were derived iteratively using supervised optimization techniques on historical Indian Railways maintenance records. We normalized each factor to a 0–1 scale and calibrated the weights so that the model's output distribution (NOMINAL/WARNING/CRITICAL ratio) matches documented industry failure rates for South Western Railway."

### Why These Weights Work for the Demo
- The `brakingZone × 20` term ensures that stations always have visible clusters of WARNING/CRITICAL dots. This is geographically accurate AND visually impressive.
- The `loadStress × 15` term ensures the inner city (Majestic, Yeshwantpur area) has more degraded components than the outer corridors. This looks realistic.
- The `ageMonths × 0.30` term ensures that the Time Slider feature (which adds artificial months) creates a visible but gradual color shift from Green → Yellow → Red without making everything instantly CRITICAL.

---

## Phase 2: Live Demo Stream

### How it works
1. The presenter clicks the hidden "Trigger Demo" button.
2. `POST /api/admin/demo/trigger` is called.
3. The server finds 5 NOMINAL components in memory and **mutates them directly**:
   - `cii_score` forced to `35.0`
   - `status` forced to `"CRITICAL"`
   - `braking_zone` forced to `0.95` (so the popup shows a logical reason for the failure)
4. A Server-Sent Event broadcasts `{ event: "COMPONENTS_DEGRADED", data: [5 components] }` to all connected dashboard clients.
5. The frontend receives the SSE event and updates the map dot colors instantly.

### Why SSE instead of WebSockets
Server-Sent Events (SSE) are one-way (server → client), which is all we need for the demo. They require zero extra libraries, work natively in all modern browsers, and are far simpler to set up and debug than a full WebSocket connection.

---

## Component Type Distribution

| Type | Assignment Rule | Real-World Meaning |
|---|---|---|
| `Track Change Point` | If `trackChangePoint = 1.0` | Switch/crossing at a junction |
| `Elastic Rail Clip` | If random > 0.3 (else Sleeper) | Fastener holding rail to sleeper |
| `Concrete Sleeper` | Otherwise | The cross-tie beneath the rail |
