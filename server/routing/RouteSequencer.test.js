const { RouteSequencer } = require('./RouteSequencer');
const { OpeningHoursConstraint } = require('../stops/OpeningHoursConstraint');
const { PrecedenceConstraint } = require('../stops/PrecedenceConstraint');

describe('RouteSequencer', () => {
  const sequencer = new RouteSequencer();

  test('handles empty stops gracefully', () => {
    const plan = sequencer.plan([]);
    expect(plan.optimalRoute.stops).toHaveLength(0);
    expect(plan.shortestDistanceRoute.stops).toHaveLength(0);
    expect(plan.alternatives).toHaveLength(0);
  });

  test('sequences single stop correctly with trip origin', () => {
    const stops = [{ id: 's-1', name: 'Stop 1', lat: 48.8584, lon: 2.2945 }];
    const tripConfig = { startTime: '09:00', startLat: 48.85, startLon: 2.3 };

    const plan = sequencer.plan(stops, tripConfig);
    expect(plan.optimalRoute.stops).toHaveLength(1);
    expect(plan.optimalRoute.legs).toHaveLength(1);
    expect(plan.optimalRoute.legs[0].arrivalTime).toBeDefined();
  });

  test('strictly honors precedence constraints in visiting order', () => {
    // 3 stops: Precedence requires stop 2 to be visited before stop 1
    const stop1 = { id: 's-1', name: 'Dinner', lat: 48.86, lon: 2.34 };
    const stop2 = { id: 's-2', name: 'Check-in', lat: 48.87, lon: 2.31 };
    const stop3 = { id: 's-3', name: 'Museum', lat: 48.88, lon: 2.33 };

    const precedence = new PrecedenceConstraint('pc1', 's-2', 's-1');
    const stops = [stop1, { ...stop2, constraints: [precedence] }, stop3];

    const plan = sequencer.plan(stops, { startTime: '09:00', startLat: 48.85, startLon: 2.3 });
    const order = plan.optimalRoute.getStopOrder();

    expect(order.indexOf('s-2')).toBeLessThan(order.indexOf('s-1'));
  });

  test('prioritizes opening hours constraints to ensure feasibility', () => {
    // Stop A closes early at 10:30, Stop B is open all day
    const stopA = {
      id: 's-a',
      name: 'Early Market',
      lat: 48.87,
      lon: 2.35,
      constraints: [new OpeningHoursConstraint('oh-a', 's-a', '09:00', '10:30')],
    };
    const stopB = {
      id: 's-b',
      name: 'Late Gallery',
      lat: 48.86,
      lon: 2.31,
      constraints: [new OpeningHoursConstraint('oh-b', 's-b', '09:00', '19:00')],
    };

    const stops = [stopB, stopA];
    const plan = sequencer.plan(stops, { startTime: '09:00', startLat: 48.85, startLon: 2.3 });

    const arrivalA = plan.optimalRoute.getArrivalTime('s-a');
    expect(arrivalA).toBeDefined();
    expect(arrivalA <= '10:30').toBe(true);
  });
});
