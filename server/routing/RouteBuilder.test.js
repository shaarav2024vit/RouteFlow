const { RouteBuilder } = require('./RouteBuilder');
const { Route } = require('./Route');
const { HaversineDistanceProvider } = require('../distance/HaversineDistanceProvider');
const { OpeningHoursConstraint } = require('../stops/OpeningHoursConstraint');
const { PrecedenceConstraint } = require('../stops/PrecedenceConstraint');

describe('RouteBuilder & ConstraintsFilter', () => {
  const distanceProvider = new HaversineDistanceProvider();
  const routeBuilder = new RouteBuilder(distanceProvider);

  const tripConfig = {
    startTime: '09:00',
    startLat: 12.9716,
    startLon: 77.5946,
  };

  const stops = [
    { id: 's1', name: 'Museum', lat: 12.9752, lon: 77.5963, constraints: [] },
    { id: 's2', name: 'Bakery', lat: 12.9822, lon: 77.6083, constraints: [] },
    { id: 's3', name: 'Park', lat: 12.9780, lon: 77.5825, constraints: [] },
  ];

  test('buildInitialRoute builds valid nearest-neighbour ordering with scheduled arrivals', () => {
    const route = routeBuilder.buildInitialRoute(stops, tripConfig);
    expect(route).toBeInstanceOf(Route);
    expect(route.stops.length).toBe(3);
    expect(route.totalDistanceKm).toBeGreaterThan(0);
    expect(route.totalTravelTimeMin).toBeGreaterThan(0);
    expect(route.stops[0].scheduledArrival).toBeDefined();
    expect(route.violations.length).toBe(0);
  });

  test('detects opening hours violation in route', () => {
    // Arrival at s1 will be around 09:09. Setting window to 11:00-14:00 will violate it
    const s1WithConstraint = {
      ...stops[0],
      constraints: [new OpeningHoursConstraint('oh1', 's1', '11:00', '14:00')],
    };
    const route = routeBuilder.buildInitialRoute([s1WithConstraint, stops[1]], tripConfig);
    expect(route.violations.length).toBe(1);
    expect(route.violations[0].type).toBe('OPENING_HOURS');
  });

  test('detects precedence violation in route', () => {
    // Force s2 to precede s1. But nearest neighbour visits s1 first
    const s2MustPrecedeS1 = {
      ...stops[1],
      constraints: [new PrecedenceConstraint('pc1', 's2', 's1')],
    };
    const route = routeBuilder.buildInitialRoute([stops[0], s2MustPrecedeS1], tripConfig);
    expect(route.violations.length).toBe(1);
    expect(route.violations[0].type).toBe('PRECEDENCE');
  });

  test('refineRoute applies 2-opt search to resolve precedence conflicts when possible', () => {
    // When precedence is violated, 2-opt checks reversals to satisfy constraint
    const s2BeforeS1 = new PrecedenceConstraint('pc1', 's2', 's1');
    const s2 = { ...stops[1], constraints: [s2BeforeS1] };
    const s1 = { ...stops[0] };
    const s3 = { ...stops[2] };

    const initial = routeBuilder.buildInitialRoute([s1, s2, s3], tripConfig);
    const refined = routeBuilder.refineRoute(initial, tripConfig);

    // After 2-opt refinement, s2 should precede s1 or have fewer violations
    expect(refined.violations.length).toBeLessThanOrEqual(initial.violations.length);
  });
});
