/**
 * Time utility functions for Route calculations
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const norm = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Route entity representing a calculated path across ordered stops.
 * Implements contracts required by OpeningHoursConstraint and PrecedenceConstraint:
 * - getArrivalTime(stopId) -> "HH:mm"
 * - getStopOrder() -> string[]
 */
class Route {
  /**
   * @param {object} params
   * @param {Array<object>} params.legs - Array of route legs { fromStop, toStop, distanceKm, travelTimeMin, arrivalTime, departureTime, waitTimeMin, dwellTimeMin }
   * @param {Array<object>} params.stops - Ordered stops in this route
   * @param {object} [params.tripConfig] - { startTime, startLat, startLon }
   * @param {number} [params.totalDistanceKm=0]
   * @param {number} [params.totalDurationMin=0]
   * @param {object} [params.scoreBreakdown=null]
   */
  constructor({
    legs = [],
    stops = [],
    tripConfig = null,
    totalDistanceKm = 0,
    totalDurationMin = 0,
    scoreBreakdown = null,
  }) {
    this.legs = legs;
    this.stops = stops;
    this.tripConfig = tripConfig;
    this.totalDistanceKm = totalDistanceKm;
    this.totalDurationMin = totalDurationMin;
    this.scoreBreakdown = scoreBreakdown;
  }

  /**
   * Returns arrival time formatted as "HH:mm" for the given stopId.
   * Required by OpeningHoursConstraint.
   * @param {string} stopId
   * @returns {string|null}
   */
  getArrivalTime(stopId) {
    const leg = this.legs.find((l) => l.toStop && l.toStop.id === stopId);
    return leg ? leg.arrivalTime : null;
  }

  /**
   * Returns array of stop IDs in their visited order.
   * Required by PrecedenceConstraint.
   * @returns {string[]}
   */
  getStopOrder() {
    return this.stops.map((s) => s.id);
  }

  /**
   * Returns total route distance in kilometers.
   * @returns {number}
   */
  getTotalDistance() {
    return Number(this.totalDistanceKm.toFixed(2));
  }

  /**
   * Returns total route duration in minutes.
   * @returns {number}
   */
  getTotalDuration() {
    return Math.round(this.totalDurationMin);
  }

  /**
   * Evaluates all constraints on the stops against this route.
   * @param {Array<import('../stops/Constraint').Constraint>} [extraConstraints=[]]
   * @returns {{ feasible: boolean, violations: Array<{ constraintId: string, name: string, severity: string, message: string }> }}
   */
  checkConstraints(extraConstraints = []) {
    const allConstraints = [...extraConstraints];
    for (const stop of this.stops) {
      if (Array.isArray(stop.constraints)) {
        allConstraints.push(...stop.constraints);
      }
    }

    // Deduplicate by constraint ID
    const unique = [];
    const seen = new Set();
    for (const c of allConstraints) {
      if (!c || !c.id) continue;
      if (!seen.has(c.id)) {
        seen.add(c.id);
        unique.push(c);
      }
    }

    const violations = [];
    let feasible = true;

    for (const c of unique) {
      if (typeof c.isViolated === 'function' && c.isViolated(this)) {
        const msg = typeof c.violationMessage === 'function'
          ? c.violationMessage(this)
          : `Constraint ${c.name} violated.`;
        violations.push({
          constraintId: c.id,
          name: c.name,
          severity: c.severity || 'HARD',
          message: msg,
        });
        if (c.severity !== 'SOFT') {
          feasible = false;
        }
      }
    }

    return { feasible, violations };
  }

  /**
   * Returns serializable JSON representation of the route.
   */
  toJSON() {
    return {
      totalDistanceKm: this.getTotalDistance(),
      totalDurationMin: this.getTotalDuration(),
      stops: this.stops.map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.lat,
        lon: s.lon,
        prefStart: s.prefStart,
        prefEnd: s.prefEnd,
      })),
      legs: this.legs.map((leg) => ({
        fromStopId: leg.fromStop ? leg.fromStop.id : 'ORIGIN',
        fromName: leg.fromStop ? leg.fromStop.name : 'Trip Start',
        toStopId: leg.toStop ? leg.toStop.id : null,
        toName: leg.toStop ? leg.toStop.name : null,
        distanceKm: Number(leg.distanceKm.toFixed(2)),
        travelTimeMin: Math.round(leg.travelTimeMin),
        arrivalTime: leg.arrivalTime,
        dwellTimeMin: leg.dwellTimeMin,
        departureTime: leg.departureTime,
        waitTimeMin: leg.waitTimeMin || 0,
        isReturnLeg: Boolean(leg.isReturnLeg),
      })),
      scoreBreakdown: this.scoreBreakdown,
    };
  }
}

module.exports = {
  Route,
  timeToMinutes,
  minutesToTime,
};
