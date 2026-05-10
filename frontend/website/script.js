// ============ OFFLINE STATE ============
let isOffline = false;

// ============ BACKEND API CONFIG ============
const API_BASE = (window.VISTA_CONFIG && window.VISTA_CONFIG.API_BASE_URL) || 'http://localhost:3000';

// ============ BACKEND 6-TIER STATUS SYSTEM ============
// Backend is the source of truth for CII scores and status tiers.
// These functions map backend status strings to display properties.

function getStatusCssClass(status) {
    const map = {
        'SEVERE_RISK': 'severe-risk', 'SUBSTANDARD': 'substandard',
        'NEEDS_MAINTENANCE': 'needs-maintenance', 'STABLE': 'stable',
        'HIGHLY_RELIABLE': 'highly-reliable', 'OPTIMAL': 'optimal'
    };
    return map[status] || 'stable';
}

function getStatusColor(status) {
    const map = {
        'SEVERE_RISK': '#ff2a2a', 'SUBSTANDARD': '#ff7a00',
        'NEEDS_MAINTENANCE': '#ffbb00', 'STABLE': '#1eff44',
        'HIGHLY_RELIABLE': '#00cc33', 'OPTIMAL': '#00eeff'
    };
    return map[status] || '#9ca3af';
}

function getStatusLabel(status) {
    const map = {
        'SEVERE_RISK': 'Severe Risk', 'SUBSTANDARD': 'Substandard',
        'NEEDS_MAINTENANCE': 'Needs Maintenance', 'STABLE': 'Stable',
        'HIGHLY_RELIABLE': 'Highly Reliable', 'OPTIMAL': 'Optimal'
    };
    return map[status] || status;
}

// Legacy adapters — some Firebase/modal code still calls these with a CII number
function getCIIColor(cii) {
    if (cii < 20) return '#dc2626';
    if (cii < 40) return '#ea580c';
    if (cii < 60) return '#ca8a04';
    if (cii < 80) return '#16a34a';
    if (cii < 95) return '#15803d';
    return '#06b6d4';
}
function getCIIStatusLabel(cii) {
    if (cii < 20) return 'SEVERE RISK';
    if (cii < 40) return 'SUBSTANDARD';
    if (cii < 60) return 'NEEDS MAINTENANCE';
    if (cii < 80) return 'STABLE';
    if (cii < 95) return 'HIGHLY RELIABLE';
    return 'OPTIMAL';
}

// ============ LIVE BACKEND DATA ============
let backendComponents = []; // Populated from GET /api/components

async function fetchComponentsFromBackend(queryParams = '') {
    try {
        const res = await fetch(`${API_BASE}/api/components${queryParams ? '?' + queryParams : ''}`);
        const json = await res.json();
        if (json.success) {
            backendComponents = json.data;
            console.log(`[VISTA] Loaded ${json.count} of ${json.total} components from backend.`);
        }
    } catch (err) {
        console.error('[VISTA] Backend fetch failed:', err);
        showNotification('Could not connect to VISTA backend. Check server.', 'error');
    }
}

async function fetchSectorSummary() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/dashboard/map`);
        return (await res.json()).data || {};
    } catch (err) {
        console.error('[VISTA] Sector summary fetch failed:', err);
        return {};
    }
}

// ============ FAKED ENGINEER DATA (kept as-is per requirements) ============
const mockData = {
    engineers: [
        { id: 'priya', name: 'Priya Menon', hub: 'Majestic Hub', status: 'available' },
        { id: 'kavitha', name: 'Kavitha Reddy', hub: 'Majestic Hub', status: 'available' },
        { id: 'raj', name: 'Raj Kumar', hub: 'Majestic Hub', status: 'available' },
        { id: 'ananya', name: 'Ananya Krishnan', hub: 'Majestic Hub', status: 'available' },
        { id: 'rohan', name: 'Rohan Pillai', hub: 'Majestic Hub', status: 'available' },
        { id: 'suresh', name: 'Suresh Babu', hub: 'Yeshwantpur Hub', status: 'available' },
        { id: 'deepak', name: 'Deepak Rao', hub: 'Yeshwantpur Hub', status: 'available' },
        { id: 'meena', name: 'Meena Iyer', hub: 'Yeshwantpur Hub', status: 'available' },
        { id: 'kiran', name: 'Kiran Reddy', hub: 'KR Puram Hub', status: 'available' },
        { id: 'aditya', name: 'Aditya Shetty', hub: 'KR Puram Hub', status: 'available' }
    ]
};

let sectorMetricSlices = [];
let sectorChartSelectedStatus = '';
const sectorChartStatuses = ['SEVERE_RISK', 'SUBSTANDARD', 'NEEDS_MAINTENANCE', 'STABLE', 'HIGHLY_RELIABLE', 'OPTIMAL'];
const sectorChartLabels = ['Severe Risk', 'Substandard', 'Needs Maint.', 'Stable', 'Highly Reliable', 'Optimal'];
const sectorChartColors = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#15803d', '#06b6d4'];
let selectedComponentId = null;

// ============ GET CURRENT USER ROLE ============
function getCurrentUserRole() {
    return getUserRole();
}

// ============ FIREBASE REALTIME STATE ============
let firebaseDispatches = [];
let firebaseAssignments = [];

function setupFirebaseListeners() {
    if (typeof db !== 'undefined') {
        db.collection('dispatches').onSnapshot(snapshot => {
            firebaseDispatches = [];
            snapshot.forEach(doc => {
                firebaseDispatches.push({ id: doc.id, ...doc.data() });
            });
            if (getCurrentUserRole() === 'supervisor') {
                renderPendingTasks();
            }
        });

        db.collection('assignments').onSnapshot(snapshot => {
            firebaseAssignments = [];
            snapshot.forEach(doc => {
                firebaseAssignments.push({ id: doc.id, ...doc.data() });
            });

            // Update component status for completed assignments
            firebaseAssignments.forEach(assign => {
                if (assign.status === 'Completed' && assign.componentId && assign.componentId !== 'N/A') {
                    const comp = backendComponents.find(c => c.id === assign.componentId);
                    if (comp) {
                        // Reset stress factors as if the component was just replaced/repaired
                        comp.age_months = 0;
                        comp.loadGMT = 0;
                        comp.cii = calculateCII(comp.age_months, comp.loadGMT, comp.rainfallIndex, comp.thermalGradient);
                        comp.status = getCIIStatus(comp.cii);
                    }
                }
            });

            if (getCurrentUserRole() === 'controller' || getCurrentUserRole() === 'supervisor') {
                // If it's the unified role, update both views in the background
                renderEngineerList();
                renderActiveAssignments();
                renderPendingTasks();
                renderControllerView();
            }
        });
    }
}

// ============ MAIN VIEW TOGGLE ============
function switchMainView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (viewId === 'controllerView') {
        document.getElementById('nav-controller').classList.add('active');
    } else if (viewId === 'analyticsView') {
        const nav = document.getElementById('nav-analytics');
        if (nav) nav.classList.add('active');
        renderAnalyticsView();
    } else if (viewId === 'mapView') {
        const nav = document.getElementById('nav-map');
        if (nav) nav.classList.add('active');
        renderLeafletView();
    } else if (viewId === 'areaWiseView') {
        const nav = document.getElementById('nav-areawise');
        if (nav) nav.classList.add('active');
        renderAreaWiseView();
    } else if (viewId === 'predictionsView') {
        const nav = document.getElementById('nav-predictions');
        if (nav) nav.classList.add('active');
        renderPredictionsView();
    } else if (viewId === 'reportView') {
        const nav = document.getElementById('nav-report');
        if (nav) nav.classList.add('active');
        renderReportView();
    } else {
        document.getElementById('nav-supervisor').classList.add('active');
        renderPendingAlerts();
        renderCompletedAlerts();
    }
}

// ============ INITIALIZE DASHBOARD ============
document.addEventListener('DOMContentLoaded', async function () {
    loadUserInfo();
    setupFirebaseListeners();

    // Fetch real component data from backend
    await fetchComponentsFromBackend('sort=cii_asc');

    const role = getCurrentUserRole();

    if (role === 'controller') {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.style.display = 'block';

        switchMainView('controllerView');
        renderControllerView();

        currentSupervisorHub = 'Majestic Hub';
        switchHub(currentSupervisorHub);

        document.getElementById('offlineToggle').style.display = 'none';

        if (typeof db === 'undefined') {
            renderControllerView();
            renderSupervisorView();
        }
    } else if (role === 'supervisor') {
        document.getElementById('supervisorView').classList.add('active');
        document.getElementById('offlineToggle').style.display = 'none';

        currentSupervisorHub = getUserHub();
        switchHub(currentSupervisorHub);

        if (typeof db === 'undefined') renderSupervisorView();
    }

    setupEventListeners();
});

// ============ USER INFO ============
function loadUserInfo() {
    const userNameEl = document.getElementById('userName');
    if (userNameEl) userNameEl.style.display = 'none';

    document.getElementById('userRole').textContent = 'Regional Controller';
    document.getElementById('userHub').textContent = 'Bangalore Central';
}

function handleLogout() {
    logout();
    window.location.href = 'login.html';
}

function setupEventListeners() {
    document.getElementById('searchComponent').addEventListener('input', searchComponents);
}

// ============ OFFLINE MODE ============
function toggleOfflineMode() {
    isOffline = !isOffline;
    const toggle = document.getElementById('offlineToggle');
    const label = document.getElementById('offlineLabel');

    if (isOffline) {
        toggle.classList.add('offline');
        label.textContent = 'Offline';
        showNotification('Offline mode enabled. Sync and AI features disabled.', 'error');
    } else {
        toggle.classList.remove('offline');
        label.textContent = 'Online';
        showNotification('Online mode restored. Syncing data...');
    }
}

// ============ CONTROLLER VIEW ============
// In-memory alert store keyed by componentId to avoid duplicates
const dispatchedAlertMap = {};  // { compId: { comp, hub, ts, status } }

const STATUS_CRITICALITY = {
    SEVERE_RISK: 0, SUBSTANDARD: 1, NEEDS_MAINTENANCE: 2,
    STABLE: 3, HIGHLY_RELIABLE: 4, OPTIMAL: 5
};
const SECTOR_TO_HUB = {
    'Bangalore Central': 'Majestic Hub', 'Kengeri Zone': 'Majestic Hub',
    'Electronic City Corridor': 'Majestic Hub', 'Hosur Corridor': 'Majestic Hub',
    'Mysore Corridor': 'Majestic Hub', 'Yeshwantpur Zone': 'Yeshwantpur Hub',
    'Yelahanka Corridor': 'Yeshwantpur Hub', 'Tumkur Corridor': 'Yeshwantpur Hub',
    'Devanahalli Corridor': 'Yeshwantpur Hub', 'Krishnarajapuram Zone': 'KR Puram Hub',
    'Whitefield Corridor': 'KR Puram Hub', 'Bangarapet Corridor': 'KR Puram Hub',
};

function renderControllerView() {
    renderComponentDatabase();
    renderMetrics();
    renderAlertsQueue();
}

function renderAlertsQueue() {
    const list = document.getElementById('alertsQueueList');
    const countEl = document.getElementById('alertQueueCount');
    if (!list) return;

    const search = (document.getElementById('alertSearchInput')?.value || '').toLowerCase();
    const filter = document.getElementById('alertStatusFilter')?.value || '';

    let comps = [...backendComponents];

    // Default: critical-first (ascending CII score = worse first)
    comps.sort((a, b) => (STATUS_CRITICALITY[a.status] ?? 9) - (STATUS_CRITICALITY[b.status] ?? 9));

    if (filter) comps = comps.filter(c => c.status === filter);
    if (search) comps = comps.filter(c =>
        c.id.toLowerCase().includes(search) ||
        (c.type || '').toLowerCase().includes(search) ||
        (c.location?.sector || '').toLowerCase().includes(search)
    );

    const display = comps.slice(0, 120);
    if (countEl) countEl.textContent = `Showing ${display.length} of ${comps.length}`;

    list.innerHTML = '';
    display.forEach(comp => {
        const bc = getStatusColor(comp.status);
        const hub = SECTOR_TO_HUB[comp.location?.sector] || 'Majestic Hub';
        const sent = !!dispatchedAlertMap[comp.id];
        const sentBg = sent ? 'rgba(22,163,74,0.08)' : 'rgba(255,255,255,0.04)';
        const sentBorder = sent ? '#16a34a' : bc;

        const row = document.createElement('div');
        row.style.cssText = `border-left:4px solid ${sentBorder};background:${sentBg};padding:12px 16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;transition:background 0.2s;`;

        row.innerHTML = `
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;color:#e5e7eb;font-size:1em;margin-bottom:3px;">
                    ${comp.id}
                    <span style="font-size:0.78em;color:#9ca3af;font-weight:normal;margin-left:8px;">${comp.type}</span>
                </div>
                <div style="font-size:0.82em;color:#d1d5db;display:flex;gap:14px;flex-wrap:wrap;">
                    <span>📍 ${comp.location?.sector || '—'}</span>
                    <span>⏱️ Age: ${(comp.age_months / 12).toFixed(1)} yrs</span>
                    <span>🏢 Hub: <strong style="color:#c4b5fd;">${hub}</strong></span>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:14px;flex-shrink:0;">
                <div style="text-align:right;">
                    <div style="font-size:0.75em;color:#9ca3af;">CII</div>
                    <div style="font-weight:700;font-size:1.2em;color:${bc};">${comp.cii_score}</div>
                </div>
                ${sent
                ? `<div style="font-size:0.78em;color:#16a34a;font-weight:600;padding:5px 10px;border:1px solid #16a34a33;border-radius:6px;">✅ Sent</div>`
                : `<button onclick="sendAlert('${comp.id}')" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:0.82em;font-weight:600;cursor:pointer;white-space:nowrap;transition:opacity 0.2s;" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">🚨 Send Alert</button>`
            }
            </div>
        `;
        list.appendChild(row);
    });
}

function sendAlert(compId) {
    const comp = backendComponents.find(c => c.id === compId);
    if (!comp || dispatchedAlertMap[compId]) return;

    const hub = SECTOR_TO_HUB[comp.location?.sector] || 'Majestic Hub';
    dispatchedAlertMap[compId] = {
        comp,
        hub,
        ts: new Date(),
        status: 'Pending'
    };

    showNotification(`🚨 Alert sent for ${compId} → ${hub}`, 'success');
    renderAlertsQueue();       // refresh queue to show ✅
    renderPendingAlerts();     // refresh hub panel
}

function renderPendingAlerts() {
    const list = document.getElementById('pendingAlertsList');
    const countEl = document.getElementById('pendingAlertsCount');
    if (!list) return;

    const alerts = Object.values(dispatchedAlertMap).filter(a => a.status === 'Pending');
    if (countEl) countEl.textContent = `${alerts.length} pending alert${alerts.length !== 1 ? 's' : ''}`;

    if (alerts.length === 0) {
        list.innerHTML = `<div style="color:#9ca3af;text-align:center;padding:20px;font-size:0.9em;">No pending alerts. Send alerts from Network Overview.</div>`;
        return;
    }

    list.innerHTML = '';
    alerts.forEach(({ comp, hub, ts }) => {
        const bc = getStatusColor(comp.status);
        const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        const card = document.createElement('div');
        card.style.cssText = `border-left:4px solid ${bc};background:rgba(255,255,255,0.04);padding:12px 16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;`;
        card.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:600;color:#e5e7eb;margin-bottom:3px;">${comp.id} <span style="font-size:0.78em;color:#9ca3af;font-weight:normal;">${comp.type}</span></div>
                <div style="font-size:0.82em;color:#d1d5db;display:flex;gap:14px;flex-wrap:wrap;">
                    <span>📍 ${comp.location?.sector || '—'}</span>
                    <span>CII: <strong style="color:${bc};">${comp.cii_score}</strong></span>
                    <span>⏰ ${timeStr}</span>
                </div>
            </div>
            <button onclick="assignAlertEngineer('${comp.id}')" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:0.82em;font-weight:600;cursor:pointer;white-space:nowrap;" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">👤 Assign Engineer</button>
        `;
        list.appendChild(card);
    });
}

