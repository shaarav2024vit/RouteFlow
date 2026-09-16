const { HaversineDistanceProvider } = require('./HaversineDistanceProvider');

describe('HaversineDistanceProvider', () => {
  const provider = new HaversineDistanceProvider();

  test('same point returns zero distance and dwell-only time', () => {
    const { distanceKm, travelTimeMin } = provider.getDistance(0, 0, 0, 0);
    expect(distanceKm).toBeCloseTo(0, 6);
    expect(travelTimeMin).toBeCloseTo(5, 6); // dwell time only
  });

  test('one degree of longitude at the equator is ~111.19 km', () => {
    const { distanceKm } = provider.getDistance(0, 0, 0, 1);
    expect(distanceKm).toBeCloseTo(111.19, 1);
  });

  test('rejects an out-of-range latitude', () => {
    expect(() => provider.getDistance(95, 0, 0, 0)).toThrow(RangeError);
  });

  test('rejects an out-of-range longitude', () => {
    expect(() => provider.getDistance(0, -185, 0, 0)).toThrow(RangeError);
  });

  test('calculates correct distance between known cities (e.g. London to Paris ~343 km)', () => {
    // London: 51.5074, -0.1278; Paris: 48.8566, 2.3522
    const { distanceKm, travelTimeMin } = provider.getDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(distanceKm).toBeGreaterThan(340);
    expect(distanceKm).toBeLessThan(345);
    // travel time = (distance / 20) * 60 + 5
    expect(travelTimeMin).toBeCloseTo((distanceKm / 20) * 60 + 5, 4);
  });
});
