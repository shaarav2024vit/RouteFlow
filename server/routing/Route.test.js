const { Route, timeToMinutes, minutesToTime } = require('./Route');
const { OpeningHoursConstraint } = require('../stops/OpeningHoursConstraint');
const { PrecedenceConstraint } = require('../stops/PrecedenceConstraint');

describe('Route & Time Utilities', () => {
  describe('timeToMinutes & minutesToTime', () => {
    test('converts HH:mm to minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('09:30')).toBe(570);
      expect(timeToMinutes('14:45')).toBe(885);
      expect(timeToMinutes(null)).toBe(0);
    });

    test('converts minutes to HH:mm string', () => {
      expect(minutesToTime(0)).toBe('00:00');
      expect(minutesToTime(570)).toBe('09:30');
      expect(minutesToTime(885)).toBe('14:45');
      expect(minutesToTime(1440 + 60)).toBe('01:00'); // modulo wrap
    });
  });

  describe('Route domain class', () => {
    const stopA = { id: 's-a', name: 'Stop A', lat: 48.85, lon: 2.3 };
    const stopB = { id: 's-b', name: 'Stop B', lat: 48.86, lon: 2.35 };

    const route = new Route({
      stops: [stopA, stopB],
      legs: [
        {
          fromStop: null,
          toStop: stopA,
          distanceKm: 2.5,
          travelTimeMin: 12,
          arrivalTime: '09:12',
          dwellTimeMin: 30,
          departureTime: '09:42',
        },
        {
          fromStop: stopA,
          toStop: stopB,
          distanceKm: 3.5,
          travelTimeMin: 15,
          arrivalTime: '09:57',
          dwellTimeMin: 45,
          departureTime: '10:42',
        },
      ],
      totalDistanceKm: 6.0,
      totalDurationMin: 102,
    });

    test('implements getArrivalTime(stopId)', () => {
      expect(route.getArrivalTime('s-a')).toBe('09:12');
      expect(route.getArrivalTime('s-b')).toBe('09:57');
      expect(route.getArrivalTime('non-existent')).toBeNull();
    });

    test('implements getStopOrder()', () => {
      expect(route.getStopOrder()).toEqual(['s-a', 's-b']);
    });

    test('calculates total distance and duration accurately', () => {
      expect(route.getTotalDistance()).toBe(6.0);
      expect(route.getTotalDuration()).toBe(102);
    });

    test('checkConstraints validates OpeningHoursConstraint and PrecedenceConstraint', () => {
      const ohc = new OpeningHoursConstraint('oh1', 's-a', '09:00', '11:00');
      const pc = new PrecedenceConstraint('pc1', 's-a', 's-b');

      const check1 = route.checkConstraints([ohc, pc]);
      expect(check1.feasible).toBe(true);
      expect(check1.violations).toHaveLength(0);

      const invalidOhc = new OpeningHoursConstraint('oh2', 's-a', '10:00', '11:00');
      const check2 = route.checkConstraints([invalidOhc]);
      expect(check2.feasible).toBe(false);
      expect(check2.violations[0].constraintId).toBe('oh2');
    });

    test('toJSON produces serializable summary', () => {
      const json = route.toJSON();
      expect(json.totalDistanceKm).toBe(6.0);
      expect(json.stops).toHaveLength(2);
      expect(json.legs).toHaveLength(2);
    });
  });
});
