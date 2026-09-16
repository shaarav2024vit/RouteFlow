/**
 * IDistanceProvider (interface)
 * Traces to: FR-14, NFR-6; Week 3 Design §2.2 "Distance Provider
 * Interface"; Week 4 Design §2.2, §3.
 *
 * Any concrete provider must implement getDistance(), returning an
 * estimated distance and derived travel time between two points —
 * per the Week 4 §3 module-contract output: "Estimated distance
 * (Haversine) and derived travel time."
 */
class IDistanceProvider {
  /**
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {{ distanceKm: number, travelTimeMin: number }}
   */
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  getDistance(lat1, lon1, lat2, lon2) {
    throw new Error('getDistance() must be implemented by a subclass');
  }
}

module.exports = { IDistanceProvider };
