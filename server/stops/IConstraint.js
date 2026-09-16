/**
 * IConstraint (interface)
 * Traces to: FR-4, FR-5; Week 5 §4.1 "two-method IConstraint contract."
 *
 * Any concrete constraint must implement isViolated() and
 * violationMessage(), evaluated by Constraint-Aware Refinement
 * against a candidate route (Week 3 Decision 1).
 */
class IConstraint {
  /**
   * @param {Route} route
   * @returns {boolean}
   */
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  isViolated(route) {
    throw new Error('isViolated() must be implemented by a subclass');
  }

  /**
   * @param {Route} route
   * @returns {string}
   */
  // eslint-disable-next-line no-unused-vars, class-methods-use-this
  violationMessage(route) {
    throw new Error('violationMessage() must be implemented by a subclass');
  }
}

module.exports = { IConstraint };
