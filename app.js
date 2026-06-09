// ==========================================================================
// Uppsala Sports Hall Allocator ("Uppsala Hallfördelare") - Core Application
// ==========================================================================

// Default list of prominent Uppsala sports halls categorized by size (liten, stor, storst)
const DEFAULT_HALLS = [
  { id: 'ifu-arena-a', name: 'IFU Arena (Arena A - Gibon)', hours: 40, size: 'storst', type: 'sporthall', active: true },
  { id: 'ifu-arena-b', name: 'IFU Arena (Arena B - ICA)', hours: 35, size: 'storst', type: 'sporthall', active: true },
  { id: 'ifu-arena-c', name: 'IFU Arena (Arena C)', hours: 30, size: 'stor', type: 'sporthall', active: true },
  { id: 'ifu-arena-d', name: 'IFU Arena (Arena D)', hours: 25, size: 'stor', type: 'sporthall', active: true },
  { id: 'ifu-arena-e', name: 'IFU Arena (Arena E)', hours: 20, size: 'stor', type: 'sporthall', active: true },
  { id: 'fyrishov-a', name: 'Fyrishov (Hall A)', hours: 45, size: 'storst', type: 'sporthall', active: true },
  { id: 'fyrishov-b', name: 'Fyrishov (Hall B)', hours: 40, size: 'stor', type: 'sporthall', active: true },
  { id: 'fyrishov-c', name: 'Fyrishov (Hall C)', hours: 35, size: 'stor', type: 'sporthall', active: true },
  { id: 'fyrishov-d', name: 'Fyrishov (Hall D)', hours: 30, size: 'stor', type: 'sporthall', active: true },
  { id: 'fyrishov-e', name: 'Fyrishov (Hall E)', hours: 25, size: 'stor', type: 'sporthall', active: true },
  { id: 'fyrishov-f', name: 'Fyrishov (Hall F)', hours: 20, size: 'liten', type: 'sporthall', active: true },
  { id: 'rosendalshallen', name: 'Rosendalshallen', hours: 35, size: 'stor', type: 'sporthall', active: true },
  { id: 'gamla-uppsala', name: 'Gamla Uppsala Sporthall', hours: 30, size: 'liten', type: 'sporthall', active: true },
  { id: 'gottsundahallen', name: 'Gottsundahallen', hours: 30, size: 'stor', type: 'sporthall', active: true },
  { id: 'tiundahallen', name: 'Tiundahallen', hours: 25, size: 'liten', type: 'sporthall', active: true },
  { id: 'valsatrahallen', name: 'Valsätrahallen', hours: 25, size: 'liten', type: 'sporthall', active: true },
  { id: 'allianshallen', name: 'Allianshallen', hours: 40, size: 'stor', type: 'sporthall', active: true },
  
  // Ice Rinks (Ishallar)
  { id: 'granby-is-a', name: 'Gränby Ishall (A-hallen)', hours: 50, size: 'storst', type: 'is', active: true },
  { id: 'granby-is-b', name: 'Gränby Ishall (B-hallen)', hours: 40, size: 'stor', type: 'is', active: true },
  { id: 'granby-is-c', name: 'Gränby Ishall (C-hallen)', hours: 30, size: 'liten', type: 'is', active: true },
  
  // Football Fields (Fotbollsplaner)
  { id: 'loten-ip-a', name: 'Lötens IP (Konstgräs A)', hours: 60, size: 'storst', type: 'fotboll', active: true },
  { id: 'loten-ip-b', name: 'Lötens IP (Naturgräs B)', hours: 40, size: 'stor', type: 'fotboll', active: true },
  { id: 'studenterna-ip', name: 'Studenternas IP (Matcharena)', hours: 30, size: 'storst', type: 'fotboll', active: true },
  
  // Swimming Lanes (Simbassänger / Banor)
  { id: 'fyrishov-sim-50', name: 'Fyrishov Simbana (50m bassäng)', hours: 80, size: 'storst', type: 'simning', active: true },
  { id: 'gottsunda-sim-25', name: 'Gottsunda Badet (25m bassäng)', hours: 50, size: 'stor', type: 'simning', active: true }
];

// Global Application State
const appState = {
  halls: JSON.parse(JSON.stringify(DEFAULT_HALLS)), // Deep copy defaults
  tiers: [
    { label: 'Liten', limit: 200, hours: 2 },
    { label: 'Mellan', limit: 1000, hours: 5 },
    { label: 'Stor', limit: Infinity, hours: 10 }
  ],
  associations: [],       // Combined list of associations aggregated from active files
  files: [],              // Active uploaded participant files
  activeAlgo: 'pure-proportional',
  lastAllocatedData: [],
  hallsFile: null,         // Uploaded halls file: { name, size }
  historicalUsage: {},     // Historical utilization dictionary by club name
  historicalFile: null,    // Uploaded historical file details
  allocationYear: 2025,    // Operating Year
  ageMultipliers: { m5_9: 1, m10_15: 2, m16_20: 3 },
  dataType: 'detailed',    // 'simple' | 'detailed' | 'age-template'
  excludedAssociations: new Set() // Set of keys ClubName||ActivityName for non-applying clubs
};

// Raw file details during import
let currentFileData = {
  name: '',
  size: '',
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
  updateAllocation(); // Run initial math
});

function initHallsList() {
  renderHallsList();
}

function initTiersList() {
  renderTiers();
}

// Register UI Events
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

  // Reset custom halls button
  document.getElementById('reset-halls-btn').addEventListener('click', handleResetHalls);

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

  // Format Toggle inside Mapper panel (Toggles detailed / age columns inputs)
  const formatRadios = document.getElementsByName('data-format');
  formatRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const detailedCols = document.querySelectorAll('.map-detailed-only');
      const ageCols = document.querySelectorAll('.map-age-template-only');
      const totalLabel = document.getElementById('map-total-label');
      
      if (e.target.value === 'summary-list') {
        detailedCols.forEach(el => el.classList.add('hidden'));
        ageCols.forEach(el => el.classList.add('hidden'));
        totalLabel.textContent = "Kolumn för Medlemsantal (Krävs):";
      } else if (e.target.value === 'age-template') {
        detailedCols.forEach(el => el.classList.add('hidden'));
        ageCols.forEach(el => el.classList.remove('hidden'));
        totalLabel.textContent = "Totalt antal deltagare (Valfri):";
      } else { // detailed-list
        detailedCols.forEach(el => el.classList.remove('hidden'));
        ageCols.forEach(el => el.classList.add('hidden'));
        totalLabel.textContent = "Totalt antal deltagare (Krävs):";
      }
    });
  });

  // Age multipliers inputs event
  const multiplierInputs = document.querySelectorAll('.multiplier-val-input');
  multiplierInputs.forEach(input => {
    input.addEventListener('input', () => {
      runAggregation();
    });
  });

  // Apply column mapper button
  document.getElementById('apply-mapping-btn').addEventListener('click', handleApplyMapping);
  
  // Cancel column mapper button
  document.getElementById('cancel-mapping-btn').addEventListener('click', () => {
    document.getElementById('mapper-panel').classList.add('hidden');
    document.getElementById('dropzone').classList.remove('hidden');
  });

  // Table Search input filter
  document.getElementById('table-search').addEventListener('input', () => {
    renderTable(appState.lastAllocatedData);
  });

  // Mock Data Button
  document.getElementById('mock-data-btn').addEventListener('click', handleLoadMockData);

  // Export Buttons
  document.getElementById('export-xlsx-btn').addEventListener('click', () => {
    exportExcel(appState.lastAllocatedData);
  });

  document.getElementById('print-pdf-btn').addEventListener('click', () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit' });
    document.querySelector('.main-header').setAttribute('data-date', dateStr);
    window.print();
  });

  // Year Selection
  document.getElementById('allocation-year-select').addEventListener('change', (e) => {
    appState.allocationYear = parseInt(e.target.value) || 2025;
  });

  // Adjust by History switch
  document.getElementById('adjust-by-history-switch').addEventListener('change', () => {
    runAggregation();
  });

  // Hide non-applied toggle
  const hideNotAppliedSwitch = document.getElementById('hide-not-applied-switch');
  if (hideNotAppliedSwitch) {
    hideNotAppliedSwitch.addEventListener('change', () => {
      renderTable(appState.lastAllocatedData);
    });
  }

  // Reset historical utilization file
  document.getElementById('reset-historical-btn').addEventListener('click', () => {
    appState.historicalUsage = {};
    appState.historicalFile = null;
    document.getElementById('historical-file-indicator').classList.add('hidden');
    runAggregation();
  });

  // Tab Switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

