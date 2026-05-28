// ==========================================================================
// Uppsala Sports Hall Allocator ("Uppsala Hallfördelare") - Core Application
// ==========================================================================

// Default list of prominent Uppsala sports halls
const DEFAULT_HALLS = [
  { id: 'ifu-arena-a', name: 'IFU Arena (Arena A - Gibon)', hours: 40, active: true },
  { id: 'ifu-arena-b', name: 'IFU Arena (Arena B - ICA)', hours: 35, active: true },
  { id: 'ifu-arena-c', name: 'IFU Arena (Arena C)', hours: 30, active: true },
  { id: 'ifu-arena-d', name: 'IFU Arena (Arena D)', hours: 25, active: true },
  { id: 'ifu-arena-e', name: 'IFU Arena (Arena E)', hours: 20, active: true },
  { id: 'fyrishov-a', name: 'Fyrishov (Hall A)', hours: 45, active: true },
  { id: 'fyrishov-b', name: 'Fyrishov (Hall B)', hours: 40, active: true },
  { id: 'fyrishov-c', name: 'Fyrishov (Hall C)', hours: 35, active: true },
  { id: 'fyrishov-d', name: 'Fyrishov (Hall D)', hours: 30, active: true },
  { id: 'fyrishov-e', name: 'Fyrishov (Hall E)', hours: 25, active: true },
  { id: 'fyrishov-f', name: 'Fyrishov (Hall F)', hours: 20, active: true },
  { id: 'rosendalshallen', name: 'Rosendalshallen', hours: 35, active: true },
  { id: 'gamla-uppsala', name: 'Gamla Uppsala Sporthall', hours: 30, active: true },
  { id: 'gottsundahallen', name: 'Gottsundahallen', hours: 30, active: true },
  { id: 'tiundahallen', name: 'Tiundahallen', hours: 25, active: true },
  { id: 'valsatrahallen', name: 'Valsätrahallen', hours: 25, active: true },
  { id: 'allianshallen', name: 'Allianshallen', hours: 40, active: true }
];

// Global Application State
const appState = {
  halls: JSON.parse(JSON.stringify(DEFAULT_HALLS)), // Deep copy defaults
  tiers: [
    { label: 'Liten', limit: 100, hours: 2 },
    { label: 'Mellan', limit: 500, hours: 5 },
    { label: 'Stor', limit: Infinity, hours: 10 }
  ],
  associations: [],
  activeAlgo: 'pure-proportional',
  fileName: '',
  fileSize: '',
  pendingFileName: '',
  pendingFileSize: '',
  lastAllocatedData: []
};

// Raw file data placeholder
let currentFileData = {
  headers: [],
  rows: []
};

// Chart.js instances
let barChartInstance = null;
let scatterChartInstance = null;

// ==========================================================================
// Initialization
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  initHallsList();
  initTiersList();
  initEventListeners();
  updateAllocation(); // Run initial math (will show 0 values)
});

// Populate Halls Configurator
function initHallsList() {
  renderHallsList();
}

// Populate Tier Configurator
function initTiersList() {
  renderTiers();
}

