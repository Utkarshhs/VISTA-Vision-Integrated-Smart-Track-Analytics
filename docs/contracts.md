# API Contracts between Frontend & Backend

This document defines the standardized API contracts that both the Web Application and the Engineer App (React/Vite) must adhere to when communicating with the Express.js Backend.

## 1. Map & Dashboard Endpoints

### 1.1 Get Sector Summary
- **Endpoint**: `GET /api/admin/dashboard/map`
- **Description**: Retrieves a count of components by status for each sector.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "Bangalore Central": {
        "total": 150,
        "severe_risk": 5,
        "substandard": 12,
        "needs_maintenance": 20,
        "stable": 80,
        "highly_reliable": 25,
        "optimal": 8
      }
    }
  }
  ```

### 1.2 Get Components by Sector
- **Endpoint**: `GET /api/admin/map/sector/:sectorId`
- **Description**: Retrieves detailed component data for map rendering in a specific sector.
- **Response**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "id": "TRK-BNG-MJ-001",
        "type": "ERC Clip",
        "location": { "sector": "Bangalore Central", "coordinates": "12.9234, 77.5021" },
        "cii_score": 75.5,
        "status": "STABLE",
        "factors": { "braking_zone": 0.8, "curvature": 0.9, "historical_faults": 0 }
      }
    ]
  }
  ```

### 1.3 Get Predictive Degradation Map
- **Endpoint**: `GET /api/admin/predictive-map?monthsForward={N}`
- **Description**: Simulates the CII score degradation `N` months into the future.
- **Response**: Same format as `1.2`, but with `is_predicted: true` and lowered `cii_score`.

## 2. Dispatch & Task Endpoints

### 2.1 Get Engineer Tasks
- **Endpoint**: `GET /api/engineer/tasks`
- **Description**: Retrieves highest-risk components assigned to engineers (SEVERE_RISK and SUBSTANDARD).
- **Response**: Array of component objects (Same as `1.2`).

### 2.2 Dispatch Task to Engineer
- **Endpoint**: `POST /api/admin/dispatch`
- **Description**: Dispatches a maintenance task to a specific engineer.
- **Request Body**:
  ```json
  {
    "component_id": "TRK-BNG-MJ-001",
    "engineer_id": "eng-123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Ticket for TRK-BNG-MJ-001 dispatched to eng-123."
  }
  ```

## 3. Engineer Actions & AI Verification

### 3.1 AI Image Verification (Gemini)
- **Endpoint**: `POST /api/engineer/inspection/verify`
- **Description**: Replaces the frontend-side direct Gemini calls. The frontend uploads the image to Firebase Storage, then passes the `photoUrl` to this endpoint. The backend processes the image using Gemini and updates the Firestore document, which will trigger a frontend UI update.
- **Request Body**:
  ```json
  {
    "component_id": "TRK-BNG-MJ-001",
    "assignment_id": "BRD-12345",
    "photoUrl": "https://firebasestorage.googleapis.com/v0/b/..."
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Gemini processing started. Result will be pushed via Firebase realtime update."
  }
  ```

### 3.2 Offline Sync
- **Endpoint**: `POST /api/engineer/sync`
- **Description**: Syncs locally cached inspections to the central backend once internet connection is restored.
- **Request Body**:
  ```json
  {
    "inspections": [
      {
        "component_id": "TRK-BNG-MJ-001",
        "timestamp": "2024-03-25T10:00:00Z",
        "notes": "Replaced ERC clip",
        "aiAnalysis": { ... }
      }
    ]
  }
  ```

## 4. Live Events (SSE)

### 4.1 Dashboard Live Stream
- **Endpoint**: `GET /api/admin/dashboard/live-stream`
- **Description**: Server-Sent Events (SSE) endpoint to listen for realtime component degradation or task completion.
- **Event Example**:
  ```json
  {
    "event": "COMPONENTS_DEGRADED",
    "data": [ { ...component_object... } ]
  }
  ```

---

## 🛑 Missing Endpoints to be Created
1. `GET /api/components`: To fetch all components at once (or paginated) to populate the initial map and replace the frontend's mocked component data.
