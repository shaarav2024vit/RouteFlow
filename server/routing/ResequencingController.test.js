const { ResequencingController } = require('./ResequencingController');
const { StopManager } = require('../stops/StopManager');

describe('ResequencingController', () => {
  let stopManager;
  let controller;

  beforeEach(() => {
    stopManager = new StopManager();
    controller = new ResequencingController(stopManager, { preset: 'BALANCED' });
  });

  test('subscribes to stopsChanged and recalculates route', (done) => {
    stopManager.setTripConfig('09:00', 48.85, 2.3);

    controller.on('routeUpdated', ({ result }) => {
      if (result.optimalRoute && result.optimalRoute.stops.length === 1) {
        expect(result.explanation).toBeDefined();
        expect(result.optimalRoute.stops[0].name).toBe('Stop X');
        done();
      }
    });

    stopManager.addStop({ name: 'Stop X', lat: 48.86, lon: 2.32 });
  });

  test('allows changing presets and updates calculation', () => {
    stopManager.addStop({ name: 'Stop A', lat: 48.85, lon: 2.3 });
    stopManager.addStop({ name: 'Stop B', lat: 48.87, lon: 2.32 });

    const result = controller.setPreset('CROWD_AVOIDER');
    expect(controller.preset).toBe('BALANCED'); // initial
    expect(controller.scorer.presetName).toBe('Least Crowded Route');
    expect(result.optimalRoute.stops).toHaveLength(2);
  });
});
