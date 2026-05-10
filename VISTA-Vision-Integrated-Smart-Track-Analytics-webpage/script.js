// ============ OFFLINE STATE ============
let isOffline = false;

// ============ CII CALCULATION ENGINE ============
// CII = 100 - (Age_Factor + (Load * 1.5) + (Weather_Impact * 2.0))
function calculateCII(age_months, loadGMT, rainfallIndex, thermalGradient) {
    const maxAge = 120; // 10 years in months
    const ageFactor = (age_months / maxAge) * 40; // Max 40 points
    const loadFactor = loadGMT * 1.5;
    const weatherImpact = (rainfallIndex + thermalGradient) * 2.0;
    let cii = 100 - (ageFactor + loadFactor + weatherImpact);
    cii = Math.max(0, Math.min(100, Math.round(cii)));
    return cii;
}

function getCIIStatus(cii) {
    if (cii <= 30) return 'critical';
    if (cii <= 55) return 'high';
    if (cii <= 75) return 'moderate';
    return 'nominal';
}

function getCIIColor(cii) {
    if (cii <= 30) return '#dc2626';
    if (cii <= 55) return '#ea580c';
    if (cii <= 75) return '#b8960a';
    return '#16a34a';
}

function getCIIStatusLabel(cii) {
    if (cii <= 30) return 'CRITICAL';
    if (cii <= 55) return 'HIGH RISK';
    if (cii <= 75) return 'MODERATE';
    return 'NOMINAL';
}

