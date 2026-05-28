// Unit test for Uppsala Sports Hall Allocator algorithms
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
global.lucide = { createIcons: () => {} };
global.Chart = class {
  constructor() {}
  destroy() {}
  static defaults = { color: '', font: {} };
};
global.XLSX = {};

// Load app.js code by executing it
const appJsPath = path.join(__dirname, 'app.js');
let appJsCode = fs.readFileSync(appJsPath, 'utf8');

// Expose variables and functions to global context for Node execution
appJsCode = appJsCode
  .replace('const appState =', 'global.appState =')
  .replace('function updateAllocation()', 'global.updateAllocation = function()')
  .replace('function processRawRows(rawRows)', 'global.processRawRows = function(rawRows)')
  .replace('function showColumnMapper(headers)', 'global.showColumnMapper = function(headers)')
  .replace('function handleApplyMapping()', 'global.handleApplyMapping = function()');

// Evaluate app.js in global context
eval(appJsCode);

// Helper to check assertion
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
}

console.log("Starting algorithm tests...");

// Setup mock halls and associations
appState.halls = [
  { id: 'hall1', name: 'Hall 1', hours: 40, active: true },
  { id: 'hall2', name: 'Hall 2', hours: 60, active: true },
  { id: 'hall3', name: 'Hall 3', hours: 50, active: false } // Inactive
];

// Total active hours = 40 + 60 = 100 hours
appState.associations = [
  { name: 'Klubb Stor', members: 600 },
  { name: 'Klubb Mellan', members: 300 },
  { name: 'Klubb Liten', members: 100 }
]; // Total members = 1000

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
// Test Case 2: Base + Proportional (Base = 2h)
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
// Test Case 3: Tiered (Medlemskategorier)
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

// Klubb Stor: 600 members -> > 500 members -> matches last bracket (Stor) -> 30h
const klStorTier = result.find(i => i.name === 'Klubb Stor');
assert(klStorTier.totalHours === 30, `Klubb Stor (Tiered) should get 30h, got ${klStorTier.totalHours}`);

// Klubb Mellan: 300 members -> matches Mellan -> 15h
const klMellanTier = result.find(i => i.name === 'Klubb Mellan');
assert(klMellanTier.totalHours === 15, `Klubb Mellan (Tiered) should get 15h, got ${klMellanTier.totalHours}`);

// Klubb Liten: 100 members -> matches Liten -> 5h
const klLitenTier = result.find(i => i.name === 'Klubb Liten');
assert(klLitenTier.totalHours === 5, `Klubb Liten (Tiered) should get 5h, got ${klLitenTier.totalHours}`);

// Sum allocated = 30 + 15 + 5 = 50h <= 100h. No scaling required.
const sumTierAllocated = result.reduce((sum, item) => sum + item.totalHours, 0);
assert(sumTierAllocated === 50, `Total tiered hours should be 50, got ${sumTierAllocated}`);

console.log("✅ Tiered (Within Hours) passed.");

// ----------------------------------------------------
// Test Case 4: Tiered Algorithm (Exceeding Hours - Scaling Down)
// ----------------------------------------------------
console.log("Testing Tiered Algorithm (Exceeding Hours - Scaling Down)...");
// Set total available hours to 40h (change active halls)
appState.halls = [
  { id: 'hall1', name: 'Hall 1', hours: 40, active: true }
]; // Total available = 40h. Total required tiers = 50h. Scale = 40/50 = 0.8.
updateAllocation();
result = appState.lastAllocatedData;

// Klubb Stor: 30h * 0.8 = 24h
const klStorTierScaled = result.find(i => i.name === 'Klubb Stor');
assert(Math.abs(klStorTierScaled.totalHours - 24) < 0.001, `Klubb Stor (Tiered Scaled) should get 24h, got ${klStorTierScaled.totalHours}`);

// Klubb Liten: 5h * 0.8 = 4h
const klLitenTierScaled = result.find(i => i.name === 'Klubb Liten');
assert(Math.abs(klLitenTierScaled.totalHours - 4) < 0.001, `Klubb Liten (Tiered Scaled) should get 4h, got ${klLitenTierScaled.totalHours}`);

console.log("✅ Tiered (Scaled Down) passed.");

// ----------------------------------------------------
// Test Case 5: File Parsing & Column Mapping Autodetection
// ----------------------------------------------------
console.log("Testing File Parsing & Column Mapping...");

// Mock showColumnMapper to capture detected headers and settings
let capturedHeaders = null;
global.showColumnMapper = (headers) => {
  capturedHeaders = headers;
};

// Raw rows simulating Excel parsing: [Header, Data...]
const mockExcelRows = [
  [], // Empty row at top
  ["Klubbnamn", "Antal Medlemmar", "Ort"], // Header row
  ["Uppsala Basket", 850, "Uppsala"],
  ["FBC Uppsala", 620, "Uppsala"],
  ["Uppsala Handboll", 430, "Uppsala"]
];

global.processRawRows(mockExcelRows);

assert(capturedHeaders !== null, "Should identify headers and show mapper");
assert(capturedHeaders[0] === "Klubbnamn", "Should extract header 1 correctly");
assert(capturedHeaders[1] === "Antal Medlemmar", "Should extract header 2 correctly");

// Test mapping application for "summary-list"
// Mock mapper selection fields
global.document.getElementById = (id) => {
  const el = createMockElement();
  if (id === 'map-club-col') el.value = '0'; // index of Klubbnamn
  if (id === 'map-members-col') el.value = '1'; // index of Antal Medlemmar
  if (id === 'base-hours-input') el.value = '2';
  return el;
};

global.document.querySelector = (selector) => {
  const el = createMockElement();
  if (selector === 'input[name="data-format"]:checked') {
    el.value = 'summary-list';
  }
  return el;
};

global.handleApplyMapping();

assert(appState.associations.length === 3, "Should parse 3 associations");
const mockBasket = appState.associations.find(a => a.name === "Uppsala Basket");
assert(mockBasket !== undefined, "Should contain Uppsala Basket");
assert(mockBasket.members === 850, `Uppsala Basket should have 850 members, got ${mockBasket.members}`);

console.log("✅ File Parsing & Column Mapping passed.");

console.log("\n⭐ ALL ALGORITHM & FILE PARSING UNIT TESTS PASSED SUCCESSFULLY! ⭐");