// Register Events
function initEventListeners() {
  // Add custom hall form
  document.getElementById('add-hall-btn').addEventListener('click', handleAddHall);
  
  // Custom hall inputs on Enter key
  document.getElementById('new-hall-name').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddHall();
  });
  document.getElementById('new-hall-hours').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddHall();
  });

  // Algorithm configuration panels toggle
  const algoRadios = document.getElementsByName('allocation-algo');
  algoRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      appState.activeAlgo = e.target.value;
      
      document.getElementById('base-config-panel').classList.add('hidden');
      document.getElementById('tiered-config-panel').classList.add('hidden');
      
      if (appState.activeAlgo === 'base-proportional') {
        document.getElementById('base-config-panel').classList.remove('hidden');
      } else if (appState.activeAlgo === 'tiered') {
        document.getElementById('tiered-config-panel').classList.remove('hidden');
      }
      
      updateAllocation();
    });
  });

  // Base Hours input event
  document.getElementById('base-hours-input').addEventListener('input', () => {
    updateAllocation();
  });

  // Add tier category button
  document.getElementById('add-tier-btn').addEventListener('click', handleAddTier);

  // File Upload Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  dropzone.addEventListener('click', (e) => {
    if (e.target !== fileInput && !e.target.classList.contains('select-file-btn')) {
      fileInput.click();
    }
  });
  
  const selectBtn = dropzone.querySelector('.select-file-btn');
  selectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', handleFileSelect);

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      handleFileSelect();
    }
  });

  // Format Toggle inside Mapper panel
  const formatRadios = document.getElementsByName('data-format');
  formatRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const memberGroup = document.getElementById('mapper-member-count-group');
      if (e.target.value === 'summary-list') {
        memberGroup.classList.remove('hidden');
      } else {
        memberGroup.classList.add('hidden');
      }
    });
  });

  // Apply column mapper button
  document.getElementById('apply-mapping-btn').addEventListener('click', handleApplyMapping);
  
  // Cancel column mapper button
  document.getElementById('cancel-mapping-btn').addEventListener('click', () => {
    document.getElementById('mapper-panel').classList.add('hidden');
    if (appState.associations.length > 0) {
      document.getElementById('results-container').classList.remove('hidden');
      document.getElementById('active-file-indicator').classList.remove('hidden');
    } else {
      document.getElementById('dropzone').classList.remove('hidden');
    }
  });

  // Remove active file button
  document.getElementById('remove-file-btn').addEventListener('click', handleRemoveFile);

  // Tab navigation buttons
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Table Search input filter
  document.getElementById('table-search').addEventListener('input', () => {
    renderTable(appState.lastAllocatedData);
  });

  // Mock Data Button
  document.getElementById('mock-data-btn').addEventListener('click', handleLoadMockData);

  // Export Buttons
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    exportCSV(appState.lastAllocatedData);
  });

  document.getElementById('print-pdf-btn').addEventListener('click', () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' });
    document.querySelector('.main-header').setAttribute('data-date', dateStr);
    window.print();
  });
}

// ==========================================================================
// Hall Configurator Logic
// ==========================================================================
function renderHallsList() {
  const container = document.getElementById('halls-list-container');
  container.innerHTML = '';
  
  appState.halls.forEach(hall => {
    const item = document.createElement('div');
    item.className = `hall-item ${hall.active ? '' : 'inactive'}`;
    item.innerHTML = `
      <label class="hall-label-group">
        <div class="checkbox-custom-wrapper">
          <input type="checkbox" ${hall.active ? 'checked' : ''} data-hall-id="${hall.id}">
          <span class="checkbox-custom"></span>
        </div>
        <span class="hall-name">${hall.name}</span>
      </label>
      <div class="hall-hours-input-wrapper">
        <input type="number" value="${hall.hours}" min="0" max="168" step="0.5" class="form-input" data-hall-id="${hall.id}">
        <span>h</span>
      </div>
      <button class="hall-delete-btn" data-hall-id="${hall.id}" title="Ta bort hall">
        <i data-lucide="trash-2"></i>
      </button>
    `;
    
    // Checkbox toggle event
    const checkbox = item.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', (e) => {
      hall.active = e.target.checked;
      if (hall.active) {
        item.classList.remove('inactive');
      } else {
        item.classList.add('inactive');
      }
      updateAllocation();
    });
    
    // Available hours input change
    const hourInput = item.querySelector('input[type="number"]');
    hourInput.addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val) || val < 0) val = 0;
      hall.hours = val;
      updateAllocation();
    });
    
    // Delete hall button
    const deleteBtn = item.querySelector('.hall-delete-btn');
    deleteBtn.addEventListener('click', () => {
      appState.halls = appState.halls.filter(h => h.id !== hall.id);
      renderHallsList();
      updateAllocation();
    });
    
    container.appendChild(item);
  });
  
  lucide.createIcons();
}

function handleAddHall() {
  const nameInput = document.getElementById('new-hall-name');
  const hoursInput = document.getElementById('new-hall-hours');
  
  const name = nameInput.value.trim();
  let hours = parseFloat(hoursInput.value);
  
  if (!name) {
    alert("Vänligen ange ett namn på sporthallen.");
    return;
  }
  
  if (isNaN(hours) || hours <= 0) {
    hours = 20; // Default fallback hours
  }
  
  const id = 'custom-' + Date.now();
  appState.halls.push({
    id: id,
    name: name,
    hours: hours,
    active: true
  });
  
  nameInput.value = '';
  hoursInput.value = '';
  
  renderHallsList();
  updateAllocation();
}

