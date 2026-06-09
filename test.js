// Unit test for Uppsala Sports Hall Allocator - Phase 2 (Multi-File & Arena Sizes)
const fs = require('fs');
const path = require('path');

// 1. Mock browser globals to load app.js in Node
const createMockElement = (tagName = 'div') => {
  return {
    tagName: tagName.toUpperCase(),
    className: '',
    innerHTML: '',
    style: {},
    classList: {
      add: () => {},
      remove: () => {}
    },
    appendChild: () => {},
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    remove: () => {},
    value: '',
    textContent: '',
    setAttribute: () => {}
  };
};

global.window = { addEventListener: () => {} };
global.document = {
  addEventListener: () => {},
  createElement: createMockElement,
  getElementById: (id) => {
    const el = createMockElement();
    if (id === 'base-hours-input') {
      el.value = '2';
    }
    return el;
  },
  querySelectorAll: () => [],
  querySelector: () => createMockElement(),
  getElementsByName: () => []
};
global.navigator = {};
global.alert = () => {};
global.lucide = { createIcons: () => {} };
global.Chart = class {
  constructor() {}
  destroy() {}
  static defaults = { color: '', font: {} };
};
global.XLSX = {
  utils: {
    book_new: () => ({ SheetNames: [], Sheets: {} }),
    aoa_to_sheet: () => ({}),
    book_append_sheet: () => {}
  },
  writeFile: () => {}
};

// Load app.js code by executing it
const appJsPath = path.join(__dirname, 'app.js');
let appJsCode = fs.readFileSync(appJsPath, 'utf8');

// Expose variables and functions to global context for Node execution
appJsCode = appJsCode
  .replace('const appState =', 'global.appState =')
  .replace('let currentFileData =', 'global.currentFileData =')
  .replace('function updateAllocation()', 'global.updateAllocation = function()')
  .replace('function processRawFile(rawRows)', 'global.processRawFile = function(rawRows)')
  .replace('function showColumnMapper(headers)', 'global.showColumnMapper = function(headers)')
  .replace('function handleApplyMapping()', 'global.handleApplyMapping = function()')
  .replace('function aggregateAndAllocate()', 'global.aggregateAndAllocate = function()')
  .replace('function importHallsData()', 'global.importHallsData = function()');

// Evaluate app.js in global context
eval(appJsCode);

// Helper to check assertion
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
}

console.log("Starting Uppsala Sports Hall Allocator Phase 2 Tests...");

// Setup mock halls and associations
appState.halls = [
  { id: 'hall1', name: 'Hall 1', hours: 40, size: 'storst', active: true },
  { id: 'hall2', name: 'Hall 2', hours: 60, size: 'stor', active: true },
  { id: 'hall3', name: 'Hall 3', hours: 50, size: 'liten', active: false } // Inactive
];

// Total active hours = 40 + 60 = 100 hours
appState.associations = [
  { name: 'Klubb Stor', participants: 600, points: 600, activities: 'Fotboll', girls: 300, boys: 300 },
  { name: 'Klubb Mellan', participants: 300, points: 300, activities: 'Basket', girls: 150, boys: 150 },
  { name: 'Klubb Liten', participants: 100, points: 100, activities: 'Handboll', girls: 50, boys: 50 }
]; // Total points = 1000

// ----------------------------------------------------
// Test Case 1: Pure Proportional
// ----------------------------------------------------
console.log("Testing Pure Proportional Algorithm...");
appState.activeAlgo = 'pure-proportional';
updateAllocation();

let result = appState.lastAllocatedData;
assert(result.length === 3, "Should allocate for all 3 associations");

const totalAllocated = result.reduce((sum, item) => sum + item.totalHours, 0);
assert(Math.abs(totalAllocated - 100) < 0.001, `Total allocated hours should be 100, got ${totalAllocated}`);

// Klubb Stor should get 60% of hours (60h)
const klStor = result.find(i => i.name === 'Klubb Stor');
assert(Math.abs(klStor.totalHours - 60) < 0.001, `Klubb Stor should get 60h, got ${klStor.totalHours}`);

// Klubb Liten should get 10% of hours (10h)
const klLiten = result.find(i => i.name === 'Klubb Liten');
assert(Math.abs(klLiten.totalHours - 10) < 0.001, `Klubb Liten should get 10h, got ${klLiten.totalHours}`);

console.log("✅ Pure Proportional passed.");

