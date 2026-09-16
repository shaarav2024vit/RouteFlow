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
    return order.indexOf(this.stopId) > order.indexOf(this.precedesStopId);
  }

  /**
   * @returns {string}
   */
  violationMessage() {
    return (
      `Stop ${this.stopId} must be visited before ` +
      `stop ${this.precedesStopId}.`
    );
  }
}

module.exports = { PrecedenceConstraint };
