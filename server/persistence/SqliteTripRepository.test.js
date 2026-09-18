const { SqliteTripRepository } = require('./SqliteTripRepository');

describe('SqliteTripRepository', () => {
  let repo;

  beforeEach(() => {
    repo = new SqliteTripRepository(':memory:');
  });

  afterEach(() => {
    repo.close();
  });

  test('saves and reloads a complete trip aggregate', () => {
    const tripData = {
      tripId: 'test-trip-1',
      startTime: '09:00',
      startLat: 12.97,
      startLon: 77.59,
      activePresetId: 'Fastest',
      stops: [
        {
          id: 'stop-1',
          name: 'Museum',
          lat: 12.971,
          lon: 77.591,
          inputOrder: 0,
          prefStart: '10:00',
          prefEnd: '12:00',
          constraints: [
            {
              id: 'c1',
              name: 'OPENING_HOURS',
              openTime: '09:30',
              closeTime: '17:00',
            },
          ],
        },
      ],
    };

    repo.saveTrip(tripData);
    const loaded = repo.loadTrip('test-trip-1');

    expect(loaded).not.toBeNull();
    expect(loaded.tripId).toBe('test-trip-1');
    expect(loaded.stops.length).toBe(1);
    expect(loaded.stops[0].name).toBe('Museum');
    expect(loaded.stops[0].constraints.length).toBe(1);
    expect(loaded.stops[0].constraints[0].open_time).toBe('09:30');
  });

  test('saves and updates route result', () => {
    repo.saveTrip({
      tripId: 'test-trip-2',
      startTime: '09:00',
      startLat: 12.97,
      startLon: 77.59,
      stops: [{ id: 'stop-1', name: 'A', lat: 0, lon: 0, inputOrder: 0 }],
    });

    repo.saveRouteResult('test-trip-2', {
      routeResultId: 'rr-1',
      presetId: 'Fastest',
      totalTime: 45.5,
      totalDistance: 12.3,
      violationCount: 0,
      orderedStopIds: ['stop-1'],
    });

    const res = repo.db.prepare('SELECT * FROM route_result WHERE trip_id = ?').get('test-trip-2');
    expect(res).toBeDefined();
    expect(res.total_time).toBe(45.5);
    expect(res.total_distance).toBe(12.3);
  });
});