// ==========================================================================
// Tier (Categories) Configurator Logic
// ==========================================================================
function renderTiers() {
  const container = document.getElementById('tiers-list-container');
  container.innerHTML = '';
  
  appState.tiers.forEach((tier, index) => {
    const div = document.createElement('div');
    div.className = 'tier-item';
    
    const isLast = index === appState.tiers.length - 1;
    
    if (isLast) {
      const prevLimit = index === 0 ? 0 : appState.tiers[index-1].limit;
      div.innerHTML = `
        <span class="tier-input-desc">> ${prevLimit} medl:</span>
        <input type="number" class="tier-hours form-input" value="${tier.hours}" min="0" step="0.5" style="width: 55px">
        <span class="tier-input-desc">timmar</span>
      `;
    } else {
      const prevLimit = index === 0 ? 0 : appState.tiers[index-1].limit;
      div.innerHTML = `
        <span class="tier-input-desc">${prevLimit} - </span>
        <input type="number" class="tier-limit form-input" value="${tier.limit}" min="${prevLimit + 1}" style="width: 60px">
        <span class="tier-input-desc">medl:</span>
        <input type="number" class="tier-hours form-input" value="${tier.hours}" min="0" step="0.5" style="width: 55px">
        <span class="tier-input-desc">timmar</span>
        ${appState.tiers.length > 2 ? `
          <button class="tier-delete-btn" data-index="${index}" title="Ta bort">
            <i data-lucide="x"></i>
          </button>
        ` : ''}
      `;
    }
    
    // Hours value update
    const hoursInput = div.querySelector('.tier-hours');
    hoursInput.addEventListener('change', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val) || val < 0) val = 0;
      tier.hours = val;
      updateAllocation();
    });
    
    // Limit value update
    if (!isLast) {
      const limitInput = div.querySelector('.tier-limit');
      limitInput.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        const prevLimit = index === 0 ? 0 : appState.tiers[index-1].limit;
        if (isNaN(val) || val <= prevLimit) val = prevLimit + 1;
        tier.limit = val;
        
        // Push subsequent limits if they conflict
        for (let i = index + 1; i < appState.tiers.length - 1; i++) {
          if (appState.tiers[i].limit <= appState.tiers[i-1].limit) {
            appState.tiers[i].limit = appState.tiers[i-1].limit + 100;
          }
        }
        renderTiers();
        updateAllocation();
      });
      
      const deleteBtn = div.querySelector('.tier-delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          appState.tiers.splice(index, 1);
          renderTiers();
          updateAllocation();
        });
      }
    }
    
    container.appendChild(div);
  });
  
  lucide.createIcons();
}

function handleAddTier() {
  const len = appState.tiers.length;
  const lastItem = appState.tiers[len - 1];
  const secondLastItem = appState.tiers[len - 2];
  
  const newLimit = secondLastItem ? secondLastItem.limit + 200 : 200;
  const newHours = secondLastItem ? secondLastItem.hours + 2 : 4;
  
  const newTier = {
    label: 'Kategori ' + len,
    limit: newLimit,
    hours: newHours
  };
  
  // Insert before the last tier (which is the Infinity catch-all)
  appState.tiers.splice(len - 1, 0, newTier);
  renderTiers();
  updateAllocation();
}

// ==========================================================================
// Excel/CSV File Reading & Autodetection Logic
// ==========================================================================
function handleFileSelect() {
  const fileInput = document.getElementById('file-input');
  const file = fileInput.files[0];
  if (!file) return;
  
  appState.pendingFileName = file.name;
  appState.pendingFileSize = formatBytes(file.size);
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
      
      if (rawRows.length === 0) {
        alert("Excel/CSV-filen är tom eller oläslig.");
        return;
      }
      
      processRawRows(rawRows);
    } catch (err) {
      console.error(err);
      alert("Kunde inte läsa filen. Se till att det är en korrekt sparad .xlsx, .xls eller .csv-fil.");
    }
  };
  reader.readAsArrayBuffer(file);
}

function processRawRows(rawRows) {
  // Find first row with cells
  let headerIndex = -1;
  for (let i = 0; i < rawRows.length; i++) {
    if (rawRows[i].some(cell => cell !== "")) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    alert("Ingen data hittades i filen.");
    return;
  }
  
  const headers = rawRows[headerIndex].map((h, index) => h ? String(h).trim() : `Kolumn ${index + 1}`);
  const dataRows = rawRows.slice(headerIndex + 1).filter(row => row.some(cell => cell !== ""));
  
  currentFileData = {
    headers: headers,
    rows: dataRows
  };
  
  showColumnMapper(headers);
}

