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
        { id: 'BNG-MJ', name: 'Majestic Hub', hub: 'Majestic' },
        { id: 'BNG-YP', name: 'Yeshwantpur Hub', hub: 'Yeshwantpur' }
    ],
    components: [
        { id: 'TRK-BNG-MJ-001', type: 'ERC Clip', hub: 'Majestic', location: '12.9234, 77.5021', age_months: 48, loadGMT: 12, rainfallIndex: 0.7, thermalGradient: 0.4, lastInspection: '2024-01-15' },
        { id: 'TRK-BNG-MJ-002', type: 'Fish Plate', hub: 'Majestic', location: '12.9245, 77.5031', age_months: 36, loadGMT: 8, rainfallIndex: 0.5, thermalGradient: 0.3, lastInspection: '2024-02-10' },
        { id: 'TRK-BNG-MJ-003', type: 'Bolt Assembly', hub: 'Majestic', location: '12.9256, 77.5042', age_months: 24, loadGMT: 5, rainfallIndex: 0.3, thermalGradient: 0.2, lastInspection: '2024-03-05' },
        { id: 'TRK-BNG-MJ-004', type: 'Elastic Pad', hub: 'Majestic', location: '12.9267, 77.5053', age_months: 12, loadGMT: 3, rainfallIndex: 0.2, thermalGradient: 0.1, lastInspection: '2024-03-20' },
        { id: 'TRK-BNG-YP-001', type: 'Rail Joint', hub: 'Yeshwantpur', location: '13.0015, 77.6234', age_months: 60, loadGMT: 10, rainfallIndex: 0.6, thermalGradient: 0.5, lastInspection: '2024-01-10' },
        { id: 'TRK-BNG-YP-002', type: 'Clip Fastener', hub: 'Yeshwantpur', location: '13.0026, 77.6245', age_months: 54, loadGMT: 9, rainfallIndex: 0.5, thermalGradient: 0.4, lastInspection: '2024-02-15' },
        { id: 'TRK-BNG-YP-003', type: 'Ballast Stone', hub: 'Yeshwantpur', location: '13.0037, 77.6256', age_months: 30, loadGMT: 4, rainfallIndex: 0.3, thermalGradient: 0.2, lastInspection: '2024-03-12' },
        { id: 'TRK-BNG-YP-004', type: 'Sleeper', hub: 'Yeshwantpur', location: '13.0048, 77.6267', age_months: 18, loadGMT: 2, rainfallIndex: 0.1, thermalGradient: 0.1, lastInspection: '2024-03-25' }
    ],
    engineers: [
        { id: 'EMP-001', name: 'Raj Kumar', hub: 'Majestic', status: 'available' },
        { id: 'EMP-002', name: 'Priya Singh', hub: 'Majestic', status: 'on-inspection' },
        { id: 'EMP-003', name: 'Ahmed Hassan', hub: 'Yeshwantpur', status: 'available' }
    ]
};

// Calculate CII for all components on load
mockData.components.forEach(comp => {
    comp.cii = calculateCII(comp.age_months, comp.loadGMT, comp.rainfallIndex, comp.thermalGradient);
    comp.status = getCIIStatus(comp.cii);
});

// ============ GET CURRENT USER ROLE ============
function getCurrentUserRole() {
    return getUserRole();
}

// ============ INITIALIZE DASHBOARD ============
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();

    const role = getCurrentUserRole();

    if (role === 'controller') {
        renderControllerView();
        document.getElementById('controllerView').classList.add('active');
    } else if (role === 'supervisor') {
        renderSupervisorView();
        document.getElementById('supervisorView').classList.add('active');
    } else if (role === 'engineer') {
        renderEngineerView();
        document.getElementById('engineerView').classList.add('active');
    }

    setupEventListeners();
});

// ============ USER INFO ============
function loadUserInfo() {
    document.getElementById('userName').textContent = getUserName();
    document.getElementById('userRole').textContent = getRoleDisplayName(getUserRole());
    document.getElementById('userHub').textContent = getUserHub();
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
        const node = document.createElement('div');
        node.className = `component-node ${comp.status}`;
        node.innerHTML = `
            <div>${comp.id}</div>
            <div class="component-node-label">CII: ${comp.cii} | ${comp.type}</div>
        `;
        node.onclick = () => showComponentDetails(comp);
        riskMap.appendChild(node);
    });
}

function renderMetrics() {
    const critical = mockData.components.filter(c => c.status === 'critical').length;
    const high = mockData.components.filter(c => c.status === 'high').length;
    const moderate = mockData.components.filter(c => c.status === 'moderate').length;
    const nominal = mockData.components.filter(c => c.status === 'nominal').length;

    document.getElementById('metricCritical').textContent = critical;
    document.getElementById('metricHigh').textContent = high;
    document.getElementById('metricModerate').textContent = moderate;
    document.getElementById('metricNominal').textContent = nominal;
}

