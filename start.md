# VISTA - Startup Guide

To easily run the complete VISTA platform locally for your demo, you will need to start three separate services. Open three separate terminal tabs and run the following commands in each:

## 1. Start the Backend API
This powers the component database and the Gemini AI vision inspection endpoint.
```bash
cd backend
npm install   # Only needed the first time
npm start
```
*The backend will run on `http://localhost:3000`*

## 2. Start the VISTA Dashboard (Website)
This serves the regional controller live radar map and component status tracker.
```bash
cd frontend/website
npx serve -p 8080 .
```
*Access the dashboard at `http://localhost:8080/dashboard.html`*

## 3. Start the Engineer Mobile Web App
This serves the React-based inspection tool that field engineers use to verify damage and upload images.
```bash
cd frontend/engineer-app/app/artifacts/railtrack
npm install   # Only needed the first time
npm run dev
```
*Access the engineer app at `http://localhost:5173`*

---

### Verification Checklist:
- **Backend**: You should see `[VISTA] Backend running → http://localhost:3000` in the terminal.
- **Dashboard**: Ensure the map loads successfully and you see the data populating on the left side.
- **Engineer App**: Ensure you can click on an inspection task and access the camera upload page.
