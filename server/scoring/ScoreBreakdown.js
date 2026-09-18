/**
 * ScoreBreakdown
 * Traces to: FR-8, FR-12, NFR-3; Week 1 §1; Week 4 §3, §5.2.
 *
 * Encapsulates the decomposable scoring factors for explainability.
 */
class ScoreBreakdown {
  /**
   * @param {object} params
   * @param {number} params.travelTimeScore
   * @param {number} params.timeWindowScore
   * @param {number} params.weatherScore
   * @param {number} params.crowdScore
   * @param {number} params.scenicScore
   * @param {number} params.preferenceScore
   * @param {number} params.totalScore
   * @param {Array<object>} [params.stopBreakdowns=[]]
   */
  constructor({
    travelTimeScore = 0,
    timeWindowScore = 0,
    weatherScore = 0,
    crowdScore = 0,
    scenicScore = 0,
    preferenceScore = 0,
    totalScore = 0,
    stopBreakdowns = [],
  }) {
    this.travelTimeScore = travelTimeScore;
    this.timeWindowScore = timeWindowScore;
    this.weatherScore = weatherScore;
    this.crowdScore = crowdScore;
    this.scenicScore = scenicScore;
    this.preferenceScore = preferenceScore;
    this.totalScore = totalScore;
    this.stopBreakdowns = stopBreakdowns;
  }
}

module.exports = { ScoreBreakdown };
