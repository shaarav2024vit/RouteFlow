const EventEmitter = require('events');

/**
 * ReSequencingController
 * Traces to: FR-9, FR-10, FR-11; Week 3 Decision 3; Week 4 §3, §5.2.
 *
 * Single coordinating entry point for route re-calculation. Subscribes to
 * StopManager's 'stopsChanged' event, weight adjustments, and preset changes.
 */
class ReSequencingController extends EventEmitter {
  /**
   * @param {import('../stops/StopManager').StopManager} stopManager
   * @param {import('./RouteBuilder').RouteBuilder} routeBuilder
   * @param {import('../scoring/ScoringEngine').ScoringEngine} scoringEngine
   * @param {import('../scoring/PresetManager').PresetManager} presetManager
   * @param {import('../persistence/ITripRepository').ITripRepository} [tripRepository=null]
   */
  constructor(
    stopManager,
    routeBuilder,
    scoringEngine,
    presetManager,
    tripRepository = null
  ) {
    super();
    this.stopManager = stopManager;
    this.routeBuilder = routeBuilder;
    this.scoringEngine = scoringEngine;
    this.presetManager = presetManager;
    this.tripRepository = tripRepository;

    this.currentRoute = null;
    this.currentScoreBreakdown = null;

    // Subscribe to StopManager's mutation event (Week 3 Decision 3, FR-10)
    this.stopManager.on('stopsChanged', () => {
      this.recalculateRoute();
    });
  }

  /**
   * Triggers re-sequencing pipeline:
   * 1. Nearest-neighbour initial route construction (FR-6)
   * 2. Constraint-aware 2-opt refinement (FR-7)
   * 3. 6-factor weighted multi-objective scoring (FR-8, FR-12)
   * 4. Emits 'routeUpdated' with route and score breakdown
   * @returns {{ route: import('./Route').Route, scoreBreakdown: import('../scoring/ScoreBreakdown').ScoreBreakdown }}
   */
  recalculateRoute() {
    const stops = this.stopManager.stops;
    const tripConfig = this.stopManager.tripConfig || {
      startTime: '09:00',
      startLat: stops[0]?.lat ?? 0,
      startLon: stops[0]?.lon ?? 0,
    };

    if (!stops || stops.length === 0) {
      this.currentRoute = null;
      this.currentScoreBreakdown = null;
      this.emit('routeUpdated', { route: null, scoreBreakdown: null });
      return { route: null, scoreBreakdown: null };
    }

    // 1. Initial NN construction
    const initialRoute = this.routeBuilder.buildInitialRoute(stops, tripConfig);

    // 2. 2-opt refinement
    const weights = this.presetManager.getWeights();
    const refinedRoute = this.routeBuilder.refineRoute(initialRoute, tripConfig, weights);

    // 3. Multi-objective scoring
    const { breakdown } = this.scoringEngine.scoreRoute(refinedRoute, weights);

    this.currentRoute = refinedRoute;
    this.currentScoreBreakdown = breakdown;

    this.emit('routeUpdated', {
      route: this.currentRoute,
      scoreBreakdown: this.currentScoreBreakdown,
    });

    return {
      route: this.currentRoute,
      scoreBreakdown: this.currentScoreBreakdown,
    };
  }

  /**
   * Updates preset selection and recalculates (FR-11)
   * @param {string} presetName
   */
  setPreset(presetName) {
    this.presetManager.selectPreset(presetName);
    return this.recalculateRoute();
  }

  /**
   * Updates slider weights and recalculates (FR-9)
   * @param {object} weights
   */
  setWeights(weights) {
    this.presetManager.setWeights(weights);
    return this.recalculateRoute();
  }
}

module.exports = { ReSequencingController };
