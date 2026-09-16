const { IConstraint } = require('./IConstraint');

/**
 * Constraint (abstract base)
 * Traces to: FR-4, FR-5; Week 4 §5.2 class diagram (id, name, severity).
 *
 * Carries the fields shared by every concrete constraint. Concrete
 * subclasses (OpeningHoursConstraint, PrecedenceConstraint) still
 * implement isViolated()/violationMessage() themselves.
 */
class Constraint extends IConstraint {
  /**
   * @param {string} id
   * @param {string} name
   * @param {'HARD'|'SOFT'} severity
   */
  constructor(id, name, severity = 'HARD') {
    super();
    this.id = id;
    this.name = name;
    this.severity = severity;
  }
}

module.exports = { Constraint };
