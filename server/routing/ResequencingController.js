const EventEmitter = require('events');
const { RouteSequencer } = require('./RouteSequencer');
const { MultiObjectiveScorer } = require('../scoring/MultiObjectiveScorer');
const { ReasoningEngine } = require('../reasoning/ReasoningEngine');

/**
 * ResequencingController
 * Traces to: Week 3 Decision 3, Week 5 §5.2.
 *
 * Subscribes to 'stopsChanged' events emitted by StopManager.
 * Orchestrates multi-objective route re-calculation and triggers
 * ReasoningEngine to generate explanations upon state changes.
 */
class ResequencingController extends EventEmitter {
  /**
   * @param {import('../stops/StopManager').StopManager} stopManager
   * @param {object} [options]
   * @param {string} [options.preset='BALANCED']
   * @param {import('../distance/IDistanceProvider').IDistanceProvider} [options.distanceProvider]
   */
  constructor(stopManager, options = {}) {
    super();
    this.stopManager = stopManager;
    this.preset = options.preset || 'BALANCED';
    this.distanceProvider = options.distanceProvider;
    this.scorer = new MultiObjectiveScorer(this.preset);
    this.sequencer = new RouteSequencer({
      distanceProvider: this.distanceProvider,
      scorer: this.scorer,
    });

    this.latestResult = null;
    this._bindEvents();
  }

  _bindEvents() {
    if (this.stopManager && typeof this.stopManager.on === 'function') {
      this.stopManager.on('stopsChanged', (event) => {
        this.recalculate({ triggerEvent: event });
      });
    }
  }

  /**
   * Changes the active scoring preset (e.g. 'FASTEST', 'BALANCED', 'CROWD_AVOIDER', 'SCENIC_EXPLORER').
   * @param {string|object} presetOrWeights
   */
  setPreset(presetOrWeights) {
    this.scorer = new MultiObjectiveScorer(presetOrWeights);
    this.sequencer = new RouteSequencer({
      distanceProvider: this.distanceProvider,
      scorer: this.scorer,
    });
    return this.recalculate();
  }

  /**
   * Triggers route calculation across all registered stops in StopManager.
   * @param {object} [meta]
   * @returns {object} { optimalRoute, shortestDistanceRoute, alternatives, explanation }
   */
  recalculate(meta = {}) {
    const stops = this.stopManager ? this.stopManager.stops : [];
    const tripConfig = this.stopManager ? this.stopManager.tripConfig : null;

    if (!stops || stops.length === 0) {
      this.latestResult = {
        optimalRoute: null,
        shortestDistanceRoute: null,
        alternatives: [],
        explanation: ReasoningEngine.generateExplanation({
          optimalRoute: null,
          scorer: this.scorer,
        }),
      };
      this.emit('routeUpdated', { result: this.latestResult, meta });
      return this.latestResult;
    }

    const plan = this.sequencer.plan(stops, tripConfig);
    const explanation = ReasoningEngine.generateExplanation({
      optimalRoute: plan.optimalRoute,
      shortestDistanceRoute: plan.shortestDistanceRoute,
      originalRoute: plan.originalRoute,
      alternatives: plan.alternatives,
      scorer: this.scorer,
      comparison: plan.comparison,
      conflictSuggestions: plan.conflictSuggestions,
    });

    this.latestResult = {
      originalRoute: plan.originalRoute,
      optimalRoute: plan.optimalRoute,
      shortestDistanceRoute: plan.shortestDistanceRoute,
      alternatives: plan.alternatives,
      comparison: plan.comparison,
      conflictSuggestions: plan.conflictSuggestions,
      explanation,
    };

    this.emit('routeUpdated', { result: this.latestResult, meta });
    return this.latestResult;
  }
}

module.exports = { ResequencingController };
