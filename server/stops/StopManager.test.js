const { StopManager } = require('./StopManager');
const { OpeningHoursConstraint } = require('./OpeningHoursConstraint');
const { PrecedenceConstraint } = require('./PrecedenceConstraint');

describe('StopManager', () => {
  test('addStop assigns inputOrder in insertion sequence', () => {
    const mgr = new StopManager();
    const a = mgr.addStop({ name: 'Museum', lat: 12.9, lon: 77.6 });
    const b = mgr.addStop({ name: 'Cafe', lat: 12.91, lon: 77.61 });
    expect(a.inputOrder).toBe(0);
    expect(b.inputOrder).toBe(1);
    expect(mgr.stops.length).toBe(2);
  });

  test('removeStop re-indexes remaining stops', () => {
    const mgr = new StopManager();
    const a = mgr.addStop({ name: 'A', lat: 0, lon: 0 });
    const b = mgr.addStop({ name: 'B', lat: 1, lon: 1 });
    const c = mgr.addStop({ name: 'C', lat: 2, lon: 2 });
    mgr.removeStop(a.id);
    expect(mgr.stops[0].id).toBe(b.id);
    expect(mgr.stops[0].inputOrder).toBe(0);
    expect(mgr.stops[1].id).toBe(c.id);
    expect(mgr.stops[1].inputOrder).toBe(1);
  });

  test('removeStop throws RangeError if stop does not exist', () => {
    const mgr = new StopManager();
    expect(() => mgr.removeStop('non-existent-id')).toThrow(RangeError);
  });

  test('repositionStop updates coordinates and validates bounds', () => {
    const mgr = new StopManager();
    const s = mgr.addStop({ name: 'Station', lat: 10, lon: 20 });
    mgr.repositionStop(s.id, 10.5, 20.5);
    expect(s.lat).toBe(10.5);
    expect(s.lon).toBe(20.5);
    expect(() => mgr.repositionStop(s.id, 95, 20)).toThrow(RangeError);
  });

  test('repositionStop throws RangeError if stop does not exist', () => {
    const mgr = new StopManager();
    expect(() => mgr.repositionStop('non-existent-id', 10, 20)).toThrow(RangeError);
  });

  test('rejects a close_time before open_time', () => {
    const mgr = new StopManager();
    const s = mgr.addStop({ name: 'Museum', lat: 0, lon: 0 });
    expect(() =>
      mgr.attachConstraint(s.id, new OpeningHoursConstraint('c1', s.id, '14:00', '10:00'))
    ).toThrow(RangeError);
  });

  test('rejects opening hours with missing openTime or closeTime', () => {
    const mgr = new StopManager();
    const s = mgr.addStop({ name: 'Museum', lat: 0, lon: 0 });
    expect(() =>
      mgr.attachConstraint(s.id, new OpeningHoursConstraint('c1', s.id, null, '18:00'))
    ).toThrow(TypeError);
  });

  test('rejects a stop preceding itself', () => {
    const mgr = new StopManager();
    const s = mgr.addStop({ name: 'Cafe', lat: 0, lon: 0 });
    expect(() =>
      mgr.attachConstraint(s.id, new PrecedenceConstraint('c2', s.id, s.id))
    ).toThrow(RangeError);
  });

  test('rejects a precedence constraint referencing an unknown precedesStopId', () => {
    const mgr = new StopManager();
    const s = mgr.addStop({ name: 'Cafe', lat: 0, lon: 0 });
    expect(() =>
      mgr.attachConstraint(s.id, new PrecedenceConstraint('c2', s.id, 'unknown-stop-id'))
    ).toThrow(RangeError);
  });

  test('attaches valid OpeningHoursConstraint and PrecedenceConstraint', () => {
    const mgr = new StopManager();
    const a = mgr.addStop({ name: 'Cafe', lat: 0, lon: 0 });
    const b = mgr.addStop({ name: 'Bakery', lat: 1, lon: 1 });

    const ohc = new OpeningHoursConstraint('c1', a.id, '09:00', '17:00');
    const pc = new PrecedenceConstraint('c2', a.id, b.id);

    mgr.attachConstraint(a.id, ohc);
    mgr.attachConstraint(a.id, pc);

    expect(a.constraints.length).toBe(2);
    expect(a.constraints[0]).toBe(ohc);
    expect(a.constraints[1]).toBe(pc);
  });

  test('setTripConfig sets configuration and emits stopsChanged event', () => {
    const mgr = new StopManager();
    const handler = jest.fn();
    mgr.on('stopsChanged', handler);

    mgr.setTripConfig('09:00', 12.9716, 77.5946);
    expect(mgr.tripConfig).toEqual({
      startTime: '09:00',
      startLat: 12.9716,
      startLon: 77.5946,
    });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'TRIP_CONFIG_UPDATED' }));
  });

  test('emits stopsChanged on mutation', () => {
    const mgr = new StopManager();
    const handler = jest.fn();
    mgr.on('stopsChanged', handler);

    const s = mgr.addStop({ name: 'Park', lat: 0, lon: 0 });
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'ADD', stopId: s.id }));

    mgr.repositionStop(s.id, 1, 1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'REPOSITION', stopId: s.id }));

    const ohc = new OpeningHoursConstraint('c1', s.id, '10:00', '16:00');
    mgr.attachConstraint(s.id, ohc);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CONSTRAINT_ADDED', stopId: s.id })
    );

    mgr.removeStop(s.id);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'REMOVE', stopId: s.id }));
  });
});