// ==========================================================================
// Hall Configurator Logic
// ==========================================================================
function renderHallsList() {
  const container = document.getElementById('halls-list-container');
  container.innerHTML = '';
  
  const types = {
    sporthall: { label: 'Sporthallar', list: [] },
    fotboll: { label: 'Fotbollsplaner', list: [] },
    is: { label: 'Ishallar', list: [] },
    simning: { label: 'Simbassänger / Banor', list: [] }
  };
  
  appState.halls.forEach(hall => {
    const type = hall.type || 'sporthall';
    if (types[type]) {
      types[type].list.push(hall);
    } else {
      types.sporthall.list.push(hall);
    }
  });
  
  Object.keys(types).forEach(typeKey => {
    const group = types[typeKey];
    if (group.list.length === 0) return;
    
    // Group header showing type-specific hours capacity
    const typeHours = group.list.filter(h => h.active).reduce((sum, h) => sum + h.hours, 0);
    const groupHeader = document.createElement('div');
    groupHeader.className = 'halls-size-header';
    groupHeader.style.marginTop = '1rem';
    groupHeader.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    groupHeader.innerHTML = `<span>${group.label}</span> <span class="size-badge size-${typeKey === 'sporthall' ? 'stor' : typeKey === 'is' ? 'storst' : typeKey === 'fotboll' ? 'storst' : 'liten'}">${typeHours.toFixed(1)}h</span>`;
    container.appendChild(groupHeader);
    
    group.list.forEach(hall => {
      const item = document.createElement('div');
      item.className = `hall-item ${hall.active ? '' : 'inactive'}`;
      
      const sizeLabel = hall.size === 'storst' ? 'Störst' : hall.size === 'stor' ? 'Stor' : 'Liten';
      const sizeClass = `size-${hall.size}`;
      
      item.innerHTML = `
        <label class="hall-label-group">
          <div class="checkbox-custom-wrapper">
            <input type="checkbox" ${hall.active ? 'checked' : ''} data-hall-id="${hall.id}">
            <span class="checkbox-custom"></span>
          </div>
          <span class="hall-name">${hall.name} <span class="size-badge ${sizeClass}" style="transform: scale(0.8); transform-origin: left; margin-left: 0.25rem;">${sizeLabel}</span></span>
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
  });
  
  lucide.createIcons();
}

function handleAddHall() {
  const nameInput = document.getElementById('new-hall-name');
  const hoursInput = document.getElementById('new-hall-hours');
  const sizeSelect = document.getElementById('new-hall-size');
  const typeSelect = document.getElementById('new-hall-type');
  
  const name = nameInput.value.trim();
  let hours = parseFloat(hoursInput.value);
  const size = sizeSelect.value;
  const type = typeSelect.value;
  
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
    size: size,
    type: type,
    active: true
  });
  
  nameInput.value = '';
  hoursInput.value = '';
  
  renderHallsList();
  updateAllocation();
}

function handleResetHalls() {
  if (confirm("Vill du återställa hallistan till standardhallarna? Uppladdad sporthallslista kommer att tas bort.")) {
    appState.halls = JSON.parse(JSON.stringify(DEFAULT_HALLS));
    appState.hallsFile = null;
    
    document.getElementById('halls-file-indicator').classList.add('hidden');
    renderHallsList();
    updateAllocation();
  }
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
        <span class="tier-input-desc">> ${prevLimit} poäng:</span>
        <input type="number" class="tier-hours form-input" value="${tier.hours}" min="0" step="0.5" style="width: 55px">
        <span class="tier-input-desc">timmar</span>
      `;
    } else {
      const prevLimit = index === 0 ? 0 : appState.tiers[index-1].limit;
      div.innerHTML = `
        <span class="tier-input-desc">${prevLimit} - </span>
        <input type="number" class="tier-limit form-input" value="${tier.limit}" min="${prevLimit + 1}" style="width: 60px">
        <span class="tier-input-desc">poäng:</span>
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
  
  const newLimit = secondLastItem ? secondLastItem.limit + 500 : 500;
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
  
  currentFileData.name = file.name;
  currentFileData.size = formatBytes(file.size);
  
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
      
      processRawFile(rawRows);
    } catch (err) {
      console.error(err);
      alert("Kunde inte läsa filen. Se till att det är en korrekt sparad .xlsx, .xls eller .csv-fil.");
    }
  };
  reader.readAsArrayBuffer(file);
}

function getHallTypeForActivity(activity) {
  if (!activity) return 'sporthall';
  const act = String(activity).toLowerCase();
  if (act.includes('innebandy')) return 'sporthall';
  if (act.includes('fotboll') || act.includes('soccer') || act.includes('football')) return 'fotboll';
  if (act.includes('simning') || act.includes('sim') || act.includes('swim')) return 'simning';
  if (act.includes('is') || act.includes('hockey') || act.includes('konståkning') || act.includes('skridsko') || act.includes('curling') || act.includes('bandy')) return 'is';
  return 'sporthall';
}

function importHistoricalData() {
  const headers = currentFileData.headers;
  const rows = currentFileData.rows;
  
  let clubIdx = -1;
  let bookedIdx = -1;
  let hoursWeekIdx = -1;
  let utilIdx = -1;
  let approvedIdx = -1;
  let approvedChangeIdx = -1;
  let rejectIdx = -1;
  
  headers.forEach((h, idx) => {
    const lh = h.toLowerCase();
    if (clubIdx === -1 && ['förening', 'forening', 'klubb', 'organization', 'organisation'].some(kw => lh.includes(kw))) clubIdx = idx;
    if (bookedIdx === -1 && ['bokad tid', 'bokad'].some(kw => lh.includes(kw))) bookedIdx = idx;
    if (hoursWeekIdx === -1 && ['timmar/vecka', 'timmar per vecka', 'tim/vecka', 'timmar'].some(kw => lh.includes(kw))) hoursWeekIdx = idx;
    if (utilIdx === -1 && ['% av bokad tid', 'utnyttjande', 'utnyttjandegrad', 'andel'].some(kw => lh.includes(kw))) utilIdx = idx;
    if (approvedIdx === -1 && ['godkänd utan ändring', 'godkänd'].some(kw => lh.includes(kw))) approvedIdx = idx;
    if (approvedChangeIdx === -1 && ['godkänd med ändring', 'ändrad'].some(kw => lh.includes(kw))) approvedChangeIdx = idx;
    if (rejectIdx === -1 && ['avslag', 'avslag %', 'antal avslag'].some(kw => lh.includes(kw))) rejectIdx = idx;
  });
  
  if (clubIdx === -1 || utilIdx === -1) {
    alert("Kunde inte läsa in utnyttjandedata. Filen saknar kolumn för Förening eller Utnyttjande.");
    return;
  }
  
  let importedUsage = {};
  rows.forEach(row => {
    const club = String(row[clubIdx] || '').trim();
    if (!club) return;
    
    // Parse util percentage
    let utilRaw = String(row[utilIdx] || '').replace('%', '').replace(',', '.').trim();
    let utilVal = parseFloat(utilRaw);
    if (isNaN(utilVal)) utilVal = 100;
    if (utilVal > 0 && utilVal <= 1.0) utilVal = utilVal * 100; 
    
    let rejectRaw = rejectIdx !== -1 ? String(row[rejectIdx] || '').replace('%', '').replace(',', '.').trim() : '0';
    let rejectVal = parseFloat(rejectRaw);
    if (isNaN(rejectVal)) rejectVal = 0;
    if (rejectVal > 0 && rejectVal <= 1.0) rejectVal = rejectVal * 100;
    
    let hoursWeek = hoursWeekIdx !== -1 ? parseFloat(String(row[hoursWeekIdx]).replace(',', '.')) : 0;
    let booked = bookedIdx !== -1 ? parseFloat(String(row[bookedIdx]).replace(',', '.')) : 0;
    
    importedUsage[club.toLowerCase()] = {
      clubName: club,
      utilizationRate: utilVal,
      rejectionRate: rejectVal,
      hoursPerWeek: isNaN(hoursWeek) ? 0 : hoursWeek,
      bookedTime: isNaN(booked) ? 0 : booked
    };
  });
  
  appState.historicalUsage = importedUsage;
  appState.historicalFile = {
    name: currentFileData.name,
    size: currentFileData.size,
    count: Object.keys(importedUsage).length
  };
  
  const banner = document.getElementById('historical-file-indicator');
  const nameEl = document.getElementById('historical-file-name');
  if (banner && nameEl) {
    nameEl.textContent = `${appState.historicalFile.name} (${appState.historicalFile.count} föreningar)`;
    banner.classList.remove('hidden');
  }
  
  runAggregation();
  alert(`Lyckades importera historisk data för ${Object.keys(importedUsage).length} föreningar!`);
}

function processRawFile(rawRows) {
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
  
  currentFileData.headers = headers;
  currentFileData.rows = dataRows;
  
  // ----------------------------------------------------
  // Autodetection: Arena List vs. Historical vs. Participants List
  // ----------------------------------------------------
  let isHallsFile = false;
  let isHistoricalFile = false;
  
  const hallKeywords = ['sporthall', 'arena', 'hall', 'storlek', 'storlekstyp', 'kategori'];
  const histKeywords = ['bokad tid', '% av bokad tid', 'avslag', 'godkänd utan ändring', 'godkänd med ändring'];
  
  // Count matches
  let hallMatches = 0;
  let histMatches = 0;
  
  headers.forEach(h => {
    const lh = h.toLowerCase();
    if (hallKeywords.some(kw => lh.includes(kw))) {
      hallMatches++;
    }
    if (histKeywords.some(kw => lh.includes(kw))) {
      histMatches++;
    }
  });
  
  if (hallMatches >= 2 || headers.some(h => h.toLowerCase() === 'storlek' || h.toLowerCase() === 'arena')) {
    isHallsFile = true;
  } else if (histMatches >= 2 || headers.some(h => h.toLowerCase() === '% av bokad tid' || h.toLowerCase() === 'bokad tid')) {
    isHistoricalFile = true;
  }
  
  if (isHallsFile) {
    importHallsData();
  } else if (isHistoricalFile) {
    importHistoricalData();
  } else {
    // Show Column Mapping modal for participants
    showColumnMapper(headers);
  }
}

// Import Sporthalls from Excel
function importHallsData() {
  const headers = currentFileData.headers;
  const rows = currentFileData.rows;
  
  let nameColIdx = -1;
  let sizeColIdx = -1;
  let hoursColIdx = -1;
  let typeColIdx = -1;
  
  const nameKws = ['arena', 'hall', 'sporthall', 'namn', 'sporthallar', 'arenor'];
  const sizeKws = ['storlek', 'storlekstyp', 'kategori', 'size'];
  const hoursKws = ['timmar', 'timantal', 'bokningstimmar', 'hours', 'tid'];
  const typeKws = ['typ', 'type', 'idrott', 'sport', 'halltyp'];
  
  headers.forEach((h, idx) => {
    const lh = h.toLowerCase();
    if (nameColIdx === -1 && nameKws.some(kw => lh.includes(kw))) nameColIdx = idx;
    if (sizeColIdx === -1 && sizeKws.some(kw => lh.includes(kw))) sizeColIdx = idx;
    if (hoursColIdx === -1 && hoursKws.some(kw => lh.includes(kw))) hoursColIdx = idx;
    if (typeColIdx === -1 && typeKws.some(kw => lh.includes(kw)) && !sizeKws.some(kw => lh.includes(kw))) typeColIdx = idx;
  });
  
  // Fallbacks if not auto-detected
  if (nameColIdx === -1) nameColIdx = 0;
  if (sizeColIdx === -1 && headers.length > 1) sizeColIdx = 1;
  if (hoursColIdx === -1 && headers.length > 2) hoursColIdx = 2;
  
  if (hoursColIdx === -1 || nameColIdx === -1) {
    alert("Kunde inte läsa in sporthallarna. Filen saknar giltiga kolumner för namn och timmar.");
    return;
  }
  
  let importedHalls = [];
  rows.forEach((row, idx) => {
    const name = String(row[nameColIdx] || '').trim();
    if (!name) return;
    
    let hours = parseFloat(row[hoursColIdx]);
    if (isNaN(hours) || hours < 0) hours = 0;
    
    // Parse size category
    let sizeRaw = String(row[sizeColIdx] || '').toLowerCase();
    let size = 'stor'; // Default size
    if (sizeRaw.includes('storst') || sizeRaw.includes('störst') || sizeRaw.includes('biggest') || sizeRaw.includes('large') || sizeRaw.includes('c-hall') || sizeRaw.includes('a-hall')) {
      size = 'storst';
    } else if (sizeRaw.includes('liten') || sizeRaw.includes('small') || sizeRaw.includes('basic') || sizeRaw.includes('skola') || sizeRaw.includes('gymst')) {
      size = 'liten';
    }
    
    // Parse type
    let type = 'sporthall';
    if (typeColIdx !== -1) {
      let typeRaw = String(row[typeColIdx] || '').toLowerCase();
      if (typeRaw.includes('is') || typeRaw.includes('hockey') || typeRaw.includes('skridsko') || typeRaw.includes('konståkning')) {
        type = 'is';
      } else if (typeRaw.includes('fotboll') || typeRaw.includes('ip') || typeRaw.includes('plan') || typeRaw.includes('pitch')) {
        type = 'fotboll';
      } else if (typeRaw.includes('sim') || typeRaw.includes('bad') || typeRaw.includes('lane') || typeRaw.includes('bana')) {
        type = 'simning';
      }
    } else {
      // Autodetect from name
      let nameRaw = name.toLowerCase();
      if (nameRaw.includes('is') || nameRaw.includes('hockey') || nameRaw.includes('skridsko') || nameRaw.includes('konståkning')) {
        type = 'is';
      } else if (nameRaw.includes('fotboll') || nameRaw.includes('ip') || nameRaw.includes('plan') || nameRaw.includes('pitch') || nameRaw.includes('konstgräs') || nameRaw.includes('gräs')) {
        type = 'fotboll';
      } else if (nameRaw.includes('sim') || nameRaw.includes('bad') || nameRaw.includes('lane') || nameRaw.includes('bana') || nameRaw.includes('bassäng')) {
        type = 'simning';
      }
    }
    
    importedHalls.push({
      id: 'import-' + idx + '-' + Date.now(),
      name: name,
      hours: hours,
      size: size,
      type: type,
      active: true
    });
  });
  
  if (importedHalls.length === 0) {
    alert("Inga giltiga sporthallar hittades i filen.");
    return;
  }
  
  appState.halls = importedHalls;
  appState.hallsFile = {
    name: currentFileData.name,
    size: currentFileData.size
  };
  
  // Update UI indicators
  document.getElementById('halls-file-name').textContent = appState.hallsFile.name;
  document.getElementById('halls-file-indicator').classList.remove('hidden');
  
  renderHallsList();
  updateAllocation();
  alert(`Lyckades importera ${importedHalls.length} sporthallar!`);
}

// Show Column Mapper Wizard for Participants
function showColumnMapper(headers) {
  const fileDesc = document.getElementById('mapper-filename-desc');
  fileDesc.innerHTML = `Vi hittade flera kolumner i filen <strong>${currentFileData.name}</strong>. Välj hur data ska tolkas:`;
  
  const selects = {
    club: document.getElementById('map-club-col'),
    activity: document.getElementById('map-activity-col'),
    girls: document.getElementById('map-girls-col'),
    boys: document.getElementById('map-boys-col'),
    girlsDis: document.getElementById('map-girls-dis-col'),
    boysDis: document.getElementById('map-boys-dis-col'),
    c5_9: document.getElementById('map-5-9-col'),
    c10_15: document.getElementById('map-10-15-col'),
    c16_20: document.getElementById('map-16-20-col'),
    total: document.getElementById('map-total-col')
  };
  
  // Populate options
  Object.values(selects).forEach(sel => {
    sel.innerHTML = '';
    
    // Add optional tag to optional selectors
    if (sel.id === 'map-activity-col' || sel.id === 'map-girls-col' || sel.id === 'map-boys-col' || sel.id === 'map-girls-dis-col' || sel.id === 'map-boys-dis-col' || sel.id === 'map-total-col') {
      const opt = document.createElement('option');
      opt.value = '-1';
      opt.textContent = sel.id === 'map-total-col' ? '-- Ej angiven (Beräkna automatiskt) --' : '-- Ej angiven (Valfri) --';
      sel.appendChild(opt);
    }
    
    headers.forEach((header, index) => {
      const opt = document.createElement('option');
      opt.value = index;
      opt.textContent = header;
      sel.appendChild(opt);
    });
  });
  
  // Autodetection of columns
  let autoClub = -1, autoAct = -1, autoGirls = -1, autoBoys = -1, autoGirlsDis = -1, autoBoysDis = -1, autoTotal = -1;
  let auto5_9 = -1, auto10_15 = -1, auto16_20 = -1;
  
  headers.forEach((h, index) => {
    const lh = h.toLowerCase();
    
    // Club Name
    if (autoClub === -1 && ['förening', 'forening', 'klubb', 'organisation', 'association', 'club', 'team', 'org'].some(kw => lh.includes(kw))) {
      autoClub = index;
    }
    // Activity
    if (autoAct === -1 && ['aktivitet', 'idrott', 'gren', 'sport', 'activity'].some(kw => lh.includes(kw))) {
      autoAct = index;
    }
    // Girls
    if (autoGirls === -1 && ['flickor', 'tjejer', 'girls', 'flickdeltagare', 'unika flickor'].some(kw => lh.includes(kw))) {
      autoGirls = index;
    }
    // Boys
    if (autoBoys === -1 && ['pojkar', 'killar', 'boys', 'pojkdeltagare', 'unika pojkar'].some(kw => lh.includes(kw))) {
      autoBoys = index;
    }
    // Girls Disabled
    if (autoGirlsDis === -1 && ['funktionsnedsättning flickor', 'funk flickor', 'funktionsnedsatta flickor', 'disabilities girls'].some(kw => lh.includes(kw) || (lh.includes('funktionsneds') && lh.includes('flick')))) {
      autoGirlsDis = index;
    }
    // Boys Disabled
    if (autoBoysDis === -1 && ['funktionsnedsättning pojkar', 'funk pojkar', 'funktionsnedsatta pojkar', 'disabilities boys'].some(kw => lh.includes(kw) || (lh.includes('funktionsneds') && lh.includes('pojk')))) {
      autoBoysDis = index;
    }
    // 5-9 år
    if (auto5_9 === -1 && (lh.includes('5-9') || lh.includes('5 till 9') || lh.includes('5 - 9'))) {
      auto5_9 = index;
    }
    // 10-15 år
    if (auto10_15 === -1 && (lh.includes('10-15') || lh.includes('10 till 15') || lh.includes('10 - 15'))) {
      auto10_15 = index;
    }
    // 16-20 år
    if (auto16_20 === -1 && (lh.includes('16-20') || lh.includes('16 till 20') || lh.includes('16 - 20'))) {
      auto16_20 = index;
    }
    // Total Participants
    if (autoTotal === -1 && ['totalt deltagare', 'deltagare totalt', 'antal deltagare', 'total deltagare', 'totalt antal deltagare', 'medlemmar', 'medlemsantal', 'totalt', 'total'].some(kw => lh.includes(kw))) {
      autoTotal = index;
    }
  });
  
  // Apply auto-detected choices
  if (autoClub !== -1) selects.club.value = autoClub;
  if (autoAct !== -1) selects.activity.value = autoAct;
  if (autoGirls !== -1) selects.girls.value = autoGirls;
  if (autoBoys !== -1) selects.boys.value = autoBoys;
  if (autoGirlsDis !== -1) selects.girlsDis.value = autoGirlsDis;
  if (autoBoysDis !== -1) selects.boysDis.value = autoBoysDis;
  if (auto5_9 !== -1) selects.c5_9.value = auto5_9;
  if (auto10_15 !== -1) selects.c10_15.value = auto10_15;
  if (auto16_20 !== -1) selects.c16_20.value = auto16_20;
  if (autoTotal !== -1) selects.total.value = autoTotal;
  
  // Format Selection Toggle
  const formatRadios = document.getElementsByName('data-format');
  const detailedCols = document.querySelectorAll('.map-detailed-only');
  const ageCols = document.querySelectorAll('.map-age-template-only');
  const totalLabel = document.getElementById('map-total-label');
  
  if (auto5_9 !== -1 || auto10_15 !== -1 || auto16_20 !== -1) {
    formatRadios.forEach(radio => {
      if (radio.value === 'age-template') radio.checked = true;
    });
    detailedCols.forEach(el => el.classList.add('hidden'));
    ageCols.forEach(el => el.classList.remove('hidden'));
    totalLabel.textContent = "Totalt antal deltagare (Valfri):";
  } else if (autoGirls !== -1 || autoBoys !== -1) {
    formatRadios.forEach(radio => {
      if (radio.value === 'detailed-list') radio.checked = true;
    });
    detailedCols.forEach(el => el.classList.remove('hidden'));
    ageCols.forEach(el => el.classList.add('hidden'));
    totalLabel.textContent = "Totalt antal deltagare (Krävs):";
  } else {
    formatRadios.forEach(radio => {
      if (radio.value === 'summary-list') radio.checked = true;
    });
    detailedCols.forEach(el => el.classList.add('hidden'));
    ageCols.forEach(el => el.classList.add('hidden'));
    totalLabel.textContent = "Kolumn för Medlemsantal (Krävs):";
  }
  
  // Toggle UI visibility
  document.getElementById('mapper-panel').classList.remove('hidden');
  document.getElementById('dropzone').classList.add('hidden');
  document.getElementById('results-container').classList.add('hidden');
}

function handleApplyMapping() {
  const format = document.querySelector('input[name="data-format"]:checked').value;
  
  const clubIdx = parseInt(document.getElementById('map-club-col').value);
  const actIdx = parseInt(document.getElementById('map-activity-col').value);
  const girlsIdx = parseInt(document.getElementById('map-girls-col').value);
  const boysIdx = parseInt(document.getElementById('map-boys-col').value);
  const girlsDisIdx = parseInt(document.getElementById('map-girls-dis-col').value);
  const boysDisIdx = parseInt(document.getElementById('map-boys-dis-col').value);
  const totalIdx = parseInt(document.getElementById('map-total-col').value);
  const c5_9Idx = parseInt(document.getElementById('map-5-9-col').value);
  const c10_15Idx = parseInt(document.getElementById('map-10-15-col').value);
  const c16_20Idx = parseInt(document.getElementById('map-16-20-col').value);
  
  if (format === 'age-template') {
    if (isNaN(c5_9Idx) || c5_9Idx === -1 || isNaN(c10_15Idx) || c10_15Idx === -1 || isNaN(c16_20Idx) || c16_20Idx === -1) {
      alert("Vänligen välj kolumner för alla tre åldersgrupper.");
      return;
    }
  } else {
    if (isNaN(clubIdx) || clubIdx === -1) {
      alert("Vänligen välj kolumn för Förening.");
      return;
    }
    if (isNaN(totalIdx) || totalIdx === -1) {
      alert("Vänligen välj kolumn för Medlemsantal.");
      return;
    }
  }

  const parseVal = (v) => {
    if (v === undefined || v === null || v === "") return 0;
    if (typeof v === 'number') return Math.round(v);
    const clean = String(v).replace(/[\s\xa0]/g, '').replace(',', '.');
    const parsed = parseInt(clean, 10);
    return isNaN(parsed) ? 0 : parsed;
  };
  
  let records = [];
  
  currentFileData.rows.forEach(row => {
    const club = String(row[clubIdx] || '').trim();
    if (!club) return;
    
    let total = 0;
    if (totalIdx !== -1) {
      total = parseVal(row[totalIdx]);
    }
    
    let activity = 'N/A';
    let girls = 0;
    let boys = 0;
    let girlsDis = 0;
    let boysDis = 0;
    let c5_9 = 0;
    let c10_15 = 0;
    let c16_20 = 0;
    
    if (format === 'age-template') {
      c5_9 = parseVal(row[c5_9Idx]);
      c10_15 = parseVal(row[c10_15Idx]);
      c16_20 = parseVal(row[c16_20Idx]);
      if (total === 0) {
        total = c5_9 + c10_15 + c16_20;
      }
    } else if (format === 'detailed-list') {
      if (actIdx !== -1) activity = String(row[actIdx] || '').trim();
      
      if (girlsIdx !== -1) girls = parseVal(row[girlsIdx]);
      if (boysIdx !== -1) boys = parseVal(row[boysIdx]);
      if (girlsDisIdx !== -1) girlsDis = parseVal(row[girlsDisIdx]);
      if (boysDisIdx !== -1) boysDis = parseVal(row[boysDisIdx]);
      
      // If total is missing, calculate as girls + boys
      if (total === 0 && (girls > 0 || boys > 0)) {
        total = girls + boys;
      }
    }
    
    records.push({
      club: club,
      activity: activity,
      girls: girls,
      boys: boys,
      girlsDisability: girlsDis,
      boysDisability: boysDis,
      total: total,
      c5_9: c5_9,
      c10_15: c10_15,
      c16_20: c16_20
    });
  });
  
  if (records.length === 0) {
    alert("Kunde inte läsa in några giltiga föreningar.");
    return;
  }
  
  if (format === 'age-template') {
    appState.dataType = 'age-template';
  } else if (format === 'detailed-list') {
    appState.dataType = 'detailed';
  } else {
    appState.dataType = 'simple';
  }

  // Add this file to data sources list
  const fileId = 'file-' + Date.now();
  
  // Set default multiplier based on filename
  let autoMultiplier = 2;
  const fname = currentFileData.name.toLowerCase();
  if (fname.includes('multiplier 3') || fname.includes('multiplikator 3') || fname.includes('13-16') || fname.includes('13 - 16')) {
    autoMultiplier = 3;
  } else if (fname.includes('multiplier 1') || fname.includes('17-')) {
    autoMultiplier = 1;
  }
  
  // Set default age group label
  let ageLabel = 'Åldersgrupp ' + (appState.files.length + 1);
  if (fname.includes('7-12') || fname.includes('7 - 12')) {
    ageLabel = '7-12 år';
  } else if (fname.includes('13-16') || fname.includes('13 - 16')) {
    ageLabel = '13-16 år';
  }
  
  appState.files.push({
    id: fileId,
    name: currentFileData.name,
    size: currentFileData.size,
    records: records,
    multiplier: autoMultiplier,
    ageGroup: ageLabel,
    type: appState.dataType
  });
  
  // Rebuild aggregated list & update
  aggregateAndAllocate();
  
  // Hide mapper, restore dropzone
  document.getElementById('mapper-panel').classList.add('hidden');
  document.getElementById('dropzone').classList.remove('hidden');
}

// Aggregate multiple uploaded files by Förening
function aggregateAndAllocate() {
  const listContainer = document.getElementById('data-sources-list');
  listContainer.innerHTML = '';
  
  if (appState.files.length === 0) {
    listContainer.innerHTML = `<div class="empty-list-text">Inga filer uppladdade. Använd dropzone till vänster för att lägga till deltagarlistor.</div>`;
    appState.associations = [];
    updateAllocation();
    return;
  }
  
  // Render files list in UI
  appState.files.forEach(file => {
    const item = document.createElement('div');
    item.className = 'source-file-item';
    
    const defaultSport = file.defaultSport || 'sporthall';
    
    item.innerHTML = `
      <div class="source-file-info">
        <span class="source-file-title">
          <i data-lucide="file-spreadsheet"></i>
          <span>${file.name}</span>
        </span>
        <span class="source-file-size">${file.size} - ${file.records.length} rader</span>
      </div>
      <div class="source-file-inputs" style="flex-wrap: wrap; gap: 0.5rem;">
        <div class="source-input-group">
          <label>Standard sport:</label>
          <select class="default-sport-select form-select" style="width: 100px; padding: 0.25rem; font-size: 0.75rem; height: auto;">
            <option value="sporthall" ${defaultSport === 'sporthall' ? 'selected' : ''}>Sporthall</option>
            <option value="fotboll" ${defaultSport === 'fotboll' ? 'selected' : ''}>Fotboll</option>
            <option value="is" ${defaultSport === 'is' ? 'selected' : ''}>Ishall</option>
            <option value="simning" ${defaultSport === 'simning' ? 'selected' : ''}>Simbana</option>
          </select>
        </div>
        <div class="source-input-group">
          <label>Åldersgrupp:</label>
          <input type="text" class="label-input form-input" value="${file.ageGroup}" style="padding: 0.25rem; font-size: 0.75rem;">
        </div>
        <div class="source-input-group">
          <label>Multiplier:</label>
          <input type="number" class="multiplier-input form-input" value="${file.multiplier}" min="1" max="10" style="padding: 0.25rem; font-size: 0.75rem; width: 45px;">
        </div>
        <button class="btn btn-icon btn-danger-link delete-file-btn" title="Ta bort fil" style="width: 28px; height: 28px;">
          <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    `;
    
    // Default Sport change event
    const sportSelect = item.querySelector('.default-sport-select');
    sportSelect.addEventListener('change', (e) => {
      file.defaultSport = e.target.value;
      runAggregation();
    });
    
    // Multiplier change event
    const multInput = item.querySelector('.multiplier-input');
    multInput.addEventListener('change', (e) => {
      let val = parseInt(e.target.value);
      if (isNaN(val) || val < 1) val = 1;
      file.multiplier = val;
      runAggregation();
    });
    
    // Label change event
    const labelInput = item.querySelector('.label-input');
    labelInput.addEventListener('change', (e) => {
      file.ageGroup = e.target.value.trim() || 'Åldersgrupp';
      runAggregation();
    });
    
    // Delete file event
    const delBtn = item.querySelector('.delete-file-btn');
    delBtn.addEventListener('click', () => {
      appState.files = appState.files.filter(f => f.id !== file.id);
      aggregateAndAllocate();
    });
    
    listContainer.appendChild(item);
  });
  
  lucide.createIcons();
  runAggregation();
}

function runAggregation() {
  let aggregatedMap = {};
  
  // Get active multipliers from the sidebar controls
  const m5_9Input = document.getElementById('mult-5-9');
  const m10_15Input = document.getElementById('mult-10-15');
  const m16_20Input = document.getElementById('mult-16-20');
  
  const m5_9 = m5_9Input ? (parseFloat(m5_9Input.value) || 1) : 1;
  const m10_15 = m10_15Input ? (parseFloat(m10_15Input.value) || 2) : 2;
  const m16_20 = m16_20Input ? (parseFloat(m16_20Input.value) || 3) : 3;
  
  appState.ageMultipliers = { m5_9, m10_15, m16_20 };
  
  appState.files.forEach(file => {
    const mult = file.multiplier;
    const isAgeTemplate = file.type === 'age-template' || appState.dataType === 'age-template';
    const fileDefaultSport = file.defaultSport || 'sporthall';
    
    file.records.forEach(rec => {
      const clubName = rec.club;
      if (!clubName) return;
      
      // Determine activity and its mapped hall type
      let activity = rec.activity && rec.activity !== 'N/A' ? rec.activity : '';
      if (!activity) {
        // Fallback to default sport of the file
        activity = fileDefaultSport === 'sporthall' ? 'Sporthall' :
                   fileDefaultSport === 'fotboll' ? 'Fotboll' :
                   fileDefaultSport === 'is' ? 'Is' : 'Simning';
      }
      
      const hallType = getHallTypeForActivity(activity);
      
      // Unique key for the association-activity pair
      const key = `${clubName.trim()}||${activity.trim()}`;
      
      if (!aggregatedMap[key]) {
        aggregatedMap[key] = {
          name: clubName.trim(),
          activity: activity.trim(),
          hallType: hallType,
          applied: !appState.excludedAssociations.has(key),
          girls: 0,
          boys: 0,
          girlsDisability: 0,
          boysDisability: 0,
          participants: 0,
          points: 0,
          c5_9: 0,
          c10_15: 0,
          c16_20: 0,
          historicalUsage: null
        };
      }
      
      const assoc = aggregatedMap[key];
      
      assoc.girls += rec.girls || 0;
      assoc.boys += rec.boys || 0;
      assoc.girlsDisability += rec.girlsDisability || 0;
      assoc.boysDisability += rec.boysDisability || 0;
      
      if (isAgeTemplate) {
        assoc.c5_9 += rec.c5_9 || 0;
        assoc.c10_15 += rec.c10_15 || 0;
        assoc.c16_20 += rec.c16_20 || 0;
        assoc.participants += rec.total;
        assoc.points += (rec.c5_9 || 0) * m5_9 + (rec.c10_15 || 0) * m10_15 + (rec.c16_20 || 0) * m16_20;
      } else {
        assoc.participants += rec.total;
        assoc.points += rec.total * mult;
      }
    });
  });
  
  // Attach historical usage if uploaded
  Object.values(aggregatedMap).forEach(assoc => {
    const clubKey = assoc.name.toLowerCase();
    if (appState.historicalUsage && appState.historicalUsage[clubKey]) {
      assoc.historicalUsage = appState.historicalUsage[clubKey];
    }
  });
  
  appState.associations = Object.values(aggregatedMap);
  
  // Sort descending by points
  appState.associations.sort((a, b) => b.points - a.points);
  
  // Show results view
  if (appState.associations.length > 0) {
    document.getElementById('results-container').classList.remove('hidden');
  } else {
    document.getElementById('results-container').classList.add('hidden');
  }
  
  updateAllocation();
}

// ==========================================================================
// Mock Data Generator
// ==========================================================================
function handleLoadMockData() {
  // Clear previous files
  appState.files = [];
  
  const formatRadio = document.querySelector('input[name="data-format"]:checked');
  const format = formatRadio ? formatRadio.value : 'detailed-list';
  
  if (format === 'age-template') {
    appState.dataType = 'age-template';
    
    const mockAgeRecords = [
      { club: 'Uppsala Basket', c5_9: 210, c10_15: 220, c16_20: 80, total: 510 },
      { club: 'FBC Uppsala (Innebandy)', c5_9: 150, c10_15: 170, c16_20: 60, total: 380 },
      { club: 'Uppsala Handbollsklubb', c5_9: 110, c10_15: 120, c16_20: 40, total: 270 },
      { club: 'IK Sirius', c5_9: 250, c10_15: 350, c16_20: 120, total: 720 },
      { club: 'Vaksala SK', c5_9: 220, c10_15: 260, c16_20: 90, total: 570 },
      { club: 'Uppsala Simsällskap', c5_9: 340, c10_15: 380, c16_20: 150, total: 870 },
      { club: 'Storvreta IBK', c5_9: 160, c10_15: 220, c16_20: 70, total: 450 },
      { club: 'Uppsala Gymnastikförening', c5_9: 450, c10_15: 480, c16_20: 110, total: 1040 }
    ];
    
    appState.files.push({
      id: 'mock-file-v5',
      name: 'fordelningsmall_v5_mock.xlsx',
      size: '18.5 KB',
      records: mockAgeRecords,
      multiplier: 1,
      ageGroup: 'Blandade åldrar',
      type: 'age-template'
    });
  } else if (format === 'summary-list') {
    appState.dataType = 'simple';
    
    const mockSimpleRecords = [
      { club: 'Uppsala Basket', total: 510 },
      { club: 'FBC Uppsala (Innebandy)', total: 380 },
      { club: 'Uppsala Handbollsklubb', total: 270 },
      { club: 'IK Sirius', total: 720 },
      { club: 'Vaksala SK', total: 570 },
      { club: 'Uppsala Simsällskap', total: 870 },
      { club: 'Storvreta IBK', total: 450 },
      { club: 'Uppsala Gymnastikförening', total: 1040 }
    ];
    
    appState.files.push({
      id: 'mock-file-simple',
      name: 'medlemsantal_enkel_mock.xlsx',
      size: '12.1 KB',
      records: mockSimpleRecords,
      multiplier: 1,
      ageGroup: 'Totalt',
      type: 'simple'
    });
  } else {
    appState.dataType = 'detailed';
    
    // 1. Mock File A: 7-12 years (multiplier 2)
    const fileA_records = [
      { club: 'Uppsala Basket', activity: 'Basket', girls: 210, boys: 200, girlsDisability: 4, boysDisability: 6, total: 410 },
      { club: 'FBC Uppsala (Innebandy)', activity: 'Innebandy', girls: 150, boys: 170, girlsDisability: 2, boysDisability: 3, total: 320 },
      { club: 'Uppsala Handbollsklubb', activity: 'Handboll', girls: 110, boys: 90, girlsDisability: 0, boysDisability: 1, total: 200 },
      { club: 'IK Sirius', activity: 'Fotboll', girls: 250, boys: 350, girlsDisability: 5, boysDisability: 8, total: 600 },
      { club: 'Vaksala SK', activity: 'Fotboll', girls: 220, boys: 260, girlsDisability: 3, boysDisability: 2, total: 480 },
      { club: 'Uppsala Simsällskap', activity: 'Simning', girls: 340, boys: 310, girlsDisability: 8, boysDisability: 6, total: 650 },
      { club: 'Storvreta IBK', activity: 'Innebandy', girls: 160, boys: 220, girlsDisability: 1, boysDisability: 4, total: 380 },
      { club: 'Uppsala Gymnastikförening', activity: 'Gymnastik', girls: 450, boys: 100, girlsDisability: 6, boysDisability: 2, total: 550 }
    ];
    
    appState.files.push({
      id: 'mock-file-1',
      name: 'summering unika deltagare 2025 (7-12 år).xlsx',
      size: '14.2 KB',
      records: fileA_records,
      multiplier: 2,
      ageGroup: '7-12 år',
      type: 'detailed'
    });
    
    // 2. Mock File B: 13-16 years (multiplier 3)
    const fileB_records = [
      { club: 'Uppsala Basket', activity: 'Basket', girls: 220, boys: 220, girlsDisability: 3, boysDisability: 2, total: 440 },
      { club: 'FBC Uppsala (Innebandy)', activity: 'Innebandy', girls: 130, boys: 170, girlsDisability: 1, boysDisability: 2, total: 300 },
      { club: 'Uppsala Handbollsklubb', activity: 'Handboll', girls: 120, boys: 110, girlsDisability: 2, boysDisability: 1, total: 230 },
      { club: 'IK Sirius', activity: 'Fotboll', girls: 250, boys: 400, girlsDisability: 3, boysDisability: 6, total: 650 },
      { club: 'Vaksala SK', activity: 'Fotboll', girls: 210, boys: 260, girlsDisability: 1, boysDisability: 1, total: 470 },
      { club: 'Uppsala Simsällskap', activity: 'Simning', girls: 380, boys: 370, girlsDisability: 7, boysDisability: 5, total: 750 },
      { club: 'Storvreta IBK', activity: 'Innebandy', girls: 180, boys: 240, girlsDisability: 2, boysDisability: 2, total: 420 },
      { club: 'Uppsala Gymnastikförening', activity: 'Gymnastik', girls: 480, boys: 70, girlsDisability: 4, boysDisability: 1, total: 550 }
    ];
    
    appState.files.push({
      id: 'mock-file-2',
      name: 'summering unika deltagare 2025 (13-16 år).xlsx',
      size: '15.6 KB',
      records: fileB_records,
      multiplier: 3,
      ageGroup: '13-16 år',
      type: 'detailed'
    });
  }
  
  aggregateAndAllocate();
}

// ==========================================================================
// Core Hour Allocation Algorithms (Distribution by Points)
// ==========================================================================
function updateAllocation() {
  // 1. Group active halls and calculate hours by type
  const typeHours = {
    sporthall: 0,
    fotboll: 0,
    is: 0,
    simning: 0
  };
  appState.halls.filter(h => h.active).forEach(h => {
    const type = h.type || 'sporthall';
    if (typeHours[type] !== undefined) {
      typeHours[type] += h.hours;
    }
  });
  
  const totalHoursAvailable = Object.values(typeHours).reduce((sum, h) => sum + h, 0);
  document.getElementById('metric-total-hours').textContent = totalHoursAvailable.toFixed(1);
  
  // Calculate size-specific available hours for sub-label
  const litenHours = appState.halls.filter(h => h.active && h.size === 'liten').reduce((sum, h) => sum + h.hours, 0);
  const storHours = appState.halls.filter(h => h.active && h.size === 'stor').reduce((sum, h) => sum + h.hours, 0);
  const storstHours = appState.halls.filter(h => h.active && h.size === 'storst').reduce((sum, h) => sum + h.hours, 0);
  document.getElementById('metric-hours-breakdown').textContent = `Liten: ${litenHours.toFixed(0)}h | Stor: ${storHours.toFixed(0)}h | Störst: ${storstHours.toFixed(0)}h`;
  
  const applyingAssociations = appState.associations.filter(assoc => assoc.applied !== false);
  const nonApplyingAssociations = appState.associations.filter(assoc => assoc.applied === false);
  
  const totalClubs = applyingAssociations.length;
  document.getElementById('metric-total-clubs').textContent = totalClubs;
  
  const totalParticipants = applyingAssociations.reduce((sum, a) => sum + a.participants, 0);
  document.getElementById('metric-total-members').textContent = totalParticipants.toLocaleString('sv-SE');
  
  const totalPoints = applyingAssociations.reduce((sum, a) => sum + a.points, 0);
  document.getElementById('metric-total-points').textContent = totalPoints.toLocaleString('sv-SE');
  
  // Allocation rate is Timmar/Poäng (overall, for general info)
  const rate = totalPoints > 0 ? (totalHoursAvailable / totalPoints) : 0;
  
  const rateMetricEl = document.getElementById('metric-allocation-rate');
  if (rateMetricEl) rateMetricEl.textContent = rate.toFixed(4);
  
  // Toggle export buttons
  const hasData = appState.associations.length > 0;
  document.getElementById('export-xlsx-btn').disabled = !hasData;
  document.getElementById('print-pdf-btn').disabled = !hasData;
  
  if (!hasData) {
    renderTable([]);
    renderCharts([], totalHoursAvailable);
    renderUtilization(0, totalHoursAvailable);
    appState.lastAllocatedData = [];
    return;
  }
  
  // ----------------------------------------------------
  // Apply Historical Adjustment factor to points
  // ----------------------------------------------------
  const adjustByHistorySwitch = document.getElementById('adjust-by-history-switch');
  const adjustByHistory = adjustByHistorySwitch ? adjustByHistorySwitch.checked : false;
  
  appState.associations.forEach(assoc => {
    assoc.rawPoints = assoc.points;
    assoc.adjustedPoints = assoc.points;
    
    if (adjustByHistory && assoc.historicalUsage) {
      const utilRate = assoc.historicalUsage.utilizationRate / 100;
      assoc.adjustedPoints = assoc.points * utilRate;
    }
  });

  let allocatedData = [];
  let totalAllocatedHours = 0;
  const algo = appState.activeAlgo;
  
  // Group applying associations by hallType
  const poolAssocs = {
    sporthall: [],
    fotboll: [],
    is: [],
    simning: []
  };
  applyingAssociations.forEach(assoc => {
    const type = assoc.hallType || 'sporthall';
    if (poolAssocs[type]) {
      poolAssocs[type].push(assoc);
    } else {
      poolAssocs.sporthall.push(assoc);
    }
  });
  
  // Run allocation per pool
  Object.keys(poolAssocs).forEach(poolType => {
    const poolClubs = poolAssocs[poolType];
    const poolHoursAvailable = typeHours[poolType];
    
    if (poolClubs.length === 0 || poolHoursAvailable <= 0) return;
    
    const poolTotalPoints = poolClubs.reduce((sum, c) => sum + c.adjustedPoints, 0);
    
    // Model A: Rent proportionell (Pure Proportional)
    if (algo === 'pure-proportional') {
      poolClubs.forEach(assoc => {
        const share = poolTotalPoints > 0 ? (assoc.adjustedPoints / poolTotalPoints) : 0;
        const hours = poolHoursAvailable * share;
        
        allocatedData.push({
          ...assoc,
          share: share,
          baseHours: 0,
          propHours: hours,
          totalHours: hours
        });
        totalAllocatedHours += hours;
      });
    }
    
    // Model B: Bas + Proportionell (Base + Proportional)
    else if (algo === 'base-proportional') {
      const baseVal = parseFloat(document.getElementById('base-hours-input').value) || 0;
      const requiredBaseHours = poolClubs.length * baseVal;
      
      if (requiredBaseHours > poolHoursAvailable) {
        // Base hours exceed pool available hours: Scale down base hours and set proportional to 0
        const scaledBase = baseVal * (poolHoursAvailable / requiredBaseHours);
        
        poolClubs.forEach(assoc => {
          allocatedData.push({
            ...assoc,
            share: poolTotalPoints > 0 ? (assoc.adjustedPoints / poolTotalPoints) : 0,
            baseHours: scaledBase,
            propHours: 0,
            totalHours: scaledBase
          });
        });
        totalAllocatedHours += poolHoursAvailable;
        
        showBaseHoursWarning(`OBS: Totala bas-timmar (${requiredBaseHours.toFixed(1)}h) överskrider tillgängliga timmar (${poolHoursAvailable.toFixed(1)}h) för ${poolType === 'sporthall' ? 'sporthallar' : poolType === 'is' ? 'ishallar' : poolType === 'fotboll' ? 'fotbollsplaner' : 'simbanor'}. Bas-timmarna har skalats ner.`);
      } else {
        hideBaseHoursWarning();
        const remainingHours = poolHoursAvailable - requiredBaseHours;
        
        poolClubs.forEach(assoc => {
          const share = poolTotalPoints > 0 ? (assoc.adjustedPoints / poolTotalPoints) : 0;
          const propPart = remainingHours * share;
          const total = baseVal + propPart;
          
          allocatedData.push({
            ...assoc,
            share: share,
            baseHours: baseVal,
            propHours: propPart,
            totalHours: total
          });
          totalAllocatedHours += total;
        });
      }
    }
    
    // Model C: Medlemskategorier (Tiered / Brackets by Points)
    else if (algo === 'tiered') {
      let rawTierAllocations = [];
      let sumAssigned = 0;
      
      poolClubs.forEach(assoc => {
        let assignedHours = 0;
        for (let i = 0; i < appState.tiers.length; i++) {
          const tier = appState.tiers[i];
          const prevLimit = i === 0 ? 0 : appState.tiers[i-1].limit;
          if (assoc.adjustedPoints > prevLimit && assoc.adjustedPoints <= tier.limit) {
            assignedHours = tier.hours;
            break;
          }
        }
        
        rawTierAllocations.push({
          ...assoc,
          share: poolTotalPoints > 0 ? (assoc.adjustedPoints / poolTotalPoints) : 0,
          tierHours: assignedHours
        });
        sumAssigned += assignedHours;
      });
      
      if (sumAssigned > poolHoursAvailable) {
        // Bracket hours exceed pool available: Scale down proportionally
        const scale = poolHoursAvailable / sumAssigned;
        rawTierAllocations.forEach(item => {
          const scaledHours = item.tierHours * scale;
          allocatedData.push({
            ...item,
            baseHours: 0,
            propHours: 0,
            totalHours: scaledHours
          });
        });
        totalAllocatedHours += poolHoursAvailable;
      } else {
        // Assign exact hours, keep the rest as unallocated buffer
        rawTierAllocations.forEach(item => {
          allocatedData.push({
            ...item,
            baseHours: 0,
            propHours: 0,
            totalHours: item.tierHours
          });
        });
        totalAllocatedHours += sumAssigned;
      }
    }
  });

  // Add non-applying associations back with 0 hours
  nonApplyingAssociations.forEach(assoc => {
    allocatedData.push({
      ...assoc,
      share: 0,
      baseHours: 0,
      propHours: 0,
      totalHours: 0
    });
  });
  
  appState.lastAllocatedData = allocatedData;
  
  // Sort overall allocatedData by totalHours descending for presentation
  allocatedData.sort((a, b) => b.totalHours - a.totalHours);
  
  // Render Views
  renderTable(allocatedData);
  renderCharts(allocatedData, totalHoursAvailable);
  renderUtilization(totalAllocatedHours, totalHoursAvailable);
  
  // Remaining buffer badge toggle
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
// Views Render Logic
// ==========================================================================
function renderTable(allocatedData) {
  const tableBody = document.getElementById('allocation-table-body');
  const searchVal = document.getElementById('table-search').value.toLowerCase();
  const showBasePropCols = appState.activeAlgo === 'base-proportional';
  
  const totalRawPoints = allocatedData.reduce((sum, item) => sum + item.points, 0);
  const totalAdjustedPoints = allocatedData.reduce((sum, item) => sum + item.adjustedPoints, 0);
  
  const hasHistory = appState.historicalFile !== null;
  const historicalHeaders = hasHistory ? `
    <th class="text-right">Hist. bokning</th>
    <th class="text-right">Utnyttjande</th>
  ` : '';
  
  const basePropHeaders = showBasePropCols ? `
    <th class="text-right">Bas-timmar</th>
    <th class="text-right">Prop-timmar</th>
  ` : '';
  
  let headerHtml = '';
  if (appState.dataType === 'age-template') {
    headerHtml = `
      <tr>
        <th style="width: 50px; text-align: center;">Ansökt</th>
        <th>Förening</th>
        <th class="text-right">5-9 år</th>
        <th class="text-right">10-15 år</th>
        <th class="text-right">16-20 år</th>
        <th class="text-right">Poäng</th>
        <th class="text-right">Andel %</th>
        ${historicalHeaders}
        ${basePropHeaders}
        <th class="text-right">Tilldelad tid</th>
      </tr>
    `;
  } else if (appState.dataType === 'detailed') {
    headerHtml = `
      <tr>
        <th style="width: 50px; text-align: center;">Ansökt</th>
        <th>Förening</th>
        <th>Aktivitet</th>
        <th class="text-right">Flickor</th>
        <th class="text-right">Pojkar</th>
        <th class="text-right">Flickor (funk)</th>
        <th class="text-right">Pojkar (funk)</th>
        <th class="text-right">Deltagare</th>
        <th class="text-right">Poäng</th>
        <th class="text-right">Andel %</th>
        ${historicalHeaders}
        ${basePropHeaders}
        <th class="text-right">Tilldelad tid</th>
      </tr>
    `;
  } else { // 'simple'
    headerHtml = `
      <tr>
        <th style="width: 50px; text-align: center;">Ansökt</th>
        <th>Förening</th>
        <th class="text-right">Medlemsantal</th>
        <th class="text-right">Poäng</th>
        <th class="text-right">Andel %</th>
        ${historicalHeaders}
        ${basePropHeaders}
        <th class="text-right">Tilldelad tid</th>
      </tr>
    `;
  }
  document.getElementById('allocation-table-head').innerHTML = headerHtml;
  
  tableBody.innerHTML = '';
  
  // Calculate total columns span dynamic count
  let totalColsCount = 1; // Ansökt checkbox column
  if (appState.dataType === 'age-template') {
    totalColsCount += 7;
  } else if (appState.dataType === 'detailed') {
    totalColsCount += 10;
  } else {
    totalColsCount += 5;
  }
  if (hasHistory) totalColsCount += 2;
  if (showBasePropCols) totalColsCount += 2;
  
  if (allocatedData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="${totalColsCount}" class="text-center" style="text-align: center; padding: 2rem; color: var(--text-muted);">Inga föreningar inlagda</td></tr>`;
    return;
  }
  
  const hideNotAppliedEl = document.getElementById('hide-not-applied-switch');
  const hideNotApplied = hideNotAppliedEl ? hideNotAppliedEl.checked : false;
  
  const filtered = allocatedData.filter(item => {
    // Filter out if not applied and hideNotApplied switch is active
    if (hideNotApplied && item.applied === false) return false;
    
    const clubMatch = item.name.toLowerCase().includes(searchVal);
    const actMatch = item.activity && item.activity.toLowerCase().includes(searchVal);
    return clubMatch || actMatch;
  });
  
  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="${totalColsCount}" class="text-center" style="text-align: center; padding: 2rem; color: var(--text-muted);">Inga matchande föreningar hittades</td></tr>`;
    return;
  }
  
  filtered.forEach(item => {
    const row = document.createElement('tr');
    
    // Highlight or dim rows that did not apply
    if (item.applied === false) {
      row.style.opacity = '0.45';
      row.style.background = 'rgba(255, 255, 255, 0.01)';
    }
    
    // Use adjusted points for percentage share if historical adjustment is on
    const sharePct = totalAdjustedPoints > 0 
      ? ((item.adjustedPoints / totalAdjustedPoints) * 100).toFixed(2) + '%' 
      : '0.00%';
      
    const isPointsAdjusted = Math.abs(item.points - item.adjustedPoints) > 0.01;
    const pointsDisplay = isPointsAdjusted
      ? `${parseFloat(item.adjustedPoints.toFixed(1)).toLocaleString('sv-SE')} <span style="font-size: 0.75rem; opacity: 0.6; text-decoration: line-through; margin-left: 0.25rem;">${parseFloat(item.points.toFixed(1)).toLocaleString('sv-SE')}</span>`
      : parseFloat(item.points.toFixed(1)).toLocaleString('sv-SE');
      
    const baseHoursCell = showBasePropCols ? `<td class="text-right">${item.baseHours.toFixed(1)}h</td>` : '';
    const propHoursCell = showBasePropCols ? `<td class="text-right">${item.propHours.toFixed(1)}h</td>` : '';
    
    // Checkbox column
    const appliedChecked = item.applied !== false ? 'checked' : '';
    const checkboxHtml = `
      <td style="text-align: center; vertical-align: middle; padding: 0.5rem; width: 50px;">
        <div class="checkbox-custom-wrapper" style="margin: 0 auto; display: inline-block;">
          <input type="checkbox" class="assoc-apply-checkbox" ${appliedChecked} data-key="${item.name}||${item.activity || ''}">
          <span class="checkbox-custom"></span>
        </div>
      </td>
    `;
    
    // Historical cells
    let historicalCells = '';
    if (hasHistory) {
      if (item.historicalUsage) {
        const histBooked = item.historicalUsage.bookedTime;
        const histUtil = item.historicalUsage.utilizationRate;
        const isLowUtil = histUtil < 75;
        
        const utilStr = isLowUtil 
          ? `<span style="color: #ef4444; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;" title="Lågt utnyttjande (<75%)"><i data-lucide="alert-triangle" style="width: 14px; height: 14px;"></i>${histUtil.toFixed(1)}%</span>`
          : `<span style="color: #10b981; font-weight: 500;">${histUtil.toFixed(1)}%</span>`;
          
        historicalCells = `
          <td class="text-right">${histBooked.toFixed(1)}h</td>
          <td class="text-right">${utilStr}</td>
        `;
      } else {
        historicalCells = `
          <td class="text-right" style="color: var(--text-muted);">-</td>
          <td class="text-right" style="color: var(--text-muted);" title="Saknar historik, beräknas på 100%">100% <span style="font-size: 0.75rem; opacity: 0.6;">(ny)</span></td>
        `;
      }
    }
    
    if (appState.dataType === 'age-template') {
      row.innerHTML = `
        ${checkboxHtml}
        <td style="font-weight: 600;">${item.name}</td>
        <td class="text-right">${(item.c5_9 || 0).toLocaleString('sv-SE')}</td>
        <td class="text-right">${(item.c10_15 || 0).toLocaleString('sv-SE')}</td>
        <td class="text-right">${(item.c16_20 || 0).toLocaleString('sv-SE')}</td>
        <td class="text-right" style="font-weight: 600; color: #cbd5e1;">${pointsDisplay}</td>
        <td class="text-right">${sharePct}</td>
        ${historicalCells}
        ${baseHoursCell}
        ${propHoursCell}
        <td class="text-right" style="font-weight: 700; color: var(--brand-gold);">${item.totalHours.toFixed(1)}h</td>
      `;
    } else if (appState.dataType === 'detailed') {
      row.innerHTML = `
        ${checkboxHtml}
        <td style="font-weight: 600;">${item.name}</td>
        <td>${item.activity}</td>
        <td class="text-right">${(item.girls || 0).toLocaleString('sv-SE')}</td>
        <td class="text-right">${(item.boys || 0).toLocaleString('sv-SE')}</td>
        <td class="text-right">${(item.girlsDisability || 0).toLocaleString('sv-SE')}</td>
        <td class="text-right">${(item.boysDisability || 0).toLocaleString('sv-SE')}</td>
        <td class="text-right" style="font-weight: 500;">${item.participants.toLocaleString('sv-SE')}</td>
        <td class="text-right" style="font-weight: 600; color: #cbd5e1;">${pointsDisplay}</td>
        <td class="text-right">${sharePct}</td>
        ${historicalCells}
        ${baseHoursCell}
        ${propHoursCell}
        <td class="text-right" style="font-weight: 700; color: var(--brand-gold);">${item.totalHours.toFixed(1)}h</td>
      `;
    } else { // 'simple'
      row.innerHTML = `
        ${checkboxHtml}
        <td style="font-weight: 600;">${item.name}</td>
        <td class="text-right">${item.participants.toLocaleString('sv-SE')}</td>
        <td class="text-right" style="font-weight: 600; color: #cbd5e1;">${pointsDisplay}</td>
        <td class="text-right">${sharePct}</td>
        ${historicalCells}
        ${baseHoursCell}
        ${propHoursCell}
        <td class="text-right" style="font-weight: 700; color: var(--brand-gold);">${item.totalHours.toFixed(1)}h</td>
      `;
    }
    tableBody.appendChild(row);
  });
  
  // Bind change event to checkboxes
  tableBody.querySelectorAll('.assoc-apply-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.getAttribute('data-key');
      const isChecked = cb.checked;
      
      if (isChecked) {
        appState.excludedAssociations.delete(key);
      } else {
        appState.excludedAssociations.add(key);
      }
      
      runAggregation();
    });
  });
  
  // Re-create lucide icons for dynamic warning icons
  lucide.createIcons();
}

function renderCharts(allocatedData, totalHours) {
  const barCanvas = document.getElementById('hours-bar-chart');
  const scatterCanvas = document.getElementById('ratio-scatter-chart');
  
  if (barChartInstance) barChartInstance.destroy();
  if (scatterChartInstance) scatterChartInstance.destroy();
  
  if (allocatedData.length === 0) return;
  
  // 1. Prepare Bar Chart Data (Top 12)
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
        backgroundColor: 'rgba(15, 76, 129, 0.75)',
        borderColor: '#3b82f6',
        borderWidth: 1.5,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(245, 166, 35, 0.85)',
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
  
  // 2. Prepare Scatter Plot of Points (X) vs. Allocated Hours (Y)
  const scatterPoints = allocatedData.map(item => ({
    x: item.points,
    y: parseFloat(item.totalHours.toFixed(1)),
    name: item.name
  }));
  
  scatterChartInstance = new Chart(scatterCanvas, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Föreningar',
        data: scatterPoints,
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
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
              return `${pt.name}: ${pt.x.toLocaleString('sv-SE')} poäng, ${pt.y}h/vecka`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          title: { display: true, text: 'Poängsumma (antal)' }
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
  const overallPercent = totalHoursAvailable > 0 ? (allocatedHours / totalHoursAvailable) * 100 : 0;
  
  // Update overall progress ring
  const updateRing = (ringId, textId, allocated, total) => {
    const ring = document.getElementById(ringId);
    const textEl = document.getElementById(textId);
    if (!ring || !textEl) return;
    
    const percent = total > 0 ? Math.min(100, (allocated / total) * 100) : 0;
    textEl.textContent = `${Math.round(percent)}%`;
    
    const circ = 314.16; // 2 * PI * r = 2 * 3.1416 * 50
    const offset = circ - (percent / 100) * circ;
    ring.style.strokeDashoffset = offset;
  };
  
  // 1. Overall Ring (Circumference = 314.16 since r=50 in svg)
  updateRing('utilization-progress', 'utilization-percentage', allocatedHours, totalHoursAvailable);
  document.getElementById('util-allocated-hours').textContent = `${allocatedHours.toFixed(1)}h`;
  document.getElementById('util-total-hours').textContent = `${totalHoursAvailable.toFixed(0)}h`;
  
  // Calculate size breakdowns
  const getCapacity = (size) => appState.halls.filter(h => h.active && h.size === size).reduce((sum, h) => sum + h.hours, 0);
  
  const capLiten = getCapacity('liten');
  const capStor = getCapacity('stor');
  const capStorst = getCapacity('storst');
  
  // Allocate pro-rata from shared pool
  const allocLiten = totalHoursAvailable > 0 ? (allocatedHours * (capLiten / totalHoursAvailable)) : 0;
  const allocStor = totalHoursAvailable > 0 ? (allocatedHours * (capStor / totalHoursAvailable)) : 0;
  const allocStorst = totalHoursAvailable > 0 ? (allocatedHours * (capStorst / totalHoursAvailable)) : 0;
  
  // 2. Triple Small Rings
  updateRing('utilization-progress-storst', 'util-percentage-storst', allocStorst, capStorst);
  document.getElementById('util-allocated-storst').textContent = `${allocStorst.toFixed(1)}h`;
  document.getElementById('util-total-storst').textContent = `${capStorst.toFixed(0)}h`;
  
  updateRing('utilization-progress-stor', 'util-percentage-stor', allocStor, capStor);
  document.getElementById('util-allocated-stor').textContent = `${allocStor.toFixed(1)}h`;
  document.getElementById('util-total-stor').textContent = `${capStor.toFixed(0)}h`;
  
  updateRing('utilization-progress-liten', 'util-percentage-liten', allocLiten, capLiten);
  document.getElementById('util-allocated-liten').textContent = `${allocLiten.toFixed(1)}h`;
  document.getElementById('util-total-liten').textContent = `${capLiten.toFixed(0)}h`;
  
  // 3. Render List of individual sporthall load shares
  const listContainer = document.getElementById('halls-util-list');
  listContainer.innerHTML = '';
  
  const activeHalls = appState.halls.filter(h => h.active);
  
  if (activeHalls.length === 0) {
    listContainer.innerHTML = `<p style="padding: 1rem; color: var(--text-muted); font-size: 0.85rem; text-align: center;">Inga aktiva sporthallar</p>`;
    return;
  }
  
  // Sort halls by size descending (storst, stor, liten)
  const sizeWeight = { storst: 3, stor: 2, liten: 1 };
  activeHalls.sort((a, b) => sizeWeight[b.size] - sizeWeight[a.size]);
  
  activeHalls.forEach(hall => {
    const estLoaded = totalHoursAvailable > 0 ? (allocatedHours * (hall.hours / totalHoursAvailable)) : 0;
    const hallPercent = hall.hours > 0 ? Math.min(100, (estLoaded / hall.hours) * 100) : 0;
    
    const itemDiv = document.createElement('div');
    itemDiv.className = 'util-list-item';
    itemDiv.innerHTML = `
      <div class="util-item-header">
        <span>${hall.name} <span class="size-badge size-${hall.size}" style="margin-left: 0.5rem; transform: scale(0.85);">${hall.size}</span></span>
        <span>${estLoaded.toFixed(1)}h / ${hall.hours.toFixed(1)}h (${Math.round(hallPercent)}%)</span>
      </div>
      <div class="util-item-bar-track">
        <div class="util-item-bar-fill" style="width: ${hallPercent}%"></div>
      </div>
    `;
    listContainer.appendChild(itemDiv);
  });
}

// ==========================================================================
// Excel Export Logic (Two Sheets workbook)
// ==========================================================================
function exportExcel(allocatedData) {
  if (allocatedData.length === 0) return;
  
  // 1. Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // ----------------------------------------------------
  // Flik 1: Hallfördelning (Detailed allocation results)
  // ----------------------------------------------------
  let headers = [];
  let rows = [];
  
  const totalAdjustedPoints = allocatedData.reduce((sum, item) => sum + item.adjustedPoints, 0);
  const hasHistory = appState.historicalFile !== null;
  
  if (appState.dataType === 'age-template') {
    headers = [
      'Organization',
      'Status',
      '5-9 år',
      '10-15 år',
      '16-20 år',
      'Poäng',
      'Andel %',
      ...(hasHistory ? ['Historisk bokad tid (h/vecka)', 'Historiskt utnyttjande (%)'] : []),
      'Tilldelade tider'
    ];
    rows = allocatedData.map(item => {
      const rowData = [
        item.name,
        item.applied !== false ? 'Ansökt' : 'Söker ej',
        item.c5_9 || 0,
        item.c10_15 || 0,
        item.c16_20 || 0,
        parseFloat(item.adjustedPoints.toFixed(1)),
        parseFloat(((totalAdjustedPoints > 0 ? (item.adjustedPoints / totalAdjustedPoints) : 0) * 100).toFixed(2))
      ];
      if (hasHistory) {
        if (item.historicalUsage) {
          rowData.push(
            parseFloat(item.historicalUsage.bookedTime.toFixed(1)),
            parseFloat(item.historicalUsage.utilizationRate.toFixed(1))
          );
        } else {
          rowData.push(0, 100);
        }
      }
      rowData.push(parseFloat(item.totalHours.toFixed(1)));
      return rowData;
    });
  } else if (appState.dataType === 'detailed') {
    headers = [
      'Förening', 
      'Aktivitet', 
      'Status',
      'Flickor (antal)', 
      'Pojkar (antal)', 
      'Flickor funktionsnedsättning (antal)', 
      'Pojkar funktionsnedsättning (antal)', 
      'Totalt antal deltagare', 
      'Poäng', 
      'Andel poäng (%)', 
      ...(hasHistory ? ['Historisk bokad tid (h/vecka)', 'Historiskt utnyttjande (%)'] : []),
      'Tilldelad tid (h/vecka)'
    ];
    rows = allocatedData.map(item => {
      const rowData = [
        item.name,
        item.activity || 'N/A',
        item.applied !== false ? 'Ansökt' : 'Söker ej',
        item.girls || 0,
        item.boys || 0,
        item.girlsDisability || 0,
        item.boysDisability || 0,
        item.participants || 0,
        parseFloat(item.adjustedPoints.toFixed(1)),
        parseFloat(((totalAdjustedPoints > 0 ? (item.adjustedPoints / totalAdjustedPoints) : 0) * 100).toFixed(2))
      ];
      if (hasHistory) {
        if (item.historicalUsage) {
          rowData.push(
            parseFloat(item.historicalUsage.bookedTime.toFixed(1)),
            parseFloat(item.historicalUsage.utilizationRate.toFixed(1))
          );
        } else {
          rowData.push(0, 100);
        }
      }
      rowData.push(parseFloat(item.totalHours.toFixed(1)));
      return rowData;
    });
  } else { // 'simple'
    headers = [
      'Förening',
      'Status',
      'Medlemsantal',
      'Poäng',
      'Andel poäng (%)',
      ...(hasHistory ? ['Historisk bokad tid (h/vecka)', 'Historiskt utnyttjande (%)'] : []),
      'Tilldelad tid (h/vecka)'
    ];
    rows = allocatedData.map(item => {
      const rowData = [
        item.name,
        item.applied !== false ? 'Ansökt' : 'Söker ej',
        item.participants || 0,
        parseFloat(item.adjustedPoints.toFixed(1)),
        parseFloat(((totalAdjustedPoints > 0 ? (item.adjustedPoints / totalAdjustedPoints) : 0) * 100).toFixed(2))
      ];
      if (hasHistory) {
        if (item.historicalUsage) {
          rowData.push(
            parseFloat(item.historicalUsage.bookedTime.toFixed(1)),
            parseFloat(item.historicalUsage.utilizationRate.toFixed(1))
          );
        } else {
          rowData.push(0, 100);
        }
      }
      rowData.push(parseFloat(item.totalHours.toFixed(1)));
      return rowData;
    });
  }
  
  const sheet1Data = [headers, ...rows];
  const wsAlloc = XLSX.utils.aoa_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, wsAlloc, 'Hallfördelning');
  
  // ----------------------------------------------------
  // Flik 2: Sporthallar (Active halls list)
  // ----------------------------------------------------
  const hallHeaders = ['Sporthall', 'Storleksklass', 'Tillgängliga bokningstimmar/vecka', 'Status'];
  const hallRows = appState.halls.map(h => [
    h.name,
    h.size.toUpperCase(),
    h.hours,
    h.active ? 'Aktiv' : 'Inaktiv'
  ]);
  
  const sheet2Data = [hallHeaders, ...hallRows];
  const wsHalls = XLSX.utils.aoa_to_sheet(sheet2Data);
  XLSX.utils.book_append_sheet(wb, wsHalls, 'Sporthallar');
  
  // 5. Download workbook
  const filename = `hallfordelning_uppsala_${appState.activeAlgo}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
