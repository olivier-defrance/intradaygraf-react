import React from "react";

export default function ObjectifButtons({ value, onChange }) {
  const handleClick = (mode) => () => onChange(mode);

  return (
    <div className="objectif-group" id="objectifGroup">
      <button
        type="button"
        className={"obj-btn" + (value === "serenite" ? " active" : "")}
        data-objectif="serenite"
        onClick={handleClick("serenite")}
      >
        <span className="icon">🧘‍♂️</span>
        <span>Sérénité (Sharpe)</span>
      </button>
      <button
        type="button"
        className={"obj-btn" + (value === "performance" ? " active" : "")}
        data-objectif="performance"
        onClick={handleClick("performance")}
      >
        <span className="icon">⚡</span>
        <span>Performance (Gain)</span>
      </button>
    </div>
  );
}
