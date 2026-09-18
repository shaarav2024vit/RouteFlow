/**
 * SyntheticDataModule
 * Traces to: FR-17; Week 2 §3; Week 4 §3, §5.2.
 *
 * Provides mock/synthetic environmental conditions (weather, crowd levels)
 * for candidate evaluation during v1.
 */
class SyntheticDataModule {
  /**
   * Retrieves environmental factors for a given stop at a scheduled arrival minute
   * @param {object} stop
   * @param {number} [arrivalMinutes=540] - Minutes from midnight (e.g. 540 = 09:00)
   * @returns {{ weatherScore: number, crowdScore: number, scenicScore: number }}
   */
  static getFactors(stop, arrivalMinutes = 540) {
    // Generate deterministic values based on stop id hash and hour
    const hour = Math.floor(arrivalMinutes / 60);

    // Weather: simulated outdoor favourability (0 to 1)
    // Afternoon rains simulated around 14:00 - 16:00
    let weatherScore = 0.85;
    if (hour >= 14 && hour <= 16) {
      weatherScore = 0.4;
    }

    // Crowd: simulated crowd density factor (1 = empty/ideal, 0 = crowded)
    // Peak crowds during lunch (12:00-14:00) and evening (17:00-19:00)
    let crowdScore = 0.8;
    if (hour >= 12 && hour <= 14) {
      crowdScore = 0.3;
    } else if (hour >= 17 && hour <= 19) {
      crowdScore = 0.25;
    }

    // Scenic value: base rating (0 to 1)
    const nameLower = (stop.name || '').toLowerCase();
    let scenicScore = 0.5;
    if (nameLower.includes('park') || nameLower.includes('garden') || nameLower.includes('lake')) {
      scenicScore = 0.95;
    } else if (nameLower.includes('museum') || nameLower.includes('gallery')) {
      scenicScore = 0.75;
    }

    return {
      weatherScore,
      crowdScore,
      scenicScore,
    };
  }
}

module.exports = { SyntheticDataModule };
