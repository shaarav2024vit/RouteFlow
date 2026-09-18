/**
 * PresetSelector
 * Traces to: FR-11; Week 4 §3.
 * Manages pill buttons for the 4 named presets (Fastest, Best Scenic, Least Crowded, Most Attractions Open).
 */
class PresetSelector {
  constructor(containerId, onPresetSelect) {
    this.container = document.getElementById(containerId);
    this.onPresetSelect = onPresetSelect;
    this.initListeners();
  }

  initListeners() {
    if (!this.container) return;
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;

      const presetName = btn.getAttribute('data-preset');
      this.setActive(presetName);

      if (this.onPresetSelect) {
        this.onPresetSelect(presetName);
      }
    });
  }

  setActive(presetName) {
    if (!this.container) return;
    const buttons = this.container.querySelectorAll('.pill-btn');
    buttons.forEach((b) => {
      if (b.getAttribute('data-preset') === presetName) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }
}

window.PresetSelector = PresetSelector;