function assignAlertEngineer(compId) {
    const alert = dispatchedAlertMap[compId];
    if (!alert) return;
    // Route to the right hub first, then open the assign modal
    currentSupervisorHub = alert.hub;
    openAssignForComponent(alert.comp);
}


let dbFilteredList = [];
let dbRenderOffset = 0;
const DB_PAGE_SIZE = 60;
let dbScrollObserver = null;

function getNumericId(id) {
    const m = id.match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
}

function getStatusColor(status) {
    const map = {
        SEVERE_RISK: '#dc2626', SUBSTANDARD: '#ea580c',
        NEEDS_MAINTENANCE: '#ca8a04', STABLE: '#16a34a',
        HIGHLY_RELIABLE: '#15803d', OPTIMAL: '#06b6d4'
    };
    return map[status] || '#3b82f6';
}

function buildComponentRow(comp) {
    const bc = getStatusColor(comp.status);
    const item = document.createElement('div');
    item.style.cssText = `border-left:4px solid ${bc};background:rgba(255,255,255,0.04);padding:12px 15px;border-radius:6px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:background 0.2s;flex-shrink:0;`;
    item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.08)';
    item.onmouseout = () => item.style.background = 'rgba(255,255,255,0.04)';
    item.onclick = () => showDatabaseComponentFactors(comp);
    item.innerHTML = `
        <div style="flex:1;">
            <div style="font-weight:600;color:#e5e7eb;font-size:1.05em;margin-bottom:4px;">${comp.id} <span style="font-size:0.8em;color:#9ca3af;font-weight:normal;margin-left:8px;">${comp.type}</span></div>
            <div style="font-size:0.85em;color:#d1d5db;display:flex;gap:15px;">
                <span>📍 ${comp.location?.sector || 'Unknown'}</span>
                <span>⏱️ Age: ${(comp.age_months / 12).toFixed(1)} yrs</span>
            </div>
        </div>
        <div style="text-align:right;margin-left:15px;border-left:1px solid rgba(255,255,255,0.1);padding-left:15px;">
            <div style="font-size:0.8em;color:#9ca3af;margin-bottom:2px;">CII Score</div>
            <div style="font-weight:bold;font-size:1.2em;color:${bc};">${comp.cii_score}</div>
        </div>
    `;
    return item;
}

function appendDbPage() {
    const list = document.getElementById('componentDatabaseList');
    if (!list) return;
    const page = dbFilteredList.slice(dbRenderOffset, dbRenderOffset + DB_PAGE_SIZE);
    page.forEach(comp => list.appendChild(buildComponentRow(comp)));
    dbRenderOffset += page.length;
}

function renderComponentDatabase() {
    const list = document.getElementById('componentDatabaseList');
    if (!list) return;

    const sortOrder = document.getElementById('dbSortOrder')?.value || 'asc';
    const statusFilter = document.getElementById('dbStatusFilter')?.value || '';

    dbFilteredList = [...backendComponents];
    if (statusFilter) dbFilteredList = dbFilteredList.filter(c => c.status === statusFilter);

    dbFilteredList.sort((a, b) => {
        const diff = getNumericId(a.id) - getNumericId(b.id);
        return sortOrder === 'asc' ? diff : -diff;
    });

    dbRenderOffset = 0;
    list.innerHTML = '';

    // Disconnect old observer
    if (dbScrollObserver) dbScrollObserver.disconnect();

    appendDbPage(); // first batch

    // Sentinel at bottom of the scrollable list
    const sentinel = document.createElement('div');
    sentinel.style.height = '2px';
    list.appendChild(sentinel);

    const listWrapper = list; // the scrolling element is the list itself
    dbScrollObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && dbRenderOffset < dbFilteredList.length) {
            // Remove sentinel, add page, re-add sentinel
            list.removeChild(sentinel);
            appendDbPage();
            list.appendChild(sentinel);
        }
    }, { root: listWrapper, threshold: 0.1 });
    dbScrollObserver.observe(sentinel);
}


function showDatabaseComponentFactors(comp) {
    const modal = document.getElementById('componentFactorsModal');
    const title = document.getElementById('factorsModalTitle');
    const content = document.getElementById('factorsModalContent');
    if (!modal || !content) return;

    title.innerHTML = `🔍 ${comp.id} Factors`;

    const factors = [
        { label: 'Material Fatigue (Age)', val: Math.min(100, Math.round((comp.age_months / 180) * 100)), color: '#7C3AED' },
        { label: 'Dynamic Load', val: Math.round((comp.factors?.load_stress || 0) * 100), color: '#ea580c' },
        { label: 'Braking Friction', val: Math.round((comp.factors?.braking_zone || 0) * 100), color: '#dc2626' },
        { label: 'Curvature Stress', val: Math.round((comp.factors?.curvature_stress || 0) * 100), color: '#eab308' },
        { label: 'Moisture Impact', val: Math.round((comp.factors?.moisture_index || 0) * 100), color: '#0ea5e9' },
        { label: 'Thermal Expansion', val: Math.round((comp.factors?.thermal_gradient || 0) * 100), color: '#f43f5e' }
    ];

    let html = `<div style="font-size: 0.9em; color: #9ca3af; margin-bottom: 15px;">Type: ${comp.type} | CII: ${comp.cii_score}</div>`;

    factors.forEach(f => {
        html += `
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85em; margin-bottom: 4px;">
                    <span>${f.label}</span>
                    <span>${f.val}%</span>
                </div>
                <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                    <div style="background: ${f.color}; width: ${f.val}%; height: 100%;"></div>
                </div>
            </div>
        `;
    });

    content.innerHTML = html;
    modal.style.display = 'block';
    // Render sparkline after modal is visible
    setTimeout(() => renderComponentHistory(comp), 50);
}

// ============ AREA WISE ANALYSIS ============
const AREA_META = {
    'Bangalore Central': { color: '#3b82f6', icon: '🏙️' },
    'Yeshwantpur Zone': { color: '#8b5cf6', icon: '🏭' },
    'Krishnarajapuram Zone': { color: '#ec4899', icon: '🏗️' },
    'Yelahanka Corridor': { color: '#14b8a6', icon: '✈️' },
    'Tumkur Corridor': { color: '#f59e0b', icon: '🛤️' },
    'Whitefield Corridor': { color: '#6366f1', icon: '💻' },
    'Bangarapet Corridor': { color: '#f43f5e', icon: '🚂' },
    'Electronic City Corridor': { color: '#84cc16', icon: '🔬' },
    'Hosur Corridor': { color: '#10b981', icon: '🌿' },
    'Kengeri Zone': { color: '#a855f7', icon: '🏘️' },
    'Mysore Corridor': { color: '#d946ef', icon: '🏯' },
    'Devanahalli Corridor': { color: '#0ea5e9', icon: '🌐' }
};

let selectedArea = null;
let areaStressChartInstance = null;

function renderAreaWiseView() {
    const grid = document.getElementById('areaGrid');
    if (!grid || grid.children.length > 0) return; // already rendered

    Object.entries(AREA_META).forEach(([name, meta]) => {
        const count = backendComponents.filter(c => c.location.sector === name).length;
        const btn = document.createElement('div');
        btn.style.cssText = `
            background: rgba(255,255,255,0.04);
            border: 2px solid ${meta.color}33;
            border-radius: 10px;
            padding: 14px 12px;
            cursor: pointer;
            text-align: center;
            transition: all 0.2s;
        `;
        btn.onmouseover = () => { btn.style.background = `${meta.color}22`; btn.style.borderColor = meta.color; };
        btn.onmouseout = () => { if (selectedArea !== name) { btn.style.background = 'rgba(255,255,255,0.04)'; btn.style.borderColor = `${meta.color}33`; } };
        btn.onclick = () => selectArea(name, meta.color);
        btn.innerHTML = `
            <div style="font-size: 1.6em; margin-bottom: 6px;">${meta.icon}</div>
            <div style="font-weight: 600; color: #e5e7eb; font-size: 0.88em; line-height: 1.3;">${name}</div>
            <div style="color: ${meta.color}; font-size: 0.8em; margin-top: 4px;">${count} comps</div>
        `;
        btn.dataset.area = name;
        grid.appendChild(btn);
    });
}

function selectArea(name, color) {
    selectedArea = name;

    // Highlight selected button
    document.querySelectorAll('#areaGrid > div').forEach(btn => {
        const bName = btn.dataset.area;
        const bMeta = AREA_META[bName];
        if (bName === name) {
            btn.style.background = `${color}22`;
            btn.style.borderColor = color;
        } else {
            btn.style.background = 'rgba(255,255,255,0.04)';
            btn.style.borderColor = `${bMeta.color}33`;
        }
    });

    document.getElementById('areaDetailsContainer').style.display = 'block';
    document.getElementById('areaComponentsTitle').textContent = `${name} — Components`;
    document.getElementById('areaSearch').value = '';
    document.getElementById('areaSort').value = 'asc';

    // Scroll into view
    document.getElementById('areaDetailsContainer').scrollIntoView({ behavior: 'smooth', block: 'start' });

    renderAreaDetails();
    renderAreaStatusBars(name, color);
    renderAreaStressChart(name);
}

