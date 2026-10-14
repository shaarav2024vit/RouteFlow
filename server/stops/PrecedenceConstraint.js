const { Constraint } = require('./Constraint');

/**
 * PrecedenceConstraint
 * Traces to: FR-5; Week 4 §6.2 (precedes_stop_id).
 *
 * Violated when stopId does not appear before precedesStopId
 * in the route's visiting order.
 */
class PrecedenceConstraint extends Constraint {
  /**
   * @param {string} id
   * @param {string} stopId
   * @param {string} precedesStopId
   */
  constructor(id, stopId, precedesStopId) {
    super(id, 'PRECEDENCE', 'HARD');
    this.stopId = stopId;
    this.precedesStopId = precedesStopId;
  }

  /**
   * @param {Route} route
   * @returns {boolean}
   */
  isViolated(route) {
    const order = route.getStopOrder();
    const idxA = order.indexOf(this.stopId);
    const idxB = order.indexOf(this.precedesStopId);
    if (idxA === -1 || idxB === -1) {
      return false;
    }
    return idxA > idxB;
  }

  /**
   * @param {Route} [route]
   * @returns {string}
   */
  violationMessage(route) {
    const stopA = route && route.stops ? route.stops.find((s) => s.id === this.stopId) : null;
    const stopB = route && route.stops ? route.stops.find((s) => s.id === this.precedesStopId) : null;
    const labelA = stopA ? stopA.name : this.stopId;
    const labelB = stopB ? stopB.name : this.precedesStopId;
    return `"${labelA}" must be visited before "${labelB}".`;
  }
}

module.exports = { PrecedenceConstraint };