function showColumnMapper(headers) {
  const clubSelect = document.getElementById('map-club-col');
  const membersSelect = document.getElementById('map-members-col');
  
  clubSelect.innerHTML = '';
  membersSelect.innerHTML = '';
  
  headers.forEach((header, index) => {
    const opt1 = document.createElement('option');
    opt1.value = index;
    opt1.textContent = header;
    clubSelect.appendChild(opt1);
    
    const opt2 = document.createElement('option');
    opt2.value = index;
    opt2.textContent = header;
    membersSelect.appendChild(opt2);
  });
  
  // Autodetection keyword match
  let autoClubIdx = -1;
  let autoMembersIdx = -1;
  
  const clubKeywords = ['klubb', 'förening', 'forening', 'association', 'club', 'team', 'namn', 'name', 'organisation'];
  const memberKeywords = ['medlemmar', 'antal', 'members', 'size', 'count', 'antal medlemmar', 'medlemsantal'];
  
  headers.forEach((h, index) => {
    const lowerH = h.toLowerCase();
    if (autoClubIdx === -1 && clubKeywords.some(keyword => lowerH.includes(keyword))) {
      autoClubIdx = index;
    }
    if (autoMembersIdx === -1 && memberKeywords.some(keyword => lowerH.includes(keyword))) {
      autoMembersIdx = index;
    }
  });
  
  if (autoClubIdx !== -1) clubSelect.value = autoClubIdx;
  if (autoMembersIdx !== -1) membersSelect.value = autoMembersIdx;
  
  // Format selection defaults
  const formatRadios = document.getElementsByName('data-format');
  const memberGroup = document.getElementById('mapper-member-count-group');
  
  if (autoClubIdx !== -1 && autoMembersIdx !== -1) {
    formatRadios[1].checked = true; // summary-list
    memberGroup.classList.remove('hidden');
  } else {
    formatRadios[0].checked = true; // raw-list
    memberGroup.classList.add('hidden');
  }
  
  // Transition panels
  document.getElementById('mapper-panel').classList.remove('hidden');
  document.getElementById('dropzone').classList.add('hidden');
  document.getElementById('results-container').classList.add('hidden');
  document.getElementById('active-file-indicator').classList.add('hidden');
}

function handleApplyMapping() {
  const format = document.querySelector('input[name="data-format"]:checked').value;
  const clubIdx = parseInt(document.getElementById('map-club-col').value);
  
  let associationsMap = {};
  
  if (format === 'raw-list') {
    // Count rows per club name
    currentFileData.rows.forEach(row => {
      const clubVal = row[clubIdx];
      if (clubVal) {
        const clubName = String(clubVal).trim();
        if (clubName) {
          associationsMap[clubName] = (associationsMap[clubName] || 0) + 1;
        }
      }
    });
  } else {
    // Read club name and its sum of members
    const membersIdx = parseInt(document.getElementById('map-members-col').value);
    currentFileData.rows.forEach(row => {
      const clubVal = row[clubIdx];
      const membersVal = row[membersIdx];
      if (clubVal) {
        const clubName = String(clubVal).trim();
        if (clubName) {
          let count = parseInt(membersVal);
          if (isNaN(count) || count < 0) count = 0;
          associationsMap[clubName] = (associationsMap[clubName] || 0) + count;
        }
      }
    });
  }
  
  // Map to list
  let assocs = [];
  for (const [name, members] of Object.entries(associationsMap)) {
    assocs.push({ name, members });
  }
  
  // Sort descending
  assocs.sort((a, b) => b.members - a.members);
  
  appState.associations = assocs;
  appState.fileName = appState.pendingFileName;
  appState.fileSize = appState.pendingFileSize;
  
  // Transition panels
  document.getElementById('mapper-panel').classList.add('hidden');
  document.getElementById('active-file-name').textContent = appState.fileName;
  document.getElementById('active-file-size').textContent = `(${appState.fileSize})`;
  document.getElementById('active-file-indicator').classList.remove('hidden');
  document.getElementById('results-container').classList.remove('hidden');
  
  updateAllocation();
}

