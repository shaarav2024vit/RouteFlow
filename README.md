# RouteFlow

> A route planner that explains its reasoning, not just its route.

RouteFlow is a multi-objective multi-stop route sequencing and planning system. Instead of simply computing the shortest geographic path, RouteFlow determines the optimal visiting sequence subject to time windows, opening hours, precedence rules, and a multi-objective scoring model (travel time, time-window fit, weather, crowd levels, scenic value, and user preference).

## Current Project Status: Week 6

The project follows a staged waterfall lifecycle with an incremental build model across coding passes:
- **Pass 1 — Baseline Routing**: Distance Provider module implemented and tested.
- **Pass 2 — Constraint Handling**: Stop Management module and Constraint hierarchy implemented and tested.
- **Pass 3 — Scoring / Presets / Refinement**: Unstarted (planned for subsequent weeks).

### Implemented Modules (Week 5 & Week 6)

1. **Distance Provider Module** (`server/distance/`)
   - `IDistanceProvider.js`: Contract interface defining `getDistance(lat1, lon1, lat2, lon2)`.
   - `HaversineDistanceProvider.js`: Great-circle distance computation with assumed transit speed and dwell time.
   - `HaversineDistanceProvider.test.js`: Verification against equator benchmarks, identical points, and bounds validation.

2. **Stop Management Module & Constraint Hierarchy** (`server/stops/`)
   - `Stop.js`: Domain class for trip stops.
   - `IConstraint.js`: Interface defining `isViolated(route)` and `violationMessage(route)`.
   - `Constraint.js`: Abstract base class carrying `id`, `name`, `severity`.
   - `OpeningHoursConstraint.js`: Validates scheduled arrival within `[openTime, closeTime]`.
   - `PrecedenceConstraint.js`: Validates visiting order of prerequisite stops.
   - `StopManager.js`: In-memory trip stop manager emitting `stopsChanged` events; enforces structural validation rules at point of entry.
   - `StopManager.test.js` & `Constraint.test.js`: Comprehensive unit tests.

### Repository Layout

```
routeflow/
├── server/
│   ├── distance/
│   │   ├── IDistanceProvider.js
│   │   ├── HaversineDistanceProvider.js
│   │   └── HaversineDistanceProvider.test.js
│   └── stops/
│       ├── Stop.js
│       ├── IConstraint.js
│       ├── Constraint.js
│       ├── OpeningHoursConstraint.js
│       ├── PrecedenceConstraint.js
│       ├── StopManager.js
│       ├── StopManager.test.js
│       └── Constraint.test.js
├── .eslintrc.json
├── .gitignore
├── .nvmrc
├── .prettierrc
├── package.json
└── README.md
```

## Running Tests

```bash
npm test
```
