import React, { useEffect, useState } from "react";

const SUPABASE_URL = "https://supabase.olivdef.fr";
const SUPABASE_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzIxNzYwMCwiZXhwIjo0OTE4ODkxMjAwLCJyb2xlIjoiYW5vbiJ9.UagouIBtD8p_dKm3pJX1J2wgaiDfq0vkNo6Cv6FdCbY";
const TABLE = "DataIntradayGrafV4-3";

// Helpers de formatage
function formatMoney(value) {
  if (value == null || isNaN(value)) return "–";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + " €";
}

function formatPercent(value, digits = 2) {
  if (value == null || isNaN(value)) return "–";
  const num = value * 100;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(num) + " %";
}

function formatRatio(value, digits = 2) {
  if (value == null || isNaN(value)) return "–";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export default function App() {
  const [darkMode, setDarkMode] = useState(false);

  const [capitals, setCapitals] = useState([]);
  const [capital, setCapital] = useState("");
  const [ddMax, setDdMax] = useState(1000);
  const [objectif, setObjectif] = useState("serenite"); // "serenite" | "performance"

  const [loadingCapitals, setLoadingCapitals] = useState(false);
  const [loadingSim, setLoadingSim] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { bestRow, capital, ddMax, objectif }

  // Appliquer / retirer la classe dark sur <body>
  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Charger la liste des capitaux au chargement
  useEffect(() => {
    async function loadCapital() {
      try {
        setLoadingCapitals(true);
        setError("");

        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/${TABLE}?select=Capital`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: "Bearer " + SUPABASE_KEY,
            },
          }
        );

        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }

        const rows = await res.json();
        const caps = [...new Set(rows.map((r) => r.Capital))]
          .filter((v) => v != null)
          .sort((a, b) => a - b);

        setCapitals(caps);
      } catch (e) {
        console.error(e);
        setError(
          "Erreur lors du chargement des capitaux. Veuillez réessayer plus tard."
        );
      } finally {
        setLoadingCapitals(false);
      }
    }

    loadCapital();
  }, []);

  // Synchronisation slider / input DD
  const handleDdSliderChange = (e) => {
    const val = Number(e.target.value);
    setDdMax(val);
  };

  const handleDdInputChange = (e) => {
    let val = Number(e.target.value);
    if (isNaN(val)) val = 0;
    if (val < 0) val = 0;
    if (val > 10000) val = 10000;
    setDdMax(val);
  };

  // Lancer la simulation (appel Supabase)
  const handleRun = async () => {
    const capNum = Number(capital);
    const ddNum = Number(ddMax);

    if (!capNum || !ddNum) {
      setError("Veuillez remplir le capital et le drawdown max.");
      setResult(null);
      return;
    }

    setError("");
    setLoadingSim(true);

    try {
      const path = `/rest/v1/${TABLE}?select=*&Capital=eq.${capNum}&Drawdown=lte.${ddNum}`;
      const res = await fetch(SUPABASE_URL + path, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
        },
      });

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      const rows = await res.json();

      if (!rows.length) {
        setResult(null);
        setError("Aucun résultat pour cette configuration.");
        return;
      }

      let best = rows[0];
      if (objectif === "serenite") {
        // Sérénité = max Sharpe
        rows.forEach((r) => {
          const current = r.Sharpe ?? -Infinity;
          const bestVal = best.Sharpe ?? -Infinity;
          if (current > bestVal) best = r;
        });
      } else {
        // Performance = max Gain
        rows.forEach((r) => {
          const current = r.Gain ?? -Infinity;
          const bestVal = best.Gain ?? -Infinity;
          if (current > bestVal) best = r;
        });
      }

      setResult({
        best,
        capital: capNum,
        ddMax: ddNum,
        objectif,
      });
    } catch (e) {
      console.error(e);
      setError("Erreur Supabase : " + e.message);
      setResult(null);
    } finally {
      setLoadingSim(false);
    }
  };

  const best = result?.best;

  return (
    <div className="app">
      {/* HEADER */}
      <header>
        <div>
          <h1>Simulateur IntradayGraf 2026</h1>
          <div className="subtitle">
            Résultats sur base de l&apos;historique du robot sur l&apos;actif
            «&nbsp;Allemagne 40 Cash (15mn)&nbsp;»
            <br />
            sur la période du 01/01/2017 au 10/11/2025
          </div>
        </div>
        <button
          className="theme-toggle"
          onClick={() => setDarkMode((v) => !v)}
        >
          <span>{darkMode ? "🌙" : "🌞"}</span>
          <span>{darkMode ? "Mode sombre" : "Mode clair"}</span>
        </button>
      </header>

      {/* PARAMÈTRES */}
      <div className="card">
        <h2>⚙️ Paramètres</h2>

        {/* Capital */}
        <label>Capital alloué (€)</label>
        <select
          id="capital"
          value={capital}
          onChange={(e) => setCapital(e.target.value)}
          disabled={loadingCapitals}
        >
          {loadingCapitals && <option>Chargement…</option>}
          {!loadingCapitals && (
            <>
              <option value="">Choisir…</option>
              {capitals.map((c) => (
                <option key={c} value={c}>
                  {c} €
                </option>
              ))}
            </>
          )}
        </select>

        {/* Drawdown max avec slider + input */}
        <div style={{ marginTop: 10 }}>
          <div className="dd-label-row">
            <label style={{ marginBottom: 0 }}>Drawdown max accepté (€)</label>
            <div className="dd-value">
              {ddMax ? `${ddMax.toString()} €` : ""}
            </div>
          </div>
          <div className="slider-row" style={{ marginTop: 4 }}>
            <input
              id="ddSlider"
              type="range"
              min="0"
              max="10000"
              step="100"
              value={ddMax}
              onChange={handleDdSliderChange}
            />
            <input
              id="ddMax"
              type="number"
              min="0"
              max="10000"
              step="100"
              value={ddMax}
              onChange={handleDdInputChange}
            />
          </div>
        </div>

        {/* Objectif */}
        <div style={{ marginTop: 12 }}>
          <label style={{ marginBottom: 6 }}>Objectif</label>
          <div className="objectif-group">
            <button
              type="button"
              className={
                "obj-btn" + (objectif === "serenite" ? " active" : "")
              }
              onClick={() => setObjectif("serenite")}
            >
              <span className="icon">🧘‍♂️</span>
              <span>Sérénité (Sharpe)</span>
            </button>
            <button
              type="button"
              className={
                "obj-btn" + (objectif === "performance" ? " active" : "")
              }
              onClick={() => setObjectif("performance")}
            >
              <span className="icon">⚡</span>
              <span>Performance (Gain)</span>
            </button>
          </div>
        </div>

        <button className="btn" onClick={handleRun} disabled={loadingSim}>
          <span>🚀</span>
          <span>{loadingSim ? "Calcul en cours…" : "Lancer la simulation"}</span>
        </button>

        {error && <div className="error">{error}</div>}
      </div>

      {/* RÉSULTATS */}
      {result && best && (
        <div className="card">
          <h2>📊 Paramétrage optimal constaté</h2>
          <div style={{ color: "var(--muted)", fontSize: ".85rem" }}>
            Capital {formatMoney(result.capital).replace(" €", " €")} •
            &nbsp;Drawdown max accepté {formatMoney(result.ddMax)}
          </div>

          <div className="result-grid">
            {/* Section 1 : paramètres robot */}
            <div className="result-section-label">
              🧩 Paramètres à appliquer dans le robot IntradayGraf 2026 :
            </div>

            <div className="stat">
              <div className="stat-label">Instrument</div>
              <div className="stat-value">{best.Actif ?? "–"}</div>
            </div>

            <div className="stat">
              <div className="stat-label">Risque par trade</div>
              <div className="stat-value">
                {best.pRisque != null
                  ? formatPercent(best.pRisque, 2)
                  : "–"}
              </div>
            </div>

            {/* Section 2 : performance */}
            <div className="result-section-label" style={{ marginTop: 10 }}>
              📈 Performance :
            </div>

            <div className="stat">
              <div className="stat-label">Gain total</div>
              <div className="stat-value">{formatMoney(best.Gain)}</div>
            </div>

            <div className="stat">
              <div className="stat-label">Drawdown max</div>
              <div className="stat-value">{formatMoney(best.Drawdown)}</div>
            </div>

            <div className="stat">
              <div className="stat-label">Gain total / Drawdown max</div>
              <div className="stat-value">{formatRatio(best.Sharpe, 2)}</div>
            </div>

            <div className="stat">
              <div className="stat-label">% trades gagnants</div>
              <div className="stat-value">
                {best.pGagnant != null
                  ? formatPercent(best.pGagnant, 2)
                  : "–"}
              </div>
            </div>

            <div className="stat">
              <div className="stat-label">Nombre de trades</div>
              <div className="stat-value">
                {best.NbTrade != null ? best.NbTrade : "–"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
