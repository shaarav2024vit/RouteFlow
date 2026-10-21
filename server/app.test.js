const request = require('supertest');
const { app, loadSampleTrip } = require('./app');
const { TripRepository } = require('./db/database');

describe('RouteFlow Express API Endpoints & Features', () => {
  beforeEach(() => {
    loadSampleTrip('paris');
  });

  test('GET /api/status returns server status and version', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBe('0.1.0');
    expect(res.body.stopsCount).toBeGreaterThan(0);
  });

  test('GET /api/presets returns list of multi-objective presets', async () => {
    const res = await request(app).get('/api/presets');
    expect(res.status).toBe(200);
    expect(res.body.presets).toBeDefined();
    expect(res.body.presets.BALANCED).toBeDefined();
    expect(res.body.presets.FASTEST).toBeDefined();
    expect(res.body.presets.MOST_OPEN).toBeDefined();
  });

  test('GET /api/samples returns sample trips', async () => {
    const res = await request(app).get('/api/samples');
    expect(res.status).toBe(200);
    expect(res.body.samples.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /api/samples/:key/load loads sample trip', async () => {
    const res = await request(app).post('/api/samples/san_francisco/load');
    expect(res.status).toBe(200);
    expect(res.body.tripConfig.startTime).toBe('08:30');
    expect(res.body.stops).toHaveLength(5);
    expect(res.body.result.optimalRoute).toBeDefined();
  });

  test('GET /api/stops returns list of stops and tripConfig', async () => {
    const res = await request(app).get('/api/stops');
    expect(res.status).toBe(200);
    expect(res.body.stops).toBeDefined();
    expect(res.body.tripConfig).toBeDefined();
  });

  test('POST /api/stops adds a validated stop', async () => {
    const res = await request(app)
      .post('/api/stops')
      .send({ name: 'Versailles Palace', lat: 48.8049, lon: 2.1204 });

    expect(res.status).toBe(201);
    expect(res.body.stop.name).toBe('Versailles Palace');
    expect(res.body.stop.id).toBeDefined();
  });

  test('POST /api/stops rejects invalid coordinates', async () => {
    const res = await request(app)
      .post('/api/stops')
      .send({ name: 'Invalid Stop', lat: 95.0, lon: 2.1204 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Latitude');
  });

  test('POST /api/stops/:id/constraints attaches OpeningHoursConstraint', async () => {
    const getRes = await request(app).get('/api/stops');
    const firstStopId = getRes.body.stops[0].id;

    const res = await request(app)
      .post(`/api/stops/${firstStopId}/constraints`)
      .send({
        type: 'OPENING_HOURS',
        openTime: '08:00',
        closeTime: '20:00',
      });

    expect(res.status).toBe(201);
    expect(res.body.stop.constraints.length).toBeGreaterThan(0);
    const addedConstraintId = res.body.stop.constraints[res.body.stop.constraints.length - 1].id;

    const delRes = await request(app)
      .delete(`/api/stops/${firstStopId}/constraints/${addedConstraintId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.stop.constraints.some((c) => c.id === addedConstraintId)).toBe(false);
  });

  test('POST /api/plan-route computes optimal route and reasoning explanation', async () => {
    const res = await request(app)
      .post('/api/plan-route')
      .send({ preset: 'BALANCED' });

    expect(res.status).toBe(200);
    expect(res.body.optimalRoute).toBeDefined();
    expect(res.body.explanation).toBeDefined();
    expect(res.body.explanation.summary).toBeDefined();
    expect(res.body.explanation.itinerary.length).toBeGreaterThan(0);
    expect(res.body.comparison).toBeDefined();
  });

  test('POST /api/compare-presets returns side-by-side comparison of all presets', async () => {
    const res = await request(app).post('/api/compare-presets');
    expect(res.status).toBe(200);
    expect(res.body.comparison.length).toBeGreaterThanOrEqual(4);
    expect(res.body.comparison[0].presetName).toBeDefined();
  });

  test('POST /api/what-if previews impact of adding or removing a stop', async () => {
    const res = await request(app)
      .post('/api/what-if')
      .send({
        addStop: { id: 'test-stop', name: 'Test Stop', lat: 48.86, lon: 2.34 },
      });

    expect(res.status).toBe(200);
    expect(res.body.delta).toBeDefined();
    expect(res.body.preview.stopsCount).toBe(res.body.base.stopsCount + 1);
  });

  test('GET /api/search-places finds places from landmarks and search query', async () => {
    const res = await request(app).get('/api/search-places?q=Eiffel');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.results[0].name).toContain('Eiffel');
  });

  test('GET /api/trip-summary produces formatted itinerary', async () => {
    const res = await request(app).get('/api/trip-summary');
    expect(res.status).toBe(200);
    expect(res.body.tripTitle).toBeDefined();
    expect(res.body.stops.length).toBeGreaterThan(0);
  });

  test('GET /api/export/gpx returns valid GPX XML', async () => {
    const res = await request(app).get('/api/export/gpx');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/gpx+xml');
    expect(res.text).toContain('<?xml version="1.0"');
    expect(res.text).toContain('<gpx version="1.1"');
    expect(res.text).toContain('<wpt lat=');
    expect(res.text).toContain('<rte>');
  });

  test('GET /api/export/geojson returns GeoJSON FeatureCollection', async () => {
    const res = await request(app).get('/api/export/geojson');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/geo+json');
    expect(res.body.type).toBe('FeatureCollection');
    expect(res.body.features.length).toBeGreaterThan(1);
    expect(res.body.features[0].geometry.type).toBe('LineString');
  });

  test('GET /api/export/json returns structured JSON itinerary', async () => {
    const res = await request(app).get('/api/export/json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.title).toContain('RouteFlow');
    expect(res.body.stops.length).toBeGreaterThan(0);
    expect(res.body.metrics).toBeDefined();
  });

  test('POST /api/trip-config supports roundTrip and plans return leg', async () => {
    const configRes = await request(app)
      .post('/api/trip-config')
      .send({ startTime: '09:00', startLat: 48.8584, startLon: 2.2945, roundTrip: true });
    expect(configRes.status).toBe(200);
    expect(configRes.body.tripConfig.roundTrip).toBe(true);

    const planRes = await request(app)
      .post('/api/plan-route')
      .send({ preset: 'BALANCED' });
    expect(planRes.status).toBe(200);
    const legs = planRes.body.optimalRoute.legs;
    const lastLeg = legs[legs.length - 1];
    expect(lastLeg.isReturnLeg).toBe(true);
    expect(lastLeg.toStopId).toBe('ORIGIN_RETURN');
  });

  test('Database TripRepository saves, lists, loads, and deletes trips', () => {
    const sampleTrip = {
      id: 'test-trip-db-1',
      name: 'Test Database Trip',
      description: 'Trip persistence test',
      tripConfig: { startTime: '10:00', startLat: 48.85, startLon: 2.3 },
      stops: [{ id: 's1', name: 'Stop 1', lat: 48.85, lon: 2.3, constraints: [] }],
    };

    TripRepository.saveFullTrip(sampleTrip);
    const loaded = TripRepository.getTrip('test-trip-db-1');
    expect(loaded).toBeDefined();
    expect(loaded.name).toBe('Test Database Trip');
    expect(loaded.stops).toHaveLength(1);

    const list = TripRepository.listTrips();
    expect(list.some((t) => t.id === 'test-trip-db-1')).toBe(true);

    const deleted = TripRepository.deleteTrip('test-trip-db-1');
    expect(deleted).toBe(true);
    expect(TripRepository.getTrip('test-trip-db-1')).toBeNull();
  });
});
