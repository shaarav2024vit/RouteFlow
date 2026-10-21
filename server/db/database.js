/**
 * In-memory Trip Repository
 *
 * Replaces the better-sqlite3 SQLite backend with a plain JavaScript Map so
 * the app runs on serverless platforms (Vercel) where native addons and
 * persistent file-system writes are not available.
 *
 * On every cold-start the sample trips are seeded by server/app.js via
 * `loadSampleTrip()`, so the demo data is always present.
 */

// ── In-memory stores ──────────────────────────────────────────────────────────
const tripsMap = new Map(); // tripId → tripRecord

// ── Helpers ──────────────────────────────────────────────────────────────────
function now() {
  return new Date().toISOString();
}

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ── TripRepository ────────────────────────────────────────────────────────────
const TripRepository = {
  /** Create a minimal trip record (no stops). */
  createTrip(trip) {
    const record = {
      id: trip.id,
      name: trip.name,
      description: trip.description || '',
      tripConfig: {
        startTime: trip.startTime || '09:00',
        startLat: trip.startLat || 0,
        startLon: trip.startLon || 0,
        maxDurationMin: trip.maxDurationMin || null,
        maxDistanceKm: trip.maxDistanceKm || null,
      },
      preset: trip.preset || 'BALANCED',
      stops: [],
      createdAt: now(),
      updatedAt: now(),
    };
    tripsMap.set(trip.id, record);
    return cloneDeep(record);
  },

  /** Retrieve a single trip with all its stops & constraints. */
  getTrip(tripId) {
    const record = tripsMap.get(tripId);
    if (!record) return null;
    return cloneDeep(record);
  },

  /** List all trips (summary – no stops array). */
  listTrips() {
    const result = [];
    for (const record of tripsMap.values()) {
      result.push({
        id: record.id,
        name: record.name,
        description: record.description,
        preset: record.preset,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        stopCount: record.stops.length,
      });
    }
    // Sort newest-updated first
    result.sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1));
    return result;
  },

  /**
   * Upsert a complete trip (trip meta + all stops + constraints).
   * This mirrors the old SQLite saveFullTrip transaction.
   */
  saveFullTrip(tripData) {
    const record = {
      id: tripData.id,
      name: tripData.name,
      description: tripData.description || '',
      tripConfig: {
        startTime: tripData.tripConfig?.startTime || '09:00',
        startLat: tripData.tripConfig?.startLat || 0,
        startLon: tripData.tripConfig?.startLon || 0,
        maxDurationMin: tripData.tripConfig?.maxDurationMin || null,
        maxDistanceKm: tripData.tripConfig?.maxDistanceKm || null,
      },
      preset: tripData.preset || 'BALANCED',
      stops: (tripData.stops || []).map((s, idx) => ({
        id: s.id,
        tripId: tripData.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        inputOrder: idx,
        prefStart: s.prefStart || null,
        prefEnd: s.prefEnd || null,
        dwellTimeMin: s.dwellTimeMin || 30,
        popularity: s.popularity !== undefined ? s.popularity : 0.6,
        scenicScore: s.scenicScore !== undefined ? s.scenicScore : 0.5,
        mustVisit: s.mustVisit !== false,
        constraints: Array.isArray(s.constraints)
          ? s.constraints.map((c) => ({
              id: c.id,
              type: c.type || 'OPENING_HOURS',
              name: c.name || c.type,
              severity: c.severity || 'HARD',
              openTime: c.openTime || null,
              closeTime: c.closeTime || null,
              precedesStopId: c.precedesStopId || null,
            }))
          : [],
      })),
      createdAt: tripsMap.get(tripData.id)?.createdAt || now(),
      updatedAt: now(),
    };

    tripsMap.set(tripData.id, record);
    return cloneDeep(record);
  },

  /** Delete a trip. Returns true if it existed. */
  deleteTrip(tripId) {
    return tripsMap.delete(tripId);
  },

  /** Save route history (no-op stub – kept for API compatibility). */
  saveRouteHistory(_tripId, _preset, _routeData, _explanationData) {
    return `rh-${Date.now()}`;
  },
};

// Export a minimal stub for `db` so any code that does `const { db } = require(…)` doesn't crash.
const db = {
  pragma: () => {},
  exec: () => {},
  prepare: () => ({ run: () => {}, get: () => null, all: () => [] }),
  transaction: (fn) => fn,
};

function initSchema() {
  // No-op for in-memory store
}

module.exports = {
  db,
  initSchema,
  TripRepository,
};