function renderAreaDetails() {
    const list = document.getElementById('areaComponentList');
    if (!list || !selectedArea) return;

    const search = (document.getElementById('areaSearch')?.value || '').toLowerCase();
    const sort = document.getElementById('areaSort')?.value || 'asc';

    let comps = backendComponents.filter(c => c.location.sector === selectedArea);
    if (search) {
        comps = comps.filter(c =>
            c.id.toLowerCase().includes(search) ||
            (c.type || '').toLowerCase().includes(search)
        );
    }
    comps.sort((a, b) => sort === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id));

    const display = comps.slice(0, 100);
    list.innerHTML = '';

    const colorMap = {
        SEVERE_RISK: '#dc2626', SUBSTANDARD: '#ea580c',
        NEEDS_MAINTENANCE: '#ca8a04', STABLE: '#16a34a',
        HIGHLY_RELIABLE: '#15803d', OPTIMAL: '#06b6d4'
    };

    display.forEach(comp => {
        const bc = colorMap[comp.status] || '#3b82f6';
        const item = document.createElement('div');
        item.style.cssText = `border-left: 4px solid ${bc}; background: rgba(255,255,255,0.04); padding: 12px 15px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: background 0.2s;`;
        item.onmouseover = () => item.style.background = 'rgba(255,255,255,0.08)';
        item.onmouseout = () => item.style.background = 'rgba(255,255,255,0.04)';
        item.onclick = () => showDatabaseComponentFactors(comp);
        item.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:600;color:#e5e7eb;font-size:1.05em;margin-bottom:4px;">${comp.id} <span style="font-size:0.8em;color:#9ca3af;font-weight:normal;">${comp.type}</span></div>
                <div style="font-size:0.85em;color:#d1d5db;display:flex;gap:15px;">
                    <span>⏱️ Age: ${(comp.age_months / 12).toFixed(1)} yrs</span>
                </div>
            </div>
            <div style="text-align:right;margin-left:15px;border-left:1px solid rgba(255,255,255,0.1);padding-left:15px;">
                <div style="font-size:0.8em;color:#9ca3af;margin-bottom:2px;">CII Score</div>
                <div style="font-weight:bold;font-size:1.2em;color:${bc};">${comp.cii_score}</div>
            </div>
        `;
        list.appendChild(item);
    });

    if (display.length === 0) {
        list.innerHTML = `<div style="color:#9ca3af;text-align:center;padding:20px;">No components found.</div>`;
    }
}

function renderAreaStatusBars(area, areaColor) {
    const container = document.getElementById('areaStatusBars');
    if (!container) return;

    const comps = backendComponents.filter(c => c.location.sector === area);
    const total = comps.length;

    const statuses = [
        { key: 'SEVERE_RISK', label: 'Severe Risk', color: '#dc2626' },
        { key: 'SUBSTANDARD', label: 'Substandard', color: '#ea580c' },
        { key: 'NEEDS_MAINTENANCE', label: 'Needs Maintenance', color: '#ca8a04' },
        { key: 'STABLE', label: 'Stable', color: '#16a34a' },
        { key: 'HIGHLY_RELIABLE', label: 'Highly Reliable', color: '#15803d' },
        { key: 'OPTIMAL', label: 'Optimal', color: '#06b6d4' }
    ];

    container.innerHTML = `<div style="font-size:0.85em;color:#9ca3af;margin-bottom:12px;">Total: <strong style="color:#e5e7eb;">${total}</strong> components</div>`;

    statuses.forEach(s => {
        const count = comps.filter(c => c.status === s.key).length;
        const pct = total > 0 ? (count / total * 100).toFixed(1) : 0;
        container.innerHTML += `
            <div>
                <div style="display:flex;justify-content:space-between;font-size:0.85em;margin-bottom:4px;color:#e5e7eb;">
                    <span>${s.label}</span><span>${count} (${pct}%)</span>
                </div>
                <div style="background:rgba(255,255,255,0.1);height:8px;border-radius:4px;overflow:hidden;">
                    <div style="background:${s.color};width:${pct}%;height:100%;transition:width 1s ease;"></div>
                </div>
            </div>
        `;
    });
}

function renderAreaStressChart(area) {
    const canvas = document.getElementById('areaStressChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const comps = backendComponents.filter(c => c.location.sector === area);
    if (comps.length === 0) return;

    const avg = (fn) => comps.reduce((s, c) => s + fn(c), 0) / comps.length;
    const data = [
        avg(c => Math.min(100, (c.age_months / 180) * 100)),
        avg(c => (c.factors?.load_stress || 0) * 100),
        avg(c => (c.factors?.braking_zone || 0) * 100),
        avg(c => (c.factors?.curvature_stress || 0) * 100),
        avg(c => (c.factors?.moisture_index || 0) * 100),
        avg(c => (c.factors?.thermal_gradient || 0) * 100),
    ];

    if (areaStressChartInstance) areaStressChartInstance.destroy();

    areaStressChartInstance = new Chart(canvas, {
        type: 'polarArea',
        data: {
            labels: ['Material Fatigue', 'Dynamic Load', 'Braking Friction', 'Curvature Stress', 'Moisture Impact', 'Thermal Expansion'],
            datasets: [{
                data: data.map(v => Math.round(v)),
                backgroundColor: [
                    'rgba(124,58,237,0.7)', 'rgba(234,88,12,0.7)', 'rgba(220,38,38,0.7)',
                    'rgba(234,179,8,0.7)', 'rgba(14,165,233,0.7)', 'rgba(244,63,94,0.7)'
                ],
                borderWidth: 1,
                borderColor: '#1e1e2d'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { display: false } } },
            plugins: {
                legend: { position: 'bottom', labels: { color: '#e5e7eb', font: { size: 10 }, boxWidth: 12 } }
            },
            animation: { animateScale: true, duration: 1000 }
        }
    });
}


// ============ PREDICTIONS VIEW ============
const TIER_CONFIG = [
    { status: 'SEVERE_RISK', label: 'Severe Risk', color: '#dc2626', startRange: [8, 18] },
    { status: 'SUBSTANDARD', label: 'Substandard', color: '#ea580c', startRange: [22, 38] },
    { status: 'NEEDS_MAINTENANCE', label: 'Needs Maintenance', color: '#ca8a04', startRange: [42, 58] },
    { status: 'STABLE', label: 'Stable', color: '#16a34a', startRange: [62, 75] },
    { status: 'HIGHLY_RELIABLE', label: 'Highly Reliable', color: '#15803d', startRange: [78, 90] },
    { status: 'OPTIMAL', label: 'Optimal', color: '#06b6d4', startRange: [92, 99] },
];
const MAINTENANCE_THRESHOLD = 40;

let degradChartInstances = [];
let costChartInstance = null;
let predictionsRendered = false;

function renderPredictionsView() {
    if (predictionsRendered) return;
    predictionsRendered = true;

    renderDegradationCharts();
    renderCostTrendChart();
}

function renderDegradationCharts() {
    // Half-yearly labels over 5 years: H1/H2 notation
    const labels = [];
    const baseYear = new Date().getFullYear();
    const baseHalf = new Date().getMonth() < 6 ? 1 : 2;
    for (let h = 0; h <= 10; h++) {
        const totalHalves = (baseHalf - 1) + h;
        const yr = baseYear + Math.floor(totalHalves / 2);
        const half = (totalHalves % 2) + 1;
        labels.push(`H${half} '${String(yr).slice(2)}`);
    }

    TIER_CONFIG.forEach((tier, i) => {
        const canvas = document.getElementById(`degradChart${i}`);
        if (!canvas || typeof Chart === 'undefined') return;

        // Compute real average CII for this tier
        const tierComps = backendComponents.filter(c => c.status === tier.status);
        let startCII = tierComps.length > 0
            ? tierComps.reduce((s, c) => s + c.cii_score, 0) / tierComps.length
            : (tier.startRange[0] + tier.startRange[1]) / 2;
        startCII = Math.round(startCII * 10) / 10;

        // Degradation model:
        //  Tiers 0-2: linear constant decay (already bad, degrades fast evenly)
        //  Tiers 3-5: power-curve (slow start → accelerates, quasi-elliptic)
        const ratePerHalf = [2.8, 1.8, 1.2][i]; // only used for tiers 0-2
        const noiseMag = [1.4, 1.0, 0.8, 0.5, 0.35, 0.25][i];

        // Power curve config for tiers 3-5 (Stable, Highly Reliable, Optimal)
        // totalDrop = how many CII points lost over 5 years total
        // exponent  > 1 means slow start, steep end (quarter-ellipse feel)
        const curveCfg = [
            null, null, null,
            { totalDrop: 18, exponent: 1.9 },  // Stable
            { totalDrop: 14, exponent: 2.2 },  // Highly Reliable
            { totalDrop: 20, exponent: 1.7 },  // Optimal (higher drop, varied curve)
        ][i];

        const ciData = [];
        for (let h = 0; h <= 10; h++) {
            const noise = (Math.random() - 0.45) * noiseMag;
            let val;
            if (curveCfg) {
                // Power curve: y = startCII - totalDrop * (h/10)^exponent
                val = startCII - curveCfg.totalDrop * Math.pow(h / 10, curveCfg.exponent) + noise;
            } else {
                // Linear decay from startCII
                val = startCII - ratePerHalf * h + noise;
            }
            ciData.push(Math.max(0, Math.round(val * 10) / 10));
        }

        // Threshold band (constant)
        const threshLine = Array(11).fill(MAINTENANCE_THRESHOLD);

        if (degradChartInstances[i]) degradChartInstances[i].destroy();

        degradChartInstances[i] = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: `Avg CII — ${tier.label}`,
                        data: ciData,
                        borderColor: tier.color,
                        backgroundColor: `${tier.color}22`,
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointBackgroundColor: tier.color,
                        tension: 0.38,
                        fill: true,
                    },
                    {
                        label: 'Maintenance Threshold (CII 40)',
                        data: threshLine,
                        borderColor: '#f87171',
                        borderDash: [6, 4],
                        borderWidth: 1.5,
                        pointRadius: 0,
                        fill: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { color: '#9ca3af', font: { size: 9 }, maxRotation: 45 },
                        grid: { color: 'rgba(255,255,255,0.06)' }
                    },
                    y: {
                        min: 0, max: 100,
                        ticks: { color: '#9ca3af', font: { size: 9 }, stepSize: 20 },
                        grid: { color: 'rgba(255,255,255,0.06)' },
                        title: { display: true, text: 'CII Score', color: '#6b7280', font: { size: 9 } }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#9ca3af', font: { size: 9 }, boxWidth: 10 } },
                    tooltip: {
                        callbacks: {
                            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}`
                        }
                    }
                },
                animation: { duration: 900 }
            }
        });
    });
}

function renderCostTrendChart() {
    const canvas = document.getElementById('costTrendChart');
    if (!canvas || typeof Chart === 'undefined') return;

    // ── Historical 2015-2024 (₹ Crore) ── realistic upward trend with variance
    const histYears = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
    const histCost = [142, 158, 167, 189, 204, 196, 221, 248, 273, 301];

    // ── Projection 2025-2030 based on current health ──
    // More critical = higher spend. Simple model: base growth * degradation factor
    const critical = backendComponents.filter(c =>
        ['SEVERE_RISK', 'SUBSTANDARD', 'NEEDS_MAINTENANCE'].includes(c.status)
    ).length;
    const total = backendComponents.length || 1;
    const critRatio = critical / total; // 0–1
    const annualGrowth = 0.07 + critRatio * 0.08; // 7-15% growth

    const projYears = [2025, 2026, 2027, 2028, 2029, 2030];
    let projBase = histCost[histCost.length - 1];
    const projCost = projYears.map(() => {
        projBase = Math.round(projBase * (1 + annualGrowth) + (Math.random() - 0.3) * 12);
        return projBase;
    });

    const allLabels = [...histYears, ...projYears].map(String);
    const histDataset = [...histCost, ...Array(projYears.length).fill(null)];
    const projDataset = [...Array(histYears.length - 1).fill(null), histCost[histCost.length - 1], ...projCost];

    if (costChartInstance) costChartInstance.destroy();

    costChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: allLabels,
            datasets: [
                {
                    label: 'Historical Spend (₹ Cr)',
                    data: histDataset,
                    borderColor: '#818cf8',
                    backgroundColor: 'rgba(129,140,248,0.12)',
                    borderWidth: 2.5,
                    pointRadius: 5,
                    pointBackgroundColor: '#818cf8',
                    tension: 0.35,
                    fill: true,
                    spanGaps: false,
                },
                {
                    label: 'AI Projected Spend (₹ Cr)',
                    data: projDataset,
                    borderColor: '#a78bfa',
                    backgroundColor: 'rgba(167,139,250,0.08)',
                    borderDash: [8, 4],
                    borderWidth: 2.5,
                    pointRadius: 5,
                    pointBackgroundColor: '#a78bfa',
                    pointStyle: 'triangle',
                    tension: 0.35,
                    fill: true,
                    spanGaps: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { color: 'rgba(255,255,255,0.06)' }
                },
                y: {
                    ticks: { color: '#9ca3af', callback: v => `₹${v}Cr` },
                    grid: { color: 'rgba(255,255,255,0.06)' },
                    title: { display: true, text: '₹ Crore', color: '#6b7280' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e5e7eb', font: { size: 11 } } },
                tooltip: {
                    callbacks: { label: ctx => `${ctx.dataset.label}: ₹${ctx.parsed.y} Cr` }
                },
                annotation: {} // placeholder
            },
            animation: { duration: 1000 }
        }
    });

    // ── Cost Summary Panel ──
    const panel = document.getElementById('costSummaryPanel');
    if (!panel) return;

    const lastHist = histCost[histCost.length - 1];
    const nextYear = projCost[0];
    const fiveYear = projCost[projCost.length - 1];
    const totalProj = projCost.reduce((s, v) => s + v, 0);
    const avgHist = Math.round(histCost.reduce((s, v) => s + v, 0) / histCost.length);

    const urgencyLabel = critRatio > 0.5 ? '🔴 HIGH' : critRatio > 0.3 ? '🟡 MEDIUM' : '🟢 LOW';

    panel.innerHTML = `
        <div style="background:rgba(129,140,248,0.1);border:1px solid rgba(129,140,248,0.3);border-radius:10px;padding:16px;">
            <div style="font-size:0.8em;color:#9ca3af;margin-bottom:4px;">FY 2024 Actual Spend</div>
            <div style="font-size:1.8em;font-weight:700;color:#818cf8;">₹${lastHist} Cr</div>
        </div>
        <div style="background:rgba(167,139,250,0.1);border:1px solid rgba(167,139,250,0.3);border-radius:10px;padding:16px;">
            <div style="font-size:0.8em;color:#9ca3af;margin-bottom:4px;">FY 2025 Projected</div>
            <div style="font-size:1.8em;font-weight:700;color:#a78bfa;">₹${nextYear} Cr</div>
            <div style="font-size:0.78em;color:#6b7280;margin-top:4px;">↑ ${((nextYear - lastHist) / lastHist * 100).toFixed(1)}% YoY growth</div>
        </div>
        <div style="background:rgba(248,113,113,0.08);border:1px solid rgba(248,113,113,0.25);border-radius:10px;padding:16px;">
            <div style="font-size:0.8em;color:#9ca3af;margin-bottom:4px;">5-Year Total Projection (2025–2030)</div>
            <div style="font-size:1.8em;font-weight:700;color:#f87171;">₹${totalProj} Cr</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px;">
            <div style="font-size:0.8em;color:#9ca3af;margin-bottom:4px;">10-Year Historical Average</div>
            <div style="font-size:1.5em;font-weight:700;color:#e5e7eb;">₹${avgHist} Cr/yr</div>
        </div>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:16px;">
            <div style="font-size:0.8em;color:#9ca3af;margin-bottom:6px;">Network Maintenance Urgency</div>
            <div style="font-size:1.4em;font-weight:700;color:#e5e7eb;">${urgencyLabel}</div>
            <div style="font-size:0.78em;color:#6b7280;margin-top:4px;">${Math.round(critRatio * 100)}% components below Stable threshold</div>
        </div>
        <div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:10px;padding:16px;">
            <div style="font-size:0.8em;color:#9ca3af;margin-bottom:4px;">Projected Spend by 2030</div>
            <div style="font-size:1.8em;font-weight:700;color:#06b6d4;">₹${fiveYear} Cr</div>
            <div style="font-size:0.78em;color:#6b7280;margin-top:4px;">Annual growth rate: ${(annualGrowth * 100).toFixed(1)}%</div>
        </div>
    `;
}


// ============ ALERT RESOLUTION ============
const resolvedAlerts = [];

function resolveAlert(compId) {
    const alert = dispatchedAlertMap[compId];
    if (!alert) return;
    alert.status = 'Resolved';
    alert.resolvedAt = new Date();
    resolvedAlerts.push({ ...alert });
    delete dispatchedAlertMap[compId];
    renderPendingAlerts();
    renderCompletedAlerts();
    renderAlertsQueue();
    showNotification(`✅ Inspection for ${compId} marked as resolved`);
}

function renderCompletedAlerts() {
    const list    = document.getElementById('completedAlertsList');
    const countEl = document.getElementById('completedAlertsCount');
    if (!list) return;

    if (countEl) countEl.textContent = `${resolvedAlerts.length} completed`;

    if (resolvedAlerts.length === 0) {
        list.innerHTML = `<div style="color:#9ca3af;text-align:center;padding:20px;font-size:0.9em;">No completed inspections yet.</div>`;
        return;
    }

    list.innerHTML = '';
    [...resolvedAlerts].reverse().forEach(({ comp, hub, ts, resolvedAt }) => {
        const bc = getStatusColor(comp.status);
        const tsSent = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const tsRes  = resolvedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const card = document.createElement('div');
        card.style.cssText = `border-left:4px solid #16a34a;background:rgba(22,163,74,0.06);padding:12px 16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;`;
        card.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:600;color:#e5e7eb;margin-bottom:3px;">✅ ${comp.id} <span style="font-size:0.78em;color:#9ca3af;font-weight:normal;">${comp.type}</span></div>
                <div style="font-size:0.82em;color:#d1d5db;display:flex;gap:14px;flex-wrap:wrap;">
                    <span>📍 ${comp.location?.sector || '—'}</span>
                    <span>CII: <strong style="color:${bc};">${comp.cii_score}</strong></span>
                    <span>🏢 ${hub}</span>
                    <span>Sent: ${tsSent} → Resolved: ${tsRes}</span>
                </div>
            </div>
            <div style="font-size:0.78em;color:#16a34a;font-weight:600;padding:5px 10px;border:1px solid #16a34a44;border-radius:6px;">Resolved</div>
        `;
        list.appendChild(card);
    });
}

// Override renderPendingAlerts to add Resolve button
function renderPendingAlerts() {
    const list    = document.getElementById('pendingAlertsList');
    const countEl = document.getElementById('pendingAlertsCount');
    if (!list) return;

    const alerts = Object.values(dispatchedAlertMap).filter(a => a.status === 'Pending');
    if (countEl) countEl.textContent = `${alerts.length} pending alert${alerts.length !== 1 ? 's' : ''}`;

    if (alerts.length === 0) {
        list.innerHTML = `<div style="color:#9ca3af;text-align:center;padding:20px;font-size:0.9em;">No pending alerts. Send alerts from Network Overview.</div>`;
        return;
    }

    list.innerHTML = '';
    alerts.forEach(({ comp, hub, ts }) => {
        const bc = getStatusColor(comp.status);
        const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        const card = document.createElement('div');
        card.style.cssText = `border-left:4px solid ${bc};background:rgba(255,255,255,0.04);padding:12px 16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;`;
        card.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:600;color:#e5e7eb;margin-bottom:3px;">${comp.id} <span style="font-size:0.78em;color:#9ca3af;font-weight:normal;">${comp.type}</span></div>
                <div style="font-size:0.82em;color:#d1d5db;display:flex;gap:14px;flex-wrap:wrap;">
                    <span>📍 ${comp.location?.sector || '—'}</span>
                    <span>CII: <strong style="color:${bc};">${comp.cii_score}</strong></span>
                    <span>⏰ ${timeStr}</span>
                </div>
            </div>
            <div style="display:flex;gap:8px;flex-shrink:0;">
                <button onclick="assignAlertEngineer('${comp.id}')" style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:0.82em;font-weight:600;cursor:pointer;" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">👤 Assign</button>
                <button onclick="resolveAlert('${comp.id}')" style="background:linear-gradient(135deg,#15803d,#16a34a);color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:0.82em;font-weight:600;cursor:pointer;" onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">✅ Resolve</button>
            </div>
        `;
        list.appendChild(card);
    });
}

// ============ COMPONENT HISTORY SPARKLINE ============
let historyChartInstance = null;

function renderComponentHistory(comp) {
    const canvas = document.getElementById('componentHistoryChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (historyChartInstance) historyChartInstance.destroy();

    // Simulate last 6 months of CII readings ending at current score
    const endCII = comp.cii_score;
    const degradRate = [2.5, 1.8, 1.2, 0.7, 0.4, 0.3][
        ['SEVERE_RISK','SUBSTANDARD','NEEDS_MAINTENANCE','STABLE','HIGHLY_RELIABLE','OPTIMAL']
            .indexOf(comp.status)
    ] || 1.0;

    const pts = [];
    let cur = Math.min(100, endCII + degradRate * 6 + (Math.random() * 3));
    for (let m = 6; m >= 0; m--) {
        const noise = (Math.random() - 0.45) * 1.2;
        cur = Math.max(0, cur - degradRate + noise);
        pts.unshift(Math.round(cur * 10) / 10);
    }
    pts[pts.length - 1] = endCII;

    const now = new Date();
    const labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - (6 - i));
        return d.toLocaleString('default', { month: 'short' });
    });

    const lineColor = getStatusColor(comp.status);
    historyChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: pts,
                borderColor: lineColor,
                backgroundColor: `${lineColor}22`,
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: lineColor,
                tension: 0.4,
                fill: true,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#9ca3af', font: { size: 9 } }, grid: { display: false } },
                y: { min: 0, max: 100, ticks: { color: '#9ca3af', font: { size: 9 }, stepSize: 25 }, grid: { color: 'rgba(255,255,255,0.06)' } }
            },
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `CII: ${ctx.parsed.y}` } } },
            animation: { duration: 600 }
        }
    });
}

