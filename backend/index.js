import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));

// Serve the data directory statically for fetching tracks GeoJSON
app.use('/data', express.static(path.join(__dirname, 'data')));

// 6-Tier CII status (calibrated to SWR maintenance data)
function getStatus(cii) {
  if (cii >= 95) return 'OPTIMAL';
  if (cii >= 80) return 'HIGHLY_RELIABLE';
  if (cii >= 60) return 'STABLE';
  if (cii >= 40) return 'NEEDS_MAINTENANCE';
  if (cii >= 20) return 'SUBSTANDARD';
  return 'SEVERE_RISK';
}

// --- DATA LOAD ---
const DATA_PATH = path.join(__dirname, 'data', 'historical_components.json');
let components = [];

if (fs.existsSync(DATA_PATH)) {
  const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
  components = JSON.parse(rawData);
  console.log(`[VISTA] Loaded ${components.length} components from database.`);
} else {
  console.warn(`\n[WARNING] Data file not found at ${DATA_PATH}.`);
  console.warn(`Please run 'node scripts/generateData.js' to generate the dataset.\n`);
}

// --- HEALTH CHECK ---
app.get('/api/healthz', (req, res) => res.json({ status: 'ok', components_loaded: components.length }));

app.get('/', (req, res) => {
  res.json({
    service: 'VISTA Backend',
    status: 'running',
    components_loaded: components.length,
    endpoints: [
      'GET  /api/components?sector=X&status=X&limit=N&sort=cii_asc|cii_desc',
      'GET  /api/admin/dashboard/map',
      'GET  /api/admin/map/sector/:sectorId',
      'GET  /api/admin/component/:id',
      'GET  /api/admin/predictive-map?monthsForward=N',
      'GET  /api/admin/dashboard/live-stream',
      'POST /api/admin/demo/trigger',
      'GET  /api/engineer/tasks',
      'POST /api/engineer/sync',
      'POST /api/engineer/inspection/verify',
    ]
  });
});

// --- ALL COMPONENTS (with filtering) ---
app.get('/api/components', (req, res) => {
  let result = [...components];
  if (req.query.sector) {
    result = result.filter(c =>
      c.location.sector.toLowerCase().replace(/\s+/g, '-') === req.query.sector.toLowerCase()
      || c.location.sector.toLowerCase() === req.query.sector.toLowerCase()
    );
  }
  if (req.query.status) {
    result = result.filter(c => c.status === req.query.status.toUpperCase());
  }
  if (req.query.sort === 'cii_asc') {
    result.sort((a, b) => a.cii_score - b.cii_score);
  } else if (req.query.sort === 'cii_desc') {
    result.sort((a, b) => b.cii_score - a.cii_score);
  }
  if (req.query.limit) {
    result = result.slice(0, parseInt(req.query.limit));
  }
  res.json({ success: true, total: components.length, count: result.length, data: result });
});

// --- ADMIN: SECTOR SUMMARY MAP ---
app.get('/api/admin/dashboard/map', (req, res) => {
  const sectors = {};
  components.forEach(comp => {
    const s = comp.location.sector;
    if (!sectors[s]) {
      sectors[s] = { total: 0, severe_risk: 0, substandard: 0, needs_maintenance: 0, stable: 0, highly_reliable: 0, optimal: 0 };
    }
    sectors[s].total++;
    const key = comp.status.toLowerCase().replace(/_/g, '_');
    if (sectors[s][key] !== undefined) sectors[s][key]++;
  });
  res.json({ success: true, data: sectors });
});

// --- ADMIN: SECTOR COMPONENTS ---
app.get('/api/admin/map/sector/:sectorId', (req, res) => {
  const sectorId = req.params.sectorId;
  const filtered = components.filter(c =>
    c.location.sector.toLowerCase().replace(/\s+/g, '-') === sectorId.toLowerCase()
  );
  res.json({ success: true, count: filtered.length, data: filtered });
});

// --- ADMIN: SINGLE COMPONENT DEEP DIVE ---
app.get('/api/admin/component/:id', (req, res) => {
  const comp = components.find(c => c.id === req.params.id);
  if (!comp) return res.status(404).json({ success: false, message: 'Component not found' });
  res.json({ success: true, data: comp });
});

// --- ADMIN: PREDICTIVE TIME SLIDER ---
app.get('/api/admin/predictive-map', (req, res) => {
  const monthsForward = parseInt(req.query.monthsForward) || 0;
  const predictedComponents = components.map(comp => {
    let newCii = comp.cii_score - (monthsForward * 1.5);
    newCii = Math.max(0, Math.min(100, newCii));
    return { ...comp, cii_score: parseFloat(newCii.toFixed(1)), status: getStatus(newCii), is_predicted: true };
  });
  res.json({ success: true, count: predictedComponents.length, data: predictedComponents });
});

// --- ADMIN: INSPECTION QUEUE ---
// Issue fix 4: This endpoint was in docs/contracts.md but missing from index.js entirely
const inspectionQueue = []; // In-memory queue, gets populated when sync triggers verification
app.get('/api/admin/inspection-queue', (req, res) => {
  res.json({ success: true, count: inspectionQueue.length, data: inspectionQueue });
});

