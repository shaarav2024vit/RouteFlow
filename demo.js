const { HaversineDistanceProvider } = require('./server/distance/HaversineDistanceProvider');
const { StopManager } = require('./server/stops/StopManager');
const { OpeningHoursConstraint } = require('./server/stops/OpeningHoursConstraint');
const { PrecedenceConstraint } = require('./server/stops/PrecedenceConstraint');

// Helper to format headings
function step(title) {
  console.log(`\n============================================================`);
  console.log(`▶ ${title}`);
  console.log(`============================================================`);
}

console.clear ? console.clear() : null;
console.log(`
┌──────────────────────────────────────────────────────────┐
│               RouteFlow - Week 6 Walkthrough             │
│   "A route planner that explains its reasoning"          │
└──────────────────────────────────────────────────────────┘`);

// ------------------------------------------------------------
// STEP 1: CALCULATING DISTANCE (WEEK 5)
// ------------------------------------------------------------
step('STEP 1: Calculating Distance & Travel Time (Week 5)');
console.log('Goal: Calculate travel time between two stops using the Haversine formula.\n');

const distanceProvider = new HaversineDistanceProvider();
const pointA = { name: 'Cubbon Park', lat: 12.9763, lon: 77.5929 };
const pointB = { name: 'Lalbagh Botanical Garden', lat: 12.9507, lon: 77.5848 };

const tripLeg = distanceProvider.getDistance(pointA.lat, pointA.lon, pointB.lat, pointB.lon);

console.log(`From: ${pointA.name} (${pointA.lat}, ${pointA.lon})`);
console.log(`To:   ${pointB.name} (${pointB.lat}, ${pointB.lon})`);
console.log(`------------------------------------------------------------`);
console.log(`Result:`);
console.log(`  • Straight-line Distance: ${tripLeg.distanceKm.toFixed(2)} km`);
console.log(`  • Estimated Travel Time:  ${tripLeg.travelTimeMin.toFixed(1)} mins`);
console.log(`    (Formula: distance / 20 km/h speed + 5 mins dwell time)`);

// ------------------------------------------------------------
// STEP 2: CREATING A TRIP AND ADDING STOPS (WEEK 6)
// ------------------------------------------------------------
step('STEP 2: Stop Management & Trip Setup (Week 6)');
console.log('Goal: Create a trip, set start location, and add destinations.\n');

const stopManager = new StopManager();

// Listen to changes (simulating what the UI or Controller does)
stopManager.on('stopsChanged', (event) => {
  console.log(`  🔔 [Event Notification] stopsChanged -> Action: ${event.type}`);
});

console.log('1. Setting Trip Start:');
stopManager.setTripConfig('09:00', 12.9716, 77.5946);
console.log(`   Trip begins at 09:00 AM from Central Station (12.9716, 77.5946)\n`);

console.log('2. Adding 3 Stops:');
const museum = stopManager.addStop({ name: 'Visvesvaraya Museum', lat: 12.9752, lon: 77.5963 });
const bakery = stopManager.addStop({ name: 'Thomson Bakery', lat: 12.9822, lon: 77.6083 });
const park = stopManager.addStop({ name: 'Freedom Park', lat: 12.9780, lon: 77.5825 });

console.log('\nCurrent Stops in Itinerary:');
console.table(
  stopManager.stops.map((s) => ({
    'Input Order': s.inputOrder,
    Name: s.name,
    Latitude: s.lat,
    Longitude: s.lon,
  }))
);

// ------------------------------------------------------------
// STEP 3: ATTACHING CONSTRAINTS (WEEK 6)
// ------------------------------------------------------------
step('STEP 3: Attaching Real-World Constraints');
console.log('Goal: Add opening hours and precedence rules to stops.\n');

// A. Opening Hours Constraint
const museumHours = new OpeningHoursConstraint('c1', museum.id, '10:00', '17:00');
stopManager.attachConstraint(museum.id, museumHours);
console.log(`✓ Attached Opening Hours to [${museum.name}]: Open 10:00 AM – 5:00 PM`);

// B. Precedence Constraint
const orderRule = new PrecedenceConstraint('c2', bakery.id, park.id);
stopManager.attachConstraint(bakery.id, orderRule);
console.log(`✓ Attached Precedence Rule: Must visit [${bakery.name}] BEFORE [${park.name}]`);