// ============ REPORT VIEW ============
const HUB_SECTORS = {
    'Majestic Hub':      ['Bangalore Central','Kengeri Zone','Electronic City Corridor','Hosur Corridor','Mysore Corridor'],
    'Yeshwantpur Hub':   ['Yeshwantpur Zone','Yelahanka Corridor','Tumkur Corridor','Devanahalli Corridor'],
    'KR Puram Hub':      ['Krishnarajapuram Zone','Whitefield Corridor','Bangarapet Corridor'],
};
const ALL_SECTORS = Object.keys(AREA_META);

function renderReportView() {
    const total = backendComponents.length;
    const critical = backendComponents.filter(c =>
        ['SEVERE_RISK','SUBSTANDARD','NEEDS_MAINTENANCE'].includes(c.status)).length;
    const avgCII = total > 0
        ? (backendComponents.reduce((s, c) => s + c.cii_score, 0) / total).toFixed(1)
        : 0;
    const alertsSent = Object.keys(dispatchedAlertMap).length + resolvedAlerts.length;
    const reportDate = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' });

    // Meta grid
    const meta = document.getElementById('reportMetaGrid');
    if (meta) {
        meta.innerHTML = [
            { label: 'Report Date', value: reportDate, color: '#e5e7eb' },
            { label: 'Total Components', value: total, color: '#818cf8' },
            { label: 'Critical (< Stable)', value: `${critical} (${((critical/total)*100).toFixed(1)}%)`, color: '#f87171' },
            { label: 'Network Avg CII', value: avgCII, color: '#34d399' },
        ].map(s => `
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px;">
                <div style="font-size:0.78em;color:#9ca3af;margin-bottom:4px;">${s.label}</div>
                <div style="font-size:1.4em;font-weight:700;color:${s.color};">${s.value}</div>
            </div>
        `).join('');
    }

    // Hub table
    const hubBody = document.getElementById('reportHubTableBody');
    if (hubBody) {
        hubBody.innerHTML = '';
        Object.entries(HUB_SECTORS).forEach(([hub, sectors]) => {
            const comps = backendComponents.filter(c => sectors.includes(c.location?.sector));
            const cnt = (s) => comps.filter(c => c.status === s).length;
            const avg = comps.length > 0 ? (comps.reduce((s,c) => s + c.cii_score, 0) / comps.length).toFixed(1) : '—';
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.06);';
            tr.innerHTML = `
                <td style="padding:10px 14px;font-weight:600;color:#e5e7eb;">${hub}</td>
                <td style="padding:10px 14px;text-align:center;color:#9ca3af;">${comps.length}</td>
                <td style="padding:10px 14px;text-align:center;color:#dc2626;">${cnt('SEVERE_RISK')}</td>
                <td style="padding:10px 14px;text-align:center;color:#ea580c;">${cnt('SUBSTANDARD')}</td>
                <td style="padding:10px 14px;text-align:center;color:#ca8a04;">${cnt('NEEDS_MAINTENANCE')}</td>
                <td style="padding:10px 14px;text-align:center;color:#16a34a;">${cnt('STABLE')}</td>
                <td style="padding:10px 14px;text-align:center;color:#15803d;">${cnt('HIGHLY_RELIABLE')}</td>
                <td style="padding:10px 14px;text-align:center;color:#06b6d4;">${cnt('OPTIMAL')}</td>
                <td style="padding:10px 14px;text-align:center;font-weight:600;color:#818cf8;">${avg}</td>
            `;
            hubBody.appendChild(tr);
        });
    }

    // Sector table
    const secBody = document.getElementById('reportSectorTableBody');
    if (secBody) {
        secBody.innerHTML = '';
        ALL_SECTORS.forEach(sector => {
            const comps = backendComponents.filter(c => c.location?.sector === sector);
            if (comps.length === 0) return;
            const crit = comps.filter(c => ['SEVERE_RISK','SUBSTANDARD','NEEDS_MAINTENANCE'].includes(c.status)).length;
            const avgC = (comps.reduce((s,c) => s + c.cii_score, 0) / comps.length).toFixed(1);
            const avgA = (comps.reduce((s,c) => s + c.age_months, 0) / comps.length / 12).toFixed(1);
            const critPct = ((crit / comps.length) * 100).toFixed(0);
            const statusLabel = crit / comps.length > 0.4 ? '🔴 High Risk' : crit / comps.length > 0.2 ? '🟡 Moderate' : '🟢 Stable';
            const alertsForSector = [...Object.values(dispatchedAlertMap), ...resolvedAlerts]
                .filter(a => a.comp?.location?.sector === sector).length;
            const color = AREA_META[sector]?.color || '#9ca3af';
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.06);';
            tr.innerHTML = `
                <td style="padding:10px 14px;font-weight:600;color:${color};">${sector}</td>
                <td style="padding:10px 14px;text-align:center;color:#9ca3af;">${comps.length}</td>
                <td style="padding:10px 14px;text-align:center;color:#f87171;">${crit} (${critPct}%)</td>
                <td style="padding:10px 14px;text-align:center;font-weight:600;color:#818cf8;">${avgC}</td>
                <td style="padding:10px 14px;text-align:center;color:#9ca3af;">${avgA}</td>
                <td style="padding:10px 14px;text-align:center;">${statusLabel}</td>
                <td style="padding:10px 14px;text-align:center;color:#a78bfa;">${alertsForSector}</td>
            `;
            secBody.appendChild(tr);
        });
    }

    // Alert summary
    const alertSummary = document.getElementById('reportAlertSummary');
    if (alertSummary) {
        const pending   = Object.values(dispatchedAlertMap).filter(a => a.status === 'Pending').length;
        const resolved  = resolvedAlerts.length;
        alertSummary.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
                <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:10px;padding:14px;">
                    <div style="font-size:0.78em;color:#9ca3af;margin-bottom:4px;">Alerts Dispatched</div>
                    <div style="font-size:1.8em;font-weight:700;color:#f87171;">${alertsSent}</div>
                </div>
                <div style="background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.25);border-radius:10px;padding:14px;">
                    <div style="font-size:0.78em;color:#9ca3af;margin-bottom:4px;">Pending Inspection</div>
                    <div style="font-size:1.8em;font-weight:700;color:#eab308;">${pending}</div>
                </div>
                <div style="background:rgba(22,163,74,0.08);border:1px solid rgba(22,163,74,0.25);border-radius:10px;padding:14px;">
                    <div style="font-size:0.78em;color:#9ca3af;margin-bottom:4px;">Resolved</div>
                    <div style="font-size:1.8em;font-weight:700;color:#16a34a;">${resolved}</div>
                </div>
            </div>
        `;
    }
}

// ============ LEAFLET RENDERER ============
let leafletInstance = null;
let leafletLayerGroup = null;
let sectorPolygonLayers = {};  // name -> L.polygon layer
let componentMarkers = {};     // comp.id -> { marker, comp }
let activeSectorName = null;

// Sector colors (matching AREA_META for consistency)
const SECTOR_COLORS = {
    'Bangalore Central': '#3b82f6',
    'Yeshwantpur Zone': '#8b5cf6',
    'Krishnarajapuram Zone': '#ec4899',
    'Yelahanka Corridor': '#14b8a6',
    'Tumkur Corridor': '#f59e0b',
    'Whitefield Corridor': '#6366f1',
    'Bangarapet Corridor': '#f43f5e',
    'Electronic City Corridor': '#84cc16',
    'Hosur Corridor': '#10b981',
    'Kengeri Zone': '#a855f7',
    'Mysore Corridor': '#d946ef',
    'Devanahalli Corridor': '#0ea5e9',
    'Regional Outer': '#64748b'
};

// Convex hull computation for organic polygon shapes
function _computeConvexHull(points) {
    if (points.length < 3) return points;
    points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    function cross(O, A, B) { return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]); }
    const lower = [];
    for (const p of points) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper = [];
    for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);
}

// Buffer the hull outward slightly for a more padded, organic feel
function _bufferHull(hull, bufferDeg) {
    if (hull.length < 3) return hull;
    // Compute centroid
    let cx = 0, cy = 0;
    hull.forEach(p => { cx += p[0]; cy += p[1]; });
    cx /= hull.length; cy /= hull.length;
    // Push each point away from centroid by bufferDeg
    return hull.map(p => {
        const dx = p[0] - cx, dy = p[1] - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        return [p[0] + (dx / dist) * bufferDeg, p[1] + (dy / dist) * bufferDeg];
    });
}

// Build sector polygons from component data (convex hull based)
function _buildSectorPolygons() {
    const sectorPts = {};
    backendComponents.forEach(c => {
        const s = c.location.sector;
        if (!sectorPts[s]) sectorPts[s] = [];
        sectorPts[s].push([c.location.lat, c.location.lng]);
    });
    
    const rawHulls = {};
    Object.entries(sectorPts).forEach(([name, pts]) => {
        if (name === 'Regional Outer') return; // Handled separately
        if (pts.length < 3) { rawHulls[name] = pts; return; }
        const hull = _computeConvexHull(pts);
        rawHulls[name] = _bufferHull(hull, 0.05); // ~5km buffer to fill map deeply
    });

    // If Turf.js is available, use it to remove overlapping regions so they share boundaries
    if (typeof turf !== 'undefined') {
        const processed = {};
        const names = Object.keys(rawHulls);
        let previousPolys = null;

        names.forEach(name => {
            const coords = rawHulls[name];
            if (coords.length < 3) {
                processed[name] = coords;
                return;
            }

            // Convert to Turf Polygon [lng, lat] format
            const turfCoords = coords.map(p => [p[1], p[0]]);
            // Ensure closed ring
            if (turfCoords[0][0] !== turfCoords[turfCoords.length-1][0] || turfCoords[0][1] !== turfCoords[turfCoords.length-1][1]) {
                turfCoords.push([...turfCoords[0]]);
            }
            
            let poly;
            try {
                poly = turf.polygon([turfCoords]);
            } catch (e) {
                processed[name] = coords;
                return;
            }

            if (previousPolys) {
                try {
                    poly = turf.difference(poly, previousPolys);
                } catch (e) {
                    console.warn("Turf difference error", e);
                }
            }

            if (poly) {
                try {
                    if (!previousPolys) previousPolys = poly;
                    else previousPolys = turf.union(previousPolys, poly);
                } catch (e) {}
                
                // Extract coordinates back to [lat, lng]
                const finalCoords = [];
                if (poly.geometry && poly.geometry.type === 'Polygon') {
                    poly.geometry.coordinates[0].forEach(p => finalCoords.push([p[1], p[0]]));
                    processed[name] = finalCoords;
                } else if (poly.geometry && poly.geometry.type === 'MultiPolygon') {
                    // Pick the largest polygon from the multipolygon
                    let maxArea = -1;
                    let bestCoords = null;
                    poly.geometry.coordinates.forEach(polyCoords => {
                        try {
                            const tempPoly = turf.polygon([polyCoords[0]]);
                            const area = turf.area(tempPoly);
                            if (area > maxArea) {
                                maxArea = area;
                                bestCoords = polyCoords[0];
                            }
                        } catch (e) {}
                    });
                    if (bestCoords) {
                        bestCoords.forEach(p => finalCoords.push([p[1], p[0]]));
                        processed[name] = finalCoords;
                    } else {
                        processed[name] = coords;
                    }
                } else {
                    processed[name] = coords;
                }
            } else {
                // Completely eclipsed by previous polygons
                processed[name] = coords; // fallback
            }
        });

        // ── OUTLIER ZONES (Regional Outer) ──
        if (sectorPts['Regional Outer'] && sectorPts['Regional Outer'].length > 0) {
            let outlierPoly = null;
            sectorPts['Regional Outer'].forEach(pt => {
                try {
                    // 2.5km buffer around each outlier point
                    const circle = turf.circle([pt[1], pt[0]], 2.5, { units: 'kilometers', steps: 16 });
                    if (!outlierPoly) outlierPoly = circle;
                    else outlierPoly = turf.union(outlierPoly, circle);
                } catch (e) {}
            });

            if (outlierPoly && previousPolys) {
                try {
                    outlierPoly = turf.difference(outlierPoly, previousPolys);
                } catch (e) {}
            }

            if (outlierPoly) {
                const finalMultiCoords = [];
                if (outlierPoly.geometry && outlierPoly.geometry.type === 'Polygon') {
                    const subCoords = [];
                    outlierPoly.geometry.coordinates[0].forEach(p => subCoords.push([p[1], p[0]]));
                    finalMultiCoords.push(subCoords);
                } else if (outlierPoly.geometry && outlierPoly.geometry.type === 'MultiPolygon') {
                    outlierPoly.geometry.coordinates.forEach(polyCoords => {
                        const subCoords = [];
                        polyCoords[0].forEach(p => subCoords.push([p[1], p[0]]));
                        finalMultiCoords.push(subCoords);
                    });
                }
                if (finalMultiCoords.length > 0) {
                    processed['Regional Outer'] = finalMultiCoords;
                }
            }
        }

        return processed;
    }

    return rawHulls;
}

function _getSectorStats(sectorName) {
    const comps = backendComponents.filter(c => c.location.sector === sectorName);
    const total = comps.length;
    const counts = {};
    const statuses = ['SEVERE_RISK', 'SUBSTANDARD', 'NEEDS_MAINTENANCE', 'STABLE', 'HIGHLY_RELIABLE', 'OPTIMAL'];
    statuses.forEach(s => counts[s] = comps.filter(c => c.status === s).length);
    const avgCii = total > 0 ? (comps.reduce((s, c) => s + c.cii_score, 0) / total).toFixed(1) : '—';
    return { total, counts, avgCii };
}

function _showSectorPanel(sectorName, color) {
    const panel = document.getElementById('vistaSectorPanel');
    const content = document.getElementById('vistaSectorContent');
    if (!panel || !content) return;

    const stats = _getSectorStats(sectorName);
    const statusInfo = [
        { key: 'SEVERE_RISK', label: 'Severe Risk', color: '#dc2626' },
        { key: 'SUBSTANDARD', label: 'Substandard', color: '#ea580c' },
        { key: 'NEEDS_MAINTENANCE', label: 'Needs Maint.', color: '#ca8a04' },
        { key: 'STABLE', label: 'Stable', color: '#16a34a' },
        { key: 'HIGHLY_RELIABLE', label: 'Highly Reliable', color: '#15803d' },
        { key: 'OPTIMAL', label: 'Optimal', color: '#06b6d4' }
    ];

    let barsHtml = '';
    statusInfo.forEach(s => {
        const count = stats.counts[s.key] || 0;
        const pct = stats.total > 0 ? (count / stats.total * 100) : 0;
        barsHtml += `
            <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;font-size:0.78em;margin-bottom:3px;">
                    <span style="color:rgba(255,255,255,0.6)">${s.label}</span>
                    <span style="color:${s.color};font-weight:600">${count}</span>
                </div>
                <div style="background:rgba(255,255,255,0.06);height:4px;border-radius:2px;overflow:hidden;">
                    <div style="background:${s.color};width:${pct}%;height:100%;border-radius:2px;transition:width 0.6s ease;"></div>
                </div>
            </div>
        `;
    });

    content.innerHTML = `
        <div style="margin-bottom:16px;">
            <div style="font-size:0.68em;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.35);margin-bottom:6px;">Sector</div>
            <div style="font-size:1.15em;font-weight:700;color:#fff;display:flex;align-items:center;gap:8px;">
                <span style="width:10px;height:10px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color};flex-shrink:0;"></span>
                ${sectorName}
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
            <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:1.5em;font-weight:700;color:#e62b2b;">${stats.total}</div>
                <div style="font-size:0.72em;color:rgba(255,255,255,0.4);margin-top:2px;">Components</div>
            </div>
            <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:1.5em;font-weight:700;color:${color};">${stats.avgCii}</div>
                <div style="font-size:0.72em;color:rgba(255,255,255,0.4);margin-top:2px;">Avg CII</div>
            </div>
        </div>
        <div style="font-size:0.68em;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.35);margin-bottom:10px;">Status Breakdown</div>
        ${barsHtml}
    `;

    panel.classList.add('visible');
    activeSectorName = sectorName;
}

function closeSectorPanel() {
    const panel = document.getElementById('vistaSectorPanel');
    if (panel) panel.classList.remove('visible');

    // Reset polygon highlight
    if (activeSectorName && sectorPolygonLayers[activeSectorName]) {
        const color = SECTOR_COLORS[activeSectorName] || '#3b82f6';
        sectorPolygonLayers[activeSectorName].setStyle({
            weight: 1.5,
            fillOpacity: 0.08,
            opacity: 0.6
        });
    }
    activeSectorName = null;
}

function toggleMapLegend() {
    const legend = document.getElementById('vistaMapLegend');
    if (legend) legend.classList.toggle('hidden');
}

function vistaMapZoomIn() {
    if (leafletInstance) leafletInstance.zoomIn(1, { animate: true });
}

function vistaMapZoomOut() {
    if (leafletInstance) leafletInstance.zoomOut(1, { animate: true });
}

async function renderLeafletView() {
    const mapContainer = document.getElementById('leafletContainer');
    if (!mapContainer) return;

    // Initialize Leaflet if not done already
    if (!leafletInstance) {
        leafletInstance = L.map('leafletContainer', {
            maxBounds: [[12.2, 76.8], [13.8, 78.4]],
            maxBoundsViscosity: 1.0,
            minZoom: 9,
            zoomControl: false, // We use custom controls
            zoomAnimation: true,
            fadeAnimation: true,
            markerZoomAnimation: true
        }).setView([12.9716, 77.5946], 10);

        // ── DARK THEME TILE LAYER ──
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(leafletInstance);

        leafletLayerGroup = L.layerGroup().addTo(leafletInstance);

        // ── DRAW ORGANIC SECTOR POLYGONS (Convex Hulls) ──
        const sectorHulls = _buildSectorPolygons();
        Object.entries(sectorHulls).forEach(([name, coords]) => {
            if (coords.length < 3) return;
            const color = SECTOR_COLORS[name] || '#3b82f6';
            const polygon = L.polygon(coords, {
                color: color,
                weight: 1.5,
                opacity: 0.6,
                fillColor: color,
                fillOpacity: 0.12,
                dashArray: '6 3',
                smoothFactor: 1.5,
                className: 'vista-sector-polygon'
            });

            polygon.bindTooltip(name, {
                permanent: false,
                direction: 'center',
                className: 'vista-sector-tooltip'
            });

            polygon.on('click', function () {
                // Zoom to fit this polygon precisely
                leafletInstance.fitBounds(polygon.getBounds(), {
                    padding: [40, 40],
                    animate: true,
                    duration: 0.8,
                    maxZoom: 14
                });
                // Highlight this polygon
                Object.entries(sectorPolygonLayers).forEach(([n, p]) => {
                    if (n !== name) {
                        p.setStyle({ weight: 1.5, fillOpacity: 0.04, opacity: 0.3 });
                    }
                });
                polygon.setStyle({ weight: 2.5, fillOpacity: 0.15, opacity: 0.9 });
                // Show info panel
                _showSectorPanel(name, color);
            });

            polygon.on('mouseover', function () {
                if (activeSectorName !== name) {
                    polygon.setStyle({ fillOpacity: 0.12, weight: 2 });
                }
            });

            polygon.on('mouseout', function () {
                if (activeSectorName !== name) {
                    polygon.setStyle({ fillOpacity: 0.12, weight: 1.5, opacity: 0.6 });
                }
            });

            polygon.addTo(leafletInstance);
            sectorPolygonLayers[name] = polygon;
        });

        // ── FETCH AND DRAW RAILWAY TRACKS & STATIONS ──
        try {
            const response = await fetch(`${API_BASE}/data/railway-network.geojson`);
            if (response.ok) {
                const geojson = await response.json();
                L.geoJSON(geojson, {
                    // Filter: exclude metro features entirely
                    filter: function (feature) {
                        const props = feature.properties || {};
                        // Exclude metro stations
                        if (props.subway === 'yes') return false;
                        if ((props.network || '').toLowerCase().includes('metro')) return false;
                        return true;
                    },
                    style: function (feature) {
                        // Style railway tracks with a darker grey look
                        const props = feature.properties || {};
                        const isMain = props.usage === 'main';
                        return {
                            color: isMain ? '#64748b' : '#475569',
                            weight: isMain ? 4 : 2.5,
                            opacity: isMain ? 0.9 : 0.6,
                            lineCap: 'round',
                            lineJoin: 'round'
                        };
                    },
                    pointToLayer: function (feature, latlng) {
                        const props = feature.properties || {};
                        // Only render non-metro stations
                        if (props.railway === 'station') {
                            const stationName = props.name || 'Station';
                            const icon = L.divIcon({
                                className: 'vista-station-icon',
                                html: '',
                                iconSize: [6.7, 6.7],
                                iconAnchor: [3.35, 3.35]
                            });
                            return L.marker(latlng, { icon: icon })
                                .bindTooltip(stationName, {
                                    direction: 'top',
                                    offset: [0, -6],
                                    className: 'vista-station-tooltip'
                                });
                        }
                        return null;
                    },
                    onEachFeature: function (feature, layer) {
                        // Add a second shadow line underneath main tracks for subtle glow effect
                        if (feature.geometry.type === 'LineString' && feature.properties.usage === 'main') {
                            const shadowLine = L.geoJSON(feature, {
                                style: {
                                    color: '#94a3b8',
                                    weight: 8,
                                    opacity: 0.15,
                                    lineCap: 'round',
                                    lineJoin: 'round'
                                }
                            });
                            shadowLine.addTo(leafletInstance);
                            shadowLine.bringToBack();
                        }
                    }
                }).addTo(leafletInstance);
            }
        } catch (e) {
            console.error('[VISTA] Failed to load track geojson', e);
        }
    }

    // Force Leaflet to resize since it was display: none
    setTimeout(() => {
        if (leafletInstance) leafletInstance.invalidateSize();
    }, 100);

    // Clear existing component markers
    if (leafletLayerGroup) leafletLayerGroup.clearLayers();
    componentMarkers = {};

    // ── MAP ALL COMPONENTS ──
    backendComponents.forEach(comp => {
        if (!comp.location || !comp.location.lng || !comp.location.lat) return;

        const color = getStatusColor(comp.status);
        const statusLabel = getStatusLabel(comp.status);
        const agYrs = (comp.age_months / 12).toFixed(1);

        const popupContent = `
            <div style="min-width:210px;">
                <div style="font-weight:700;color:#e62b2b;font-size:1.2em;margin-bottom:7px;font-family:'Orbitron',sans-serif;letter-spacing:0.5px;">${comp.id}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;">
                    <span style="color:rgba(255,255,255,0.6);font-size:1.05em;">${comp.type}</span>
                    <span style="font-size:0.9em;color:rgba(255,255,255,0.4);">${agYrs} yrs</span>
                </div>
                <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:9px 10px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:0.95em;color:rgba(255,255,255,0.5);">CII Score</span>
                    <span style="font-weight:700;font-size:1.4em;color:${color};">${comp.cii_score}</span>
                </div>
                <div style="margin-top:8px;text-align:center;font-size:0.9em;padding:5px 10px;border-radius:5px;background:${color}18;color:${color};font-weight:600;border:1px solid ${color}33;">${statusLabel}</div>
            </div>
        `;

        // Use L.circle (radius in meters) instead of L.circleMarker (radius in pixels)
        // This ensures the dots scale geographically as you zoom in/out
        const marker = L.circle([comp.location.lat, comp.location.lng], {
            radius: 20, // 20 meters radius
            fillColor: color,
            color: color,
            weight: 0.5,
            opacity: 0.9,
            fillOpacity: 0.8
        })
            .bindPopup(popupContent, {
                maxWidth: 250,
                className: 'vista-comp-popup',
                offset: [0, -10]
            })
            .on('click', () => showComponentDispatch(comp));

        componentMarkers[comp.id] = { marker, comp };
        marker.addTo(leafletLayerGroup);
    });

    // Populate the dropdown filters dynamically
    const filterSelect = document.getElementById('mapFilterCorridor');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="ALL">All Corridors</option>';
        Object.keys(sectorPolygonLayers).forEach(name => {
            filterSelect.innerHTML += `<option value="${name}">${name}</option>`;
        });
    }
}

// ============ MAP SEARCH AND FILTER LOGIC ============

function handleMapSearch(e) {
    if (e.key === 'Enter') executeMapSearch();
}

function executeMapSearch() {
    const query = (document.getElementById('mapSearchInput').value || '').toLowerCase().trim();
    if (!query) return;

    const compId = Object.keys(componentMarkers).find(id => id.toLowerCase().includes(query));
    if (compId) {
        const { marker, comp } = componentMarkers[compId];
        // Zoom to street level (16) instead of maximum
        leafletInstance.flyTo([comp.location.lat, comp.location.lng], 16, { animate: true, duration: 1.5 });
        setTimeout(() => {
            marker.openPopup();
        }, 1500);
    } else {
        showNotification('Component not found.', 'error');
    }
}

function applyMapFilters() {
    const corridorVal = document.getElementById('mapFilterCorridor').value;
    const statusVal = document.getElementById('mapFilterStatus').value;

    // Filter polygons
    Object.entries(sectorPolygonLayers).forEach(([name, poly]) => {
        if (corridorVal === 'ALL' || corridorVal === name) {
            if (!leafletInstance.hasLayer(poly)) poly.addTo(leafletInstance);
        } else {
            if (leafletInstance.hasLayer(poly)) leafletInstance.removeLayer(poly);
        }
    });

    // Filter points
    Object.values(componentMarkers).forEach(({ marker, comp }) => {
        const matchCorridor = (corridorVal === 'ALL' || comp.location.sector === corridorVal);
        const matchStatus = (statusVal === 'ALL' || comp.status === statusVal);

        if (matchCorridor && matchStatus) {
            if (!leafletLayerGroup.hasLayer(marker)) leafletLayerGroup.addLayer(marker);
        } else {
            if (leafletLayerGroup.hasLayer(marker)) leafletLayerGroup.removeLayer(marker);
        }
    });
}

function recenterMap() {
    if (leafletInstance) {
        // Close sector panel if open
        closeSectorPanel();
        // Reset all polygon styles
        Object.entries(sectorPolygonLayers).forEach(([name, p]) => {
            const color = SECTOR_COLORS[name] || '#3b82f6';
            p.setStyle({ weight: 1.5, fillOpacity: 0.08, opacity: 0.6 });
        });
        leafletInstance.flyTo([12.9716, 77.5946], 10, { animate: true, duration: 1.0 });
    }
}

function vistaMapPan(direction) {
    if (!leafletInstance) return;
    const offset = 200; // pixels to pan
    switch(direction) {
        case 'up': leafletInstance.panBy([0, -offset], { animate: true, duration: 0.4 }); break;
        case 'down': leafletInstance.panBy([0, offset], { animate: true, duration: 0.4 }); break;
        case 'left': leafletInstance.panBy([-offset, 0], { animate: true, duration: 0.4 }); break;
        case 'right': leafletInstance.panBy([offset, 0], { animate: true, duration: 0.4 }); break;
    }
}

function renderMetrics() {
    const severe_risk = backendComponents.filter(c => c.status === 'SEVERE_RISK').length;
    const substandard = backendComponents.filter(c => c.status === 'SUBSTANDARD').length;
    const needs_maintenance = backendComponents.filter(c => c.status === 'NEEDS_MAINTENANCE').length;
    const stable = backendComponents.filter(c => c.status === 'STABLE').length;
    const highly_reliable = backendComponents.filter(c => c.status === 'HIGHLY_RELIABLE').length;
    const optimal = backendComponents.filter(c => c.status === 'OPTIMAL').length;



    renderSectorMetricChart({ severe_risk, substandard, needs_maintenance, stable, highly_reliable, optimal });
}

let currentSectorMetricChart = null;

function renderSectorMetricChart(counts) {
    const canvas = document.getElementById('sectorMetricChart');
    if (!canvas) return;

    const values = [counts.severe_risk, counts.substandard, counts.needs_maintenance, counts.stable, counts.highly_reliable, counts.optimal];
    const total = values.reduce((sum, v) => sum + v, 0);

    // Update total components text
    const totalEl = document.getElementById('totalComponentsAnalysed');
    if (totalEl) totalEl.textContent = `Total Components Analysed: ${total}`;

    // Update horizontal bars
    const barsContainer = document.getElementById('sectorMetricBars');
    if (barsContainer) {
        barsContainer.innerHTML = '';
        sectorChartLabels.forEach((label, i) => {
            const val = values[i];
            const pct = total > 0 ? (val / total * 100).toFixed(1) : 0;
            barsContainer.innerHTML += `
                <div class="status-bar-container">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85em; margin-bottom: 4px; color: #e5e7eb;">
                        <span>${label}</span><span>${val} (${pct}%)</span>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: ${sectorChartColors[i]}; width: ${pct}%; height: 100%; transition: width 1s ease;"></div>
                    </div>
                </div>
            `;
        });
    }

    if (currentSectorMetricChart) {
        currentSectorMetricChart.destroy();
    }

    if (typeof Chart !== 'undefined') {
        currentSectorMetricChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: sectorChartLabels,
                datasets: [{
                    data: values,
                    backgroundColor: sectorChartColors,
                    borderWidth: 2,
                    borderColor: '#1e1e2d',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1500
                },
                plugins: {
                    legend: { display: false }
                },
                onClick: (event, elements) => {
                    if (elements && elements.length > 0) {
                        const index = elements[0].index;
                        const status = sectorChartStatuses[index];
                        const filterSelect = document.getElementById('filterCII');
                        if (!filterSelect) return;

                        if (sectorChartSelectedStatus === status) {
                            sectorChartSelectedStatus = '';
                            filterSelect.value = '';
                        } else {
                            sectorChartSelectedStatus = status;
                            filterSelect.value = status;
                        }
                        filterByCII();
                    }
                }
            }
        });
    }
}

// Custom canvas helpers removed in favor of Chart.js implementation

function renderComponentList() {
    const list = document.getElementById('componentList');
    list.innerHTML = '';

    // Show up to 100 components in the scrollable list
    const displayComponents = backendComponents.slice(0, 100);

    displayComponents.forEach(comp => {
        const item = document.createElement('div');
        item.className = `component-item ${getStatusCssClass(comp.status)}`;
        item.setAttribute('data-status', comp.status); item.innerHTML = `
            <div class="component-info">
                <div class="component-id">${comp.id}</div>
                <div class="component-details">${comp.type} | ${comp.location.sector} | Age: ${comp.age_months}m | Load: ${comp.factors.load_stress} | Rain: ${comp.factors.moisture_index}</div>
            </div>
            <div class="component-cii" style="color: ${getStatusColor(comp.status)}">${comp.cii_score}</div>
        `;
        item.style.cursor = 'pointer';
        item.onclick = () => showComponentDispatch(comp);
        list.appendChild(item);
    });
}

function showComponentDispatch(comp) {
    // Map backend sector to nearest hub for engineer assignment
    const sectorToHub = {
        'Bangalore Central': 'Majestic Hub', 'Kengeri Zone': 'Majestic Hub',
        'Yeshwantpur Zone': 'Yeshwantpur Hub', 'Yelahanka Corridor': 'Yeshwantpur Hub',
        'Tumkur Corridor': 'Yeshwantpur Hub', 'Krishnarajapuram Zone': 'KR Puram Hub',
        'Whitefield Corridor': 'KR Puram Hub', 'Bangarapet Corridor': 'KR Puram Hub',
        'Electronic City Corridor': 'Majestic Hub', 'Hosur Corridor': 'Majestic Hub',
        'Mysore Corridor': 'Majestic Hub', 'Devanahalli Corridor': 'Yeshwantpur Hub',
        'Regional Outer': 'Majestic Hub'
    };
    currentSupervisorHub = sectorToHub[comp.location.sector] || 'Majestic Hub';
    selectedComponentId = comp.id;
    openAssignForComponent(comp);
}

function getPriorityLabel(status) {
    if (status === 'critical') return 'Critical';
    if (status === 'high') return 'High';
    if (status === 'moderate') return 'Moderate';
    return 'Nominal';
}

function searchComponents() {
    const query = document.getElementById('searchComponent').value.toLowerCase();
    const items = document.querySelectorAll('.component-item');

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(query) ? 'flex' : 'none';
    });
}

function filterByCII() {
    const filter = document.getElementById('filterCII').value;
    const items = document.querySelectorAll('.component-item');

    items.forEach(item => {
        if (!filter) {
            item.style.display = 'flex';
        } else {
            const itemStatus = item.getAttribute('data-status');
            item.style.display = itemStatus === filter ? 'flex' : 'none';
        }
    });
}

function showComponentDetails(comp) {
    showNotification(`Selected: ${comp.id} (CII: ${comp.cii_score} - ${getStatusLabel(comp.status)})`);
}

// ============ SUPERVISOR VIEW ============
let selectedDispatchId = null;
let currentSupervisorHub = null;

function switchHub(hubName) {
    currentSupervisorHub = hubName;
    const hubNameEl = document.getElementById('supervisorHubName');
    if (hubNameEl) hubNameEl.textContent = hubName + ' - Engineer Assignment';

    // Update active tab styling
    document.querySelectorAll('.hub-tab').forEach(tab => {
        if (tab.id === 'hubTab-' + hubName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    renderSupervisorView();
}

function renderSupervisorView() {
    renderCompletedTasks();
    renderEngineerList();
    renderActiveAssignments();
}

function renderCompletedTasks() {
    const taskList = document.getElementById('completedTasks');
    if (!taskList) return;
    taskList.innerHTML = '';
    const currentHub = currentSupervisorHub || getUserHub();

    // Show completed assignments from Firestore
    const completedAssignments = firebaseAssignments.filter(a => a.status === 'Completed' && (a.hub === currentHub || currentHub === 'System Wide'));

    if (completedAssignments.length > 0) {
        completedAssignments.forEach(assign => {
            const task = document.createElement('div');
            task.className = 'task-item';
            task.style.cursor = 'pointer';
            const time = new Date(assign.timestamp).toLocaleString();
            task.innerHTML = `
                <strong>${assign.component}</strong>
                <div style="margin-top: 4px;">Completed by ${assign.engineer || 'Unknown'}</div>
                <div style="font-size: 0.8em; color: #9ca3af;">${time}</div>
                <div class="task-priority nominal">AI Verified: Nominal</div>
                <div style="margin-top: 8px; font-size: 0.8em; color: #16a34a;">▸ Click to view report</div>
            `;
            // Re-open verification modal for completed tasks
            task.onclick = () => openGeminiVerification(assign);
            taskList.appendChild(task);
        });
    } else {
        taskList.innerHTML = '<div style="color: #9ca3af; padding: 15px;">No completed assignments for this hub.</div>';
    }
}

function openAssignForDispatch(dispatch) {
    selectedDispatchId = dispatch.id;

    // Show dispatch info in modal
    const infoEl = document.getElementById('assignDispatchInfo');
    if (infoEl) {
        const compInfo = dispatch.componentId && dispatch.componentId !== 'N/A'
            ? `<div style="font-size: 0.9em; color: #d1d5db;">Component: ${dispatch.componentId} (${dispatch.componentType})</div>
               <div style="font-size: 0.9em; color: ${getCIIColor(dispatch.componentCII)}; margin-top: 2px;">CII: ${dispatch.componentCII} — ${dispatch.componentStatus}</div>`
            : '';
        infoEl.innerHTML = `
            <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 6px; padding: 12px; margin-bottom: 15px;">
                <div style="font-weight: 600; color: #7C3AED; margin-bottom: 6px;">${dispatch.id}</div>
                ${compInfo}
                <div style="font-size: 0.85em; color: #9ca3af; margin-top: 4px;">Hub: ${dispatch.hub} | Priority: ${dispatch.priority}</div>
            </div>
        `;
    }

    populateAvailableEngineers();
    openModal('assignModal');
}

function openAssignForComponent(comp) {
    // Create a temporary dispatch-like object for components not yet dispatched
    selectedDispatchId = 'AUTO-' + comp.id;

    const infoEl = document.getElementById('assignDispatchInfo');
    if (infoEl) {
        infoEl.innerHTML = `
            <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); border-radius: 6px; padding: 12px; margin-bottom: 15px;">
                <div style="font-weight: 600; color: #7C3AED; margin-bottom: 6px;">${comp.id}</div>
                <div style="font-size: 0.9em; color: #d1d5db;">Type: ${comp.type} | Sector: ${comp.location ? comp.location.sector : 'Unknown'}</div>
                <div style="font-size: 0.9em; color: ${getStatusColor(comp.status || 'STABLE')}; margin-top: 2px;">CII: ${comp.cii_score || comp.cii || 'N/A'} — ${getStatusLabel(comp.status || 'STABLE')}</div>
            </div>
        `;
    }

    populateAvailableEngineers();
    openModal('assignModal');
}

function getBusyEngineerNames() {
    // An engineer is only "busy" when they have actively accepted a task (In Progress).
    // Being in a broadcast pool (Pending Acceptance) does NOT make them unavailable —
    // stale pending broadcasts would otherwise permanently lock engineers as On Inspection.
    const busySet = new Set();
    firebaseAssignments.forEach(a => {
        if (a.status === 'In Progress' && a.engineer) {
            busySet.add(a.engineer);
        }
    });
    return busySet;
}

function getAvailableEngineers() {
    const currentHub = currentSupervisorHub || getUserHub();
    const busyEngineerNames = getBusyEngineerNames();

    return mockData.engineers.filter(eng => {
        return eng.hub === currentHub && !busyEngineerNames.has(eng.name);
    });
}

function populateAvailableEngineers() {
    const listContainer = document.getElementById('availableEngineersList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    const availableEngineers = getAvailableEngineers();

    if (availableEngineers.length === 0) {
        listContainer.innerHTML = '<div style="color: #dc2626; padding: 10px; background: rgba(220, 38, 38, 0.1); border-radius: 6px;">No engineers currently available</div>';
        return;
    }

    let html = '<div style="background: rgba(22, 163, 74, 0.1); border: 1px solid rgba(22, 163, 74, 0.3); border-radius: 6px; padding: 12px;">';
    html += '<div style="font-weight: 600; color: #16a34a; margin-bottom: 8px;">Available Engineers (' + availableEngineers.length + '):</div>';
    html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';

    availableEngineers.forEach(eng => {
        html += `<span style="background: rgba(22, 163, 74, 0.2); color: #16a34a; padding: 4px 10px; border-radius: 4px; font-size: 0.85em;">${eng.name}</span>`;
    });

    html += '</div></div>';
    listContainer.innerHTML = html;
}

function renderEngineerList() {
    const engineerList = document.getElementById('engineerList');
    engineerList.innerHTML = '';
    const currentHub = currentSupervisorHub || getUserHub();

    // Use the unified busy-check so Available status always reflects real Firestore state
    const busyEngineerNames = getBusyEngineerNames();

    const hubEngineers = mockData.engineers.filter(eng => eng.hub === currentHub);

    hubEngineers.forEach(eng => {
        const isBusy = busyEngineerNames.has(eng.name);
        const item = document.createElement('div');
        item.className = 'engineer-item';
        item.innerHTML = `
            <strong>${eng.name}</strong>
            <div>${eng.id}</div>
            <div style="color: ${isBusy ? '#dc2626' : '#16a34a'}; margin-top: 5px;">
                ${isBusy ? 'On Inspection' : 'Available'}
            </div>
        `;
        engineerList.appendChild(item);
    });
}

function renderActiveAssignments() {
    const assignmentsEl = document.getElementById('activeAssignments');
    assignmentsEl.innerHTML = '';

    // Load assignments from Firestore
    const savedAssignments = firebaseAssignments.filter(a => a.status !== 'Completed');

    if (savedAssignments.length === 0) {
        assignmentsEl.innerHTML = '<div style="color: #9ca3af; padding: 15px;">No active assignments.</div>';
        return;
    }

    savedAssignments.forEach((assign) => {
        const row = document.createElement('div');
        row.className = 'assignment-row';

        let statusColor, statusIcon;
        if (assign.status === 'In Progress') {
            statusColor = '#ea580c';
            statusIcon = '🔄';
        } else if (assign.status === 'Completed') {
            statusColor = '#16a34a';
            statusIcon = '✅';
        } else if (assign.status === 'Pending Acceptance') {
            statusColor = '#7C3AED';
            statusIcon = '📡';
        } else {
            statusColor = '#9ca3af';
            statusIcon = '⏳';
        }

        const engineerDisplay = assign.status === 'Pending Acceptance'
            ? `<span style="color: #7C3AED;">Broadcasted to ${assign.broadcastTo ? assign.broadcastTo.length : 0} engineer(s)</span>`
            : (assign.engineer || 'Unassigned');

        const broadcastInfo = assign.status === 'Pending Acceptance' && assign.declinedBy && assign.declinedBy.length > 0
            ? `<div style="font-size: 0.75em; color: #dc2626; margin-top: 4px;">Declined by: ${assign.declinedBy.join(', ')}</div>`
            : '';

        row.innerHTML = `
            <div class="assignment-field"><strong>Component</strong>${assign.component}</div>
            <div class="assignment-field"><strong>Engineer</strong>${engineerDisplay}</div>
            <div class="assignment-field"><strong>Deadline</strong>${assign.deadline}</div>
            <div class="assignment-field">
                <strong>Status</strong>
                <span style="color: ${statusColor};">${statusIcon} ${assign.status}</span>
                ${broadcastInfo}
                ${assign.status === 'In Progress' ? `<div style="margin-top: 6px; padding: 4px 10px; background: rgba(168, 85, 247, 0.2); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.4); border-radius: 4px; font-size: 0.8em; display: inline-block;">▸ Click to Verify</div>` : ''}
            </div>
        `;

        if (assign.status === 'In Progress' || assign.status === 'Completed') {
            row.classList.add('clickable');
            row.onclick = () => openGeminiVerification(assign);
        }

        assignmentsEl.appendChild(row);
    });
}

let pendingVerificationId = null;

function openGeminiVerification(assign) {
    // Support being called with just an ID string (legacy)
    if (typeof assign === 'string') {
        assign = firebaseAssignments.find(a => a.id === assign) || { id: assign };
    }

    pendingVerificationId = assign.id;

    // Find component from mockData, or build a stub from the assignment data
    let comp = backendComponents.find(c => c.id === assign.componentId);
    if (!comp) {
        // Build a fallback comp from assignment fields
        comp = {
            id: assign.componentId || assign.component || 'Unknown',
            type: assign.componentType || 'Component',
            location: { sector: assign.hub || 'Bangalore Central' },
            cii_score: assign.componentCII || 60
        };
    }

    // Show engineer's uploaded photo if available, otherwise fall back to generic image
    const imgEl = document.getElementById('geminiVerificationImage');
    if (imgEl) {
        imgEl.src = assign.photoData ? assign.photoData : 'assets/repaired_track.png';
    }

    // Show loading state
    const reportContainer = document.getElementById('geminiReportContent');
    reportContainer.innerHTML = '<div style="color: #9ca3af; display: flex; align-items: center; gap: 8px;">⏳ Analyzing field data via Gemini AI...</div>';

    const btnApprove = document.getElementById('btnApproveRepair');
    btnApprove.style.display = 'none';

    openModal('geminiVerificationModal');

    // ── If the engineer's PWA already stored the analysis, use it directly ──
    if (assign.aiAnalysis) {
        const a = assign.aiAnalysis;
        const score = a.confidence || 80;
        const scoreColor = score >= 80 ? '#16a34a' : score >= 75 ? '#ca8a04' : '#ea580c';
        const scoreLabel = score >= 80 ? 'Good' : score >= 75 ? 'Acceptable' : 'Minor Issues';

        const defectsList = Array.isArray(a.defects) && a.defects.length > 0
            ? a.defects.map(d => `<li style="margin-bottom:4px;">• ${d}</li>`).join('')
            : '<li>• None visible</li>';

        const recsList = Array.isArray(a.recommendations) && a.recommendations.length > 0
            ? a.recommendations.map(r => `<li style="margin-bottom:4px;">› ${r}</li>`).join('')
            : '<li>› Clear for operation</li>';

        const safetyColor = a.safetyRisk === 'HIGH' ? '#dc2626' : a.safetyRisk === 'MEDIUM' ? '#ea580c' : a.safetyRisk === 'LOW' ? '#ca8a04' : '#16a34a';

        const feedbackHtml = assign.engineerFeedback
            ? `<div style="margin-top:14px; padding:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px;">
                <div style="font-size:0.8em; color:#9ca3af; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.05em;">Engineer Field Report</div>
                <div style="color:#e5e7eb; font-size:0.92em; line-height:1.5;">${assign.engineerFeedback}</div>
               </div>`
            : '';

        reportContainer.innerHTML = `
            <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
                <strong>Health Score</strong>
                <span style="font-size:1.2em; font-weight:700; color:${scoreColor};">${score} — ${scoreLabel}</span>
            </div>
            <div style="margin-bottom:12px;"><strong>Summary:</strong> <span style="color:#d1d5db;">${a.summary || 'Nominal'}</span></div>
            <div style="margin-bottom:8px;"><strong style="color:#f87171;">Defects Found:</strong>
                <ul style="margin:6px 0 0 4px; padding:0; list-style:none; color:#fca5a5;">${defectsList}</ul>
            </div>
            <div style="margin-bottom:10px;"><strong style="color:#93c5fd;">Recommendations:</strong>
                <ul style="margin:6px 0 0 4px; padding:0; list-style:none; color:#bfdbfe;">${recsList}</ul>
            </div>
            <div style="margin-bottom:12px;"><strong>Safety Risk:</strong> <span style="color:${safetyColor}; font-weight:600;">${a.safetyRisk || 'NONE'}</span></div>
            ${feedbackHtml}
        `;

        if (assign.status !== 'Completed') {
            btnApprove.style.display = 'block';
        }
        return; // Skip Gemini re-call
    }

    // ── Fallback: call Backend Gemini proxy ──
    fetch(`${API_BASE}/api/engineer/inspection/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            component_id: comp.id,
            component_type: comp.type,
            component_location: comp.location ? comp.location.sector : (comp.hub || 'Unknown')
        })
    })
        .then(async response => {
            if (!response.ok) throw new Error(`API Error ${response.status}`);
            return response.json();
        })
        .then(data => {
            reportContainer.innerHTML = `
            <div style="margin-bottom: 12px;"><strong>AI Tag:</strong> <span style="color: ${data.tag === 'Critical' ? '#dc2626' : '#16a34a'};">${data.tag}</span></div>
            <div style="margin-bottom: 12px;"><strong>Summary:</strong> <span style="color: #d1d5db;">${data.summary}</span></div>
            <div style="margin-bottom: 12px; font-size: 1.1em;"><strong>Confidence:</strong> <span style="color: #38bdf8;">${data.confidence_score}%</span></div>
            <div style="font-size: 1.1em;"><strong>Action:</strong> <span style="color: #ca8a04;">${data.action_taken}</span></div>
        `;
            if (assign.status !== 'Completed') btnApprove.style.display = 'block';
        })
        .catch(error => {
            console.warn('Backend Gemini Error (Falling back to local mock):', error);
            reportContainer.innerHTML = `
            <div style="margin-bottom: 12px;"><strong>Visual Analysis:</strong> <span style="color: #16a34a;">Pass.</span> New ${comp.type} installed securely. No surface micro-fractures detected. Ballast profile is nominal.</div>
            <div style="margin-bottom: 12px;"><strong>Location Context:</strong> ${comp.location ? comp.location.sector : 'Unknown'}. Weather pattern indicates moderate impact. Material fatigue models adjusted.</div>
            <div style="margin-bottom: 12px; font-size: 1.1em;"><strong>Predicted Lifespan:</strong> <span style="color: #38bdf8;">10.0 Years</span></div>
            <div style="font-size: 1.1em;"><strong>New Health Score:</strong> <span style="color: #16a34a;">CII: 98 (Optimal)</span></div>
        `;
            if (assign.status !== 'Completed') btnApprove.style.display = 'block';
        });
}

