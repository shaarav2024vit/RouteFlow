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

    /* ── WEATHER ────────────────────────────────────────────────────
     * Base rating per stop (e.g. coastal stops are sunnier).
     * Time penalty: afternoon heat/rain window 13-16h.
     * Stop-specific variation makes earlier vs. later visits differ.
     */
    const stopWeatherBase = 0.55 + (SyntheticDataModule._hash(id + 'W', 45) / 100); // [0.55–1.0]
    let weatherPenalty = 0;
    if (hour >= 13 && hour <= 16) weatherPenalty = 0.45 - (SyntheticDataModule._hash(id + 'WP', 20) / 100);
    const weatherScore = Math.max(0, Math.min(1, stopWeatherBase - weatherPenalty));

    /* ── CROWD ──────────────────────────────────────────────────────
     * Each stop has its own peak-hour sensitivity.
     * Popular stops (high name-hash) get crowded faster.
     * Peak hours: 11-14h (lunch tourists) and 17-20h (after-work).
     */
    const popularity = SyntheticDataModule._hash(id + 'C', 60) / 100; // [0.0–0.60] base popularity factor
    let crowdBase = 1.0 - popularity * 0.5;                            // [0.7–1.0] at off-peak
    let crowdPenalty = 0;
    if (hour >= 11 && hour <= 14) {
      crowdPenalty = popularity * 0.6 + 0.15;
    } else if (hour >= 17 && hour <= 20) {
      crowdPenalty = popularity * 0.5 + 0.1;
    } else if (hour >= 8 && hour <= 10) {
      crowdPenalty = popularity * 0.15; // morning rush, minor
    }
    const crowdScore = Math.max(0, Math.min(1, crowdBase - crowdPenalty));

    /* ── SCENIC VALUE ───────────────────────────────────────────────
     * Determined by stop name keywords + a per-stop base rating.
     * Keyword categories assign a tier; base hash adds individuality.
     */
    const nameBase = SyntheticDataModule._hash(id + 'S', 25) / 100; // [0.0–0.25] individuality
    let scenicTier = 0.45; // default

    // Tier 1 — natural wonders, beaches, mountains, parks (highest scenic)
    if (
      name.includes('park')      || name.includes('garden')   || name.includes('lake')    ||
      name.includes('beach')     || name.includes('mountain') || name.includes('forest')  ||
      name.includes('waterfall') || name.includes('island')   || name.includes('bay')     ||
      name.includes('coast')     || name.includes('sea')      || name.includes('river')   ||
      name.includes('valley')    || name.includes('canyon')
    ) {
      scenicTier = 0.72;
    }
    // Tier 2 — landmarks, monuments, historic sites
    else if (
      name.includes('tower')     || name.includes('bridge')   || name.includes('palace')  ||
      name.includes('castle')    || name.includes('cathedral')|| name.includes('mosque')  ||
      name.includes('temple')    || name.includes('monument') || name.includes('fort')    ||
      name.includes('shrine')    || name.includes('ruins')    || name.includes('pyramid') ||
      name.includes('gate')      || name.includes('arch')     || name.includes('statue')  ||
      name.includes('fountain')  || name.includes('square')   || name.includes('plaza')   ||
      name.includes('waterfront')|| name.includes('harbour')  || name.includes('harbor')
    ) {
      scenicTier = 0.62;
    }
    // Tier 3 — cultural venues
    else if (
      name.includes('museum')    || name.includes('gallery')  || name.includes('opera')   ||
      name.includes('theatre')   || name.includes('library')  || name.includes('art')     ||
      name.includes('zoo')       || name.includes('aquarium')
    ) {
      scenicTier = 0.52;
    }
    // Tier 4 — shopping, markets, commercial
    else if (
      name.includes('market')    || name.includes('bazaar')   || name.includes('souk')    ||
      name.includes('mall')      || name.includes('street')   || name.includes('road')    ||
      name.includes('district')  || name.includes('quarter')
    ) {
      scenicTier = 0.38;
    }

    const scenicScore = Math.min(1, scenicTier + nameBase);

    return { weatherScore, crowdScore, scenicScore };
  }
}

module.exports = { SyntheticDataModule };