function handleRemoveFile() {
  appState.associations = [];
  appState.fileName = '';
  appState.fileSize = '';
  
  document.getElementById('file-input').value = '';
  document.getElementById('active-file-indicator').classList.add('hidden');
  document.getElementById('results-container').classList.add('hidden');
  document.getElementById('dropzone').classList.remove('hidden');
  
  updateAllocation();
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ==========================================================================
// Mock Data Logic
// ==========================================================================
function handleLoadMockData() {
  appState.associations = [
    { name: 'Uppsala Basket', members: 850 },
    { name: 'FBC Uppsala (Innebandy)', members: 620 },
    { name: 'Uppsala Handbollsklubb', members: 430 },
    { name: 'IK Sirius', members: 1250 },
    { name: 'Vaksala SK', members: 950 },
    { name: 'Uppsala Innebandyförening', members: 380 },
    { name: 'Gamla Upsala SK (GUSK)', members: 510 },
    { name: 'Upsala IF Friidrott', members: 720 },
    { name: 'Uppsala Gymnastikförening', members: 1100 },
    { name: 'Uppsala Simsällskap', members: 1400 },
    { name: 'Uppsala Judoklubb', members: 180 },
    { name: 'Storvreta IBK', members: 800 },
    { name: 'Danmarks IF', members: 320 },
    { name: 'Uppsala Tennisklubb', members: 450 },
    { name: 'Uppsala Tyngdlyftningsklubb', members: 95 }
  ];
  
  appState.associations.sort((a, b) => b.members - a.members);
  
  appState.fileName = 'uppsala_foreningar_mockdata.xlsx';
  appState.fileSize = 'Test-sammanställning';
  
  document.getElementById('dropzone').classList.add('hidden');
  document.getElementById('mapper-panel').classList.add('hidden');
  
  document.getElementById('active-file-name').textContent = appState.fileName;
  document.getElementById('active-file-size').textContent = `(${appState.fileSize})`;
  document.getElementById('active-file-indicator').classList.remove('hidden');
  document.getElementById('results-container').classList.remove('hidden');
  
  updateAllocation();
}

// ==========================================================================
// Core Hour Allocation Algorithms
// ==========================================================================
function updateAllocation() {
  const totalHoursAvailable = appState.halls
    .filter(h => h.active)
    .reduce((sum, h) => sum + h.hours, 0);
    
  document.getElementById('metric-total-hours').textContent = totalHoursAvailable.toFixed(1);
  
  const totalClubs = appState.associations.length;
  document.getElementById('metric-total-clubs').textContent = totalClubs;
  
  const totalMembers = appState.associations.reduce((sum, a) => sum + a.members, 0);
  document.getElementById('metric-total-members').textContent = totalMembers.toLocaleString('sv-SE');
  
  const rate = totalMembers > 0 ? (totalHoursAvailable / totalMembers) : 0;
  document.getElementById('metric-allocation-rate').textContent = rate.toFixed(4);
  
  // Enable / disable exports depending on data presence
  const hasData = totalClubs > 0;
  document.getElementById('export-csv-btn').disabled = !hasData;
  document.getElementById('print-pdf-btn').disabled = !hasData;
  
  if (!hasData) {
    renderTable([]);
    renderCharts([], totalHoursAvailable);
    renderUtilization(0, totalHoursAvailable);
    appState.lastAllocatedData = [];
    return;
  }
  
  let allocatedData = [];
  let totalAllocatedHours = 0;
  
  const algo = appState.activeAlgo;
  
  // ----------------------------------------------------
  // Model A: Rent proportionell (Pure Proportional)
  // ----------------------------------------------------
  if (algo === 'pure-proportional') {
    appState.associations.forEach(assoc => {
      const share = totalMembers > 0 ? (assoc.members / totalMembers) : 0;
      const hours = totalHoursAvailable * share;
      
      allocatedData.push({
        name: assoc.name,
        members: assoc.members,
        share: share,
        baseHours: 0,
        propHours: hours,
        totalHours: hours
      });
      totalAllocatedHours += hours;
    });
  } 
  
  // ----------------------------------------------------
  // Model B: Bas + Proportionell (Base + Proportional)
  // ----------------------------------------------------
  else if (algo === 'base-proportional') {
    const baseVal = parseFloat(document.getElementById('base-hours-input').value) || 0;
    const requiredBaseHours = totalClubs * baseVal;
    
    if (requiredBaseHours > totalHoursAvailable) {
      // Base hours exceed total available. Scale down base hours and give 0 proportional.
      const scaledBase = baseVal * (totalHoursAvailable / requiredBaseHours);
      
      appState.associations.forEach(assoc => {
        allocatedData.push({
          name: assoc.name,
          members: assoc.members,
          share: totalMembers > 0 ? (assoc.members / totalMembers) : 0,
          baseHours: scaledBase,
          propHours: 0,
          totalHours: scaledBase
        });
      });
      totalAllocatedHours = totalHoursAvailable;
      
      showBaseHoursWarning(`OBS: Totala bas-timmar (${requiredBaseHours.toFixed(1)}h) överskrider tillgängliga timmar (${totalHoursAvailable.toFixed(1)}h). Bas-timmarna har skalats ner till ${scaledBase.toFixed(1)}h per förening.`);
    } else {
      hideBaseHoursWarning();
      const remainingHours = totalHoursAvailable - requiredBaseHours;
      
      appState.associations.forEach(assoc => {
        const share = totalMembers > 0 ? (assoc.members / totalMembers) : 0;
        const propPart = remainingHours * share;
        const total = baseVal + propPart;
        
        allocatedData.push({
          name: assoc.name,
          members: assoc.members,
          share: share,
          baseHours: baseVal,
          propHours: propPart,
          totalHours: total
        });
        totalAllocatedHours += total;
      });
    }
  } 
  
  // ----------------------------------------------------
  // Model C: Medlemskategorier (Tiered / Brackets)
  // ----------------------------------------------------
  else if (algo === 'tiered') {
    let rawTierAllocations = [];
    let sumAssigned = 0;
    
    appState.associations.forEach(assoc => {
      // Find matching bracket
      let assignedHours = 0;
      for (let i = 0; i < appState.tiers.length; i++) {
        const tier = appState.tiers[i];
        const prevLimit = i === 0 ? 0 : appState.tiers[i-1].limit;
        if (assoc.members > prevLimit && assoc.members <= tier.limit) {
          assignedHours = tier.hours;
          break;
        }
      }
      
      rawTierAllocations.push({
        name: assoc.name,
        members: assoc.members,
        share: totalMembers > 0 ? (assoc.members / totalMembers) : 0,
        tierHours: assignedHours
      });
      sumAssigned += assignedHours;
    });
    
    if (sumAssigned > totalHoursAvailable) {
      // Tiers exceed available hours: Scale down proportionally
      const scale = totalHoursAvailable / sumAssigned;
      rawTierAllocations.forEach(item => {
        const scaledHours = item.tierHours * scale;
        allocatedData.push({
          name: item.name,
          members: item.members,
          share: item.share,
          baseHours: 0,
          propHours: 0,
          totalHours: scaledHours
        });
      });
      totalAllocatedHours = totalHoursAvailable;
    } else {
      // Assign exact tier hours, leave the rest unallocated
      rawTierAllocations.forEach(item => {
        allocatedData.push({
          name: item.name,
          members: item.members,
          share: item.share,
          baseHours: 0,
          propHours: 0,
          totalHours: item.tierHours
        });
      });
      totalAllocatedHours = sumAssigned;
    }
  }
  
  // Save to global state for filters
  appState.lastAllocatedData = allocatedData;
  
  // Render views
  renderTable(allocatedData);
  renderCharts(allocatedData, totalHoursAvailable);
  renderUtilization(totalAllocatedHours, totalHoursAvailable);
  
  // Leftover unallocated hours badge toggle
  const leftover = totalHoursAvailable - totalAllocatedHours;
  const unallocatedAlert = document.getElementById('unallocated-hours-alert');
  if (leftover > 0.05 && appState.activeAlgo === 'tiered') {
    unallocatedAlert.classList.remove('hidden');
    document.getElementById('unallocated-hours-text').textContent = `${leftover.toFixed(1)} timmar i buffert (ej utnyttjade)`;
  } else {
    unallocatedAlert.classList.add('hidden');
  }
}

function showBaseHoursWarning(msg) {
  let warningDiv = document.getElementById('base-hours-warning');
  if (!warningDiv) {
    warningDiv = document.createElement('div');
    warningDiv.id = 'base-hours-warning';
    warningDiv.style.color = 'var(--brand-gold)';
    warningDiv.style.fontSize = '0.75rem';
    warningDiv.style.marginTop = '0.5rem';
    warningDiv.style.lineHeight = '1.3';
    document.getElementById('base-config-panel').appendChild(warningDiv);
  }
  warningDiv.textContent = msg;
}

function hideBaseHoursWarning() {
  const warningDiv = document.getElementById('base-hours-warning');
  if (warningDiv) warningDiv.remove();
}

// ==========================================================================
// Views Render Logic (Table, Chart, Utilization)
// ==========================================================================
function renderTable(allocatedData) {
  const tableBody = document.getElementById('allocation-table-body');
  const searchVal = document.getElementById('table-search').value.toLowerCase();
  
  // Toggle columns inside the table header
  const colBases = document.querySelectorAll('.table-col-base');
  const colProps = document.querySelectorAll('.table-col-prop');
  
  if (appState.activeAlgo === 'base-proportional') {
    colBases.forEach(el => el.classList.remove('hidden'));
    colProps.forEach(el => el.classList.remove('hidden'));
  } else {
    colBases.forEach(el => el.classList.add('hidden'));
    colProps.forEach(el => el.classList.add('hidden'));
  }
  
  tableBody.innerHTML = '';
  
  if (allocatedData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="text-align: center; padding: 2rem; color: var(--text-muted);">Inga föreningar inlagda</td></tr>`;
    return;
  }
  
  const filtered = allocatedData.filter(item => item.name.toLowerCase().includes(searchVal));
  
  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center" style="text-align: center; padding: 2rem; color: var(--text-muted);">Inga matchande föreningar hittades</td></tr>`;
    return;
  }
  
  filtered.forEach(item => {
    const row = document.createElement('tr');
    
    const sharePct = (item.share * 100).toFixed(1) + '%';
    const baseHoursCell = appState.activeAlgo === 'base-proportional' ? `<td class="text-right table-col-base">${item.baseHours.toFixed(1)}h</td>` : '';
    const propHoursCell = appState.activeAlgo === 'base-proportional' ? `<td class="text-right table-col-prop">${item.propHours.toFixed(1)}h</td>` : '';
    
    row.innerHTML = `
      <td style="font-weight: 600;">${item.name}</td>
      <td class="text-right">${item.members.toLocaleString('sv-SE')}</td>
      <td class="text-right">${sharePct}</td>
      ${baseHoursCell}
      ${propHoursCell}
      <td class="text-right" style="font-weight: 700; color: var(--brand-gold);">${item.totalHours.toFixed(1)}h</td>
    `;
    tableBody.appendChild(row);
  });
}

function renderCharts(allocatedData, totalHours) {
  const barCanvas = document.getElementById('hours-bar-chart');
  const scatterCanvas = document.getElementById('ratio-scatter-chart');
  
  // Destroy existing instances to avoid rendering overlap bugs
  if (barChartInstance) barChartInstance.destroy();
  if (scatterChartInstance) scatterChartInstance.destroy();
  
  if (allocatedData.length === 0) return;
  
  // ----------------------------------------------------
  // Chart 1: Horizontal Bar Chart of Allocated Hours (Top 12)
  // ----------------------------------------------------
  const sortedByHours = [...allocatedData].sort((a, b) => b.totalHours - a.totalHours);
  const top12 = sortedByHours.slice(0, 12);
  const others = sortedByHours.slice(12);
  
  let barLabels = top12.map(item => item.name);
  let barValues = top12.map(item => parseFloat(item.totalHours.toFixed(1)));
  
  if (others.length > 0) {
    barLabels.push('Övriga föreningar');
    const othersSum = others.reduce((sum, item) => sum + item.totalHours, 0);
    barValues.push(parseFloat(othersSum.toFixed(1)));
  }
  
  // Set Chart.js palette style
  Chart.defaults.color = '#8a99ad';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;
  
  barChartInstance = new Chart(barCanvas, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        label: 'Timmar/vecka',
        data: barValues,
        backgroundColor: 'rgba(15, 76, 129, 0.75)', // Swedish Blue
        borderColor: '#3b82f6',
        borderWidth: 1.5,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(245, 166, 35, 0.85)', // Swedish Gold
        hoverBorderColor: '#f5a623'
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1426',
          titleColor: '#fff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          title: { display: true, text: 'Timmar per vecka' }
        },
        y: {
          grid: { display: false }
        }
      }
    }
  });
  
  // ----------------------------------------------------
  // Chart 2: Scatter plot of Member count (X) vs. Allocated hours (Y)
  // ----------------------------------------------------
  const scatterPoints = allocatedData.map(item => ({
    x: item.members,
    y: parseFloat(item.totalHours.toFixed(1)),
    name: item.name
  }));
  
  scatterChartInstance = new Chart(scatterCanvas, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Föreningar',
        data: scatterPoints,
        backgroundColor: 'rgba(16, 185, 129, 0.7)', // Sports Field Green
        borderColor: '#10b981',
        borderWidth: 1.5,
        pointRadius: 6,
        pointHoverRadius: 8,
        hoverBackgroundColor: '#f5a623',
        hoverBorderColor: '#f5a623'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1426',
          titleColor: '#fff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const pt = context.raw;
              return `${pt.name}: ${pt.x.toLocaleString()} medlemmar, ${pt.y}h/vecka`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          title: { display: true, text: 'Medlemsstorlek (antal)' }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          title: { display: true, text: 'Tilldelade timmar / vecka' }
        }
      }
    }
  });
}