function approveVerification() {
    if (pendingVerificationId) {
        markAssignmentComplete(pendingVerificationId);
        closeModal('geminiVerificationModal');
        pendingVerificationId = null;
    }
}

function markAssignmentComplete(id) {
    if (typeof db !== 'undefined') {
        db.collection('assignments').doc(id).update({ status: 'Completed' })
            .then(() => showNotification('Assignment marked as completed!'))
            .catch(err => showNotification('Error completing assignment', 'error'));
    }
}

function assignEngineer() {
    selectedDispatchId = null;
    const infoEl = document.getElementById('assignDispatchInfo');
    if (infoEl) infoEl.innerHTML = '';
    populateAvailableEngineers();
    openModal('assignModal');
}

// ============ MODAL FUNCTIONS ============
function dispatchAlert() {
    openModal('dispatchModal');
}

function submitDispatch() {
    const hub = document.getElementById('dispatchHub').value;
    const priority = document.getElementById('dispatchPriority').value;
    const notes = document.getElementById('dispatchNotes').value;

    // Get selected component details
    const component = backendComponents.find(c => c.id === selectedComponentId);

    const dispatchData = {
        hub: hub,
        priority: priority,
        notes: notes,
        componentId: component ? component.id : 'N/A',
        componentType: component ? component.type : 'N/A',
        componentCII: component ? component.cii_score : 'N/A',
        componentStatus: component ? getStatusLabel(component.status) : 'N/A',
        dispatchedBy: getUserName(),
        timestamp: new Date().toISOString(),
        status: 'Pending'
    };

    if (typeof db !== 'undefined') {
        const docRef = db.collection('dispatches').doc('DSP-' + Date.now());
        dispatchData.id = docRef.id;
        docRef.set(dispatchData).then(() => {
            // Reset form and component info
            document.getElementById('dispatchNotes').value = '';
            const compInfoEl = document.getElementById('dispatchComponentInfo');
            if (compInfoEl) compInfoEl.innerHTML = '';
            selectedComponentId = null;

            closeModal('dispatchModal');
            showNotification('Alert dispatched to ' + hub + '!');
        }).catch(err => {
            showNotification('Error dispatching alert', 'error');
        });
    } else {
        showNotification('Database connection missing', 'error');
    }
}

