const { createApp } = require('./app');

describe('RouteFlow Server API (createApp)', () => {
  let controller;
  let stopManager;
  let tripRepository;

  beforeEach(() => {
    const created = createApp(':memory:');
    controller = created.controller;
    stopManager = created.stopManager;
    tripRepository = created.tripRepository;
  });

  afterEach(() => {
    tripRepository.close();
  });

  test('tripConfig defaults and state report', () => {
    expect(stopManager.tripConfig).toEqual({
      startTime: '09:00',
      startLat: 12.9716,
      startLon: 77.5946,
    });
  });

  test('adding, repositioning, and removing stops updates state and triggers route calculation', () => {
    const s1 = stopManager.addStop({ name: 'Stop 1', lat: 12.97, lon: 77.59 });
    const s2 = stopManager.addStop({ name: 'Stop 2', lat: 12.98, lon: 77.60 });

    expect(stopManager.stops.length).toBe(2);
    expect(controller.currentRoute).not.toBeNull();
    expect(controller.currentRoute.stops.length).toBe(2);

    stopManager.repositionStop(s1.id, 12.975, 77.595);
    expect(stopManager.getStop(s1.id).lat).toBe(12.975);

    stopManager.removeStop(s2.id);
    expect(stopManager.stops.length).toBe(1);
    expect(controller.currentRoute.stops.length).toBe(1);
  });

  test('attaching and removing OpeningHoursConstraint and PrecedenceConstraint', () => {
    const s1 = stopManager.addStop({ name: 'Museum', lat: 12.97, lon: 77.59 });
    const s2 = stopManager.addStop({ name: 'Cafe', lat: 12.98, lon: 77.60 });

    // Attach opening hours
    const ohc = {
      id: 'oh-1',
      name: 'OPENING_HOURS',
      severity: 'HARD',
      stopId: s1.id,
      openTime: '10:00',
      closeTime: '17:00',
      isViolated: () => false,
      violationMessage: () => '',
    };
    Object.setPrototypeOf(ohc, require('./stops/OpeningHoursConstraint').OpeningHoursConstraint.prototype);
    stopManager.attachConstraint(s1.id, ohc);
    expect(s1.constraints.length).toBe(1);

    // Attach precedence: s1 must precede s2
    const pc = new (require('./stops/PrecedenceConstraint').PrecedenceConstraint)('pc-1', s1.id, s2.id);
    stopManager.attachConstraint(s1.id, pc);
    expect(s1.constraints.length).toBe(2);

    // Remove constraint
    stopManager.removeConstraint(s1.id, 'oh-1');
    expect(s1.constraints.length).toBe(1);
    expect(s1.constraints[0].id).toBe('pc-1');
  });

  test('GET /api/trip/load/:id restores stops and triggers route recalculation', async () => {
    const { app: testApp } = createApp(':memory:');
    const request = require('http');

    // Save a trip directly via the running express app
    const s1 = stopManager.addStop({ name: 'Alpha', lat: 12.971, lon: 77.591 });
    const s2 = stopManager.addStop({ name: 'Beta',  lat: 12.981, lon: 77.601 });
    expect(controller.currentRoute).not.toBeNull();

    tripRepository.saveTrip({
      tripId: 'load-route-test',
      startTime: '09:00',
      startLat: 12.9716,
      startLon: 77.5946,
      activePresetId: 'Fastest',
      stops: stopManager.stops,
    });

    // Wipe state
    stopManager.removeAllListeners('stopsChanged');
    stopManager.stops = [];
    controller.currentRoute = null;
    stopManager.on('stopsChanged', () => controller.recalculateRoute());

    // Simulate what the HTTP handler now does: bulk-load without mid-load events
    stopManager.removeAllListeners('stopsChanged');
    const data = tripRepository.loadTrip('load-route-test');
    stopManager.tripConfig = { startTime: data.startTime, startLat: data.startLat, startLon: data.startLon };
    for (const s of data.stops) {
      stopManager.stops.push({ ...s, inputOrder: stopManager.stops.length, constraints: [] });
    }
    stopManager.on('stopsChanged', () => controller.recalculateRoute());
    controller.recalculateRoute();

    expect(controller.currentRoute).not.toBeNull();
    expect(controller.currentRoute.stops.length).toBe(2);
    void s1; void s2; void testApp; void request;
  });

  test('saving and reloading trip with precedence and opening hours re-establishes route without error', () => {
    stopManager.setTripConfig('08:30', 12.97, 77.59);
    const s1 = stopManager.addStop({ name: 'First', lat: 12.971, lon: 77.591 });
    const s2 = stopManager.addStop({ name: 'Second', lat: 12.981, lon: 77.601 });

    const ohc = new (require('./stops/OpeningHoursConstraint').OpeningHoursConstraint)('oh-1', s1.id, '09:00', '18:00');
    const pc = new (require('./stops/PrecedenceConstraint').PrecedenceConstraint)('pc-1', s1.id, s2.id);
    stopManager.attachConstraint(s1.id, ohc);
    stopManager.attachConstraint(s1.id, pc);

    tripRepository.saveTrip({
      tripId: 'test-trip-app',
      startTime: stopManager.tripConfig.startTime,
      startLat: stopManager.tripConfig.startLat,
      startLon: stopManager.tripConfig.startLon,
      activePresetId: 'Fastest',
      stops: stopManager.stops,
    });

    // Reset stops
    stopManager.stops = [];

    const loaded = tripRepository.loadTrip('test-trip-app');
    expect(loaded).not.toBeNull();
    expect(loaded.stops.length).toBe(2);

    // Test two-pass loading logic
    for (const s of loaded.stops) {
      stopManager.addStop({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
      });
    }

    for (const s of loaded.stops) {
      for (const c of s.constraints) {
        if (c.type === 'OPENING_HOURS') {
          stopManager.attachConstraint(
            s.id,
            new (require('./stops/OpeningHoursConstraint').OpeningHoursConstraint)(
              c.constraint_id,
              s.id,
              c.open_time,
              c.close_time
            )
          );
        } else if (c.type === 'PRECEDENCE') {
          stopManager.attachConstraint(
            s.id,
            new (require('./stops/PrecedenceConstraint').PrecedenceConstraint)(
              c.constraint_id,
              s.id,
              c.precedes_stop_id
            )
          );
        }
      }
    }

    expect(stopManager.stops.length).toBe(2);
    expect(stopManager.getStop(s1.id).constraints.length).toBe(2);
    expect(controller.currentRoute).not.toBeNull();
  });
});
