import React, { useEffect, useState } from "react";
import SliderDD from "./components/SliderDD.jsx";
import ObjectifButtons from "./components/ObjectifButtons.jsx";
import ResultCard from "./components/ResultCard.jsx";
import GraphPlaceholder from "./components/GraphPlaceholder.jsx";
import { fetchCapitals, fetchRows } from "./services/supabase.js";

export default function App() {
  const [capitalOptions, setCapitalOptions] = useState([]);
  const [capital, setCapital] = useState("");
  const [ddValue, setDdValue] = useState(1000);
  const [objectif, setObjectif] = useState("serenite");
  const [error, setError] = useState("");
  const [resultRow, setResultRow] = useState(null);
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(false);

  // Load capitals on mount
  useEffect(() => {
    async function load() {
      try {
        const caps = await fetchCapitals();
        setCapitalOptions(caps);
        setError("");
      } catch (e) {
        console.error(e);
        setError("Erreur lors du chargement des capitaux : " + e.message);
      }
    }
    load();
  }, []);

  // Theme sync with body
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  const handleRun = async () => {
    setError("");
    setResultRow(null);

    const capNum = Number(capital);
    const ddNum = Number(ddValue);

    if (!capNum || !ddNum) {
      setError("Veuillez remplir le capital et le drawdown max.");
      return;
    }

    setLoading(true);
    try {
      const rows = await fetchRows(capNum, ddNum);
      if (!rows.length) {
        setError("Aucun résultat pour cette configuration.");
        setLoading(false);
        return;
      }

      let best = rows[0];
      if (objectif === "serenite") {
        rows.forEach((r) => {
          if ((r.Sharpe ?? -Infinity) > (best.Sharpe ?? -Infinity)) best = r;
        });
      } else {
        rows.forEach((r) => {
          if ((r.Gain ?? -Infinity) > (best.Gain ?? -Infinity)) best = r;
        });
      }

      setResultRow(best);
    } catch (e) {
      console.error(e);
      setError("Erreur Supabase : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <div>
          <h1 className="app-header-title">Simulateur IntradayGraf 2026</h1>
          <div className="subtitle">
            Résultats sur base de l&apos;historique du robot sur l&apos;actif « Allemagne 40 Cash (15mn) »<br />
            sur la période du 01/01/2017 au 10/11/2025
          </div>
        </div>
        <button id="themeToggle" className="theme-toggle" onClick={toggleTheme}>
          <span id="themeIcon">{theme === "dark" ? "🌙" : "🌞"}</span>
          <span id="themeLabel">{theme === "dark" ? "Mode sombre" : "Mode clair"}</span>
        </button>
      </header>

      {/* Paramétrage */}
      <div className="card">
        <h2>⚙️ Paramètres</h2>

        <label>Capital alloué (€)</label>
        <select
          id="capital"
          value={capital}
          onChange={(e) => setCapital(e.target.value)}
        >
          <option value="">Choisir…</option>
          {capitalOptions.map((c) => (
            <option key={c} value={c}>
              {c} €
            </option>
          ))}
        </select>

        <div style={{ marginTop: "10px" }}>
          <div className="dd-label-row">
            <label style={{ marginBottom: 0 }}>Drawdown max accepté (€)</label>
            <div id="ddValueLabel" className="dd-value">
              {ddValue ? ddValue + " €" : ""}
            </div>
          </div>
          <SliderDD value={ddValue} onChange={setDdValue} min={0} max={10000} step={100} />
        </div>

        <div style={{ marginTop: "12px" }}>
          <label style={{ marginBottom: "6px" }}>Objectif</label>
          <ObjectifButtons value={objectif} onChange={setObjectif} />
        </div>

        <button id="runBtn" className="btn" onClick={handleRun} disabled={loading}>
          <span>🚀</span>
          <span>{loading ? "Calcul en cours..." : "Lancer la simulation"}</span>
        </button>
        {error && (
          <div id="formError" className="error">
            {error}
          </div>
        )}
      </div>

      {/* Résultats */}
      {resultRow && (
        <>
          <ResultCard result={resultRow} capital={capital} ddMax={ddValue} />
          {/* Placeholder pour futurs graphiques */}
          <GraphPlaceholder />
        </>
      )}
    </div>
  );
}