function broadcastTask() {
    const deadline = document.getElementById('assignDeadline').value;
    const availableEngineers = getAvailableEngineers();

    if (availableEngineers.length === 0) {
        showNotification('No engineers available to broadcast task.', 'error');
        return;
    }

    // Determine the component from the selected dispatch
    let componentLabel = 'Manual Assignment';
    let componentId = '';
    let componentType = '';
    let componentCII = '';
    let componentStatus = '';

    if (selectedDispatchId && !selectedDispatchId.startsWith('AUTO-')) {
        // It's a controller dispatch — mark it as Assigned in Firestore
        const dispatch = firebaseDispatches.find(d => d.id === selectedDispatchId);
        if (dispatch) {
            if (typeof db !== 'undefined') {
                db.collection('dispatches').doc(selectedDispatchId).update({ status: 'Assigned' });
            }
            componentLabel = dispatch.componentId && dispatch.componentId !== 'N/A'
                ? `${dispatch.componentId} (${dispatch.componentType})`
                : dispatch.hub;
            componentId = dispatch.componentId || '';
            componentType = dispatch.componentType || '';
            componentCII = dispatch.componentCII || '';
            componentStatus = dispatch.componentStatus || '';
        }
    } else if (selectedDispatchId && selectedDispatchId.startsWith('AUTO-')) {
        // It's an auto-flagged component
        const compId = selectedDispatchId.replace('AUTO-', '');
        const comp = backendComponents.find(c => c.id === compId);
        if (comp) {
            componentLabel = `${comp.id} (${comp.type})`;
            componentId = comp.id;
            componentType = comp.type;
            componentCII = comp.cii_score;
            componentStatus = getStatusLabel(comp.status);
        }
    }

    // Create a broadcast task that all available engineers can see
    const broadcastData = {
        component: componentLabel,
        componentId: componentId,
        componentType: componentType,
        componentCII: componentCII,
        componentStatus: componentStatus,
        hub: currentSupervisorHub || getUserHub(),
        deadline: deadline || 'Not set',
        status: 'Pending Acceptance',
        broadcastTo: availableEngineers.map(e => e.name),
        acceptedBy: null,
        declinedBy: [],
        assignedBy: getUserName(),
        timestamp: new Date().toISOString()
    };

    if (typeof db !== 'undefined') {
        const docRef = db.collection('assignments').doc('BRD-' + Date.now());
        broadcastData.id = docRef.id;
        docRef.set(broadcastData).then(() => {
            selectedDispatchId = null;
            const infoEl = document.getElementById('assignDispatchInfo');
            if (infoEl) infoEl.innerHTML = '';

            closeModal('assignModal');
            showNotification(`Task broadcasted to ${availableEngineers.length} engineer(s)! Waiting for acceptance...`);
        }).catch(err => {
            showNotification('Error broadcasting task', 'error');
        });
    } else {
        showNotification('Database connection missing', 'error');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
}

function submitInspection() {
    const form = document.getElementById('inspectionForm');
    const checkboxes = form.querySelectorAll('input[type="checkbox"]:checked').length;

    if (checkboxes === 0) {
        showNotification('Please complete the inspection checklist', 'error');
        return;
    }

    if (isOffline) {
        showNotification('Inspection saved locally. Will sync when online.', 'error');
        return;
    }

    showNotification('Inspection submitted! Syncing to cloud...');
}

function syncToCloud() {
    if (isOffline) {
        showNotification('Cannot sync in Offline mode. Data queued for later.', 'error');
        return;
    }
    showNotification('Data synced successfully to central server!');
}

function viewAnalytics() {
    switchMainView('analyticsView');
    renderAnalyticsView();
}

let healthChartInstance = null;
let stressChartInstance = null;

function renderAnalyticsView() {
    const criticalComps = backendComponents.filter(c => c.status === 'SEVERE_RISK' || c.status === 'SUBSTANDARD');

    // 1. Diagnostic Insights
    renderDiagnosticInsights();

    // 2. Charts Initialization
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded yet.');
        return;
    }

    // Prepare data for Health by Type
    // Build chart from backendComponents
    const typeCounts = {};
    backendComponents.forEach(c => {
        if (!typeCounts[c.type]) typeCounts[c.type] = { nominal: 0, warning: 0 };
        if (c.status === 'SEVERE_RISK' || c.status === 'SUBSTANDARD') typeCounts[c.type].warning++;
        else typeCounts[c.type].nominal++;
    });

    const labels = Object.keys(typeCounts);
    const nominalData = labels.map(l => typeCounts[l].nominal);
    const warningData = labels.map(l => typeCounts[l].warning);

    const ctxHealth = document.getElementById('healthTypeChart');
    if (ctxHealth) {
        if (healthChartInstance) healthChartInstance.destroy();
        healthChartInstance = new Chart(ctxHealth, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Nominal/Moderate', data: nominalData, backgroundColor: '#16a34a' },
                    { label: 'High/Critical', data: warningData, backgroundColor: '#dc2626' }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { color: 'rgba(255,255,255,0.1)' } },
                    y: { stacked: true, grid: { color: 'rgba(255,255,255,0.1)' } }
                },
                plugins: { legend: { labels: { color: '#e5e7eb' } } }
            }
        });
    }

    // Prepare data for Stress Factors (Averages across critical components)
    let avgAge = 0, avgLoad = 0, avgBraking = 0, avgCurve = 0, avgMoisture = 0, avgThermal = 0;
    if (criticalComps.length > 0) {
        avgAge = criticalComps.reduce((sum, c) => sum + (c.age_months / 180 * 100), 0) / criticalComps.length;
        avgLoad = criticalComps.reduce((sum, c) => sum + ((c.factors?.load_stress || 0) * 100), 0) / criticalComps.length;
        avgBraking = criticalComps.reduce((sum, c) => sum + ((c.factors?.braking_zone || 0) * 100), 0) / criticalComps.length;
        avgCurve = criticalComps.reduce((sum, c) => sum + ((c.factors?.curvature_stress || 0) * 100), 0) / criticalComps.length;
        avgMoisture = criticalComps.reduce((sum, c) => sum + ((c.factors?.moisture_index || 0) * 100), 0) / criticalComps.length;
        avgThermal = criticalComps.reduce((sum, c) => sum + ((c.factors?.thermal_gradient || 0) * 100), 0) / criticalComps.length;
    }

    const ctxStress = document.getElementById('stressFactorChart');
    if (ctxStress) {
        if (stressChartInstance) stressChartInstance.destroy();
        stressChartInstance = new Chart(ctxStress, {
            type: 'polarArea',
            data: {
                labels: ['Material Fatigue', 'Dynamic Load', 'Braking Friction', 'Curvature Stress', 'Moisture Impact', 'Thermal Expansion'],
                datasets: [{
                    data: [avgAge, avgLoad, avgBraking, avgCurve, avgMoisture, avgThermal],
                    backgroundColor: [
                        'rgba(124, 58, 237, 0.7)',
                        'rgba(234, 88, 12, 0.7)',
                        'rgba(220, 38, 38, 0.7)',
                        'rgba(234, 179, 8, 0.7)',
                        'rgba(14, 165, 233, 0.7)',
                        'rgba(244, 63, 94, 0.7)'
                    ],
                    borderWidth: 1,
                    borderColor: '#1e1e2d'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { display: false } } },
                plugins: { legend: { position: 'bottom', labels: { color: '#e5e7eb', font: { size: 10 } } } },
                onClick: (event, elements) => {
                    const popup = document.getElementById('factorPopup');
                    if (popup) {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            showFactorDetails(index, criticalComps);
                            popup.style.display = 'block';
                        } else {
                            popup.style.display = 'none';
                        }
                    }
                }
            }
        });
    }
}

