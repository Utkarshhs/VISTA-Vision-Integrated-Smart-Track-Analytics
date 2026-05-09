# Integration Plan: VISTA Backend & Frontend

## Background
The project currently has a well-developed Node.js/Express backend (with data simulation and SSE streams) and two frontends (a Web app for Controllers/Supervisors and a React app for Engineers).
Currently, the frontends are heavily disconnected from the backend. They rely on hardcoded `mockData` and direct Firebase connections, while also making unsafe direct calls to the Gemini API.

This integration plan outlines the exact steps for junior developers to connect the systems properly without changing the UI/UX.

---

## Phase 1: Standardize Data Fetching (Replace Mock Data)

### 1. Remove Frontend Hardcoded Component Data
- **Web App (`script.js`)**: Delete the `mockData.components` and `mockData.sectors` arrays. *Note: We will KEEP `mockData.engineers` faked as requested, so no backend logic needs to be created for engineers.*
- **Engineer App**: Remove local component JSONs/mocks.

### 2. Connect to Map & Dashboard Endpoints
- **Web App**:
  - Update `renderRiskMap()` to fetch from `GET /api/admin/map/sector/:sectorId` or a new `GET /api/components` endpoint to get real backend data.
  - Update `renderMetrics()` to use data from `GET /api/admin/dashboard/map`.
- **UI/UX Note**: Ensure the map nodes and coloring still use the same logic (`getCIIColor`, `getCIIStatusLabel`), but rely on the backend's `cii_score` and `status` fields instead of calculating CII on the fly in `script.js`.

---

## Phase 2: Secure AI & Unify Realtime Data

### 1. Realtime Synchronization Strategy (Firebase + Backend)
*Decision: We will KEEP Firebase for realtime synchronization to prioritize simplicity and demo stability.*
- **Source of Truth**: The Express backend remains the primary database for components and tasks.
- **Sync Flow**: When the backend processes an event (e.g., dispatch, status change), it will instantly push the update to the Firebase Firestore `dispatches` or `assignments` collections.
- **Frontend Reaction**: The frontend's existing `onSnapshot` listeners will detect the change and update the UI live. This prevents divergence while keeping the mobile offline-sync robust.

### 2. Move Gemini Verification to Backend
*Decision: Frontend API keys will be removed. Gemini processing will happen strictly on the backend.*
- **Image Upload**: The Engineer App will upload photos to Firebase Storage to get a `photoUrl`. Do NOT embed large base64 strings directly in Firestore documents.
- **Trigger Processing**: Frontend sends the `photoUrl` to `POST /api/engineer/inspection/verify`.
- **Loading State**: The frontend must display a loading/processing state while the AI runs.
- **Result Push**: Once the backend's Gemini API finishes processing, the backend updates the task document in Firestore. The frontend listener will catch this and update the UI automatically.

---

## Phase 3: Implement the "Map Navigation" Feature

We will use **Leaflet JS** with a CartoDB Light basemap to maintain a highly performant and clear geospatial interface.
1. **View Style**: A light-themed map (`cartocdn.com/light_all`) that contrasts with the data overlay.
2. **Geospatial Overlay**: 
   - **Hub Polygons**: 12 distinct colored `L.rectangle` overlays to clearly delineate the maintenance hubs/sectors.
   - **Railway Network**: Draw the physical track lines across the map using `L.geoJSON` from the backend track data.
3. **Data Rendering**:
   - Render **all 3,700+** components simultaneously.
   - Use `L.circleMarker` mapped to the 6-tier CSS color palette (Severe Risk `#dc2626`, etc.) to ensure high performance via Canvas rendering.
4. **Interaction**: 
   - **Zoom Controls**: The default Leaflet Zoom In/Out controls (+/-) are fully implemented and retained on the map interface.
   - Click a point (component) to show a popup with details and trigger the Dispatch workflow.
