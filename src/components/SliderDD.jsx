import React from "react";

export default function SliderDD({ value, onChange, min = 0, max = 10000, step = 100 }) {
  const handleRangeChange = (e) => {
    onChange(Number(e.target.value) || 0);
  };

  const handleNumberChange = (e) => {
    let v = Number(e.target.value);
    if (isNaN(v)) v = 0;
    if (v < min) v = min;
    if (v > max) v = max;
    onChange(v);
  };

  return (
    <div style={{ marginTop: "4px" }} className="slider-row">
      <input
        id="ddSlider"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleRangeChange}
      />
      <input
        id="ddMax"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleNumberChange}
      />
    </div>
  );
}
