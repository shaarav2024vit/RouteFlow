/**
 * WeightSliderPanel
 * Traces to: FR-9; Week 4 §3.
 * Manages slider UI elements for the six scoring objectives and triggers callbacks on changes.
 */
class WeightSliderPanel {
  constructor(panelId, onWeightChange) {
    this.panel = document.getElementById(panelId);
    this.onWeightChange = onWeightChange;

    this.sliders = {
      travelTimeWeight: document.getElementById('slider-travelTime'),
      timeWindowWeight: document.getElementById('slider-timeWindow'),
      scenicWeight: document.getElementById('slider-scenic'),
      crowdWeight: document.getElementById('slider-crowd'),
      weatherWeight: document.getElementById('slider-weather'),
      preferenceWeight: document.getElementById('slider-preference'),
    };

    this.labels = {
      travelTimeWeight: document.getElementById('val-travelTime'),
      timeWindowWeight: document.getElementById('val-timeWindow'),
      scenicWeight: document.getElementById('val-scenic'),
      crowdWeight: document.getElementById('val-crowd'),
      weatherWeight: document.getElementById('val-weather'),
      preferenceWeight: document.getElementById('val-preference'),
    };

    this.initListeners();
  }

  initListeners() {
    for (const [key, slider] of Object.entries(this.sliders)) {
      if (!slider) continue;
      slider.addEventListener('input', () => {
        const val = parseFloat(slider.value);
        if (this.labels[key]) {
          this.labels[key].textContent = val.toFixed(2);
        }
        if (this.onWeightChange) {
          this.onWeightChange(this.getWeights());
        }
      });
    }
  }

  getWeights() {
    const res = {};
    for (const [k, slider] of Object.entries(this.sliders)) {
      if (slider) res[k] = parseFloat(slider.value);
    }
    return res;
  }

  setWeights(weights) {
    for (const [k, v] of Object.entries(weights)) {
      if (this.sliders[k]) {
        this.sliders[k].value = v;
      }
      if (this.labels[k]) {
        this.labels[k].textContent = Number(v).toFixed(2);
      }
    }
  }
}

window.WeightSliderPanel = WeightSliderPanel;