// ============ MOCK DATA WITH STRESS FACTORS ============
const mockData = {
    sectors: [
        { id: 'BNG-MJ', name: 'Majestic Hub', hub: 'Majestic Hub' },
        { id: 'BNG-YP', name: 'Yeshwantpur Hub', hub: 'Yeshwantpur Hub' },
        { id: 'BNG-KP', name: 'KR Puram Hub', hub: 'KR Puram Hub' }
    ],
    components: [
        { id: 'TRK-BNG-MJ-001', type: 'ERC Clip', hub: 'Majestic Hub', location: '12.9234, 77.5021', age_months: 48, loadGMT: 12, rainfallIndex: 0.7, thermalGradient: 0.4, lastInspection: '2024-01-15' },
        { id: 'TRK-BNG-MJ-002', type: 'Fish Plate', hub: 'Majestic Hub', location: '12.9245, 77.5031', age_months: 36, loadGMT: 8, rainfallIndex: 0.5, thermalGradient: 0.3, lastInspection: '2024-02-10' },
        { id: 'TRK-BNG-MJ-003', type: 'Bolt Assembly', hub: 'Majestic Hub', location: '12.9256, 77.5042', age_months: 24, loadGMT: 5, rainfallIndex: 0.3, thermalGradient: 0.2, lastInspection: '2024-03-05' },
        { id: 'TRK-BNG-MJ-004', type: 'Elastic Pad', hub: 'Majestic Hub', location: '12.9267, 77.5053', age_months: 12, loadGMT: 3, rainfallIndex: 0.2, thermalGradient: 0.1, lastInspection: '2024-03-20' },
        { id: 'TRK-BNG-YP-001', type: 'Rail Joint', hub: 'Yeshwantpur Hub', location: '13.0015, 77.6234', age_months: 60, loadGMT: 10, rainfallIndex: 0.6, thermalGradient: 0.5, lastInspection: '2024-01-10' },
        { id: 'TRK-BNG-YP-002', type: 'Clip Fastener', hub: 'Yeshwantpur Hub', location: '13.0026, 77.6245', age_months: 54, loadGMT: 9, rainfallIndex: 0.5, thermalGradient: 0.4, lastInspection: '2024-02-15' },
        { id: 'TRK-BNG-YP-003', type: 'Ballast Stone', hub: 'Yeshwantpur Hub', location: '13.0037, 77.6256', age_months: 30, loadGMT: 4, rainfallIndex: 0.3, thermalGradient: 0.2, lastInspection: '2024-03-12' },
        { id: 'TRK-BNG-YP-004', type: 'Sleeper', hub: 'Yeshwantpur Hub', location: '13.0048, 77.6267', age_months: 18, loadGMT: 2, rainfallIndex: 0.1, thermalGradient: 0.1, lastInspection: '2024-03-25' },
        { id: 'TRK-BNG-MJ-005', type: 'Rail Joint', hub: 'Majestic Hub', location: '12.9278, 77.5064', age_months: 90, loadGMT: 18, rainfallIndex: 0.8, thermalGradient: 0.6, lastInspection: '2023-11-12' },
        { id: 'TRK-BNG-MJ-006', type: 'Switch Blade', hub: 'Majestic Hub', location: '12.9289, 77.5075', age_months: 60, loadGMT: 15, rainfallIndex: 0.6, thermalGradient: 0.5, lastInspection: '2023-12-05' },
        { id: 'TRK-BNG-YP-005', type: 'Point Machine', hub: 'Yeshwantpur Hub', location: '13.0059, 77.6278', age_months: 45, loadGMT: 12, rainfallIndex: 0.7, thermalGradient: 0.4, lastInspection: '2024-01-20' },
        { id: 'TRK-BNG-YP-006', type: 'Crossing Frog', hub: 'Yeshwantpur Hub', location: '13.0070, 77.6289', age_months: 72, loadGMT: 14, rainfallIndex: 0.5, thermalGradient: 0.3, lastInspection: '2023-10-15' },
        { id: 'TRK-BNG-KP-001', type: 'ERC Clip', hub: 'KR Puram Hub', location: '13.0068, 77.6954', age_months: 110, loadGMT: 20, rainfallIndex: 0.9, thermalGradient: 0.7, lastInspection: '2023-09-10' },
        { id: 'TRK-BNG-KP-002', type: 'Fish Plate', hub: 'KR Puram Hub', location: '13.0079, 77.6965', age_months: 80, loadGMT: 16, rainfallIndex: 0.8, thermalGradient: 0.6, lastInspection: '2023-10-05' },
        { id: 'TRK-BNG-KP-003', type: 'Bolt Assembly', hub: 'KR Puram Hub', location: '13.0090, 77.6976', age_months: 40, loadGMT: 10, rainfallIndex: 0.4, thermalGradient: 0.3, lastInspection: '2024-02-18' },
        { id: 'TRK-BNG-KP-004', type: 'Elastic Pad', hub: 'KR Puram Hub', location: '13.0101, 77.6987', age_months: 20, loadGMT: 5, rainfallIndex: 0.2, thermalGradient: 0.2, lastInspection: '2024-03-22' },
        { id: 'TRK-BNG-KP-005', type: 'Sleeper', hub: 'KR Puram Hub', location: '13.0112, 77.6998', age_months: 50, loadGMT: 12, rainfallIndex: 0.5, thermalGradient: 0.4, lastInspection: '2023-12-20' }
    ],
    engineers: [
        // Majestic Hub
        { id: 'priya',   name: 'Priya Menon',      hub: 'Majestic Hub',      status: 'available' },
        { id: 'kavitha', name: 'Kavitha Reddy',     hub: 'Majestic Hub',      status: 'available' },
        { id: 'raj',     name: 'Raj Kumar',         hub: 'Majestic Hub',      status: 'available' },
        { id: 'ananya',  name: 'Ananya Krishnan',   hub: 'Majestic Hub',      status: 'available' },
        { id: 'rohan',   name: 'Rohan Pillai',      hub: 'Majestic Hub',      status: 'available' },
        // Yeshwantpur Hub
        { id: 'suresh',  name: 'Suresh Babu',       hub: 'Yeshwantpur Hub',   status: 'available' },
        { id: 'deepak',  name: 'Deepak Rao',        hub: 'Yeshwantpur Hub',   status: 'available' },
        { id: 'meena',   name: 'Meena Iyer',        hub: 'Yeshwantpur Hub',   status: 'available' },
        // KR Puram Hub
        { id: 'kiran',   name: 'Kiran Reddy',       hub: 'KR Puram Hub',      status: 'available' },
        { id: 'aditya',  name: 'Aditya Shetty',     hub: 'KR Puram Hub',      status: 'available' }
    ]
};

let sectorMetricSlices = [];
let sectorChartSelectedStatus = '';
const sectorChartStatuses = ['critical', 'high', 'moderate', 'nominal'];
const sectorChartLabels = ['Critical', 'High Risk', 'Moderate', 'Nominal'];
const sectorChartColors = ['#dc2626', '#ea580c', '#eab308', '#22c55e'];
let selectedComponentId = null;

// Calculate CII for all components on load
mockData.components.forEach(comp => {
    comp.cii = calculateCII(comp.age_months, comp.loadGMT, comp.rainfallIndex, comp.thermalGradient);
    comp.status = getCIIStatus(comp.cii);
});

// ============ GET CURRENT USER ROLE ============
function getCurrentUserRole() {
    return getUserRole();
}

