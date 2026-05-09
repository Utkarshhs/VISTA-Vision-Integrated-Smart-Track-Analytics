# VISTA (Vision-Integrated Smart Track Analytics)

**Modernizing track infrastructure through predictive AI, generative vision, and offline-first data syncing.**

## Project Overview

VISTA is an intelligent, dual-portal predictive maintenance system designed to shift railway safety protocols from reactive to proactive. Indian Railways relies on millions of critical track components—such as concrete sleepers, elastic rail clips, and track change points—to maintain the structural integrity of its vast network. VISTA prevents derailments by predicting component failure before it occurs.

### The Challenge

Currently, tracking the health of these components relies heavily on manual logs and reactive maintenance. Interventions typically occur only after a component fails, which dramatically increases the risk of derailments and causes severe operational delays. VISTA solves this by introducing a unified, offline-first digital approach.

### Repository Structure

This repository is organized into two main workspaces:

- **`/monish` (Frontend & UI):** Contains all the previously built user interfaces, the offline-first React.js PWA, and dashboard implementations.
- **`/backend` (AI & Server Logistics):** Contains the data simulation algorithms, machine learning integrations, and the server infrastructure that synchronizes data between the field workers and regional controllers.

---

## Core Differentiator: Offline-First Resilience & Automated Verification

Railway infrastructure is frequently located in remote areas with zero network connectivity. VISTA is architected specifically for this operational reality, combining an offline-capable mobile interface for field engineers with a centralized AI command center for railway administrators.

### Dual-Portal Architecture

**1. Railway Admin Command Center (Web Portal)**
Designed for railway overseers, this dashboard serves as the central nervous system for track network management.
- **Predictive Alerts:** A mathematical model flags high-risk components (indicated visually on the dashboard) based on historical age and 6 critical environmental stress factors.
- **Task Dispatch:** Administrators can instantly generate a repair ticket and broadcast it to the field engineering team.

**2. Field Engineer Application (Mobile-First Web App)**
Designed for field personnel, ensuring uninterrupted operation in areas with limited or no network connectivity.
- **On-Demand Task Allocation:** Real-time feed of open maintenance tickets within their assigned sector.
- **Offline Inspection Logging:** Conduct track inspections and capture photographic evidence completely offline.
- **Automated Data Synchronization:** Auto-syncs localized data with the central server upon returning to an active network zone.

---

## Predictive Analytics & External Stress Factors

The underlying engine calculates a **Component Integrity Index (CII)** (0-100 score) for each track component. The CII decreases based on baseline wear combined with the following **6 Environmental & External Factors**:

1. **Load Stress (Tonnage/GMT):** Average Gross Million Tonnes handled. Heavy freight degrades tracks faster than passenger trains.
2. **Thermal Gradient (Temperature Cycles):** Extreme heat causes rail buckling (sun kinks), while extreme cold causes brittle fractures.
3. **Moisture & Precipitation Index:** High rainfall accelerates rust/corrosion and weakens the track ballast.
4. **Braking/Acceleration Zones:** Tracks near stations or signals experience extreme longitudinal forces, causing rapid wear.
5. **Track Change Points (Switches/Crossings):** Complex junctions where tracks merge or split experience intense mechanical impact and have high moving-part failure rates.
6. **Track Curvature Stress:** Sharp curves experience higher lateral centrifugal forces, leading to uneven wear on the outer rail and fasteners.

These factors enable us to programmatically generate highly realistic **synthetic datasets** that are perfect for simulations, demonstrations, and robust Machine Learning (ML) training.

---

## AI Verification & Workflow (Simulation MVP)

1. **Predictive Analytics:** The backend simulates components, applying the 6 stress factors to mathematically flag assets at risk of failure.
2. **Administrative Dispatch:** Regional Controllers review dashboard alerts and dispatch inspection tickets to Local Hub Supervisors or Field Engineers.
3. **Task Resolution:** Field engineers claim tickets, travel to the site, perform maintenance, and upload photographic evidence.
4. **AI-Powered Visual Verification (Hybrid Approach):** The uploaded image is processed through the **Gemini Flash API**. It provides a quick summary of the visual state and tags it as `Confident`, `Normal`, or `Critical`.
5. **Data Synchronization & Escalation:** If the AI tags the image as `Confident`, the ticket is closed automatically. If tagged as `Normal` or `Critical`, the ticket is escalated to a **Manual Inspection Board** for human review.

> **Future Enhancement (Fail-Safe Mode):** A fallback mechanism will be implemented for the Gemini API. If the network drops during the live demo, the backend will instantly return a mock "CRITICAL" JSON response to ensure the demo continues flawlessly without freezing.

## Technical Stack

- **Frontend:** React.js / Vite (Configured as a PWA for offline capabilities)
- **Backend Infrastructure:** *In development (see `/backend`)*
- **Predictive Engine:** Custom-trained ML Model (Tabular Data) using the 6 stress factors.
- **Vision Engine:** Gemini Flash API for rapid image summarization and triage.
  - *Note for Developers: To enable AI Verification, you must add your `GEMINI_API_KEY` to the `/backend/.env` file. The frontend uploads images to Firebase Storage and the backend securely queries the Gemini API before pushing the results back to the frontend via Firebase Realtime sync.*
