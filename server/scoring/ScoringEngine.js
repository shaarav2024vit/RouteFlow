const { ScoreBreakdown } = require('./ScoreBreakdown');
const { SyntheticDataModule } = require('./SyntheticDataModule');
const { parseTimeToMinutes } = require('../routing/RouteBuilder');

/**
 * ScoringEngine
 * Traces to: FR-8, FR-12, NFR-3; Week 1 §1; Week 3 §2.1; Week 4 §3.
 *
 * Multi-objective 6-factor weighted scoring.
 * Each factor produces a score in [0, 100] before weighting.
 *
 * Factor definitions:
 *  1. travelTimeScore  — efficiency: lower total km → higher score
 *  2. timeWindowScore  — fraction of stops visited within their opening hours
 *  3. weatherScore     — avg outdoor pleasantness at each stop's arrival time
 *  4. crowdScore       — avg inverse crowd density at each stop's arrival time
 *  5. scenicScore      — avg aesthetic/landmark value across stops
 *  6. preferenceScore  — avg fit of arrival time to user-specified preference windows
 *
 * Why per-leg travel-time efficiency?
 *   The old formula (1 - totalMin / (n*25)) collapsed to ~60–80 for almost
 *   every route regardless of order, giving the weight almost zero leverage.
 *   The new approach scores each leg relative to the straight-line minimum
 *   possible time for that leg, so ordering matters.
 */
class ScoringEngine {
  /**
   * Scores a complete candidate Route
   * @param {import('../routing/Route').Route} route
   * @param {object} weights - Weight configuration
   * @returns {{ totalScore: number, breakdown: ScoreBreakdown }}
   */
  scoreRoute(route, weights = {}) {
    if (!route || !route.stops || route.stops.length === 0) {
      return { totalScore: 0, breakdown: new ScoreBreakdown({}) };
    }

    const w = {
      travelTimeWeight:  weights.travelTimeWeight  ?? 1.0,
      timeWindowWeight:  weights.timeWindowWeight  ?? 0.5,
      weatherWeight:     weights.weatherWeight     ?? 0.4,
      crowdWeight:       weights.crowdWeight       ?? 0.4,
      scenicWeight:      weights.scenicWeight      ?? 0.5,
      preferenceWeight:  weights.preferenceWeight  ?? 0.3,
    };

    /* ── FACTOR 1: Travel Time Efficiency ──────────────────────────
     * Per-leg: efficiency = 1 - (actualMin - minPossibleMin) / maxLegMin
     * minPossibleMin ≈ distKm / 60 km·h⁻¹ × 60 (i.e. distKm minutes at 60 km/h)
     * maxLegMin cap is 120 min (anything longer is scored 0)
     */
    let legEfficiencySum = 0;
    const legs = route.legs || [];
    if (legs.length > 0) {
      for (const leg of legs) {
        const minPossible = (leg.distanceKm / 60) * 60; // km ÷ 60km/h × 60min
        const actual = leg.travelTimeMin;
        const overhead = Math.max(0, actual - minPossible);
        legEfficiencySum += Math.max(0, 1 - overhead / 120);
      }
      legEfficiencySum /= legs.length;
    } else {
      // No leg data: fall back to total-time normalisation
      const expected = Math.max(1, route.stops.length * 20);
      legEfficiencySum = Math.max(0, 1 - route.totalTravelTimeMin / (expected * 2));
    }
    const travelTimeScore100 = legEfficiencySum * 100;

    /* ── FACTORS 2–6: Per-stop aggregation ─────────────────────────*/
    let sumTimeWindow  = 0;
    let sumWeather     = 0;
    let sumCrowd       = 0;
    let sumScenic      = 0;
    let sumPreference  = 0;

    const stopBreakdowns = [];

    for (const stop of route.stops) {
      const arrivalMin = stop.arrivalMinutes ?? parseTimeToMinutes(stop.scheduledArrival || '10:00');
      const env = SyntheticDataModule.getFactors(stop, arrivalMin);

      // Factor 2: Time window / opening hours
      let stopTimeWindowScore = 1.0;
      if (stop.constraints) {
        for (const c of stop.constraints) {
          if (c.name === 'OPENING_HOURS' && c.isViolated(route)) {
            stopTimeWindowScore = 0.0;
            break;
          }
        }
      }

      // Factor 6: User preference window
      let stopPreferenceScore = 0.65; // neutral if no preference set
      if (stop.prefStart && stop.prefEnd) {
        const pStart = parseTimeToMinutes(stop.prefStart);
        const pEnd   = parseTimeToMinutes(stop.prefEnd);
        if (arrivalMin >= pStart && arrivalMin <= pEnd) {
          stopPreferenceScore = 1.0;
        } else {
          const diff = Math.min(
            Math.abs(arrivalMin - pStart),
            Math.abs(arrivalMin - pEnd)
          );
          stopPreferenceScore = Math.max(0, 1.0 - diff / 90);
        }
      }

      sumTimeWindow  += stopTimeWindowScore;
      sumWeather     += env.weatherScore;
      sumCrowd       += env.crowdScore;
      sumScenic      += env.scenicScore;
      sumPreference  += stopPreferenceScore;

      stopBreakdowns.push({
        stopId:          stop.id,
        stopName:        stop.name,
        scheduledArrival:stop.scheduledArrival,
        weather:         Math.round(env.weatherScore     * 100),
        crowd:           Math.round(env.crowdScore       * 100),
        scenic:          Math.round(env.scenicScore      * 100),
        timeWindowFit:   Math.round(stopTimeWindowScore  * 100),
        preferenceFit:   Math.round(stopPreferenceScore  * 100),
      });
    }

    const n = route.stops.length;
    const avg = (sum) => (sum / n) * 100;

    const avgTimeWindow  = avg(sumTimeWindow);
    const avgWeather     = avg(sumWeather);
    const avgCrowd       = avg(sumCrowd);
    const avgScenic      = avg(sumScenic);
    const avgPreference  = avg(sumPreference);

    /* ── WEIGHTED TOTAL ─────────────────────────────────────────────
     * Each factor is in [0, 100]; weights are in [0, 1].
     * Total is NOT normalised by sum-of-weights so that raising a weight
     * genuinely increases the score contribution of that factor.
     */
    const weightedScore =
      travelTimeScore100 * w.travelTimeWeight +
      avgTimeWindow      * w.timeWindowWeight +
      avgWeather         * w.weatherWeight    +
      avgCrowd           * w.crowdWeight      +
      avgScenic          * w.scenicWeight     +
      avgPreference      * w.preferenceWeight;

    // Hard violation penalty — each violation subtracts 500 pts
    const violationPenalty = route.violations.length * 500;
    const totalScore = Math.round(weightedScore - violationPenalty);

    const breakdown = new ScoreBreakdown({
      travelTimeScore: Math.round(travelTimeScore100),
      timeWindowScore: Math.round(avgTimeWindow),
      weatherScore:    Math.round(avgWeather),
      crowdScore:      Math.round(avgCrowd),
      scenicScore:     Math.round(avgScenic),
      preferenceScore: Math.round(avgPreference),
      totalScore,
      stopBreakdowns,
    });

    return { totalScore, breakdown };
  }
}

module.exports = { ScoringEngine };
