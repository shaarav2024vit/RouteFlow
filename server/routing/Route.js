/**
 * Route domain model
 * Traces to: FR-6, FR-7, FR-15; Week 3 §4.2; Week 4 §5.2.
 *
 * Represents an ordered visiting sequence of stops for a trip,
 * including scheduled timings, total travel metrics, and constraint violations.
 */
class Route {
  /**
   * @param {object} params
   * @param {Array<object>} params.stops - Ordered list of stops
   * @param {Array<object>} [params.legs=[]] - Leg distance and timing details between consecutive stops
   * @param {number} [params.totalDistanceKm=0] - Total travel distance in kilometers
   * @param {number} [params.totalTravelTimeMin=0] - Total transit + dwell duration in minutes
   * @param {Array<object>} [params.violations=[]] - Any constraint violation alerts
   */
  constructor({
    stops = [],
    legs = [],
    totalDistanceKm = 0,
    totalTravelTimeMin = 0,
    violations = [],
  }) {
    this.stops = stops;
    this.legs = legs;
    this.totalDistanceKm = totalDistanceKm;
    this.totalTravelTimeMin = totalTravelTimeMin;
    this.violations = violations;
  }

  /**
   * Returns the ordered array of stop IDs
   * @returns {string[]}
   */
  getStopOrder() {
    return this.stops.map((s) => s.id);
  }

  /**
   * Returns scheduled arrival time at a stop as "HH:mm"
   * @param {string} stopId
   * @returns {string|null}
   */
  getArrivalTime(stopId) {
    const stop = this.stops.find((s) => s.id === stopId);
    return stop && stop.scheduledArrival ? stop.scheduledArrival : null;
  }
}

module.exports = { Route };