function renderComponentList() {
    const list = document.getElementById('componentList');
    list.innerHTML = '';

    mockData.components.forEach(comp => {
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
        item.onclick = () => showComponentDetails(comp);
        list.appendChild(item);
    });
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
function renderSupervisorView() {
    renderPendingTasks();
    renderEngineerList();
    renderActiveAssignments();
}

function renderPendingTasks() {
    const taskList = document.getElementById('pendingTasks');
    taskList.innerHTML = '';

    const criticalComponents = mockData.components.filter(c => c.status === 'critical' || c.status === 'high');

    criticalComponents.forEach(comp => {
        const task = document.createElement('div');
        task.className = 'task-item';
        const priorityMap = { 'critical': 'Critical', 'high': 'High' };
        task.innerHTML = `
            <strong>${comp.id}</strong>
            <div>${comp.type} | CII: ${comp.cii}</div>
            <div class="task-priority ${comp.status}">${priorityMap[comp.status]} Priority</div>
        `;
        taskList.appendChild(task);
    });
}

function renderEngineerList() {
    const engineerList = document.getElementById('engineerList');
    engineerList.innerHTML = '';

    mockData.engineers.forEach(eng => {
        const item = document.createElement('div');
        item.className = 'engineer-item';
        item.innerHTML = `
            <strong>${eng.name}</strong>
            <div>${eng.id}</div>
            <div style="color: ${eng.status === 'available' ? '#16a34a' : '#dc2626'}; margin-top: 5px;">
                ${eng.status === 'available' ? 'Available' : 'On Inspection'}
            </div>
        `;
        engineerList.appendChild(item);
    });
}

function renderActiveAssignments() {
    const assignments = document.getElementById('activeAssignments');
    assignments.innerHTML = '';

    const mockAssignments = [
        { component: 'TRK-BNG-MJ-001', engineer: 'Raj Kumar', deadline: '2024-04-10', status: 'In Progress' },
        { component: 'TRK-BNG-YP-001', engineer: 'Ahmed Hassan', deadline: '2024-04-12', status: 'Pending' }
    ];

    mockAssignments.forEach(assign => {
        const row = document.createElement('div');
        row.className = 'assignment-row';
        row.innerHTML = `
            <div class="assignment-field"><strong>Component</strong>${assign.component}</div>
            <div class="assignment-field"><strong>Engineer</strong>${assign.engineer}</div>
            <div class="assignment-field"><strong>Deadline</strong>${assign.deadline}</div>
            <div class="assignment-field"><strong>Status</strong>${assign.status}</div>
        `;
        assignments.appendChild(row);
    });
}

function assignEngineer() {
    openModal('assignModal');
}

// ============ ENGINEER VIEW ============
function renderEngineerView() {
    const assignedComponent = mockData.components[0];
    renderComponentDetail(assignedComponent);
    renderAIAnalysis();
}

function renderComponentDetail(comp) {
    const detail = document.getElementById('componentDetail');
    detail.innerHTML = `
        <div class="component-detail-row">
            <div><strong>Component ID</strong><span>${comp.id}</span></div>
            <div><strong>Type</strong><span>${comp.type}</span></div>
        </div>
        <div class="component-detail-row">
            <div><strong>Location</strong><span>${comp.location}</span></div>
            <div><strong>Age (months)</strong><span>${comp.age_months}</span></div>
        </div>
        <div class="component-detail-row">
            <div><strong>Current CII Score</strong><span style="color: ${getCIIColor(comp.cii)}">${comp.cii} (${getCIIStatusLabel(comp.cii)})</span></div>
            <div><strong>Status</strong><span style="text-transform: uppercase">${comp.status}</span></div>
        </div>
        <div class="component-detail-row">
            <div><strong>Last Inspection</strong><span>${comp.lastInspection}</span></div>
            <div><strong>Hub</strong><span>${comp.hub}</span></div>
        </div>
        <div class="component-detail-row">
            <div><strong>Load Stress (GMT)</strong><span>${comp.loadGMT}</span></div>
            <div><strong>Rainfall Index</strong><span>${comp.rainfallIndex}</span></div>
        </div>
        <div class="component-detail-row">
            <div><strong>Thermal Gradient</strong><span>${comp.thermalGradient}</span></div>
            <div><strong>CII Formula</strong><span style="font-size: 0.85em;">100 - (Age_Factor + Load*1.5 + Weather*2.0)</span></div>
        </div>
    `;
}

function renderAIAnalysis() {
    const analysis = document.getElementById('aiAnalysis');
    analysis.innerHTML = '<p style="color: #999;">Upload a photo to trigger Gemini AI analysis</p>';
    document.getElementById('truthCheckSection').style.display = 'none';
}

// ============ AI PROCESSING SIMULATION ============
function simulateAIProcessing(imageSrc) {
    if (isOffline) {
        showNotification('AI analysis unavailable in Offline mode. Go online to use Gemini.', 'error');
        return;
    }

    const aiAnalysis = document.getElementById('aiAnalysis');
    const truthCheck = document.getElementById('truthCheckSection');

    const steps = [
        'Uploading image to Gemini API...',
        'Extracting visual features...',
        'Analyzing structural patterns...',
        'Comparing with historical baseline...',
        'Calculating Rate of Decay...',
        'Reasoning with Gemini...',
        'Generating certification report...'
    ];

    // Show processing animation
    aiAnalysis.innerHTML = `
        <div class="ai-processing">
            <div class="scan-line"></div>
            <div style="margin-bottom: 15px;">
                <img src="${imageSrc}" alt="Analyzing..." style="max-width: 100%; border-radius: 6px; max-height: 150px; opacity: 0.6;">
            </div>
            <div class="status-text" id="aiStatusText">Initializing Gemini API...</div>
        </div>
    `;

    let stepIndex = 0;
    const stepInterval = setInterval(() => {
        if (stepIndex < steps.length) {
            const statusText = document.getElementById('aiStatusText');
            if (statusText) {
                statusText.textContent = steps[stepIndex];
            }
            stepIndex++;
        } else {
            clearInterval(stepInterval);
            // Show final AI result
            showAIResult(imageSrc);
        }
    }, 600);
}

function showAIResult(imageSrc) {
    const aiAnalysis = document.getElementById('aiAnalysis');
    const truthCheck = document.getElementById('truthCheckSection');

    // Simulate: randomly decide if critical or nominal
    const isCritical = Math.random() > 0.4;

    if (isCritical) {
        const overrideCII = Math.floor(Math.random() * 15) + 15; // 15-29
        aiAnalysis.innerHTML = `
            <div style="margin-bottom: 15px;">
                <img src="${imageSrc}" alt="Inspection Photo" style="max-width: 100%; border-radius: 6px; max-height: 200px;">
            </div>
            <div class="ai-result critical">
                <strong>Critical Issue Detected</strong>
                Gemini AI detected a longitudinal crack (12cm) on the rail surface. CII Score override: ${overrideCII} (CRITICAL)
            </div>
            <div class="ai-result">
                <strong>Temporal Delta Analysis:</strong>
                Rate of decay has increased 340% compared to last inspection cycle. Structural integrity compromised.
            </div>
            <div class="ai-result critical">
                <strong>Critical Override Applied:</strong>
                Gemini visual detection overrides mathematical CII prediction. Component flagged for emergency dispatch.
            </div>
            <div class="ai-result">
                <strong>Recommended Action:</strong>
                Immediate track inspection. Temporary Speed Restriction (TSR) recommended. Repair/Replace within 24 hours.
            </div>
            <button class="btn-primary" onclick="syncToCloud()" style="margin-top: 10px; width: 100%;">Sync Certified Report to Cloud</button>
        `;
    } else {
        aiAnalysis.innerHTML = `
            <div style="margin-bottom: 15px;">
                <img src="${imageSrc}" alt="Inspection Photo" style="max-width: 100%; border-radius: 6px; max-height: 200px;">
            </div>
            <div class="ai-result">
                <strong>AI Analysis Complete</strong>
                No critical structural defects detected. Minor surface rust observed within acceptable parameters.
            </div>
            <div class="ai-result">
                <strong>Temporal Delta Analysis:</strong>
                Rate of decay is within normal range (12% increase since last inspection). No acceleration in degradation.
            </div>
            <div class="ai-result">
                <strong>Gemini Recommendation:</strong>
                Maintain current monitoring schedule. No immediate replacement needed. Log for preventative care.
            </div>
            <button class="btn-primary" onclick="syncToCloud()" style="margin-top: 10px; width: 100%;">Sync Certified Report to Cloud</button>
        `;
    }

    truthCheck.style.display = 'block';
    showNotification('Photo analyzed by Gemini AI');
}

// ============ TRUTH CHECK (HUMAN-IN-THE-LOOP) ============
function triggerTruthCheck() {
    const aiAnalysis = document.getElementById('aiAnalysis');
    const truthCheck = document.getElementById('truthCheckSection');

    aiAnalysis.innerHTML += `
        <div class="ai-result critical" style="margin-top: 15px;">
            <strong>Calibration Event Logged</strong>
            Field engineer has disagreed with the AI assessment. This event has been recorded for model calibration review. Manual inspection takes precedence.
        </div>
    `;
    truthCheck.style.display = 'none';
    showNotification('Calibration Event logged. Manual assessment takes precedence.');
}

// ============ MODAL FUNCTIONS ============
function dispatchAlert() {
    openModal('dispatchModal');
}

function submitDispatch() {
    closeModal('dispatchModal');
    showNotification('Alert dispatched to Hub Supervisor!');
}

function submitAssignment() {
    closeModal('assignModal');
    showNotification('Task assigned to Engineer!');
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
    showNotification('Analytics dashboard opening...');
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
