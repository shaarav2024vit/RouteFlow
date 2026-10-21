const { ReasoningEngine } = require('./ReasoningEngine');
const { RouteSequencer } = require('../routing/RouteSequencer');
const { MultiObjectiveScorer } = require('../scoring/MultiObjectiveScorer');
const { OpeningHoursConstraint } = require('../stops/OpeningHoursConstraint');

describe('ReasoningEngine', () => {
  const sequencer = new RouteSequencer();
  const scorer = new MultiObjectiveScorer('BALANCED');

  test('generates fallback summary for empty route', () => {
    const explanation = ReasoningEngine.generateExplanation({
      optimalRoute: null,
      scorer,
    });
    expect(explanation.summary).toContain('No stops configured');
    expect(explanation.itinerary).toHaveLength(0);
  });

  test('synthesizes comprehensive rationale with summary, itinerary, constraints and trade-offs', () => {
    const stop1 = {
      id: 's-1',
      name: 'Morning Bakery',
      lat: 48.85,
      lon: 2.3,
      dwellTimeMin: 20,
      constraints: [new OpeningHoursConstraint('oh1', 's-1', '08:00', '11:00')],
    };
    const stop2 = {
      id: 's-2',
      name: 'City Museum',
      lat: 48.87,
      lon: 2.32,
      dwellTimeMin: 60,
      constraints: [new OpeningHoursConstraint('oh2', 's-2', '10:00', '18:00')],
    };

    const plan = sequencer.plan([stop1, stop2], { startTime: '09:00', startLat: 48.84, startLon: 2.29 });
    const explanation = ReasoningEngine.generateExplanation({
      optimalRoute: plan.optimalRoute,
      shortestDistanceRoute: plan.shortestDistanceRoute,
      alternatives: plan.alternatives,
      scorer,
    });

    expect(explanation.summary).toBeDefined();
    expect(explanation.itinerary).toHaveLength(2);
    expect(explanation.itinerary[0].reasons.length).toBeGreaterThan(0);
    expect(explanation.constraintDecisions).toHaveLength(2);
    expect(explanation.tradeOffs.length).toBeGreaterThan(0);
    expect(explanation.metrics.totalDistanceKm).toBeGreaterThan(0);
  });
});
