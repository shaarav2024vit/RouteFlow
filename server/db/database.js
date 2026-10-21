const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '../../data/routeflow.db');

// Ensure data directory exists if file-based
if (DB_PATH !== ':memory:') {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      start_time TEXT DEFAULT '09:00',
      start_lat REAL NOT NULL,
      start_lon REAL NOT NULL,
      max_duration_min INTEGER,
      max_distance_km REAL,
      preset TEXT DEFAULT 'BALANCED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stops (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lon REAL NOT NULL,
      input_order INTEGER DEFAULT 0,
      pref_start TEXT,
      pref_end TEXT,
      dwell_time_min INTEGER DEFAULT 30,
      popularity REAL DEFAULT 0.6,
      scenic_score REAL DEFAULT 0.5,
      must_visit INTEGER DEFAULT 1,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS constraints (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      stop_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      severity TEXT DEFAULT 'HARD',
      open_time TEXT,
      close_time TEXT,
      precedes_stop_id TEXT,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (stop_id) REFERENCES stops(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS route_history (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      preset TEXT NOT NULL,
      total_distance_km REAL,
      total_duration_min INTEGER,
      optimal_route_json TEXT NOT NULL,
      explanation_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
  `);
}

initSchema();

// Trip Model operations
const TripRepository = {
  createTrip(trip) {
    const stmt = db.prepare(`
      INSERT INTO trips (id, name, description, start_time, start_lat, start_lon, max_duration_min, max_distance_km, preset)
      VALUES (@id, @name, @description, @startTime, @startLat, @startLon, @maxDurationMin, @maxDistanceKm, @preset)
    `);
    stmt.run({
      id: trip.id,
      name: trip.name,
      description: trip.description || '',
      startTime: trip.startTime || '09:00',
      startLat: trip.startLat,
      startLon: trip.startLon,
      maxDurationMin: trip.maxDurationMin || null,
      maxDistanceKm: trip.maxDistanceKm || null,
      preset: trip.preset || 'BALANCED',
    });
    return this.getTrip(trip.id);
  },

  getTrip(tripId) {
    const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);
    if (!trip) return null;

    const stops = db.prepare('SELECT * FROM stops WHERE trip_id = ? ORDER BY input_order ASC').all(tripId);
    const constraints = db.prepare('SELECT * FROM constraints WHERE trip_id = ?').all(tripId);

    // Group constraints by stop_id
    const stopsWithConstraints = stops.map((s) => ({
      id: s.id,
      tripId: s.trip_id,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      inputOrder: s.input_order,
      prefStart: s.pref_start,
      prefEnd: s.pref_end,
      dwellTimeMin: s.dwell_time_min,
      popularity: s.popularity,
      scenicScore: s.scenic_score,
      mustVisit: Boolean(s.must_visit),
      constraints: constraints
        .filter((c) => c.stop_id === s.id)
        .map((c) => ({
          id: c.id,
          type: c.type,
          name: c.name,
          severity: c.severity,
          openTime: c.open_time,
          closeTime: c.close_time,
          precedesStopId: c.precedes_stop_id,
        })),
    }));

    return {
      id: trip.id,
      name: trip.name,
      description: trip.description,
      tripConfig: {
        startTime: trip.start_time,
        startLat: trip.start_lat,
        startLon: trip.start_lon,
        maxDurationMin: trip.max_duration_min,
        maxDistanceKm: trip.max_distance_km,
      },
      preset: trip.preset,
      stops: stopsWithConstraints,
      createdAt: trip.created_at,
      updatedAt: trip.updated_at,
    };
  },

  listTrips() {
    const trips = db.prepare('SELECT id, name, description, preset, created_at, updated_at FROM trips ORDER BY updated_at DESC').all();
    return trips.map((t) => {
      const stopCount = db.prepare('SELECT COUNT(*) as count FROM stops WHERE trip_id = ?').get(t.id).count;
      return {
        ...t,
        stopCount,
      };
    });
  },

  saveFullTrip(tripData) {
    const saveTransaction = db.transaction(() => {
      // Check if trip exists
      const existing = db.prepare('SELECT id FROM trips WHERE id = ?').get(tripData.id);
      if (existing) {
        db.prepare(`
          UPDATE trips
          SET name = @name, description = @description, start_time = @startTime,
              start_lat = @startLat, start_lon = @startLon, max_duration_min = @maxDurationMin,
              max_distance_km = @maxDistanceKm, preset = @preset, updated_at = CURRENT_TIMESTAMP
          WHERE id = @id
        `).run({
          id: tripData.id,
          name: tripData.name,
          description: tripData.description || '',
          startTime: tripData.tripConfig?.startTime || '09:00',
          startLat: tripData.tripConfig?.startLat || 0,
          startLon: tripData.tripConfig?.startLon || 0,
          maxDurationMin: tripData.tripConfig?.maxDurationMin || null,
          maxDistanceKm: tripData.tripConfig?.maxDistanceKm || null,
          preset: tripData.preset || 'BALANCED',
        });

        // Clear existing stops and constraints for this trip
        db.prepare('DELETE FROM constraints WHERE trip_id = ?').run(tripData.id);
        db.prepare('DELETE FROM stops WHERE trip_id = ?').run(tripData.id);
      } else {
        db.prepare(`
          INSERT INTO trips (id, name, description, start_time, start_lat, start_lon, max_duration_min, max_distance_km, preset)
          VALUES (@id, @name, @description, @startTime, @startLat, @startLon, @maxDurationMin, @maxDistanceKm, @preset)
        `).run({
          id: tripData.id,
          name: tripData.name,
          description: tripData.description || '',
          startTime: tripData.tripConfig?.startTime || '09:00',
          startLat: tripData.tripConfig?.startLat || 0,
          startLon: tripData.tripConfig?.startLon || 0,
          maxDurationMin: tripData.tripConfig?.maxDurationMin || null,
          maxDistanceKm: tripData.tripConfig?.maxDistanceKm || null,
          preset: tripData.preset || 'BALANCED',
        });
      }

      // Insert stops & constraints
      const insertStop = db.prepare(`
        INSERT INTO stops (id, trip_id, name, lat, lon, input_order, pref_start, pref_end, dwell_time_min, popularity, scenic_score, must_visit)
        VALUES (@id, @tripId, @name, @lat, @lon, @inputOrder, @prefStart, @prefEnd, @dwellTimeMin, @popularity, @scenicScore, @mustVisit)
      `);

      const insertConstraint = db.prepare(`
        INSERT INTO constraints (id, trip_id, stop_id, type, name, severity, open_time, close_time, precedes_stop_id)
        VALUES (@id, @tripId, @stopId, @type, @name, @severity, @openTime, @closeTime, @precedesStopId)
      `);

      (tripData.stops || []).forEach((stop, idx) => {
        insertStop.run({
          id: stop.id,
          tripId: tripData.id,
          name: stop.name,
          lat: stop.lat,
          lon: stop.lon,
          inputOrder: idx,
          prefStart: stop.prefStart || null,
          prefEnd: stop.prefEnd || null,
          dwellTimeMin: stop.dwellTimeMin || 30,
          popularity: stop.popularity !== undefined ? stop.popularity : 0.6,
          scenicScore: stop.scenicScore !== undefined ? stop.scenicScore : 0.5,
          mustVisit: stop.mustVisit === false ? 0 : 1,
        });

        if (Array.isArray(stop.constraints)) {
          stop.constraints.forEach((c) => {
            insertConstraint.run({
              id: c.id,
              tripId: tripData.id,
              stopId: stop.id,
              type: c.type || (c.name === 'OPENING_HOURS' ? 'OPENING_HOURS' : 'PRECEDENCE'),
              name: c.name || c.type,
              severity: c.severity || 'HARD',
              openTime: c.openTime || null,
              closeTime: c.closeTime || null,
              precedesStopId: c.precedesStopId || null,
            });
          });
        }
      });
    });

    saveTransaction();
    return this.getTrip(tripData.id);
  },

  deleteTrip(tripId) {
    const res = db.prepare('DELETE FROM trips WHERE id = ?').run(tripId);
    return res.changes > 0;
  },

  saveRouteHistory(tripId, preset, routeData, explanationData) {
    const id = `rh-${Date.now()}`;
    db.prepare(`
      INSERT INTO route_history (id, trip_id, preset, total_distance_km, total_duration_min, optimal_route_json, explanation_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tripId,
      preset,
      routeData.totalDistanceKm,
      routeData.totalDurationMin,
      JSON.stringify(routeData),
      JSON.stringify(explanationData)
    );
    return id;
  },
};

module.exports = {
  db,
  initSchema,
  TripRepository,
};
