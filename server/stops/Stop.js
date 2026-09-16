/**
 * Stop domain entity
 * Traces to: FR-1–FR-5; Week 3 §4.2; Week 4 §5.2, §6.2.
 *
 * Represents an individual stop configured on a trip with its
 * geographical location, input sequence index, optional preferred time window,
 * and attached constraints.
 */
class Stop {
  /**
   * @param {object} params
   * @param {string} params.id
   * @param {string} params.name
   * @param {number} params.lat
   * @param {number} params.lon
   * @param {number} [params.inputOrder=0]
   * @param {string|null} [params.prefStart=null]
   * @param {string|null} [params.prefEnd=null]
   * @param {Array<import('./Constraint').Constraint>} [params.constraints=[]]
   */
  constructor({
    id,
    name,
    lat,
    lon,
    inputOrder = 0,
    prefStart = null,
    prefEnd = null,
    constraints = [],
  }) {
    this.id = id;
    this.name = name;
    this.lat = lat;
    this.lon = lon;
    this.inputOrder = inputOrder;
    this.prefStart = prefStart;
    this.prefEnd = prefEnd;
    this.constraints = constraints;
  }
}

module.exports = { Stop };