// ----------------------------------------------------
// Test Case 2: Base + Proportional (Base = 10h)
// ----------------------------------------------------
console.log("Testing Base + Proportional Algorithm...");
appState.activeAlgo = 'base-proportional';
// Mock base hours input element
document.getElementById = (id) => {
  const el = createMockElement();
  if (id === 'base-hours-input') el.value = '10'; // Garanterade 10h per klubb => total base = 30h
  return el;
};

updateAllocation();
result = appState.lastAllocatedData;

// Total active hours = 100h. Base hours = 10h per association. Sum of base = 30h. Remaining = 70h.
// Klubb Stor: 10h (base) + 70h * 0.6 = 10 + 42 = 52h
const klStorBase = result.find(i => i.name === 'Klubb Stor');
assert(Math.abs(klStorBase.totalHours - 52) < 0.001, `Klubb Stor (Base+Prop) should get 52h, got ${klStorBase.totalHours}`);

// Klubb Liten: 10h (base) + 70h * 0.1 = 10 + 7 = 17h
const klLitenBase = result.find(i => i.name === 'Klubb Liten');
assert(Math.abs(klLitenBase.totalHours - 17) < 0.001, `Klubb Liten (Base+Prop) should get 17h, got ${klLitenBase.totalHours}`);

console.log("✅ Base + Proportional passed.");

// ----------------------------------------------------
// Test Case 3: Tiered (Medlemskategorier based on points)
// ----------------------------------------------------
console.log("Testing Tiered Algorithm (Within Available Hours)...");
appState.activeAlgo = 'tiered';
appState.tiers = [
  { label: 'Liten', limit: 100, hours: 5 },
  { label: 'Mellan', limit: 500, hours: 15 },
  { label: 'Stor', limit: Infinity, hours: 30 }
];

updateAllocation();
result = appState.lastAllocatedData;

// Klubb Stor: 600 points -> > 500 points -> matches last bracket (Stor) -> 30h
const klStorTier = result.find(i => i.name === 'Klubb Stor');
assert(klStorTier.totalHours === 30, `Klubb Stor (Tiered) should get 30h, got ${klStorTier.totalHours}`);

// Klubb Mellan: 300 points -> matches Mellan -> 15h
const klMellanTier = result.find(i => i.name === 'Klubb Mellan');
assert(klMellanTier.totalHours === 15, `Klubb Mellan (Tiered) should get 15h, got ${klMellanTier.totalHours}`);

// Klubb Liten: 100 points -> matches Liten -> 5h
const klLitenTier = result.find(i => i.name === 'Klubb Liten');
assert(klLitenTier.totalHours === 5, `Klubb Liten (Tiered) should get 5h, got ${klLitenTier.totalHours}`);

console.log("✅ Tiered (Within Hours) passed.");

// ----------------------------------------------------
// Test Case 4: File Column Mapping & Autodetection
// ----------------------------------------------------
console.log("Testing File Parsing & Column Mapping...");

let capturedHeaders = null;
global.showColumnMapper = (headers) => {
  capturedHeaders = headers;
};

// Simulation of raw Excel data rows
const mockExcelRows = [
  [], // Empty
  ["Förening", "Ort", "Aktivitet", "Antal unika flickor", "Antal unika pojkar", "Totalt deltagare"], // Headers
  ["Uppsala Basket", "Uppsala", "Basket", 150, 150, 300],
  ["IK Sirius", "Uppsala", "Fotboll", 200, 300, 500]
];

// Mock pending filename
appState.pendingFileName = "summering unika deltagare 2025 (7-12 år).xlsx";
appState.pendingFileSize = "14.2 KB";

global.processRawFile(mockExcelRows);

assert(capturedHeaders !== null, "Should identify headers and show mapper");
assert(capturedHeaders[0] === "Förening", "Should extract header 0 correctly");
assert(capturedHeaders[5] === "Totalt deltagare", "Should extract header 5 correctly");

// Mock document setup to read mapping options
global.document.getElementById = (id) => {
  const el = createMockElement();
  if (id === 'map-club-col') el.value = '0';
  if (id === 'map-activity-col') el.value = '2';
  if (id === 'map-girls-col') el.value = '3';
  if (id === 'map-boys-col') el.value = '4';
  if (id === 'map-total-col') el.value = '5';
  if (id === 'base-hours-input') el.value = '2';
  return el;
};

global.document.querySelector = (selector) => {
  const el = createMockElement();
  if (selector === 'input[name="data-format"]:checked') {
    el.value = 'detailed-list';
  }
  return el;
};

// Apply mapping should parse the file and add it to appState.files
global.handleApplyMapping();

