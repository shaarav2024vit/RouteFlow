const { IDistanceProvider } = require('./IDistanceProvider');

// WGS-84 mean earth radius (km); matches the earthRadiusKm constant
// fixed on HaversineDistanceProvider in the Week 4 §5.2 class diagram.
const EARTH_RADIUS_KM = 6371.0088;

// Week 3 Design §2.2 fixes the *model* — "assumed urban transit speed
// plus fixed dwell time" — but not its numbers. The two constants below
// are new in this implementation and open to recalibration later.
const ASSUMED_SPEED_KMH = 20;
const FIXED_DWELL_MIN = 5;

/**
 * Raises a RangeError if a coordinate falls outside the bounds fixed
 * in the Week 4 §6.2 database validation rules (lat -90..90,
 * lon -180..180) — reused here so the same bounds are enforced at
 * the moment a distance is computed, not only at persistence time.
 * @param {number} lat
 * @param {number} lon
 */
function validateCoordinate(lat, lon) {
  if (lat < -90 || lat > 90) {
    throw new RangeError(`Latitude ${lat} is out of range (-90 to 90)`);
  }
  if (lon < -180 || lon > 180) {
    throw new RangeError(`Longitude ${lon} is out of range (-180 to 180)`);
  }
}

/**
 * HaversineDistanceProvider
 * v1 implementation of IDistanceProvider using the Haversine formula.
 * Traces to: FR-14, NFR-6 (Week 3 Design §2.2; Week 4 Design §2.2, §3).
 */
class HaversineDistanceProvider extends IDistanceProvider {
  /**
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {{ distanceKm: number, travelTimeMin: number }}
   */
  getDistance(lat1, lon1, lat2, lon2) {
    validateCoordinate(lat1, lon1);
    validateCoordinate(lat2, lon2);

    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceKm = EARTH_RADIUS_KM * c;
    const travelTimeMin = (distanceKm / ASSUMED_SPEED_KMH) * 60 + FIXED_DWELL_MIN;

    return { distanceKm, travelTimeMin };
  }
}

module.exports = { HaversineDistanceProvider, validateCoordinate };
