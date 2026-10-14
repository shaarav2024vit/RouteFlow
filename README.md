# RouteFlow

> A route planner that explains its reasoning, not just its route.

RouteFlow is a multi-objective multi-stop route sequencing and planning system. Instead of simply computing the shortest geographic path, RouteFlow determines the optimal visiting sequence subject to time windows, opening hours, precedence rules, and a multi-objective scoring model (travel time, time-window fit, weather, crowd levels, scenic value, and user preference).

---

## Architecture & Features

RouteFlow is architected with clear domain boundaries, clean separation of concerns, and rigorous automated test coverage across all layers:

1. **Distance Provider Module** (`server/distance/`)
   - `IDistanceProvider.js`: Contract interface defining `getDistance(lat1, lon1, lat2, lon2)`.
   - `HaversineDistanceProvider.js`: Great-circle distance computation with transit speed and dwell time.

2. **Stop Management & Constraints Hierarchy** (`server/stops/`)
   - `Stop.js`: Core domain model for trip stops with preference windows.
   - `IConstraint.js` & `Constraint.js`: Extensible constraint hierarchy (HARD/SOFT).
   - `OpeningHoursConstraint.js`: Enforces scheduled arrival within `[openTime, closeTime]`.
   - `PrecedenceConstraint.js`: Enforces prerequisite visiting orders between stops.
   - `StopManager.js`: In-memory stop manager emitting `stopsChanged` events; includes constraint lifecycle (`attachConstraint`, `removeConstraint`) and coordinate validation.

3. **Routing Engine** (`server/routing/`)
   - `Route.js`: Route domain model with scheduled arrival times, leg details, and violation summaries.
   - `RouteBuilder.js`: Nearest-Neighbour initial route constructor (FR-6) and Constraint-Aware 2-Opt local search optimizer (FR-7).
   - `ConstraintsFilter.js`: Evaluates candidate routes against attached constraints.
   - `ReSequencingController.js`: Event-driven pipeline controller coordinating StopManager, RouteBuilder, ScoringEngine, and PresetManager.

4. **Multi-Objective Scoring Engine** (`server/scoring/`)
   - `ScoringEngine.js`: 6-factor weighted multi-objective scoring (travel time efficiency, time-window fit, weather, crowd avoidance, scenic value, user preference).
   - `ScoreBreakdown.js`: Explainable factor breakdown data structure (FR-12).
   - `PresetManager.js`: 4 built-in optimization presets (*Fastest*, *Best Scenic*, *Least Crowded*, *Most Attractions Open*) with customizable weights.
   - `SyntheticDataModule.js`: Deterministic environmental factors based on stop identity, category keywords, and scheduled arrival hour.

5. **Persistence Layer** (`server/persistence/`)
   - `SqliteTripRepository.js`: SQLite persistence engine backed by `better-sqlite3`.
   - `schema.sql`: Normalized relational design (`trip`, `stop`, `stop_constraint`, `preset`, `route_result`, `route_result_stop`).

6. **Reporting** (`server/reporting/`)
   - `RouteReporting.js`: Formats structured route summaries with distance, duration, violations, and factor scores.

7. **Interactive Web Application** (`public/` & `server/app.js`)
   - Interactive Leaflet map with real road geometry via OSRM, drag-and-drop stop repositioning, and numbered sequence markers.
   - Modal stop entry with optional preferred arrival windows.
   - Modals for configuring opening hours and precedence rules directly from the map or itinerary list.
   - Real-time multi-objective weight sliders and preset selection pills.
   - Explainable score breakdown visualization with progress bars.
   - 28 pre-built world sample itineraries across Asia, Europe, the Americas, and more with instant map camera flyTo.
   - Save and load trips directly to/from SQLite.

---

## Repository Layout

```
routeflow/
├── server/
│   ├── distance/
│   │   ├── IDistanceProvider.js
│   │   ├── HaversineDistanceProvider.js
│   │   └── HaversineDistanceProvider.test.js
│   ├── stops/
│   │   ├── Stop.js
│   │   ├── IConstraint.js
│   │   ├── Constraint.js
│   │   ├── OpeningHoursConstraint.js
│   │   ├── PrecedenceConstraint.js
│   │   ├── StopManager.js
│   │   ├── StopManager.test.js
│   │   └── Constraint.test.js
│   ├── routing/
│   │   ├── Route.js
│   │   ├── RouteBuilder.js
│   │   ├── RouteBuilder.test.js
│   │   ├── ConstraintsFilter.js
│   │   └── ReSequencingController.js
│   ├── scoring/
│   │   ├── ScoringEngine.js
│   │   ├── ScoringEngine.test.js
│   │   ├── ScoreBreakdown.js
│   │   ├── PresetManager.js
│   │   └── SyntheticDataModule.js
│   ├── persistence/
│   │   ├── ITripRepository.js
│   │   ├── SqliteTripRepository.js
│   │   ├── SqliteTripRepository.test.js
│   │   └── schema.sql
│   ├── reporting/
│   │   └── RouteReporting.js
│   ├── app.js
│   ├── app.test.js
│   └── server.js
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       ├── mapRenderer.js
│       ├── weightSliderPanel.js
│       ├── presetSelector.js
│       └── scoreBreakdownCard.js
├── demo.js
├── eslint.config.js
├── package.json
└── README.md
```

---

## Quickstart & Commands

### 1. Run Automated Unit & Integration Tests

```bash
npm test
```
Executes all 7 Jest test suites (42 tests) covering distance calculation, multi-modal transit speeds, stop management, constraints hierarchy, routing 2-opt search, scoring engine, SQLite persistence, and API integration.

### 2. Run Code Quality Linter

```bash
npm run lint
```
Runs ESLint with flat config rules across server and client code with 0 errors and 0 warnings.

### 3. Run Architectural Walkthrough Demo

```bash
npm run demo
# or: node demo.js
```
Runs the 9-stage CLI architectural walkthrough demonstrating:
1. Multi-Modal Haversine Matrix (driving, cycling, walking)
2. Event-Driven Stop Management
3. Hard Constraints (Opening Hours & Precedence rules)
4. Structural Validation & Cycle Detection
5. Initial Route Construction (Nearest-Neighbour heuristic)
6. 2-Opt Local Search Optimization
7. Multi-Objective Scoring across 4 Optimization Presets
8. Explainable AI Reasoning Generation
9. SQLite Relational Persistence Round-Trip

### 4. Start Web Application

```bash
npm start
```
Launches the server at `http://localhost:3000`.

---

## Web Application Features

- **Global Place Search**: Real-time geocoding powered by OpenStreetMap Nominatim with debouncing.
- **Multi-Modal Transit Routing**: Instant toggling between Driving (35 km/h), Cycling (15 km/h), and Walking (5 km/h) with dynamic OSRM geometry.
- **Realistic Dwell Times**: Configurable duration at each stop (15 min to 3 hours) with accurate departure time calculation.
- **Explainable Route Reasoning**: AI insight cards per stop showing why each destination was sequenced at that time.
- **Turn-by-Turn Leg Connectors**: Interactive distance and travel time indicators between consecutive stops.
- **Manual vs. AI Savings Comparison**: Re-order stops manually and instantly see time and distance delta comparisons against RouteFlow's optimized sequence.
- **Trip Persistence & Library**: Save customized trips to SQLite and browse, restore, or delete them via the "My Trips" library modal.
- **Export & Navigation**:
  - One-click Google Maps multi-stop navigation route link
  - GPX GPS track file download for Garmin/Wahoo/OSM devices
  - GeoJSON spatial geometry export
  - Formatted Markdown summary for itineraries
  - Print-friendly itinerary sheet