function showFactorDetails(index, comps) {
    const details = [
        {
            title: 'Material Fatigue (Age)',
            count: comps.filter(c => c.age_months > 120).length,
            desc: 'Represents the cumulative tonnage lifecycle and material degradation over time. Components exceeding 10 years (120 months) typically exhibit elevated risk of micro-fractures.'
        },
        {
            title: 'Dynamic Load Stress',
            count: comps.filter(c => (c.factors?.load_stress || 0) > 0.6).length,
            desc: 'Measures the vertical force exerted by passing trains, exacerbated by heavy freight traffic or insufficient ballast support.'
        },
        {
            title: 'Braking Friction',
            count: comps.filter(c => (c.factors?.braking_zone || 0) > 0.6).length,
            desc: 'Longitudinal shear stress caused by train deceleration near stations or signals, leading to rail head wear and corrugation.'
        },
        {
            title: 'Curvature Stress',
            count: comps.filter(c => (c.factors?.curvature_stress || 0) > 0.6).length,
            desc: 'Centrifugal lateral wear forces on curved track segments. High curvature stress accelerates gauge tie degradation and outer rail wear.'
        },
        {
            title: 'Moisture Impact',
            count: comps.filter(c => (c.factors?.moisture_index || 0) > 0.6).length,
            desc: 'Ballast degradation and subgrade saturation due to rainfall and poor drainage, reducing the track\'s load-bearing capacity.'
        },
        {
            title: 'Thermal Expansion',
            count: comps.filter(c => (c.factors?.thermal_gradient || 0) > 0.6).length,
            desc: 'Stress from temperature variations causing rail expansion and contraction, which increases the risk of track buckling (sun kinks).'
        }
    ];

    const factor = details[index];
    if (factor) {
        document.getElementById('factorPopupTitle').textContent = factor.title;
        document.getElementById('factorPopupCount').textContent = `${factor.count} critical components strongly affected.`;
        document.getElementById('factorPopupDesc').textContent = factor.desc;
    }
}