function renderUtilization(allocatedHours, totalHoursAvailable) {
  const percent = totalHoursAvailable > 0 ? Math.min(100, (allocatedHours / totalHoursAvailable) * 100) : 0;
  
  // Update overall progress meter
  const progressRing = document.getElementById('utilization-progress');
  const percentageText = document.getElementById('utilization-percentage');
  const allocatedText = document.getElementById('util-allocated-hours');
  const freeText = document.getElementById('util-free-hours');
  
  percentageText.textContent = `${Math.round(percent)}%`;
  allocatedText.textContent = `${allocatedHours.toFixed(1)}h`;
  
  const leftover = Math.max(0, totalHoursAvailable - allocatedHours);
  freeText.textContent = `${leftover.toFixed(1)}h`;
  
  // Dash offset logic (r=70 => circumference = 439.82)
  const circ = 439.82;
  const dashOffset = circ - (percent / 100) * circ;
  progressRing.style.strokeDashoffset = dashOffset;
  
  // Render list of individual hall load shares (pro-rata assumption for pool representation)
  const listContainer = document.getElementById('halls-util-list');
  listContainer.innerHTML = '';
  
  const activeHalls = appState.halls.filter(h => h.active);
  
  if (activeHalls.length === 0) {
    listContainer.innerHTML = `<p style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem; text-align: center;">Inga aktiva sporthallar</p>`;
    return;
  }
  
  activeHalls.forEach(hall => {
    // Pro-rata estimation of how many hours are loaded on this hall
    const estLoadedHours = totalHoursAvailable > 0 ? (allocatedHours * (hall.hours / totalHoursAvailable)) : 0;
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'util-list-item';
    itemDiv.innerHTML = `
      <div class="util-item-header">
        <span>${hall.name}</span>
        <span>${estLoadedHours.toFixed(1)}h / ${hall.hours.toFixed(1)}h (${Math.round(percent)}%)</span>
      </div>
      <div class="util-item-bar-track">
        <div class="util-item-bar-fill" style="width: ${percent}%"></div>
      </div>
    `;
    listContainer.appendChild(itemDiv);
  });
}

