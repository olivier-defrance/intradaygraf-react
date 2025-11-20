import React from "react";
import { money, pct, formatRisk, formatSharpe } from "../utils/format";

export default function ResultCard({ result, capital, ddMax }) {
  if (!result) return null;

  return (
    <div className="card" id="resultCard">
      <h2>📊 Paramétrage optimal constaté</h2>
      <div style={{ color: "var(--muted)", fontSize: ".85rem" }}>
        Capital {capital} € • Drawdown max accepté {ddMax} €
      </div>

      <div className="result-grid">
        {/* SECTION 1 : Paramètres robot */}
        <div className="result-section-label">
          🧩 Paramètres à appliquer dans le robot IntradayGraf 2026 :
        </div>

        <div className="stat">
          <div className="stat-label">Instrument</div>
          <div id="instrument" className="stat-value">
            {result.Actif ?? "–"}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">Risque par trade</div>
          <div id="risk" className="stat-value">
            {formatRisk(result.pRisque)}
          </div>
        </div>

        {/* SECTION 2 : Performance */}
        <div className="result-section-label" style={{ marginTop: "10px" }}>
          📈 Performance :
        </div>

        <div className="stat">
          <div className="stat-label">Gain total</div>
          <div id="gain" className="stat-value">
            {money(result.Gain)}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">Drawdown max</div>
          <div id="dd" className="stat-value">
            {money(result.Drawdown)}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">Gain total / Drawdown max</div>
          <div id="sharpe" className="stat-value">
            {formatSharpe(result.Sharpe)}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">% trades gagnants</div>
          <div id="win" className="stat-value">
            {pct(result.pGagnant)}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">Nombre de trades</div>
          <div id="trades" className="stat-value">
            {result.NbTrade ?? "–"}
          </div>
        </div>
      </div>
    </div>
  );
}
