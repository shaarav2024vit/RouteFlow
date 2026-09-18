const { ScoringEngine } = require('./ScoringEngine');
const { PresetManager } = require('./PresetManager');
const { Route } = require('../routing/Route');

describe('ScoringEngine & Presets', () => {
  const scoringEngine = new ScoringEngine();
  const presetManager = new PresetManager();

  const mockRoute = new Route({
    stops: [
      { id: 's1', name: 'Cubbon Park', lat: 12.9763, lon: 77.5929, scheduledArrival: '10:00' },
      { id: 's2', name: 'Commercial Street', lat: 12.9822, lon: 77.6083, scheduledArrival: '10:30' },
    ],
    totalDistanceKm: 3.5,
    totalTravelTimeMin: 18.0,
    violations: [],
  });

  test('scores a route and breaks down the 6 factors', () => {
    const weights = presetManager.getWeights();
    const { totalScore, breakdown } = scoringEngine.scoreRoute(mockRoute, weights);

    expect(typeof totalScore).toBe('number');
    expect(breakdown.travelTimeScore).toBeDefined();
    expect(breakdown.timeWindowScore).toBeDefined();
    expect(breakdown.weatherScore).toBeDefined();
    expect(breakdown.crowdScore).toBeDefined();
    expect(breakdown.scenicScore).toBeDefined();
    expect(breakdown.preferenceScore).toBeDefined();
    expect(breakdown.stopBreakdowns.length).toBe(2);
  });

  test('presets change weights according to named goals', () => {
    presetManager.selectPreset('Best Scenic');
    expect(presetManager.weights.scenicWeight).toBe(1.0);

    presetManager.selectPreset('Fastest');
    expect(presetManager.weights.travelTimeWeight).toBe(1.0);

    presetManager.selectPreset('Least Crowded');
    expect(presetManager.weights.crowdWeight).toBe(1.0);

    presetManager.selectPreset('Most Attractions Open');
    expect(presetManager.weights.timeWindowWeight).toBe(1.0);
  });
});
