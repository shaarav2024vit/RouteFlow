const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { ITripRepository } = require('./ITripRepository');

/**
 * SqliteTripRepository
 * Traces to: Week 4 §2.2, §6; Week 5 §2.2.
 *
 * Synchronous SQLite persistence layer backed by better-sqlite3.
 */
class SqliteTripRepository extends ITripRepository {
  /**
   * @param {string} [dbPath=':memory:']
   */
  constructor(dbPath = ':memory:') {
    super();
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
  }

  initSchema() {
    const schemaFile = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaFile, 'utf8');
    this.db.exec(sql);

    // Seed standard presets if empty (Week 2 §3; Week 4 §6.2)
    const seedPreset = this.db.prepare(`
      INSERT OR IGNORE INTO preset (preset_id, name, travel_weight, time_window_weight, weather_weight, crowd_weight, scenic_weight, preference_weight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    seedPreset.run('Fastest', 'Fastest', 1.0, 0.5, 0.1, 0.1, 0.1, 0.2);
    seedPreset.run('Best Scenic', 'Best Scenic', 0.3, 0.4, 0.7, 0.4, 1.0, 0.5);
    seedPreset.run('Least Crowded', 'Least Crowded', 0.4, 0.5, 0.4, 1.0, 0.3, 0.4);
    seedPreset.run('Most Attractions Open', 'Most Attractions Open', 0.4, 1.0, 0.3, 0.3, 0.2, 0.5);
  }

  /**
   * Persists a trip configuration, stops, and constraints
   * @param {object} params
   */
  saveTrip({ tripId, startTime, startLat, startLon, activePresetId = null, stops = [] }) {
    const insertTrip = this.db.prepare(`
      INSERT INTO trip (trip_id, start_time, start_lat, start_lon, active_preset_id)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(trip_id) DO UPDATE SET
        start_time = excluded.start_time,
        start_lat = excluded.start_lat,
        start_lon = excluded.start_lon,
        active_preset_id = excluded.active_preset_id
    `);

    const deleteStops = this.db.prepare('DELETE FROM stop WHERE trip_id = ?');

    const insertStop = this.db.prepare(`
      INSERT INTO stop (stop_id, trip_id, name, lat, lon, input_order, pref_start, pref_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertConstraint = this.db.prepare(`
      INSERT INTO stop_constraint (constraint_id, stop_id, type, open_time, close_time, precedes_stop_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertTrip.run(tripId, startTime, startLat, startLon, activePresetId);
      deleteStops.run(tripId);

      for (const s of stops) {
        insertStop.run(
          s.id,
          tripId,
          s.name,
          s.lat,
          s.lon,
          s.inputOrder,
          s.prefStart || null,
          s.prefEnd || null
        );

        if (s.constraints && Array.isArray(s.constraints)) {
          for (const c of s.constraints) {
            insertConstraint.run(
              c.id,
              s.id,
              c.name,
              c.openTime || null,
              c.closeTime || null,
              c.precedesStopId || null
            );
          }
        }
      }
    });

    transaction();
  }

  /**
   * Reconstructs a trip aggregate
   * @param {string} tripId
   * @returns {object|null}
   */
  loadTrip(tripId) {
    const trip = this.db.prepare('SELECT * FROM trip WHERE trip_id = ?').get(tripId);
    if (!trip) return null;

    const stops = this.db
      .prepare('SELECT * FROM stop WHERE trip_id = ? ORDER BY input_order ASC')
      .all(tripId);

    for (const stop of stops) {
      stop.constraints = this.db
        .prepare('SELECT * FROM stop_constraint WHERE stop_id = ?')
        .all(stop.stop_id);
    }

    return {
      tripId: trip.trip_id,
      startTime: trip.start_time,
      startLat: trip.start_lat,
      startLon: trip.start_lon,
      activePresetId: trip.active_preset_id,
      stops: stops.map((s) => ({
        id: s.stop_id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        inputOrder: s.input_order,
        prefStart: s.pref_start,
        prefEnd: s.pref_end,
        constraints: s.constraints,
      })),
    };
  }

  /**
   * Persists latest computed route result (FR-15, Week 4 §6.2)
   */
  saveRouteResult(tripId, { routeResultId, presetId = null, totalTime, totalDistance, violationCount, orderedStopIds = [] }) {
    const insertResult = this.db.prepare(`
      INSERT INTO route_result (route_result_id, trip_id, preset_id, total_time, total_distance, violation_count)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(trip_id) DO UPDATE SET
        route_result_id = excluded.route_result_id,
        preset_id = excluded.preset_id,
        total_time = excluded.total_time,
        total_distance = excluded.total_distance,
        violation_count = excluded.violation_count,
        computed_at = CURRENT_TIMESTAMP
    `);

    const deleteOldStops = this.db.prepare('DELETE FROM route_result_stop WHERE route_result_id = ?');

    const insertStopOrder = this.db.prepare(`
      INSERT INTO route_result_stop (route_result_id, stop_id, seq_order)
      VALUES (?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertResult.run(routeResultId, tripId, presetId, totalTime, totalDistance, violationCount);
      deleteOldStops.run(routeResultId);
      orderedStopIds.forEach((stopId, idx) => {
        insertStopOrder.run(routeResultId, stopId, idx);
      });
    });

    transaction();
  }

  close() {
    this.db.close();
  }
}

module.exports = { SqliteTripRepository };