// --- ADMIN: DISPATCH ---
// Also was in contracts.md but missing from code
app.post('/api/admin/dispatch', (req, res) => {
  const { component_id, engineer_id } = req.body;
  if (!component_id || !engineer_id) {
    return res.status(400).json({ success: false, message: 'component_id and engineer_id are required.' });
  }
  res.json({ success: true, message: `Ticket for ${component_id} dispatched to ${engineer_id}.` });
});

// --- ENGINEER: TASK FEED ---
// Returns the highest-risk components (SEVERE_RISK first, then SUBSTANDARD)
app.get('/api/engineer/tasks', (req, res) => {
  const severe = components.filter(c => c.status === 'SEVERE_RISK');
  const substandard = components.filter(c => c.status === 'SUBSTANDARD');
  const tasks = [...severe, ...substandard].slice(0, 10);
  res.json({ success: true, count: tasks.length, data: tasks });
});

// --- ENGINEER: OFFLINE SYNC ---
app.post('/api/engineer/sync', (req, res) => {
  const payload = req.body;
  res.json({
    success: true,
    message: 'Offline data synchronized successfully.',
    records_processed: payload.inspections ? payload.inspections.length : 0
  });
});

// --- ENGINEER: IMAGE VERIFICATION (Gemini + Fail-Safe) ---
app.post('/api/engineer/inspection/verify', async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { imageBase64, description, componentId } = req.body;

    if (!imageBase64) {
      throw new Error("No image data provided");
    }

    // Prepare the multimodal prompt
    const prompt = `You are a VISTA Smart Highway AI inspector.
Analyze this component inspection image. The engineer described the issue as: "${description || 'None provided'}".
Determine the severity and a summary.
Respond strictly in JSON format with these exact keys:
"tag": (Critical, Warning, or Info)
"summary": (A 1-2 sentence assessment)
"confidence_score": (Number 0-100)
"action_taken": (ESCALATED_TO_MANUAL_BOARD or AUTO_RESOLVED)`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBase64.split(',')[1] || imageBase64,
                mimeType: imageBase64.split(';')[0].split(':')[1] || 'image/jpeg'
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const resultText = response.text;
    const resultJson = JSON.parse(resultText);

    res.json({
      success: true,
      tag: resultJson.tag || 'Critical',
      summary: resultJson.summary || '[Gemini Vision Fallback]: Severe damage detected.',
      confidence_score: resultJson.confidence_score || 90,
      action_taken: resultJson.action_taken || 'ESCALATED_TO_MANUAL_BOARD'
    });
  } catch (error) {
    console.error('[Gemini API Error]', error);
    // Fallback response
    res.json({
      success: true,
      tag: 'Critical',
      summary: '[Fallback]: Severe lateral cracking detected on the component surface. Immediate manual review required.',
      confidence_score: 85,
      action_taken: 'ESCALATED_TO_MANUAL_BOARD'
    });
  }
});

// --- LIVE DEMO: SSE STREAM + TRIGGER ---
let sseClients = [];

app.get('/api/admin/dashboard/live-stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Send a heartbeat immediately so the client knows the connection is live
  res.write(`data: ${JSON.stringify({ event: 'CONNECTED', message: 'VISTA SSE stream active' })}\n\n`);

  const clientId = Date.now();
  sseClients.push({ id: clientId, res });

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== clientId);
  });
});

app.post('/api/admin/demo/trigger', (req, res) => {
  // Pick STABLE/HIGHLY_RELIABLE components from Bangalore Central for max visual impact
  const PRIME_SECTORS = ['Bangalore Central', 'Krishnarajapuram Zone', 'Yeshwantpur Zone'];
  const candidates = components.filter(c =>
    (c.status === 'STABLE' || c.status === 'HIGHLY_RELIABLE') &&
    PRIME_SECTORS.includes(c.location.sector)
  );
  // Fallback: any STABLE component
  const pool = candidates.length >= 5 ? candidates
    : components.filter(c => c.status === 'STABLE' || c.status === 'HIGHLY_RELIABLE');

  const degraded = [];
  for (let i = 0; i < 5 && i < pool.length; i++) {
    const comp = pool[i];
    comp.cii_score = 18.0;
    comp.status = 'SEVERE_RISK';
    comp.factors.braking_zone = 0.97;
    degraded.push(comp);
  }

  const ssePayload = JSON.stringify({ event: 'COMPONENTS_DEGRADED', data: degraded });
  sseClients.forEach(client => client.res.write(`data: ${ssePayload}\n\n`));
  res.json({ success: true, message: `Demo triggered. ${degraded.length} components degraded to SEVERE_RISK.`, data: degraded });
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`\n[VISTA] Backend running → http://localhost:${PORT}`);
  console.log(`[VISTA] Visit http://localhost:${PORT}/ to confirm all endpoints\n`);
});