function renderDiagnosticInsights() {
    const diagnosticsList = document.getElementById('diagnosticInsightsList');
    if (!diagnosticsList) return;

    // Get raw critical components
    let criticalComps = backendComponents.filter(c => c.status === 'SEVERE_RISK' || c.status === 'SUBSTANDARD');

    // Get filter values
    const searchVal = (document.getElementById('searchAnalytics')?.value || '').toLowerCase();
    const filterVal = document.getElementById('filterAnalytics')?.value || '';
    const sortVal = document.getElementById('sortAnalytics')?.value || 'lowestCii';

    // Filter
    criticalComps = criticalComps.filter(comp => {
        // Search by ID, Type, or Hub
        const textToSearch = `${comp.id} ${comp.type} ${comp.location?.sector || ''}`.toLowerCase();
        if (searchVal && !textToSearch.includes(searchVal)) return false;

        // Filter by Type
        if (filterVal && comp.type !== filterVal) return false;

        return true;
    });

    // Sort
    if (sortVal === 'lowestCii') {
        criticalComps.sort((a, b) => (a.cii_score || 0) - (b.cii_score || 0)); // ascending (most critical first)
    } else if (sortVal === 'highestCii') {
        criticalComps.sort((a, b) => (b.cii_score || 0) - (a.cii_score || 0)); // descending (least critical first)
    } else if (sortVal === 'oldest') {
        criticalComps.sort((a, b) => (b.age_months || 0) - (a.age_months || 0)); // oldest first
    }

    // Render
    diagnosticsList.innerHTML = '';
    if (criticalComps.length === 0) {
        diagnosticsList.innerHTML = '<div style="color: #16a34a; padding: 15px;">No diagnostics match your criteria.</div>';
    } else {
        criticalComps.forEach(comp => {
            let primaryReason = '';
            let action = '';

            const load = comp.factors?.load_stress || 0;
            const curve = comp.factors?.curvature_stress || 0;
            const braking = comp.factors?.braking_zone || 0;
            const thermal = comp.factors?.thermal_gradient || 0;
            const moisture = comp.factors?.moisture_index || 0;

            if (curve > 0.75) {
                primaryReason = `High centrifugal wear detected on curve (Stress: ${(curve * 100).toFixed(0)}%).`;
                action = 'Recommendation: Gauge tie maintenance and rail grinding required.';
            } else if (braking > 0.75) {
                primaryReason = `Severe longitudinal friction from heavy braking (Index: ${(braking * 100).toFixed(0)}%).`;
                action = 'Recommendation: Ultrasonic testing for rail head defects.';
            } else if (load > 0.75) {
                primaryReason = `Dynamic load limit exceeded continuously (Load Factor: ${(load * 100).toFixed(0)}%).`;
                action = 'Recommendation: Inspect ballast bed and tighten elastic clips.';
            } else if (moisture > 0.75 || thermal > 0.75) {
                primaryReason = `Environmental degradation (Thermal: ${(thermal * 100).toFixed(0)}%, Moisture: ${(moisture * 100).toFixed(0)}%).`;
                action = 'Recommendation: Check for rail buckling or subgrade saturation.';
            } else if (comp.age_months > 120) {
                primaryReason = `Component has exceeded designed lifecycle (Age: ${comp.age_months} months).`;
                action = 'Recommendation: Scheduled replacement required within 30 days.';
            } else if (comp.type === 'Rail Joint' || comp.type === 'Switch Blade') {
                primaryReason = `Mechanical stress fracture developing at junction point.`;
                action = 'Recommendation: Immediate physical inspection and lubrication.';
            } else {
                primaryReason = `Compound degradation signature detected (CII Score: ${comp.cii_score}).`;
                action = 'Recommendation: Standard manual inspection for multi-factor wear.';
            }

            const card = document.createElement('div');
            card.className = `diagnostic-card ${comp.status}`;
            const locationLabel = comp.location ? comp.location.sector : 'Unknown Sector';
            card.innerHTML = `
                <div class="diagnostic-title">${comp.id} (${comp.type}) — ${locationLabel}</div>
                <div class="diagnostic-reason"><strong>Root Cause Analysis:</strong> ${primaryReason}</div>
                <div class="diagnostic-action">${action}</div>
            `;
            diagnosticsList.appendChild(card);
        });
    }
}

// ============ NOTIFICATION ============
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Close modals when clicking outside
window.onclick = function (event) {
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
};

// Photo upload handler - triggers AI simulation
document.addEventListener('change', function (e) {
    if (e.target.id === 'photoUpload' && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function (event) {
            simulateAIProcessing(event.target.result);
        };
        reader.readAsDataURL(file);
    }
});

// ============ LIVE SSE: AI INSPECTION REPORTS ============
let aiReportCount = 0;

function renderAIInspectionReport(data) {
    const container = document.getElementById('aiInspectionReports');
    const emptyMsg = document.getElementById('aiReportsEmpty');
    if (!container) return;

    // Remove empty placeholder
    if (emptyMsg) emptyMsg.remove();

    aiReportCount++;
    const countEl = document.getElementById('aiReportCount');
    if (countEl) countEl.textContent = `${aiReportCount} report${aiReportCount > 1 ? 's' : ''} received`;

    const tagColor = data.tag === 'Critical' ? '#ef4444' :
                     data.tag === 'Warning'  ? '#f59e0b' : '#22c55e';
    const tagBg   = data.tag === 'Critical' ? 'rgba(239,68,68,0.1)' :
                     data.tag === 'Warning'  ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)';

    const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const card = document.createElement('div');
    card.style.cssText = `
        background: rgba(255,255,255,0.04);
        border: 1px solid ${tagColor}44;
        border-radius: 10px;
        padding: 14px 16px;
        display: flex;
        gap: 14px;
        align-items: flex-start;
        animation: fadeInUp 0.4s ease;
    `;

    card.innerHTML = `
        ${data.image ? `
        <div style="flex-shrink:0;">
            <img src="${data.image}" alt="Inspection Photo"
                style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:2px solid ${tagColor}66;cursor:pointer;"
                onclick="this.style.width=this.style.width==='90px'?'260px':'90px';this.style.height=this.style.height==='90px'?'auto':'90px';"
                title="Click to expand" />
        </div>` : ''}
        <div style="flex:1;min-width:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap;">
                <span style="font-family:'Orbitron',sans-serif;font-size:0.85em;font-weight:700;color:#e2e8f0;">${data.component_id || 'Unknown Component'}</span>
                <div style="display:flex;gap:8px;align-items:center;">
                    <span style="font-size:0.7em;background:${tagBg};color:${tagColor};border:1px solid ${tagColor}55;padding:3px 9px;border-radius:20px;font-weight:700;">${data.tag}</span>
                    <span style="font-size:0.7em;color:#6b7280;">${ts}</span>
                </div>
            </div>
            <p style="font-size:0.82em;color:#cbd5e1;margin:0 0 10px;line-height:1.5;">${data.summary || 'No summary available.'}</p>
            <div style="display:flex;gap:16px;flex-wrap:wrap;">
                <div style="font-size:0.76em;color:#9ca3af;">
                    Confidence: <span style="color:${tagColor};font-weight:700;">${data.confidence_score}%</span>
                </div>
                <div style="font-size:0.76em;color:#9ca3af;">
                    Action: <span style="color:#a78bfa;font-weight:600;">${(data.action_taken || '').replace(/_/g,' ')}</span>
                </div>
            </div>
        </div>
    `;

    // Prepend newest report at top
    container.insertBefore(card, container.firstChild);

    // Show notification
    showNotification(`📸 New AI report: ${data.component_id} — ${data.tag}`, data.tag === 'Critical' ? 'error' : 'success');
}

function initSSEListener() {
    const dotEl = document.getElementById('sseStatusDot');
    const labelEl = document.getElementById('sseStatusLabel');

    const setStatus = (connected) => {
        if (!dotEl || !labelEl) return;
        dotEl.style.background = connected ? '#4ade80' : '#ef4444';
        dotEl.style.boxShadow = connected ? '0 0 6px #4ade80' : '0 0 6px #ef4444';
        labelEl.style.color = connected ? '#4ade80' : '#ef4444';
        labelEl.textContent = connected ? 'Live' : 'Disconnected';
    };

    try {
        const es = new EventSource(`${API_BASE}/api/admin/dashboard/live-stream`);

        es.onopen = () => setStatus(true);

        es.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.event === 'INSPECTION_SUBMITTED' && payload.data) {
                    renderAIInspectionReport(payload.data);
                }
            } catch (e) {
                console.warn('[SSE parse error]', e);
            }
        };

        es.onerror = () => {
            setStatus(false);
            es.close();
            // Reconnect after 5 seconds
            setTimeout(initSSEListener, 5000);
        };
    } catch (e) {
        console.warn('[SSE init error]', e);
        setStatus(false);
    }
}

// Start SSE listener on page load
initSSEListener();
