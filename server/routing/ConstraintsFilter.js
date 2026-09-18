/**
 * ConstraintsFilter
 * Traces to: FR-7, FR-13, NFR-7; Week 3 Decision 1; Week 4 §5.2.
 *
 * Checks candidate route orderings against hard constraints (OpeningHoursConstraint,
 * PrecedenceConstraint). Does not throw exceptions; returns violation data.
 */
class ConstraintsFilter {
  /**
   * Evaluates all attached constraints against a candidate route.
   * @param {import('./Route').Route} route
   * @returns {{ isValid: boolean, violations: Array<{ constraintId: string, type: string, message: string }> }}
   */
  static evaluate(route) {
    const violations = [];

    for (const stop of route.stops) {
      if (!stop.constraints || !Array.isArray(stop.constraints)) continue;

      for (const constraint of stop.constraints) {
        if (constraint.isViolated(route)) {
          violations.push({
            constraintId: constraint.id,
            type: constraint.name,
            severity: constraint.severity,
            message: constraint.violationMessage(route),
          });
        }
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}

module.exports = { ConstraintsFilter };