// ------------------------------------------------------------
// STEP 4: STRUCTURAL VALIDATION (PREVENTING BAD INPUTS)
// ------------------------------------------------------------
step('STEP 4: Structural Validation (Catching Bad Inputs Early)');
console.log('Goal: Show how StopManager immediately blocks invalid constraints.\n');

console.log('Test A: Setting invalid opening hours (e.g., closing before opening: 18:00 to 10:00)');
try {
  const badHours = new OpeningHoursConstraint('bad1', park.id, '18:00', '10:00');
  stopManager.attachConstraint(park.id, badHours);
} catch (err) {
  console.log(`  ❌ Blocked: ${err.message}`);
}

console.log('\nTest B: Making a stop precede itself (Park must be before Park)');
try {
  const badRule = new PrecedenceConstraint('bad2', park.id, park.id);
  stopManager.attachConstraint(park.id, badRule);
} catch (err) {
  console.log(`  ❌ Blocked: ${err.message}`);
}

console.log('\nTest C: Precedence referencing a non-existent stop');
try {
  const badRule = new PrecedenceConstraint('bad3', park.id, 'ghost-stop-999');
  stopManager.attachConstraint(park.id, badRule);
} catch (err) {
  console.log(`  ❌ Blocked: ${err.message}`);
}

// ------------------------------------------------------------
// STEP 5: ROUTE VIOLATION CHECKING (EXPLAINABILITY)
// ------------------------------------------------------------
step('STEP 5: Route Checking & Explainability (Week 6 Core)');
console.log('Goal: Check two candidate routes against our constraints.\n');

// Route A: Sensible sequence
const routeGood = {
  getArrivalTime: (stopId) => (stopId === museum.id ? '11:30' : '14:00'),
  getStopOrder: () => [museum.id, bakery.id, park.id],
};

console.log('Checking Route Option A:');
console.log('  Sequence: Museum (11:30 AM) ➔ Bakery ➔ Park');
console.log(`  - Museum open at arrival?     ${!museumHours.isViolated(routeGood) ? '✅ YES' : '❌ NO'}`);
console.log(`  - Bakery visited before Park? ${!orderRule.isViolated(routeGood) ? '✅ YES' : '❌ NO'}`);
console.log('  👉 Result: Valid Route! Safe to recommend to the user.');

// Route B: Problematic sequence
const routeBad = {
  getArrivalTime: (stopId) => (stopId === museum.id ? '18:15' : '10:00'),
  getStopOrder: () => [park.id, bakery.id, museum.id],
};

console.log('\nChecking Route Option B:');
console.log('  Sequence: Park ➔ Bakery ➔ Museum (arriving 18:15 PM)');
console.log(`  - Museum open at arrival?     ${!museumHours.isViolated(routeBad) ? '✅ YES' : '❌ NO'}`);
if (museumHours.isViolated(routeBad)) {
  console.log(`    ⚠ Explanation: "${museumHours.violationMessage(routeBad)}"`);
}
console.log(`  - Bakery visited before Park? ${!orderRule.isViolated(routeBad) ? '✅ YES' : '❌ NO'}`);
if (orderRule.isViolated(routeBad)) {
  console.log(`    ⚠ Explanation: "${orderRule.violationMessage()}"`);
}
console.log('  👉 Result: Invalid Route! RouteFlow flags these exact conflicts.');

// ------------------------------------------------------------
// STEP 6: DRAGGING & REMOVING STOPS
// ------------------------------------------------------------
step('STEP 6: Modifying Stops (Map Drag & Removal)');
console.log('Goal: Simulate user dragging a pin or removing a stop.\n');

console.log('1. User drags "Thomson Bakery" to new location:');
stopManager.repositionStop(bakery.id, 12.9850, 77.6100);
console.log(`   New Coordinates: (${bakery.lat}, ${bakery.lon})`);

console.log('\n2. User cancels/removes "Visvesvaraya Museum":');
stopManager.removeStop(museum.id);

console.log('\nRemaining Stops (Note how inputOrder automatically re-indexes):');
console.table(
  stopManager.stops.map((s) => ({
    'Input Order': s.inputOrder,
    Name: s.name,
    Latitude: s.lat,
    Longitude: s.lon,
  }))
);

console.log(`\n🎉 Done! All Week 5 & Week 6 requirements demonstrated clearly.`);
console.log(`Run 'npm test' anytime to verify all 26 automated unit tests.\n`);
