# VISTA Feature Map — Backend to Frontend Sync

This document maps every frontend feature to the exact backend endpoint and data that powers it.

---

## PORTAL 1: Field Engineer Mobile PWA

### Feature 1: Task Feed
| Item | Detail |
|---|---|
| **User sees** | List of CRITICAL components to inspect |
| **Endpoint** | `GET /api/engineer/tasks` |
| **Returns** | Up to 10 CRITICAL Component objects |
| **Displays** | Component ID, type, sector, CII score, status badge |

### Feature 2: Offline Inspection Form + Photo Upload
| Item | Detail |
|---|---|
| **Offline storage** | `localStorage` / `IndexedDB` in the PWA |
| **Sync endpoint** | `POST /api/engineer/sync` |
| **Payload** | `{ engineer_id, inspections: [{ component_id, notes, image_base64 }] }` |
| **Backend action** | Acknowledges receipt, triggers Gemini pipeline |

### Feature 3: Gemini AI Image Verification
| Item | Detail |
|---|---|
| **Endpoint** | `POST /api/engineer/inspection/verify` |
| **Result** | Tag (`Confident`/`Normal`/`Critical`) + summary text |
| **Fail-Safe** | Mock response returned in 1.5s if Gemini unavailable |

---

## PORTAL 2: Authority Command Center

### Feature 4: Full Network Map
| Item | Detail |
|---|---|
| **User sees** | 45km Mapbox map. 6 colored sector polygons on real railway tracks. No roads/buildings. |
| **Endpoint** | `GET /api/admin/dashboard/map` |
| **Returns** | Per-sector `{ total, critical, warning, nominal }` |
| **Map coloring** | Red if >10% critical, yellow if >5%, green otherwise |
| **Map library** | Mapbox GL JS via `react-map-gl`. Custom studio style |

### Feature 5: Sector Drilldown
| Item | Detail |
|---|---|
| **User action** | Click a sector polygon |
| **Frontend** | `map.flyTo()` smooth zoom animation |
| **Endpoint** | `GET /api/admin/map/sector/:sectorId` |
| **Rendering** | Mapbox `Circle Layer` (WebGL/GPU — no DOM lag) |
| **Dot colors** | Green=NOMINAL, Yellow=WARNING, Red=CRITICAL |

### Feature 6: Component Inspector Popup
| Item | Detail |
|---|---|
| **User action** | Click a dot on the map |
| **Endpoint** | `GET /api/admin/component/:id` |
| **Popup** | Small floating panel next to the dot (not full screen) |
| **Left section** | ID, Type, Coordinates, Age (months) |
| **Right section** | 6 stress factors as progress bars (0–1 scale) |
| **Bottom strip** | CII Score + Status Tag, colored by status |

### Feature 7: Predictive Time Slider
| Item | Detail |
|---|---|
| **User sees** | Timeline slider "Now → +24 months" at bottom of Command Center |
| **Endpoint** | `GET /api/admin/predictive-map?monthsForward={value}` |
| **Algorithm** | `newCII = currentCII − (monthsForward × 1.5)` |
| **Effect** | Map dots re-color on slider release to show future decay |

### Feature 8: Live Demo Real-Time Trigger
| Item | Detail |
|---|---|
| **Action** | Hidden "Trigger Demo" button in navbar |
| **Trigger endpoint** | `POST /api/admin/demo/trigger` |
| **Stream endpoint** | `GET /api/admin/dashboard/live-stream` (SSE) |
| **Effect** | 5 green dots instantly turn red on map + alert slide-in |

### Feature 9: Dispatch Console
| Item | Detail |
|---|---|
| **Endpoint** | `POST /api/admin/dispatch` |
| **Payload** | `{ component_id, engineer_id }` |
| **Engineer sees** | New task in their task feed |

### Feature 10: Manual Inspection Board
| Item | Detail |
|---|---|
| **Endpoint** | `GET /api/admin/inspection-queue` |
| **Shows** | Tickets where `status === "NEEDS_MANUAL_REVIEW"` |

---

## Feature-to-Endpoint Quick Reference

| # | Feature | Endpoint | Method |
|---|---|---|---|
| 1 | Task Feed | `/api/engineer/tasks` | GET |
| 2 | Offline Sync | `/api/engineer/sync` | POST |
| 3 | Image Verify | `/api/engineer/inspection/verify` | POST |
| 4 | Full Map Sectors | `/api/admin/dashboard/map` | GET |
| 5 | Sector Components | `/api/admin/map/sector/:sectorId` | GET |
| 6 | Component Inspector | `/api/admin/component/:id` | GET |
| 7 | Time Slider | `/api/admin/predictive-map` | GET |
| 8 | SSE Stream | `/api/admin/dashboard/live-stream` | GET |
| 8 | Demo Trigger | `/api/admin/demo/trigger` | POST |
| 9 | Dispatch | `/api/admin/dispatch` | POST |
| 10 | Inspection Queue | `/api/admin/inspection-queue` | GET |
