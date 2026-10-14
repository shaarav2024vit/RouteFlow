const { Constraint } = require('./Constraint');

/**
 * OpeningHoursConstraint
 * Traces to: FR-4; Week 4 §6.2 (open_time, close_time).
 *
 * Violated when the route's scheduled arrival at stopId falls
 * outside [openTime, closeTime].
 */
class OpeningHoursConstraint extends Constraint {
  /**
   * @param {string} id
   * @param {string} stopId
   * @param {string} openTime "HH:mm"
   * @param {string} closeTime "HH:mm"
   */
  constructor(id, stopId, openTime, closeTime) {
    super(id, 'OPENING_HOURS', 'HARD');
    this.stopId = stopId;
    this.openTime = openTime;
    this.closeTime = closeTime;
  }

  /**
   * @param {Route} route
   * @returns {boolean}
   */
  isViolated(route) {
    const arrival = route.getArrivalTime(this.stopId);
    return arrival < this.openTime || arrival > this.closeTime;
  }

  /**
   * @param {Route} route
   * @returns {string}
   */
  violationMessage(route) {
    const arrival = route.getArrivalTime(this.stopId);
    const stop = route.stops ? route.stops.find((s) => s.id === this.stopId) : null;
    const stopLabel = stop ? stop.name : this.stopId;
    return (
      `Arrival at ${arrival} is outside opening hours ` +
      `${this.openTime}–${this.closeTime} for "${stopLabel}".`
    );
  }
}

module.exports = { OpeningHoursConstraint };
