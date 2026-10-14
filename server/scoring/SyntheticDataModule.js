/**
 * SyntheticDataModule
 * Traces to: FR-17; Week 2 §3; Week 4 §3, §5.2.
 *
 * Provides synthetic environmental conditions for candidate evaluation.
 *
 * Each factor is derived from BOTH the stop's identity (name hash) AND the
 * arrival time, so that reordering stops produces meaningfully different scores
 * for all six weights — making the 2-opt optimiser sensitive to every slider.
 *
 * Factors returned are in [0, 1]:
 *   weatherScore  — outdoor pleasantness (avoid afternoon heat/rain)
 *   crowdScore    — inverse crowd density (1 = empty, 0 = packed)
 *   scenicScore   — aesthetic/landmark rating of the stop
 */
class SyntheticDataModule {
  /**
   * Deterministic hash of a string → integer in [0, range)
   * @param {string} str
   * @param {number} range
   * @returns {number}
   */
  static _hash(str, range = 100) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
      h = h >>> 0; // keep unsigned 32-bit
    }
    return h % range;
  }

  /**
   * Returns environmental factors for a stop at a given arrival time.
   * @param {object} stop - Must have .id and .name
   * @param {number} [arrivalMinutes=540] - Minutes from midnight (e.g. 540 = 09:00)
   * @returns {{ weatherScore: number, crowdScore: number, scenicScore: number }}
   */
  static getFactors(stop, arrivalMinutes = 540) {
    const id   = stop.id   || '';
    const name = (stop.name || '').toLowerCase();
    const hour = Math.floor(arrivalMinutes / 60);

    const isOutdoor = (
      name.includes('park') || name.includes('garden') || name.includes('lake') ||
      name.includes('beach') || name.includes('mountain') || name.includes('forest') ||
      name.includes('waterfall') || name.includes('island') || name.includes('bay') ||
      name.includes('coast') || name.includes('sea') || name.includes('river') ||
      name.includes('valley') || name.includes('canyon') || name.includes('tower') ||
      name.includes('bridge') || name.includes('view') || name.includes('shrine') ||
      name.includes('temple') || name.includes('ruins') || name.includes('pyramid') ||
      name.includes('arch') || name.includes('monument') || name.includes('statue') ||
      name.includes('square') || name.includes('plaza') || name.includes('waterfront') ||
      name.includes('harbour') || name.includes('harbor') || name.includes('fort') ||
      name.includes('bamboo')
    );

    const isIndoor = (
      name.includes('museum') || name.includes('gallery') || name.includes('opera') ||
      name.includes('theatre') || name.includes('library') || name.includes('mall') ||
      name.includes('bazaar') || name.includes('market') || name.includes('cafe') ||
      name.includes('bakery') || name.includes('palace') || name.includes('castle')
    );

    /* ── SCENIC FACTOR ─────────────────────────────────────────────
     * Dependent on both landmark aesthetic tier and lighting/time-of-day.
     * Outdoor vistas benefit from morning clarity & afternoon golden hour.
     * Indoor cultural venues offer climate-controlled, stable ambiance.
     */
    const nameBase = SyntheticDataModule._hash(id + 'S', 20) / 100; // [0.0–0.20]
    let scenicBase = 0.50;
    if (isOutdoor) scenicBase = 0.65;
    if (name.includes('park') || name.includes('garden') || name.includes('bamboo') || name.includes('lake')) {
      scenicBase = 0.72;
    }
    if (name.includes('tower') || name.includes('bridge') || name.includes('temple') || name.includes('shrine') || name.includes('statue')) {
      scenicBase = 0.70;
    }

    let scenicBonus = 0;
    if (isOutdoor) {
      if (hour >= 8 && hour <= 11) scenicBonus = 0.20; // morning light clarity
      else if (hour >= 15 && hour <= 18) scenicBonus = 0.22; // golden hour
      else if (hour >= 12 && hour <= 14) scenicBonus = -0.12; // midday harsh glare
    } else if (isIndoor) {
      if (hour >= 11 && hour <= 15) scenicBonus = 0.12; // great indoor experience in midday
    }
    const scenicScore = Math.max(0.2, Math.min(1.0, scenicBase + nameBase + scenicBonus));

    /* ── WEATHER FACTOR ────────────────────────────────────────────
     * Outdoor destinations are sensitive to midday heat/sun exposure.
     * Indoor venues provide shelter and air-conditioned comfort.
     */
    const stopWeatherBase = 0.80 + (SyntheticDataModule._hash(id + 'W', 20) / 100);
    let weatherPenalty = 0;
    if (isOutdoor && hour >= 12 && hour <= 15) {
      weatherPenalty = 0.35; // midday sun & heat exposure
    }
    const weatherScore = Math.max(0.2, Math.min(1.0, stopWeatherBase - weatherPenalty));

    /* ── CROWD FACTOR ──────────────────────────────────────────────
     * Inverse crowd density (1 = empty, 0 = packed).
     * Popular landmarks have quiet morning windows and peak midday tour rushes.
     */
    const isMajor = (
      name.includes('tower') || name.includes('museum') || name.includes('temple') ||
      name.includes('shrine') || name.includes('cathedral') || name.includes('palace') ||
      name.includes('colosseum') || name.includes('louvre') || name.includes('kinkaku') ||
      name.includes('times square') || name.includes('statue') || name.includes('fushimi') ||
      name.includes('kiyomizu') || name.includes('sagrada') || name.includes('vatican') ||
      name.includes('burj') || name.includes('eiffel') || name.includes('notre')
    );

    let crowdScore = 0.75;
    if (isMajor) {
      if (hour >= 8 && hour <= 10) crowdScore = 0.90; // early morning low queues
      else if (hour >= 11 && hour <= 15) crowdScore = 0.28; // peak tour crowds
      else crowdScore = 0.60;
    } else {
      if (hour >= 12 && hour <= 14) crowdScore = 0.65;
      else crowdScore = 0.82;
    }

    return { weatherScore, crowdScore, scenicScore };
  }
}

module.exports = { SyntheticDataModule };