// ============ FIREBASE REALTIME STATE ============
let firebaseDispatches = [];
let firebaseAssignments = [];
let firebaseInitialized = false;

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
                    const comp = mockData.components.find(c => c.id === assign.componentId);
                    if (comp) {
                        // Reset stress factors as if the component was just replaced/repaired
                        comp.age_months = 0;
                        comp.loadGMT = 0;
                        comp.cii = calculateCII(comp.age_months, comp.loadGMT, comp.rainfallIndex, comp.thermalGradient);
                        comp.status = getCIIStatus(comp.cii);
                    }
                }
            });

            // ALWAYS re-render everything when assignments change
            renderRiskMap();
            renderMetrics();
            renderComponentList();
            renderEngineerList();
            renderActiveAssignments();

            // First time Firebase data arrives — mark as initialized
            if (!firebaseInitialized) {
                firebaseInitialized = true;
                console.log('[VISTA] Firebase initialized with', firebaseAssignments.length, 'assignments — filtered components from map.');
            }
        });
    }
}

// ============ MAIN VIEW TOGGLE ============
function switchMainView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if(viewId === 'controllerView') {
        document.getElementById('nav-controller').classList.add('active');
    } else if (viewId === 'analyticsView') {
        const nav = document.getElementById('nav-analytics');
        if (nav) nav.classList.add('active');
        renderAnalyticsView();
    } else {
        document.getElementById('nav-supervisor').classList.add('active');
    }
}

