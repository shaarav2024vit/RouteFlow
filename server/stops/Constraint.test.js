const { IConstraint } = require('./IConstraint');
const { Constraint } = require('./Constraint');
const { OpeningHoursConstraint } = require('./OpeningHoursConstraint');
const { PrecedenceConstraint } = require('./PrecedenceConstraint');

describe('Constraint Hierarchy Contracts', () => {
  test('IConstraint base methods throw error if not implemented by subclass', () => {
    const iConstraint = new IConstraint();
    expect(() => iConstraint.isViolated({})).toThrow('isViolated() must be implemented by a subclass');
    expect(() => iConstraint.violationMessage({})).toThrow('violationMessage() must be implemented by a subclass');
  });

  test('Constraint base class stores id, name, and severity', () => {
    const c1 = new Constraint('c1', 'CUSTOM');
    expect(c1.id).toBe('c1');
    expect(c1.name).toBe('CUSTOM');
    expect(c1.severity).toBe('HARD');

    const c2 = new Constraint('c2', 'SOFT_CUSTOM', 'SOFT');
    expect(c2.severity).toBe('SOFT');
    // base methods should still throw because it is an abstract base
    expect(() => c1.isViolated({})).toThrow('isViolated() must be implemented by a subclass');
    expect(() => c1.violationMessage({})).toThrow('violationMessage() must be implemented by a subclass');
  });

  describe('OpeningHoursConstraint', () => {
    const ohc = new OpeningHoursConstraint('oh1', 'stop-1', '10:00', '16:00');

    test('initializes with correct properties', () => {
      expect(ohc.id).toBe('oh1');
      expect(ohc.name).toBe('OPENING_HOURS');
      expect(ohc.severity).toBe('HARD');
      expect(ohc.stopId).toBe('stop-1');
      expect(ohc.openTime).toBe('10:00');
      expect(ohc.closeTime).toBe('16:00');
    });

    test('returns false when arrival is within window [openTime, closeTime]', () => {
      const mockRoute = {
        getArrivalTime: (stopId) => (stopId === 'stop-1' ? '12:00' : null),
      };
      expect(ohc.isViolated(mockRoute)).toBe(false);
    });

    test('returns true when arrival is earlier than openTime', () => {
      const mockRoute = {
        getArrivalTime: (stopId) => (stopId === 'stop-1' ? '09:30' : null),
      };
      expect(ohc.isViolated(mockRoute)).toBe(true);
      expect(ohc.violationMessage(mockRoute)).toBe(
        'Arrival at 09:30 is outside opening hours 10:00–16:00 for stop stop-1.'
      );
    });

    test('returns true when arrival is later than closeTime', () => {
      const mockRoute = {
        getArrivalTime: (stopId) => (stopId === 'stop-1' ? '16:15' : null),
      };
      expect(ohc.isViolated(mockRoute)).toBe(true);
      expect(ohc.violationMessage(mockRoute)).toBe(
        'Arrival at 16:15 is outside opening hours 10:00–16:00 for stop stop-1.'
      );
    });
  });

  describe('PrecedenceConstraint', () => {
    const pc = new PrecedenceConstraint('pc1', 'stop-A', 'stop-B');

    test('initializes with correct properties', () => {
      expect(pc.id).toBe('pc1');
      expect(pc.name).toBe('PRECEDENCE');
      expect(pc.severity).toBe('HARD');
      expect(pc.stopId).toBe('stop-A');
      expect(pc.precedesStopId).toBe('stop-B');
    });

    test('returns false when stopId comes before precedesStopId in route order', () => {
      const mockRoute = {
        getStopOrder: () => ['stop-A', 'stop-C', 'stop-B'],
      };
      expect(pc.isViolated(mockRoute)).toBe(false);
    });

    test('returns true when stopId comes after precedesStopId in route order', () => {
      const mockRoute = {
        getStopOrder: () => ['stop-B', 'stop-A'],
      };
      expect(pc.isViolated(mockRoute)).toBe(true);
      expect(pc.violationMessage()).toBe(
        'Stop stop-A must be visited before stop stop-B.'
      );
    });
  });
});
