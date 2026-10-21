const { RoadDistanceProvider, ROAD_CIRCUIT_FACTOR } = require('./RoadDistanceProvider');

describe('RoadDistanceProvider', () => {
  const provider = new RoadDistanceProvider();

  test('returns zero distance and time for identical coordinates', () => {
    const res = provider.getDistance(48.8584, 2.2945, 48.8584, 2.2945);
    expect(res.distanceKm).toBe(0);
    expect(res.travelTimeMin).toBe(0);
    expect(res.isRoadNetwork).toBe(true);
  });

  test('applies urban circuit factor over straight-line Haversine distance', () => {
    // Eiffel Tower to Louvre Museum (~3.3 km straight line)
    const res = provider.getDistance(48.8584, 2.2945, 48.8606, 2.3376);
    expect(res.distanceKm).toBeGreaterThan(res.straightLineKm);
    expect(res.distanceKm).toBeCloseTo(res.straightLineKm * ROAD_CIRCUIT_FACTOR, 1);
    expect(res.travelTimeMin).toBeGreaterThan(0);
  });

  test('caches computed distance queries', () => {
    const res1 = provider.getDistance(48.8584, 2.2945, 48.8530, 2.3499);
    const res2 = provider.getDistance(48.8584, 2.2945, 48.8530, 2.3499);
    expect(res1).toBe(res2); // Same object reference from cache
  });

  test('validates coordinate boundaries', () => {
    expect(() => provider.getDistance(95, 0, 48, 2)).toThrow(RangeError);
    expect(() => provider.getDistance(48, 190, 48, 2)).toThrow(RangeError);
  });
});