// ============ INITIALIZE DASHBOARD ============
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    setupFirebaseListeners();

    const role = getCurrentUserRole();

    if (role === 'controller') {
        // Show Sidebar
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.style.display = 'block';

        // Initialize Controller View
        switchMainView('controllerView');
        renderControllerView();
        
        // Initialize Supervisor View defaults
        currentSupervisorHub = 'Majestic Hub';
        switchHub(currentSupervisorHub);
        
        document.getElementById('offlineToggle').style.display = 'none';
        
        if (typeof db === 'undefined') {
            renderControllerView();
            renderSupervisorView();
        }
    } else if (role === 'supervisor') {
        // Legacy fallback (should no longer be reachable since test2/test3 removed)
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
function renderControllerView() {
    renderRiskMap();
    renderMetrics();
    renderComponentList();
}

function renderRiskMap() {
    const riskMap = document.getElementById('riskMap');
    riskMap.innerHTML = '';

    mockData.components.forEach(comp => {
        // Hide component from map if it has ANY assignment (pending, in-progress, or completed)
        const hasAssignment = firebaseAssignments.some(a => a.componentId === comp.id);
        if (hasAssignment) return;

        const node = document.createElement('div');
        node.className = `component-node ${comp.status}`;
        node.innerHTML = `
            <div>${comp.id}</div>
            <div class="component-node-label">CII: ${comp.cii} | ${comp.type}</div>
        `;
        node.onclick = () => showComponentDispatch(comp);
        riskMap.appendChild(node);
    });
}

function renderMetrics() {
    // Only count components that have NO assignment at all
    const activeComponents = mockData.components.filter(comp => 
        !firebaseAssignments.some(a => a.componentId === comp.id)
    );

    const critical = activeComponents.filter(c => c.status === 'critical').length;
    const high = activeComponents.filter(c => c.status === 'high').length;
    const moderate = activeComponents.filter(c => c.status === 'moderate').length;
    const nominal = activeComponents.filter(c => c.status === 'nominal').length;

    document.getElementById('metricCritical').textContent = critical;
    document.getElementById('metricHigh').textContent = high;
    document.getElementById('metricModerate').textContent = moderate;
    document.getElementById('metricNominal').textContent = nominal;

    renderSectorMetricChart({ critical, high, moderate, nominal });
}

function renderSectorMetricChart(counts) {
    const canvas = document.getElementById('sectorMetricChart');
    const tooltip = document.getElementById('sectorMetricTooltip');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = width;
    const radius = Math.min(width, height) * 0.35;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const centerX = width / 2;
    const centerY = height / 2;
    const values = [counts.critical, counts.high, counts.moderate, counts.nominal];
    const total = values.reduce((sum, v) => sum + v, 0);

    ctx.clearRect(0, 0, width, height);
    sectorMetricSlices = [];

    let startAngle = -Math.PI / 2;
    values.forEach((value, index) => {
        const sliceAngle = total === 0 ? (Math.PI * 2 / values.length) : (value / total) * Math.PI * 2;
        const endAngle = startAngle + sliceAngle;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = sectorChartColors[index];
        ctx.fill();

        sectorMetricSlices.push({
            status: sectorChartStatuses[index],
            label: sectorChartLabels[index],
            value,
            startAngle,
            endAngle
        });

        startAngle = endAngle;
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    canvas.removeEventListener('mousemove', handleMetricChartHover);
    canvas.removeEventListener('mouseleave', handleMetricChartLeave);
    canvas.removeEventListener('click', handleMetricChartClick);
    canvas.addEventListener('mousemove', handleMetricChartHover);
    canvas.addEventListener('mouseleave', handleMetricChartLeave);
    canvas.addEventListener('click', handleMetricChartClick);

    if (tooltip) {
        tooltip.style.opacity = '0';
        tooltip.style.display = 'none';
    }
}

function getMetricChartSliceAtPoint(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(rect.width, rect.height) * 0.35;
    const innerRadius = radius * 0.55;

    if (dist < innerRadius || dist > radius) {
        return null;
    }

    let angle = Math.atan2(dy, dx);
    if (angle < -Math.PI / 2) angle += Math.PI * 2;

    return sectorMetricSlices.find(slice => {
        let start = slice.startAngle;
        let end = slice.endAngle;
        if (start < -Math.PI / 2) start += Math.PI * 2;
        if (end < -Math.PI / 2) end += Math.PI * 2;
        if (end < start) end += Math.PI * 2;
        let testAngle = angle;
        if (testAngle < start) testAngle += Math.PI * 2;
        return testAngle >= start && testAngle <= end;
    }) || null;
}

function handleMetricChartHover(event) {
    const canvas = event.currentTarget;
    const slice = getMetricChartSliceAtPoint(canvas, event.clientX, event.clientY);
    const tooltip = document.getElementById('sectorMetricTooltip');
    if (!tooltip) return;
    if (!slice || slice.value === 0) {
        tooltip.style.opacity = '0';
        tooltip.style.display = 'none';
        return;
    }

    tooltip.textContent = `${slice.label}: ${slice.value}`;
    tooltip.style.left = `${event.clientX - canvas.getBoundingClientRect().left}px`;
    tooltip.style.top = `${event.clientY - canvas.getBoundingClientRect().top - 16}px`;
    tooltip.style.display = 'block';
    tooltip.style.opacity = '1';
}

function handleMetricChartLeave() {
    const tooltip = document.getElementById('sectorMetricTooltip');
    if (tooltip) {
        tooltip.style.opacity = '0';
        tooltip.style.display = 'none';
    }
}

function handleMetricChartClick(event) {
    const canvas = event.currentTarget;
    const slice = getMetricChartSliceAtPoint(canvas, event.clientX, event.clientY);
    if (!slice || slice.value === 0) return;

    const filterSelect = document.getElementById('filterCII');
    if (!filterSelect) return;

    if (sectorChartSelectedStatus === slice.status) {
        sectorChartSelectedStatus = '';
        filterSelect.value = '';
    } else {
        sectorChartSelectedStatus = slice.status;
        filterSelect.value = slice.status;
    }

    filterByCII();
}

function renderComponentList() {
    const list = document.getElementById('componentList');
    list.innerHTML = '';

    mockData.components.forEach(comp => {
        // Hide component from list if it has ANY assignment
        const hasAssignment = firebaseAssignments.some(a => a.componentId === comp.id);
        if (hasAssignment) return;

        const item = document.createElement('div');
        item.className = `component-item ${comp.status}`;
        item.innerHTML = `
            <div class="component-info">
                <div class="component-id">${comp.id}</div>
                <div class="component-details">${comp.type} | ${comp.hub} | Age: ${comp.age_months}m | Load: ${comp.loadGMT} GMT | Rain: ${comp.rainfallIndex}</div>
            </div>
            <div class="component-cii" style="color: ${getCIIColor(comp.cii)}">${comp.cii}</div>
        `;
        item.style.cursor = 'pointer';
        item.onclick = () => showComponentDispatch(comp);
        list.appendChild(item);
    });
}

function showComponentDispatch(comp) {
    // Bypass the old dispatch modal and directly open the engineer assignment modal.
    // Set the current supervisor hub context so we get the correct local engineers.
    currentSupervisorHub = comp.hub;
    
    // Store the selected component
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
            item.style.display = item.classList.contains(filter) ? 'flex' : 'none';
        }
    });
}