assert(appState.files.length === 1, "Should add 1 file to appState.files");
const file = appState.files[0];
assert(file.multiplier === 2, `File multiplier should be 2, got ${file.multiplier}`);
assert(file.records.length === 2, "Should parse 2 records from mock Excel");

const recordBasket = file.records.find(r => r.club === "Uppsala Basket");
assert(recordBasket !== undefined, "Should contain Uppsala Basket");
assert(recordBasket.girls === 150, "Should read girls count");
assert(recordBasket.total === 300, "Should read total count");

console.log("✅ File Parsing & Column Mapping passed.");

// ----------------------------------------------------
// Test Case 5: Multi-File Merging and Aggregation
// ----------------------------------------------------
console.log("Testing Multi-File Merging & Aggregation...");
appState.files = []; // Reset

// File 1: 7-12 years (multiplier 2)
appState.files.push({
  id: 'file-1',
  name: 'summering unika deltagare 2025 (7-12 år).xlsx',
  size: '10 KB',
  records: [
    { club: 'Uppsala Basket', activity: 'Basket', girls: 20, boys: 20, girlsDisability: 1, boysDisability: 1, total: 40 }
  ],
  multiplier: 2,
  ageGroup: '7-12 år'
});

// File 2: 13-16 years (multiplier 3)
appState.files.push({
  id: 'file-2',
  name: 'summering unika deltagare 2025 (13-16 år).xlsx',
  size: '12 KB',
  records: [
    { club: 'Uppsala Basket', activity: 'Basket', girls: 10, boys: 10, girlsDisability: 0, boysDisability: 0, total: 20 },
    { club: 'IK Sirius', activity: 'Fotboll', girls: 0, boys: 0, girlsDisability: 0, boysDisability: 0, total: 50 }
  ],
  multiplier: 3,
  ageGroup: '13-16 år'
});

global.aggregateAndAllocate();

assert(appState.associations.length === 2, "Should aggregate into 2 unique associations");

const mergedBasket = appState.associations.find(a => a.name === "Uppsala Basket");
assert(mergedBasket !== undefined, "Should contain Uppsala Basket");
// Total participants: 40 + 20 = 60
assert(mergedBasket.participants === 60, `Participants should be 60, got ${mergedBasket.participants}`);
// Total points: 40 * 2 (File 1) + 20 * 3 (File 2) = 80 + 60 = 140 points
assert(mergedBasket.points === 140, `Points should be 140, got ${mergedBasket.points}`);

const mergedSirius = appState.associations.find(a => a.name === "IK Sirius");
assert(mergedSirius !== undefined, "Should contain IK Sirius");
// Total points: 50 * 3 = 150 points
assert(mergedSirius.points === 150, `Sirius points should be 150, got ${mergedSirius.points}`);

console.log("✅ Multi-File Merging & Aggregation passed.");

// ----------------------------------------------------
// Test Case 6: Sports Arena Size Import
// ----------------------------------------------------
console.log("Testing Sports Arena Size Import...");
appState.halls = []; // Clear

const mockHallsRows = [
  ["Sporthall", "Storlek / Kategori", "Bokningstimmar/vecka"],
  ["IFU Arena A", "Störst", "45"],
  ["Rosendalshallen B", "Stor", "35"],
  ["Gympasal Skola", "Liten", "15"]
];

global.currentFileData = {
  name: 'halls.xlsx',
  size: '12 KB',
  headers: mockHallsRows[0],
  rows: mockHallsRows.slice(1)
};

global.importHallsData();

assert(appState.halls.length === 3, "Should import 3 halls");

const hall1 = appState.halls.find(h => h.name === "IFU Arena A");
assert(hall1 !== undefined, "Should import IFU Arena A");
assert(hall1.size === "storst", `IFU Arena A size should be storst, got ${hall1.size}`);
assert(hall1.hours === 45, `IFU Arena A hours should be 45, got ${hall1.hours}`);

const hall2 = appState.halls.find(h => h.name === "Rosendalshallen B");
assert(hall2.size === "stor", `Rosendalshallen B size should be stor, got ${hall2.size}`);

const hall3 = appState.halls.find(h => h.name === "Gympasal Skola");
assert(hall3.size === "liten", `Gympasal Skola size should be liten, got ${hall3.size}`);

console.log("✅ Sports Arena Size Import passed.");

console.log("\n⭐ ALL PHASE 2 UNIT TESTS PASSED SUCCESSFULLY! ⭐");
