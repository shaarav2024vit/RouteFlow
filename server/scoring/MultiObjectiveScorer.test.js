const { MultiObjectiveScorer, PRESETS, estimateCrowdLevel } = require('./MultiObjectiveScorer');
const { Route } = require('../routing/Route');
const { OpeningHoursConstraint } = require('../stops/OpeningHoursConstraint');

describe('MultiObjectiveScorer', () => {
  test('initializes with default BALANCED preset weights', () => {
    const scorer = new MultiObjectiveScorer();
    expect(scorer.weights.travelTime).toBe(PRESETS.BALANCED.weights.travelTime);
    expect(scorer.presetName).toBe('Balanced');
  });

  test('initializes with named preset FASTEST', () => {
    const scorer = new MultiObjectiveScorer('FASTEST');
    expect(scorer.weights.travelTime).toBe(0.60);
    expect(scorer.presetName).toBe('Fastest Route');
  });

  test('initializes with custom weights object', () => {
    const scorer = new MultiObjectiveScorer({
      name: 'CustomTest',
      travelTime: 0.5,
      timeWindowFit: 0.2,
      crowdAvoidance: 0.2,
      scenic: 0.1,
    });
    expect(scorer.presetName).toBe('CustomTest');
    expect(scorer.weights.travelTime).toBe(0.5);
  });

  test('estimateCrowdLevel computes higher density at peak midday hours', () => {
    const stop = { name: 'Eiffel Tower', popularity: 0.9 };
    const morningCrowd = estimateCrowdLevel(stop, '09:00');
    const noonCrowd = estimateCrowdLevel(stop, '13:30');
    const eveningCrowd = estimateCrowdLevel(stop, '21:00');

    expect(noonCrowd).toBeGreaterThan(morningCrowd);
    expect(noonCrowd).toBeGreaterThan(eveningCrowd);
  });

  test('scoreRoute calculates weighted total score and penalizes constraint violations', () => {
    const stopA = {
      id: 's-1',
      name: 'Stop 1',
      lat: 48.85,
      lon: 2.3,
      prefStart: '09:00',
      prefEnd: '10:00',
      popularity: 0.8,
      scenicScore: 0.9,
    };

    const route = new Route({
      stops: [stopA],
      legs: [
        {
          fromStop: null,
          toStop: stopA,
          distanceKm: 2.0,
          travelTimeMin: 10,
          arrivalTime: '09:10',
          dwellTimeMin: 30,
          departureTime: '09:40',
        },
      ],
      totalDistanceKm: 2.0,
      totalDurationMin: 40,
    });

    const scorer = new MultiObjectiveScorer('BALANCED');
    const result = scorer.scoreRoute(route);

    expect(result.isFeasible).toBe(true);
    expect(result.totalScore).toBeGreaterThan(0);
    expect(result.breakdown.factors.timeWindowFit.score).toBe(1.0); // 09:10 is within 09:00-10:00

    // Now test with violated constraint
    const violatedConstraint = new OpeningHoursConstraint('oh1', 's-1', '10:00', '12:00');
    const violatedResult = scorer.scoreRoute(route, [violatedConstraint]);
    expect(violatedResult.isFeasible).toBe(false);
    expect(violatedResult.totalScore).toBeLessThan(0); // Heavy penalty applied
  });
});
