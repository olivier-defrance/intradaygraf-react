import React, { useEffect, useState } from "react";

// === Constantes Supabase ===
const SUPABASE_URL = "https://supabase.olivdef.fr";
const SUPABASE_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MzIxNzYwMCwiZXhwIjo0OTE4ODkxMjAwLCJyb2xlIjoiYW5vbiJ9.UagouIBtD8p_dKm3pJX1J2wgaiDfq0vkNo6Cv6FdCbY";

const TABLE_CAPITALS = "ComboIntradayGrafV4-3";
const TABLE_DATA = "DataIntradayGrafV4-3";

// === Helpers de formatage ===
const formatMoney = (v) => {
  if (v == null || Number.isNaN(v)) return "–";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
};

const formatPercent = (v) => {
  if (v == null || Number.isNaN(v)) return "–";
  const n = v * 100;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n) + " %";
};

const formatPercentRisk = (v) => {
  if (v == null || Number.isNaN(v)) return "–";
  return (
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(v) + " %"
  );
};

const formatNumber = (v) => {
  if (v == null || Number.isNaN(v)) return "–";
  return new Intl.NumberFormat("fr-FR").format(v);
};

const formatRatio = (v) => {
  if (v == null || Number.isNaN(v)) return "–";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

function App() {
  const [isDark, setIsDark] = useState(false);

  const [capitals, setCapitals] = useState([]);
  const [capitalsLoading, setCapitalsLoading] = useState(true);
  const [capitalsError, setCapitalsError] = useState("");

  const [selectedCapital, setSelectedCapital] = useState("");
  const [ddMax, setDdMax] = useState(1000);
  const [objectif, setObjectif] = useState("serenite"); // "serenite" | "performance"

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [result, setResult] = useState(null); // ligne best

  // --- Dark mode : reflet sur <body> ---
  useEffect(() => {
    document.body.classList.toggle("dark", isDark);
  }, [isDark]);

  // --- Chargement liste des capitaux ---
  useEffect(() => {
    const loadCapitals = async () => {
      try {
        setCapitalsLoading(true);
        setCapitalsError("");

        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/${TABLE_CAPITALS}?select=Capital`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: "Bearer " + SUPABASE_KEY,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Erreur HTTP ${res.status}`);
        }

        const rows = await res.json();
        const uniqueCaps = [
          ...new Set(rows.map((r) => Number(r.Capital)).filter((n) => !isNaN(n))),
        ].sort((a, b) => a - b);

        setCapitals(uniqueCaps);
      } catch (e) {
        console.error(e);
        setCapitalsError("Erreur de chargement des capitaux.");
      } finally {
        setCapitalsLoading(false);
      }
    };

    loadCapitals();
  }, []);

  // --- Sync slider / input ---
  const handleDdSliderChange = (e) => {
    const v = Number(e.target.value);
    setDdMax(v);
  };

  const handleDdInputChange = (e) => {
    let v = Number(e.target.value);
    if (isNaN(v)) v = 0;
    if (v < 0) v = 0;
    if (v > 10000) v = 10000;
    setDdMax(v);
  };

  // --- Lancement simulation ---
  const handleRun = async () => {
    setRunError("");
    setResult(null);

    const capNumber = Number(selectedCapital);
    if (!capNumber || !ddMax) {
      setRunError("Veuillez choisir un capital et un drawdown max.");
      return;
    }

    setRunning(true);
    try {
      const path = `/rest/v1/${TABLE_DATA}?select=*&Capital=eq.${capNumber}&Drawdown=lte.${ddMax}`;
      const res = await fetch(SUPABASE_URL + path, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
        },
      });

      if (!res.ok) {
        throw new Error(`Erreur HTTP ${res.status}`);
      }

      const rows = await res.json();

      if (!rows.length) {
        setRunError("Aucun résultat pour cette configuration.");
        return;
      }

      let best = rows[0];

      if (objectif === "serenite") {
        rows.forEach((r) => {
          const sh = r.Sharpe ?? -Infinity;
          const bestSh = best.Sharpe ?? -Infinity;
          if (sh > bestSh) best = r;
        });
      } else {
        rows.forEach((r) => {
          const g = r.Gain ?? -Infinity;
          const bestG = best.Gain ?? -Infinity;
          if (g > bestG) best = r;
        });
      }

      setResult({
        row: best,
        capital: capNumber,
        ddMax,
      });
    } catch (e) {
      console.error(e);
      setRunError("Erreur Supabase : " + e.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-title-block">
          <h1>Simulateur IntradayGraf 2026</h1>
          <p className="subtitle">
            Résultats sur base de l&apos;historique du robot sur l&apos;actif
            &nbsp;
            <span className="subtitle-highlight">
              « Allemagne 40 Cash (15mn) »
            </span>
            <br />
            sur la période du 01/01/2017 au 10/11/2025
          </p>
        </div>
        <button
          className="theme-toggle-btn"
          onClick={() => setIsDark((d) => !d)}
        >
          <span className="theme-icon">{isDark ? "🌙" : "🌞"}</span>
          <span>{isDark ? "Mode sombre" : "Mode clair"}</span>
        </button>
      </header>

      {/* CONTENEUR PRINCIPAL */}
      <main className="layout">
        {/* Colonne gauche : Paramètres */}
        <section className="card card-params">
          <h2>⚙️ Paramètres</h2>

          {/* Capital */}
          <div className="form-group">
            <label>Capital alloué (€)</label>
            <select
              value={selectedCapital}
              onChange={(e) => setSelectedCapital(e.target.value)}
              disabled={capitalsLoading || !!capitalsError}
            >
              {capitalsLoading && <option>Chargement…</option>}
              {!capitalsLoading && !capitals.length && (
                <option>Aucun capital disponible</option>
              )}
              {!capitalsLoading && capitals.length > 0 && (
                <>
                  <option value="">Choisir…</option>
                  {capitals.map((c) => (
                    <option key={c} value={c}>
                      {formatNumber(c)} €
                    </option>
                  ))}
                </>
              )}
            </select>
            {capitalsError && (
              <div className="error-text small">{capitalsError}</div>
            )}
          </div>

          {/* Drawdown max */}
          <div className="form-group">
            <div className="label-row">
              <label>Drawdown max accepté (€)</label>
              <span className="dd-value">
                {ddMax ? `${formatNumber(ddMax)} €` : ""}
              </span>
            </div>
            <div className="dd-row">
              <input
                type="range"
                min={0}
                max={10000}
                step={100}
                value={ddMax}
                onChange={handleDdSliderChange}
              />
              <input
                type="number"
                min={0}
                max={10000}
                step={100}
                value={ddMax}
                onChange={handleDdInputChange}
              />
            </div>
          </div>

          {/* Objectif */}
          <div className="form-group">
            <label>Objectif</label>
            <div className="objectif-group">
              <button
                type="button"
                className={
                  "obj-btn" + (objectif === "serenite" ? " active" : "")
                }
                onClick={() => setObjectif("serenite")}
              >
                <span className="obj-icon">🧘‍♂️</span>
                <span>Sérénité (Sharpe)</span>
              </button>
              <button
                type="button"
                className={
                  "obj-btn" + (objectif === "performance" ? " active" : "")
                }
                onClick={() => setObjectif("performance")}
              >
                <span className="obj-icon">⚡</span>
                <span>Performance (Gain)</span>
              </button>
            </div>
          </div>

          {/* Bouton run */}
          <button
            className="btn-run"
            onClick={handleRun}
            disabled={running || capitalsLoading}
          >
            {running ? "Analyse en cours…" : "🚀 Lancer la simulation"}
          </button>

          {runError && <div className="error-text">{runError}</div>}
        </section>

        {/* Colonne droite : Résultats */}
        <section className="card card-results">
          <h2>📊 Paramétrage optimal constaté</h2>
          {!result && (
            <p className="placeholder">
              Lancez une simulation pour afficher le paramétrage optimal.
            </p>
          )}

          {result && (
            <>
              <p className="context">
                Capital {formatNumber(result.capital)} € • Drawdown max accepté{" "}
                {formatNumber(result.ddMax)} €
              </p>

              <div className="results-grid">
                {/* Section 1 : Paramètres robot */}
                <div className="section-label">
                  🧩 Paramètres à appliquer dans le robot IntradayGraf 2026 :
                </div>

                <div className="stat">
                  <div className="stat-label">Instrument</div>
                  <div className="stat-value">
                    {result.row.Actif ?? "–"}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Risque par trade</div>
                  <div className="stat-value">
                    {formatPercentRisk(result.row.pRisque)}
                  </div>
                </div>

                {/* Section 2 : Performance */}
                <div className="section-label section-label-margin">
                  📈 Performance :
                </div>

                <div className="stat">
                  <div className="stat-label">Gain total</div>
                  <div className="stat-value">
                    {formatMoney(result.row.Gain)}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Drawdown max</div>
                  <div className="stat-value">
                    {formatMoney(result.row.Drawdown)}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">
                    Gain total / Drawdown max
                  </div>
                  <div className="stat-value">
                    {formatRatio(result.row.Sharpe)}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">% trades gagnants</div>
                  <div className="stat-value">
                    {formatPercent(result.row.pGagnant)}
                  </div>
                </div>

                <div className="stat">
                  <div className="stat-label">Nombre de trades</div>
                  <div className="stat-value">
                    {formatNumber(result.row.NbTrade)}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
