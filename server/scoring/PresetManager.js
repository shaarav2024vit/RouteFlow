/**
 * PresetManager
 * Traces to: FR-9, FR-11; Week 2 §3; Week 4 §3, §6.2.
 *
 * Manages the 4 named presets and exposes active weight configurations.
 * Factor weights range from 0 to 1 and do not need to sum to 1.
 */
class PresetManager {
  static PRESETS = {
    Fastest: {
      travelTimeWeight: 1.0,
      timeWindowWeight: 0.5,
      weatherWeight: 0.1,
      crowdWeight: 0.1,
      scenicWeight: 0.1,
      preferenceWeight: 0.2,
    },
    'Best Scenic': {
      travelTimeWeight: 0.3,
      timeWindowWeight: 0.4,
      weatherWeight: 0.7,
      crowdWeight: 0.4,
      scenicWeight: 1.0,
      preferenceWeight: 0.5,
    },
    'Least Crowded': {
      travelTimeWeight: 0.4,
      timeWindowWeight: 0.5,
      weatherWeight: 0.4,
      crowdWeight: 1.0,
      scenicWeight: 0.3,
      preferenceWeight: 0.4,
    },
    'Most Attractions Open': {
      travelTimeWeight: 0.4,
      timeWindowWeight: 1.0,
      weatherWeight: 0.3,
      crowdWeight: 0.3,
      scenicWeight: 0.2,
      preferenceWeight: 0.5,
    },
  };

  constructor(initialPreset = 'Fastest') {
    this.activePreset = initialPreset;
    this.weights = { ...PresetManager.PRESETS[initialPreset] };
  }

  /**
   * Sets weights using a named preset
   * @param {string} presetName
   */
  selectPreset(presetName) {
    if (!PresetManager.PRESETS[presetName]) {
      throw new RangeError(`Unknown preset "${presetName}". Valid: ${Object.keys(PresetManager.PRESETS).join(', ')}`);
    }
    this.activePreset = presetName;
    this.weights = { ...PresetManager.PRESETS[presetName] };
    return this.weights;
  }

  /**
   * Sets custom weight values (0 to 1)
   * @param {object} customWeights
   */
  setWeights(customWeights) {
    for (const [k, v] of Object.entries(customWeights)) {
      if (typeof v === 'number' && v >= 0 && v <= 1) {
        this.weights[k] = v;
      }
    }
    this.activePreset = 'Custom';
    return this.weights;
  }

  getWeights() {
    return { ...this.weights };
  }
}

module.exports = { PresetManager };
