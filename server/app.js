const express = require('express');
const path = require('path');
const { HaversineDistanceProvider } = require('./distance/HaversineDistanceProvider');
const { StopManager } = require('./stops/StopManager');
const { OpeningHoursConstraint } = require('./stops/OpeningHoursConstraint');
const { PrecedenceConstraint } = require('./stops/PrecedenceConstraint');
const { RouteBuilder } = require('./routing/RouteBuilder');
const { ScoringEngine } = require('./scoring/ScoringEngine');
const { PresetManager } = require('./scoring/PresetManager');
const { ReSequencingController } = require('./routing/ReSequencingController');
const { RouteReporting } = require('./reporting/RouteReporting');
const { SqliteTripRepository } = require('./persistence/SqliteTripRepository');

function createApp(dbPath = ':memory:') {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  const distanceProvider = new HaversineDistanceProvider();
  const scoringEngine = new ScoringEngine();
  const presetManager = new PresetManager('Fastest');
  const routeBuilder = new RouteBuilder(distanceProvider, scoringEngine);
  const stopManager = new StopManager();
  const tripRepository = new SqliteTripRepository(dbPath);

  const controller = new ReSequencingController(
    stopManager,
    routeBuilder,
    scoringEngine,
    presetManager,
    tripRepository
  );

  // Set default trip config
  stopManager.setTripConfig('09:00', 12.9716, 77.5946);

  // --- API ROUTES ---

  // Get current state
  app.get('/api/state', (req, res) => {
    const report = RouteReporting.generateReport(
      controller.currentRoute,
      controller.currentScoreBreakdown
    );
    res.json({
      tripConfig: stopManager.tripConfig,
      stops: stopManager.stops,
      weights: presetManager.getWeights(),
      activePreset: presetManager.activePreset,
      routeReport: report,
      rawRoute: controller.currentRoute,
      scoreBreakdown: controller.currentScoreBreakdown,
    });
  });

  // Set trip config (FR-16)
  app.post('/api/trip/config', (req, res) => {
    try {
      const { startTime, startLat, startLon, transitMode, roundTrip, startAtFirstStop } = req.body;
      stopManager.setTripConfig(startTime, Number(startLat), Number(startLon), {
        transitMode,
        roundTrip,
        startAtFirstStop,
      });
      res.json({ success: true, tripConfig: stopManager.tripConfig });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Add stop (FR-1)
  app.post('/api/stops', (req, res) => {
    try {
      const { name, lat, lon, prefStart, prefEnd, dwellMin } = req.body;
      const stop = stopManager.addStop({
        name: name || `Stop ${stopManager.stops.length + 1}`,
        lat: Number(lat),
        lon: Number(lon),
        prefStart,
        prefEnd,
        dwellMin: dwellMin !== undefined ? Number(dwellMin) : 30,
      });
      res.status(201).json({ success: true, stop });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Remove stop (FR-2)
  app.delete('/api/stops/:id', (req, res) => {
    try {
      stopManager.removeStop(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reposition stop (FR-3)
  app.patch('/api/stops/:id/position', (req, res) => {
    try {
      const { lat, lon } = req.body;
      stopManager.repositionStop(req.params.id, Number(lat), Number(lon));
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update stop details (dwell time, name, preference)
  app.patch('/api/stops/:id', (req, res) => {
    try {
      const stop = stopManager.getStop(req.params.id);
      if (req.body.name !== undefined) stop.name = req.body.name;
      if (req.body.dwellMin !== undefined) stop.dwellMin = Number(req.body.dwellMin);
      if (req.body.prefStart !== undefined) stop.prefStart = req.body.prefStart;
      if (req.body.prefEnd !== undefined) stop.prefEnd = req.body.prefEnd;
      controller.recalculateRoute();
      res.json({ success: true, stop });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reorder stops manually
  app.post('/api/stops/reorder', (req, res) => {
    try {
      const { orderedStopIds } = req.body;
      if (!Array.isArray(orderedStopIds)) {
        return res.status(400).json({ error: 'orderedStopIds must be an array' });
      }
      const map = new Map(stopManager.stops.map((s) => [s.id, s]));
      const reordered = [];
      for (const id of orderedStopIds) {
        const found = map.get(id);
        if (found) {
          found.inputOrder = reordered.length;
          reordered.push(found);
        }
      }
      stopManager.stops = reordered;
      controller.recalculateRoute();
      res.json({ success: true, stops: stopManager.stops });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Attach constraint (FR-4, FR-5)
  app.post('/api/stops/:id/constraints', (req, res) => {
    try {
      const { type, openTime, closeTime, precedesStopId } = req.body;
      const constraintId = `c_${Date.now()}`;
      let constraint;

      if (type === 'OPENING_HOURS') {
        constraint = new OpeningHoursConstraint(constraintId, req.params.id, openTime, closeTime);
      } else if (type === 'PRECEDENCE') {
        constraint = new PrecedenceConstraint(constraintId, req.params.id, precedesStopId);
      } else {
        return res.status(400).json({ error: `Unknown constraint type: ${type}` });
      }

      stopManager.attachConstraint(req.params.id, constraint);
      res.status(201).json({ success: true, constraint });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Remove constraint
  app.delete('/api/stops/:id/constraints/:constraintId', (req, res) => {
    try {
      stopManager.removeConstraint(req.params.id, req.params.constraintId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Change preset (FR-11)
  app.post('/api/presets/select', (req, res) => {
    try {
      const { presetName } = req.body;
      controller.setPreset(presetName);
      res.json({
        success: true,
        activePreset: presetManager.activePreset,
        weights: presetManager.getWeights(),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Change weights (FR-9)
  app.post('/api/weights', (req, res) => {
    try {
      controller.setWeights(req.body);
      res.json({
        success: true,
        activePreset: presetManager.activePreset,
        weights: presetManager.getWeights(),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Save Trip to SQLite (Week 4 Persistence)
  app.post('/api/trip/save', (req, res) => {
    try {
      const tripId = req.body.tripId || 'default-trip';
      tripRepository.saveTrip({
        tripId,
        startTime: stopManager.tripConfig.startTime,
        startLat: stopManager.tripConfig.startLat,
        startLon: stopManager.tripConfig.startLon,
        activePresetId: presetManager.activePreset,
        stops: stopManager.stops,
      });

      if (controller.currentRoute) {
        tripRepository.saveRouteResult(tripId, {
          routeResultId: `rr_${Date.now()}`,
          presetId: presetManager.activePreset,
          totalTime: controller.currentRoute.totalTravelTimeMin,
          totalDistance: controller.currentRoute.totalDistanceKm,
          violationCount: controller.currentRoute.violations.length,
          orderedStopIds: controller.currentRoute.getStopOrder(),
        });
      }

      res.json({ success: true, message: 'Trip and route saved to SQLite' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // List all saved trips
  app.get('/api/trips', (req, res) => {
    try {
      const trips = tripRepository.listTrips ? tripRepository.listTrips() : [];
      res.json({ success: true, trips });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete saved trip
  app.delete('/api/trip/:tripId', (req, res) => {
    try {
      if (tripRepository.deleteTrip) {
        tripRepository.deleteTrip(req.params.tripId);
      }
      res.json({ success: true, message: 'Trip deleted' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Load Trip from SQLite
  app.get('/api/trip/load/:tripId', (req, res) => {
    try {
      const data = tripRepository.loadTrip(req.params.tripId);
      if (!data) {
        return res.status(404).json({ error: 'Trip not found' });
      }

      // Temporarily remove the stopsChanged listener so we don't trigger
      // premature recalculations during the bulk-restore; we'll call once at end.
      stopManager.removeAllListeners('stopsChanged');

      stopManager.stops = [];
      stopManager.tripConfig = {
        startTime: data.startTime,
        startLat: data.startLat,
        startLon: data.startLon,
      };

      // Pass 1: add all stops preserving original IDs
      for (const s of data.stops) {
        const stop = {
          ...s,
          id: s.id,
          inputOrder: stopManager.stops.length,
          constraints: [],
        };
        stopManager.stops.push(stop);
      }

      // Pass 2: reattach constraints now that all stops exist
      for (const s of data.stops) {
        if (s.constraints) {
          for (const c of s.constraints) {
            const cType = c.type || c.name;
            const cId = c.constraint_id || c.id;
            try {
              if (cType === 'OPENING_HOURS') {
                stopManager.attachConstraint(
                  s.id,
                  new OpeningHoursConstraint(
                    cId,
                    s.id,
                    c.open_time || c.openTime,
                    c.close_time || c.closeTime
                  )
                );
              } else if (cType === 'PRECEDENCE') {
                stopManager.attachConstraint(
                  s.id,
                  new PrecedenceConstraint(
                    cId,
                    s.id,
                    c.precedes_stop_id || c.precedesStopId
                  )
                );
              }
            } catch {
              // skip invalid constraint during load
            }
          }
        }
      }

      // Restore the stopsChanged listener before triggering recalculation
      stopManager.on('stopsChanged', () => {
        controller.recalculateRoute();
      });

      if (data.activePresetId && PresetManager.PRESETS[data.activePresetId]) {
        presetManager.selectPreset(data.activePresetId);
      }

      // Trigger a single recalculation with fully-restored state
      controller.recalculateRoute();

      res.json({ success: true, trip: data });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return { app, controller, stopManager, tripRepository };
}

module.exports = { createApp };
