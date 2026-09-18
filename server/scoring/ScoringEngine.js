const { ScoreBreakdown } = require('./ScoreBreakdown');
const { SyntheticDataModule } = require('./SyntheticDataModule');
const { parseTimeToMinutes } = require('../routing/RouteBuilder');

/**
 * ScoringEngine
 * Traces to: FR-8, FR-12, NFR-3; Week 1 §1; Week 3 §2.1; Week 4 §3.
 *
 * Implements multi-objective 6-factor weighted scoring:
 *  1. Travel Time efficiency
 *  2. Time Window / Opening Hours fit
 *  3. Weather condition
 *  4. Crowd level
 *  5. Scenic value
 *  6. User preference (preferred time fit)
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
      travelTimeWeight: weights.travelTimeWeight ?? 1.0,
      timeWindowWeight: weights.timeWindowWeight ?? 0.5,
      weatherWeight: weights.weatherWeight ?? 0.4,
      crowdWeight: weights.crowdWeight ?? 0.4,
      scenicWeight: weights.scenicWeight ?? 0.5,
      preferenceWeight: weights.preferenceWeight ?? 0.3,
    };

    let totalTravelTimeScore = 0;
    let totalTimeWindowScore = 0;
    let totalWeatherScore = 0;
    let totalCrowdScore = 0;
    let totalScenicScore = 0;
    let totalPreferenceScore = 0;

    const stopBreakdowns = [];

    // Factor 1: Travel time efficiency (normalized: lower time yields higher score)
    // Baseline assumption: avg leg is ~15 min. Efficiency = max(0, 1 - (totalTravelTime / (stops.length * 30)))
    const expectedTime = Math.max(1, route.stops.length * 25);
    const travelTimeScore = Math.max(0, 1 - route.totalTravelTimeMin / expectedTime);
    totalTravelTimeScore = travelTimeScore * 100;

    for (const stop of route.stops) {
      const arrivalMin = stop.arrivalMinutes ?? parseTimeToMinutes(stop.scheduledArrival || '10:00');
      const env = SyntheticDataModule.getFactors(stop, arrivalMin);

      // Factor 2: Time window fit (1 if inside all opening hour constraints, 0 if violated)
      let stopTimeWindowScore = 1.0;
      if (stop.constraints) {
        for (const c of stop.constraints) {
          if (c.name === 'OPENING_HOURS' && c.isViolated(route)) {
            stopTimeWindowScore = 0.0;
            break;
          }
        }
      }

      // Factor 6: User preference window fit
      let stopPreferenceScore = 0.7;
      if (stop.prefStart && stop.prefEnd) {
        const pStart = parseTimeToMinutes(stop.prefStart);
        const pEnd = parseTimeToMinutes(stop.prefEnd);
        if (arrivalMin >= pStart && arrivalMin <= pEnd) {
          stopPreferenceScore = 1.0;
        } else {
          const diff = Math.min(Math.abs(arrivalMin - pStart), Math.abs(arrivalMin - pEnd));
          stopPreferenceScore = Math.max(0, 1.0 - diff / 120);
        }
      }

      totalTimeWindowScore += stopTimeWindowScore * 100;
      totalWeatherScore += env.weatherScore * 100;
      totalCrowdScore += env.crowdScore * 100;
      totalScenicScore += env.scenicScore * 100;
      totalPreferenceScore += stopPreferenceScore * 100;

      stopBreakdowns.push({
        stopId: stop.id,
        stopName: stop.name,
        scheduledArrival: stop.scheduledArrival,
        weather: Math.round(env.weatherScore * 100),
        crowd: Math.round(env.crowdScore * 100),
        scenic: Math.round(env.scenicScore * 100),
        timeWindowFit: Math.round(stopTimeWindowScore * 100),
        preferenceFit: Math.round(stopPreferenceScore * 100),
      });
    }

    const numStops = route.stops.length;
    const avgTimeWindow = totalTimeWindowScore / numStops;
    const avgWeather = totalWeatherScore / numStops;
    const avgCrowd = totalCrowdScore / numStops;
    const avgScenic = totalScenicScore / numStops;
    const avgPreference = totalPreferenceScore / numStops;

    const weightedScore =
      totalTravelTimeScore * w.travelTimeWeight +
      avgTimeWindow * w.timeWindowWeight +
      avgWeather * w.weatherWeight +
      avgCrowd * w.crowdWeight +
      avgScenic * w.scenicWeight +
      avgPreference * w.preferenceWeight;

    // Apply severe penalty for any hard violations
    const violationPenalty = route.violations.length * 500;
    const totalScore = Math.round(weightedScore - violationPenalty);

    const breakdown = new ScoreBreakdown({
      travelTimeScore: Math.round(totalTravelTimeScore),
      timeWindowScore: Math.round(avgTimeWindow),
      weatherScore: Math.round(avgWeather),
      crowdScore: Math.round(avgCrowd),
      scenicScore: Math.round(avgScenic),
      preferenceScore: Math.round(avgPreference),
      totalScore,
      stopBreakdowns,
    });

    return { totalScore, breakdown };
  }
}

module.exports = { ScoringEngine };
