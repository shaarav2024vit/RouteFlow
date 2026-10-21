# RouteFlow

> A route planner that explains its reasoning, not just its route.

RouteFlow is an explainable, multi-objective multi-stop route sequencing and trip planning engine. Instead of simply computing the shortest geographic path, RouteFlow determines the optimal visiting sequence subject to time windows, opening hours, precedence rules, and a multi-objective scoring model (travel time, time-window fit, crowd levels, scenic value, open attractions, and user preferences).

---

## Implemented Feature Roadmap

### 1. Core Features
- [x] **Add, edit, and remove destinations**: Manage waypoints dynamically with coordinates, dwell times, and preferred arrival windows.
- [x] **Search places & select on map**: Autocomplete place search via OpenStreetMap/Nominatim proxy and interactive map-click waypoint placement.
- [x] **Multi-stop route planning**: End-to-end trip planning with customizable start times and origin coordinates.
- [x] **Automatic order optimization**: Heuristic and combinatorial sequence optimization.
- [x] **Interactive map**: Leaflet.js integration with styled numbered markers and route polylines.
- [x] **Distance & travel time calculations**: Precise leg-by-leg and total trip calculations.
- [x] **Save, load, and manage trips**: Embedded SQLite persistence via `better-sqlite3`.
- [x] **Complete trip summary**: Printable and exportable turn-by-turn itinerary view.

### 2. Route Optimization
- [x] **Fastest Route**: Minimizes total travel time and road transit.
- [x] **Best Scenic Route**: Prioritizes panoramic viewpoints and aesthetic stop values.
- [x] **Least Crowded Route**: Targets off-peak hours to avoid queues and peak congestion.
- [x] **Most Attractions Open**: Maximizes the proportion of venues open during visits.
- [x] **Nearest-Neighbour initial tour**: Fast greedy initialization heuristic.
- [x] **2-Opt local search**: Iterative edge-exchange improvements for larger stop counts.
- [x] **User-defined constraints**: Enforces Opening Hours and Precedence rules.
- [x] **Before vs. After comparison**: Quantifies distance (km) and time (minutes) saved by optimization.

### 3. Smart Constraints
- [x] **Arrival-time preferences**: Preferred start and end time windows (`prefStart`, `prefEnd`).
- [x] **Visit durations**: Customizable dwell time for each stop.
- [x] **Opening and closing hours**: `OpeningHoursConstraint` enforcement.
- [x] **Must-visit designation**: Priority flag for mandatory destinations.
- [x] **Trip limits**: Maximum trip duration (`maxDurationMin`) and distance (`maxDistanceKm`) caps.
- [x] **Constraint conflict warnings**: Detects infeasible schedules and alerts the user.
- [x] **Smart conflict remedies**: Suggests actionable fixes (e.g., adjusting departure time, extending duration, or reprioritizing stops).

### 4. Explainable Recommendations
- [x] **Executive narrative**: Human-readable rationale on why the sequence was chosen.
- [x] **Six scoring factors**: Displays normalized scores for Travel Time, Time-Window Fit, Crowd Avoidance, Scenic Rating, Attractions Operating, and Must-Visit Adherence.
- [x] **Trade-off analysis**: Explains compromises between speed, scenery, crowds, and open attractions.
- [x] **Reordering rationale**: Highlights why stops were moved from their original input order.
- [x] **Constraint audit**: Matrix displaying status (`SATISFIED` / `VIOLATED`) and evaluation proofs.

### 5. Map and Navigation
- [x] **Leaflet map**: Interactive canvas with pan, zoom, and fit-bounds controls.
- [x] **Numbered markers & route polylines**: Sequential waypoint labels and path lines.
- [x] **Real road-routing data**: `RoadDistanceProvider` with calibrated urban road curvature factor and graceful fallback to Haversine.
- [x] **Arrival and departure times**: Computed for every stop including wait and dwell durations.

### 6. Scoring and Personalization
- [x] **Adjustable preference sliders**: Live sliders for travel time, windows, crowds, scenery, and open attractions.
- [x] **Preset synchronization**: Sliders synchronize with active strategy presets.
- [x] **Normalized scoring scale**: Fair 0–1 normalization across all factors.
- [x] **Dominant hard constraints**: Constraint violations incur heavy penalties, ensuring feasible routes strictly dominate.

### 7. Stand-Out Features
- [x] **Before-and-after comparison**: Direct metric comparisons showing savings.
- [x] **Preset comparison matrix**: Side-by-side evaluation of all strategies for the same trip.
- [x] **What-if sandbox**: Simulates the impact of adding or removing a stop in real time.
- [x] **Constraint conflict demo**: 1-click reproducible demo showcasing conflict detection and smart alternatives.
- [x] **Pre-loaded sample tours**: Paris Heritage, San Francisco Highlights, Delhi Heritage, Mumbai Coastal, Bengaluru Tech & Garden City, Vellore (VIT Campus), and Schedule Conflict Demo.

---

## Architecture & Repository Layout

```
RouteFlow/
├── server/
│   ├── app.js                          # Express REST API & static server
│   ├── app.test.js                     # End-to-end API integration tests
│   ├── db/
│   │   └── database.js                 # SQLite schema & TripRepository
│   ├── distance/
│   │   ├── IDistanceProvider.js        # Distance provider contract
│   │   ├── HaversineDistanceProvider.js# Great-circle baseline
│   │   └── RoadDistanceProvider.js     # Urban road network distance provider
│   ├── stops/
│   │   ├── Stop.js                     # Domain entity
│   │   ├── IConstraint.js              # Constraint contract
│   │   ├── Constraint.js               # Abstract base constraint
│   │   ├── OpeningHoursConstraint.js   # Opening hours constraint
│   │   ├── PrecedenceConstraint.js     # Precedence rule constraint
│   │   └── StopManager.js              # Event-driven in-memory manager
│   ├── scoring/
│   │   └── MultiObjectiveScorer.js     # 6-factor evaluator & presets
│   ├── routing/
│   │   ├── Route.js                    # Route entity & timing calculation
│   │   ├── RouteSequencer.js           # NN + 2-opt + combinatorial optimizer
│   │   └── ResequencingController.js   # Event controller subscribing to StopManager
│   ├── reasoning/
│   │   └── ReasoningEngine.js          # Rationale & trade-off synthesizer
│   └── data/
│       └── sampleTrips.js              # Paris, San Francisco, and Conflict demo
├── public/
│   ├── index.html                      # Interactive dashboard HTML5 interface
│   ├── style.css                       # Modern dark-mode responsive design
│   └── app.js                          # Client-side map & controller logic
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm >= 9.0.0

### Installation
```bash
npm install
```

### Running the Application
```bash
npm start
```
Open **`http://localhost:3000`** in your browser.

### Running Tests & Linting
```bash
# Run 10 test suites (64 unit and integration tests)
npm test

# Run ESLint validation
npm run lint
```