// ==========================================================================
// Excel/CSV Exports
// ==========================================================================
function exportCSV(allocatedData) {
  if (allocatedData.length === 0) return;
  
  let csvLines = [];
  
  // Headers (local format matches Swedish regional Excel defaults)
  let headers = ['Förening', 'Antal medlemmar', 'Medlemsandel (%)', 'Garanterade bastimmar (h)', 'Proportionell tid (h)', 'Totalt tilldelad tid (h/vecka)'];
  if (appState.activeAlgo !== 'base-proportional') {
    headers = ['Förening', 'Antal medlemmar', 'Medlemsandel (%)', 'Totalt tilldelad tid (h/vecka)'];
  }
  csvLines.push(headers.join(';'));
  
  allocatedData.forEach(item => {
    let line = [
      `"${item.name.replace(/"/g, '""')}"`,
      item.members,
      (item.share * 100).toFixed(2).replace('.', ','),
      item.totalHours.toFixed(2).replace('.', ',')
    ];
    
    if (appState.activeAlgo === 'base-proportional') {
      line = [
        `"${item.name.replace(/"/g, '""')}"`,
        item.members,
        (item.share * 100).toFixed(2).replace('.', ','),
        item.baseHours.toFixed(2).replace('.', ','),
        item.propHours.toFixed(2).replace('.', ','),
        item.totalHours.toFixed(2).replace('.', ',')
      ];
    }
    
    csvLines.push(line.join(';'));
  });
  
  // UTF-8 Byte Order Mark (BOM) for proper Swedish characters (å, ä, ö) in MS Excel
  const bom = "\uFEFF";
  const csvBlob = new Blob([bom + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  
  const filename = `hallfordelning_${appState.activeAlgo}_${Date.now()}.csv`;
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(csvBlob, filename);
  } else {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(csvBlob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