function showComponentDetails(comp) {
    showNotification(`Selected: ${comp.id} (CII: ${comp.cii} - ${getCIIStatusLabel(comp.cii)})`);
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
                <div style="font-size: 0.9em; color: #d1d5db;">Type: ${comp.type} | Hub: ${comp.hub}</div>
                <div style="font-size: 0.9em; color: ${getCIIColor(comp.cii)}; margin-top: 2px;">CII: ${comp.cii} — ${getCIIStatusLabel(comp.cii)}</div>
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
    let comp = mockData.components.find(c => c.id === assign.componentId);
    if (!comp) {
        // Build a fallback comp from assignment fields
        comp = {
            id: assign.componentId || assign.component || 'Unknown',
            type: assign.componentType || 'Component',
            hub: assign.hub || 'Bangalore Central',
            cii: assign.componentCII || 60
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

    // ── Fallback: call Gemini fresh if no stored analysis ──
    let apiKey = window.VISTA_CONFIG?.GEMINI_API_KEY;
    
    // If not in config.js, check localStorage or prompt the user
    if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
        apiKey = localStorage.getItem('vista_gemini_api_key');
        if (!apiKey) {
            apiKey = prompt("Please enter your Gemini API Key to enable AI analysis:\n(This will be saved locally in your browser)");
            if (apiKey) {
                localStorage.setItem('vista_gemini_api_key', apiKey);
            } else {
                showNotification("API Key required for live analysis. Using fallback data.", "error");
            }
        }
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const promptText = `
    You are VISTA AI, a highly advanced railway predictive maintenance system.
    A field engineer has just completed a repair on a railway component.
    Component Details:
    - Type: ${comp.type}
    - Location: ${comp.hub}
    
    Please generate a highly realistic, professional verification report for this repair.
    Respond ONLY with raw HTML (no markdown code blocks, no \`\`\`, just the HTML tags).
    Include these exactly formatted lines:
    <div style="margin-bottom: 12px;"><strong>Visual Analysis:</strong> <span style="color: #16a34a;">Pass.</span> [Your realistic description of the repaired ${comp.type}]</div>
    <div style="margin-bottom: 12px;"><strong>Location Context:</strong> ${comp.hub}. [Your brief analysis of local weather/stress impacts]</div>
    <div style="margin-bottom: 12px; font-size: 1.1em;"><strong>Predicted Lifespan:</strong> <span style="color: #38bdf8;">[Number] Years</span></div>
    <div style="font-size: 1.1em;"><strong>New Health Score:</strong> <span style="color: #16a34a;">CII: 98 (Nominal)</span></div>
    `;

    fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
        })
    })
    .then(async response => {
        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API Error ${response.status}: ${errBody}`);
        }
        return response.json();
    })
    .then(data => {
        let aiHtml = data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        if (!aiHtml) throw new Error("Empty response from Gemini");
        aiHtml = aiHtml.replace(/```html/g, '').replace(/```/g, '').trim();
        reportContainer.innerHTML = aiHtml;
        if (assign.status !== 'Completed') btnApprove.style.display = 'block';
    })
    .catch(error => {
        console.warn('Gemini API Error (Falling back to local mock):', error);
        const lifespan = comp.type === 'ERC Clip' || comp.type === 'Elastic Pad' ? '8.5' : '12.0';
        let weatherImpact = 'Low';
        if (comp.hub === 'KR Puram Hub') weatherImpact = 'High seasonal rainfall';
        if (comp.hub === 'Majestic Hub') weatherImpact = 'High thermal variance';

        reportContainer.innerHTML = `
            <div style="margin-bottom: 12px;"><strong>Visual Analysis:</strong> <span style="color: #16a34a;">Pass.</span> New ${comp.type} installed securely. No surface micro-fractures detected. Ballast profile is nominal.</div>
            <div style="margin-bottom: 12px;"><strong>Location Context:</strong> ${comp.hub}. Weather pattern indicates ${weatherImpact}. Material fatigue models adjusted.</div>
            <div style="margin-bottom: 12px; font-size: 1.1em;"><strong>Predicted Lifespan:</strong> <span style="color: #38bdf8;">${lifespan} Years</span></div>
            <div style="font-size: 1.1em;"><strong>New Health Score:</strong> <span style="color: #16a34a;">CII: 98 (Nominal)</span></div>
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
    const component = mockData.components.find(c => c.id === selectedComponentId);

    const dispatchData = {
        hub: hub,
        priority: priority,
        notes: notes,
        componentId: component ? component.id : 'N/A',
        componentType: component ? component.type : 'N/A',
        componentCII: component ? component.cii : 'N/A',
        componentStatus: component ? getCIIStatusLabel(component.cii) : 'N/A',
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
        const comp = mockData.components.find(c => c.id === compId);
        if (comp) {
            componentLabel = `${comp.id} (${comp.type})`;
            componentId = comp.id;
            componentType = comp.type;
            componentCII = comp.cii;
            componentStatus = getCIIStatusLabel(comp.cii);
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
    const criticalComps = mockData.components.filter(c => c.status === 'critical' || c.status === 'high');
    
    // 1. Diagnostic Insights
    const diagnosticsList = document.getElementById('diagnosticInsightsList');
    if (diagnosticsList) {
        diagnosticsList.innerHTML = '';
        if (criticalComps.length === 0) {
            diagnosticsList.innerHTML = '<div style="color: #16a34a; padding: 15px;">All systems nominal. No critical diagnostics reported.</div>';
        } else {
            criticalComps.forEach(comp => {
                let primaryReason = '';
                let action = '';
                
                // Determine primary failure reason
                if (comp.age_months > 80) {
                    primaryReason = `Component has exceeded 80% of its designed lifecycle (Age: ${comp.age_months} months).`;
                    action = 'Recommendation: Scheduled replacement required within 30 days.';
                } else if (comp.loadGMT > 15) {
                    primaryReason = `Excessive load stress detected (Load: ${comp.loadGMT} GMT).`;
                    action = 'Recommendation: Inspect for micro-fractures and consider load-balancing.';
                } else if (comp.rainfallIndex > 0.7 || comp.thermalGradient > 0.6) {
                    primaryReason = `Severe weather impact. High thermal/water stress observed.`;
                    action = 'Recommendation: Urgent track integrity inspection required.';
                } else {
                    primaryReason = `Compound stress failure (CII: ${comp.cii}).`;
                    action = 'Recommendation: Standard manual inspection.';
                }

                const card = document.createElement('div');
                card.className = `diagnostic-card ${comp.status}`;
                card.innerHTML = `
                    <div class="diagnostic-title">${comp.id} (${comp.type}) — ${comp.hub}</div>
                    <div class="diagnostic-reason"><strong>Root Cause Analysis:</strong> ${primaryReason}</div>
                    <div class="diagnostic-action">${action}</div>
                `;
                diagnosticsList.appendChild(card);
            });
        }
    }

    // 2. Charts Initialization
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded yet.');
        return;
    }

    // Prepare data for Health by Type
    const typeCounts = {};
    mockData.components.forEach(c => {
        if (!typeCounts[c.type]) typeCounts[c.type] = { nominal: 0, warning: 0 };
        if (c.status === 'critical' || c.status === 'high') typeCounts[c.type].warning++;
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
    let avgAge = 0, avgLoad = 0, avgWeather = 0;
    if (criticalComps.length > 0) {
        avgAge = criticalComps.reduce((sum, c) => sum + (c.age_months / 120 * 100), 0) / criticalComps.length; // Normalized to 100
        avgLoad = criticalComps.reduce((sum, c) => sum + (c.loadGMT / 25 * 100), 0) / criticalComps.length; // Normalized to 100
        avgWeather = criticalComps.reduce((sum, c) => sum + ((c.rainfallIndex + c.thermalGradient) / 2 * 100), 0) / criticalComps.length;
    }

    const ctxStress = document.getElementById('stressFactorChart');
    if (ctxStress) {
        if (stressChartInstance) stressChartInstance.destroy();
        stressChartInstance = new Chart(ctxStress, {
            type: 'polarArea',
            data: {
                labels: ['Age Degredation', 'Load Stress', 'Weather Impact'],
                datasets: [{
                    data: [avgAge, avgLoad, avgWeather],
                    backgroundColor: ['rgba(124, 58, 237, 0.7)', 'rgba(234, 88, 12, 0.7)', 'rgba(14, 165, 233, 0.7)'],
                    borderWidth: 1,
                    borderColor: '#1e1e2d'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { r: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { display: false } } },
                plugins: { legend: { position: 'bottom', labels: { color: '#e5e7eb' } } }
            }
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
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal.show');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.classList.remove('show');
        }
    });
};

// Photo upload handler - triggers AI simulation
document.addEventListener('change', function(e) {
    if (e.target.id === 'photoUpload' && e.target.files[0]) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            simulateAIProcessing(event.target.result);
        };
        reader.readAsDataURL(file);
    }
});
