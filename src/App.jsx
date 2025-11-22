import { useEffect, useState } from "react";
import "./index.css";
import Chart from "react-apexcharts";

const API_URL = "https://api.olivdef.fr";

function formatMoney(value) {
  if (value === null || value === undefined || isNaN(value)) return "–";
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value) + " €";
}

function formatPercentFromFraction(value) {
  if (value === null || value === undefined || isNaN(value)) return "–";
  return (value * 100).toFixed(2).replace(".", ",") + " %";
}

function formatPercentRaw2(value) {
  if (value === null || value === undefined || isNaN(value)) return "–";
  return value.toFixed(2).replace(".", ",") + " %";
}

function formatPercentNoDecFromFraction(value) {
  if (value === null || value === undefined || isNaN(value)) return "–";
  return Math.round(value * 100) + " %";
}

function App() {
  const [capitals, setCapitals] = useState([]);
  const [capital, setCapital] = useState("5000");
  const [ddMax, setDdMax] = useState(1000);
  const [ddSlider, setDdSlider] = useState(1000);
  const [objectif, setObjectif] = useState("serenite");

  const [loadingCapitals, setLoadingCapitals] = useState(true);
  const [capitalError, setCapitalError] = useState("");

  const [loadingSimu, setLoadingSimu] = useState(false);
  const [simuError, setSimuError] = useState("");
  const [result, setResult] = useState(null);
  // --- Pour afficher tous les points du nuage ---
  const [allPoints, setAllPoints] = useState([]);
  const [bestSerenite, setBestSerenite] = useState(null);
  const [bestPerformance, setBestPerformance] = useState(null);
  const [chartError, setChartError] = useState("");
  // Filtres actifs
  const [filterActif1, setFilterActif1] = useState(true);
  const [filterActif5, setFilterActif5] = useState(true);

	const filteredPoints = allPoints.filter((p) => {
	  if (p.Actif === "Allemagne 40 Cash (1€)" && !filterActif1) return false;
	  if (p.Actif === "Allemagne 40 Cash (5€)" && !filterActif5) return false;
	  return true;
	});

  const [darkMode, setDarkMode] = useState(false);

  // Appliquer le thème clair au chargement
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  // --- Charger la liste des capitaux ---
  useEffect(() => {
    async function loadCapitals() {
      try {
        setLoadingCapitals(true);
        setCapitalError("");

        const response = await fetch(`${API_URL}/simu?select=Capital`);

        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}`);
        }

        const rows = await response.json();
        const caps = [...new Set(rows.map((r) => r.Capital))]
          .filter((c) => c !== null && c !== undefined)
          .sort((a, b) => a - b);

        setCapitals(caps);
        if (!capital && caps.length > 0) {
          setCapital(String(caps[0]));
        }
      } catch (e) {
        console.error(e);
        setCapitalError("Erreur de chargement des capitaux.");
      } finally {
        setLoadingCapitals(false);
      }
    }

    loadCapitals();
  }, []); // une seule fois au montage

  // --- Synchronisation slider / champ numérique ---
  useEffect(() => {
    setDdSlider(ddMax);
  }, [ddMax]);

  const handleDdSliderChange = (e) => {
    const value = Number(e.target.value);
    setDdSlider(value);
    setDdMax(value);
  };

  const handleDdInputChange = (e) => {
    let value = Number(e.target.value);
    if (isNaN(value)) value = 0;
    if (value < 0) value = 0;
    if (value > 100000) value = 100000;
    setDdMax(value);
    setDdSlider(value);
  };

  // --- Simulation ---
  const handleRunSimulation = async () => {
    setSimuError("");
    setResult(null);

    const capNumber = Number(capital);
    const ddNumber = Number(ddMax);

    if (!capNumber || !ddNumber || ddNumber <= 0) {
      setSimuError("Veuillez renseigner un capital et un drawdown max valides.");
      return;
    }

    setLoadingSimu(true);

    try {
      const url = `${API_URL}/simu?select=*&Capital=eq.${capNumber}&Drawdown=lte.${ddNumber}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const rows = await response.json();
	  // --- Correction : conversion en nombres pour ApexCharts ---
	const cleanedRows = rows.map((r) => ({
	  ...r,
	  Drawdown: Number(r.Drawdown),
	  Gain: Number(r.Gain),
	}));


if (!rows || rows.length === 0) {
  setSimuError("Aucun résultat pour cette configuration.");

  // VIDER les graphes
  setAllPoints([]);
  setBestSerenite(null);
  setBestPerformance(null);

  setResult(null);
  return;
}


      // Choix du "meilleur" résultat selon l'objectif
      let best = cleanedRows[0];

if (objectif === "serenite") {
  cleanedRows.forEach((r) => {
    const current = r.Sharpe ?? -Infinity;
    const bestVal = best.Sharpe ?? -Infinity;
    if (current > bestVal) best = r;
  });
} else {
  cleanedRows.forEach((r) => {
    const current = r.Gain ?? -Infinity;
    const bestVal = best.Gain ?? -Infinity;
    if (current > bestVal) best = r;
  });
}

// --- Nuage de points ---
setAllPoints(cleanedRows);

setBestSerenite(
  cleanedRows.reduce((a, b) =>
    (b.Sharpe ?? -Infinity) > (a.Sharpe ?? -Infinity) ? b : a
  )
);

setBestPerformance(
  cleanedRows.reduce((a, b) =>
    (b.Gain ?? -Infinity) > (a.Gain ?? -Infinity) ? b : a
  )
);


      setResult({
        ...best,
        capital: capNumber,
        ddMax: ddNumber,
      });
    } catch (e) {
      console.error(e);
      setSimuError("Erreur Supabase : " + e.message);
      setResult(null);
    } finally {
      setLoadingSimu(false);
    }
  };

  // --- Thème ---
  const toggleTheme = () => {
    setDarkMode((prev) => !prev);
    document.documentElement.setAttribute(
      "data-theme",
      !darkMode ? "dark" : "light"
    );
  };

  return (
    <div className={`app-root ${darkMode ? "theme-dark" : "theme-light"}`}>
      <div className="app-gradient" />
      <div className="app-shell">
        <header className="app-header">
          <div>
            <h1 className="app-title">Simulateur IntradayGraf 2026</h1>
            <p className="app-subtitle">
              Basé sur l&apos;historique des résultats du robot sur l&apos;actif
              « Allemagne 40 Cash » pour la période du 01/01/2017 au 10/11/2025
            </p>
          </div>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Changer de thème"
          >
            <span className="theme-toggle-icon">{darkMode ? "🌙" : "🌞"}</span>
            <span className="theme-toggle-label">
              {darkMode ? "Mode sombre" : "Mode clair"}
            </span>
          </button>
        </header>

        <main className="app-main">
          {/* Bloc paramètres */}
          <section className="card card-params">
            <h2 className="card-title">⚙️ Paramètres de simulation</h2>

            {/* Capital */}
            <div className="field">
              <label className="field-label" htmlFor="capital">
                Capital alloué (€)
              </label>
              <select
                id="capital"
                className="field-select"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                disabled={loadingCapitals}
              >
                {loadingCapitals && (
                  <option value="">Chargement des capitaux…</option>
                )}
                {!loadingCapitals && capitals.length === 0 && (
                  <option value="">Aucun capital disponible</option>
                )}
                {!loadingCapitals &&
                  capitals.map((cap) => (
                    <option key={cap} value={cap}>
                      {new Intl.NumberFormat("fr-FR").format(cap)} €
                    </option>
                  ))}
              </select>
              {capitalError && (
                <div className="field-error">{capitalError}</div>
              )}
            </div>

            {/* Drawdown max */}
            <div className="field">
              <div className="field-label-row">
                <label className="field-label" htmlFor="ddMax">
                  Drawdown max accepté (€)
                </label>
                <span className="field-helper">
                  {ddMax ? `${formatMoney(ddMax)}` : ""}
                </span>
              </div>
              <div className="dd-row">
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={ddSlider}
                  onChange={handleDdSliderChange}
                  className="dd-slider"
                />
                <input
                  id="ddMax"
                  type="number"
                  min="0"
                  max="100000"
                  step="100"
                  value={ddMax}
                  onChange={handleDdInputChange}
                  className="field-input dd-input"
                />
              </div>
            </div>

            {/* Objectif */}
            <div className="field">
              <span className="field-label">Objectif de l&apos;optimisation</span>
              <div className="objective-toggle">
                <button
                  type="button"
                  className={
                    "objective-button" +
                    (objectif === "serenite" ? " objective-button-active" : "")
                  }
                  onClick={() => setObjectif("serenite")}
                >
                  <span className="objective-icon">🧘‍♂️</span>
                  <span className="objective-text">
                    Sérénité (Gain total / Drawdown max)
                  </span>
                </button>
                <button
                  type="button"
                  className={
                    "objective-button" +
                    (objectif === "performance" ? " objective-button-active" : "")
                  }
                  onClick={() => setObjectif("performance")}
                >
                  <span className="objective-icon">⚡</span>
                  <span className="objective-text">
                    Performance (Gain total)
                  </span>
                </button>
              </div>
            </div>

            {/* Bouton lancer */}
            <div className="actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleRunSimulation}
                disabled={loadingSimu || loadingCapitals}
              >
                {loadingSimu ? (
                  <span className="btn-spinner" aria-hidden="true" />
                ) : (
                  <span className="btn-icon">🚀</span>
                )}
                <span>
                  {loadingSimu
                    ? "Calcul en cours…"
                    : "Lancer la simulation"}
                </span>
              </button>
              {simuError && <div className="field-error">{simuError}</div>}
            </div>
          </section>

          {/* Phrase de vigilance */}
          <p className="risk-warning">
            ⚠️ Les performances passées ne préjugent pas des performances futures.
          </p>

          {/* Résultats */}
          {result && (
            <section className="card card-results">
              <h2 className="card-title">📊 Paramétrage optimal constaté sur la période historique du 01/01/2017 au 10/11/2025</h2>
              <p className="context-text">
                Capital {formatMoney(result.capital)} • Drawdown max accepté{" "}
                {formatMoney(result.ddMax)}
              </p>

              <div className="results-grid">
                {/* Section 1 : paramètres robot */}
                <div className="results-section-label">
                  🧩 Paramètres à appliquer dans le robot IntradayGraf 2026 :
                </div>

                <div className="stat-card">
                  <div className="stat-label">Instrument</div>
                  <div className="stat-value">
                    {result.Actif ?? "–"}
                  </div>
                </div>

				<div className="stat-card">
				  <div className="stat-label">Risque par trade</div>
				  <div className="stat-value">
					{formatPercentRaw2(result.pRisque)}
					{` (soit ${Math.round(result.capital * (result.pRisque / 100))} €)`}
				  </div>
				</div>

                <div className="stat-card">
                  <div className="stat-label">
                    Capital max utilisé lors des ventes
                  </div>
                  <div className="stat-value">
                    {formatPercentNoDecFromFraction(result.pCapitalVente)}
                  </div>
                </div>

                {/* Section 2 : performance */}
                <div className="results-section-label results-section-top">
                  📈 Performance :
                </div>

                <div className="stat-card">
                  <div className="stat-label">Gain total</div>
                  <div className="stat-value">
                    {formatMoney(result.Gain)}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Drawdown max</div>
                  <div className="stat-value">
                    {formatMoney(result.Drawdown)}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Gain total / Drawdown max</div>
                  <div className="stat-value">
                    {result.Sharpe !== null && result.Sharpe !== undefined
                      ? result.Sharpe.toFixed(2).replace(".", ",")
                      : "–"}
                  </div>
                </div>
				
				<div className="stat-card">
				  <div className="stat-label">Performance annualisée</div>
				  <div className="stat-value">
					{formatPercentFromFraction(result.pPerfAnnuelle)}
				  </div>
				</div>

                <div className="stat-card">
                  <div className="stat-label">% trades gagnants</div>
                  <div className="stat-value">
                    {formatPercentFromFraction(result.pGagnant)}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">Nombre de trades</div>
                  <div className="stat-value">
                    {result.NbTrade ?? "–"}
                  </div>
                </div>
              </div>
            </section>
          )}
		  
		  {/* Bloc code robot */}
			{result && (
			  <section className="card card-results">
				<h2 className="card-title">🧾 Paramétrage dans le code du robot</h2>

			{/* BLOC 1 — paramètres généraux */}
			<div className="copy-row">
			  <button
				className="copy-button"
				onClick={() =>
				  navigator.clipboard.writeText(
			`MaintienCompteActif = 1   // 1=Maintien du compte IG actif si absence de trade durant 25 jours (pour tenir compte des week-end et jours fériés)
			debutMaintien = 1         // 0=demain 9h00 1=dans 25 jours calendaires si pas de trade sur la période

			InstrumentDAX = ${result.Actif === "Allemagne 40 Cash (5€)" ? 1 : 0}         // 0=Allemagne 40 Cash (1€) 1=Allemagne 40 Cash (5€)

			CapitalAlloue = ${result.capital}      // Votre CapitalAlloue à allouer au robot !
			PerteMaxCapital = ${result.ddMax}    // Perte maximale supportée sur le capital alloué
			REINV = 0                 // Changer pour 1 pour re-investir les gains

			RisqueTradeAchat = ${(result.pRisque ?? 0).toFixed(2)}   // Risque par trade à l'achat en % du CapitalAlloue
			RisqueTradeVente = ${(result.pRisque ?? 0).toFixed(2)}   // Risque par trade à la vente en % du CapitalAlloue
			sortielongWE = 1          // 1=cloturer vendredi soir; 0=garder en weekend
			sortiecourtWE = 1         // 1=cloturer vendredi soir; 0=garder en weekend
			activerLongs = 1          // 1=activer les trades à l'achat, 0=désactiver les achats
			activerShorts = 1         // 1=activer les ventes 0=désactiver les ventes
			//                        // Définir les périodes de repos pour le robot
			//                        // par exemple les vendredi : repos = repos or CurrentDayOfWeek=5
			//                        // et/ou le mois de juillet : repos = repos or CurrentMonth=7
			repos = 0                 // Ici : pas de repos :)
			nbcontratsAchat = 0       // préciser le nb de contrats voulus pour chaque achat (zéro = calcul automatique)
			nbcontratsVente = 0       // préciser le nb de contrats voulus pour chaque vente (zéro = calcul automatique)
			SecurisationGain = 1      // 1= Securisation des gains actif (idée et implémentation : Artificall, adaptation GrafTrading)
			CalendrierON = 1          // 1= permet de ne pas trader les jours feriés US et EU ainsi que les jours de FED + BCE (idée et implémentation : Artificall, adaptation GrafTrading)`
				  )
				}
			  >
				📋 Copier ce bloc
			  </button>
			</div>

			<pre className="robot-code-block">
			{`MaintienCompteActif = 1   // 1=Maintien du compte IG actif si absence de trade durant 25 jours
			debutMaintien = 1         // 0=demain 9h00 1=dans 25 jours calendaires si pas de trade sur la période

			InstrumentDAX = `}
			<span className="dynamic-value">
			  {result.Actif === "Allemagne 40 Cash (5€)" ? 1 : 0}
			</span>
			{`        // 0=Allemagne 40 Cash (1€) 1=Allemagne 40 Cash (5€)

			CapitalAlloue = `}
			<span className="dynamic-value">{result.capital}</span>
			{`     // Votre CapitalAlloue à allouer au robot !
			PerteMaxCapital = `}
			<span className="dynamic-value">{result.ddMax}</span>
			{`   // Perte maximale supportée sur le capital alloué
			REINV = 0                 // Changer pour 1 pour re-investir les gains

			RisqueTradeAchat = `}
			<span className="dynamic-value">{(result.pRisque ?? 0).toFixed(2)}</span>
			{`  // Risque par trade à l'achat en % du CapitalAlloue
			RisqueTradeVente = `}
			<span className="dynamic-value">{(result.pRisque ?? 0).toFixed(2)}</span>
			{`  // Risque par trade à la vente en % du CapitalAlloue
			sortielongWE = 1          // 1=cloturer vendredi soir; 0=garder en weekend
			sortiecourtWE = 1         // 1=cloturer vendredi soir; 0=garder en weekend
			activerLongs = 1          // 1=activer les trades à l'achat, 0=désactiver les achats
			activerShorts = 1         // 1=activer les ventes 0=désactiver les ventes

			repos = 0                 // Périodes de repos (0 = aucun)
			nbcontratsAchat = 0       // préciser le nb de contrats voulus pour chaque achat (zéro = calcul automatique)
			nbcontratsVente = 0       // préciser le nb de contrats voulus pour chaque vente (zéro = calcul automatique)
			SecurisationGain = 1      // 1= Securisation des gains actif (idée et implémentation : Artificall, adaptation GrafTrading)
			CalendrierON = 1          // Filtre jours fériés + FED/BCE
			`}
			</pre>


			{/* BLOC 2 — QteMaxVente */}
			<div className="copy-row">
			  <button
				className="copy-button"
				onClick={() =>
				  navigator.clipboard.writeText(
			`QteMaxVente = Capital / (ValeurPointDax*Close*0.05) * ${result.pCapitalVente.toFixed(2)} // ${Math.round(result.pCapitalVente * 100)}% du Capital max est utilisé pour des ventes`
				  )
				}
			  >
				📋 Copier ce bloc
			  </button>
			</div>

			<pre className="robot-code-block">
			{`QteMaxVente = Capital / (ValeurPointDax*Close*0.05) * `}
			<span className="dynamic-value">
			  {result.pCapitalVente.toFixed(2)}
			</span>
			{`     // `}
			{Math.round(result.pCapitalVente * 100)}
			{`% du capital max utilisé pour les ventes`}
			</pre>
			  </section>
			)}

{allPoints.length > 0 && (
  <section className="card card-charts">
    {/* === SECTION GRAPHIQUE === */}
  <h2 className="card-title">📊 Performance vs Risque</h2>

  {/* === FILTRES ACTIFS === */}
  <div className="filters-actifs" style={{ marginBottom: "1rem" }}>
    <label>
      <input
        type="checkbox"
        checked={filterActif1}
        onChange={() => setFilterActif1(!filterActif1)}
      />{" "}
      Allemagne 40 Cash (1€)
    </label>

    <label style={{ marginLeft: "1rem" }}>
      <input
        type="checkbox"
        checked={filterActif5}
        onChange={() => setFilterActif5(!filterActif5)}
      />{" "}
      Allemagne 40 Cash (5€)
    </label>
  </div>

  {/* === CHART === */}
  <Chart
    type="scatter"
    height={400}
    series={
      filteredPoints.length > 0
        ? [
            {
              name: "Toutes les stratégies",
              data: filteredPoints.map((p) => ({
                x: p.Drawdown,
                y: Math.round(p.Gain),
                meta: p,
                fillColor: (() => {
                  const actif = String(p.Actif || "").toLowerCase();
                  if (actif.includes("1€")) return "#64b5f6"; // bleu clair
                  if (actif.includes("5€")) return "#1565c0"; // bleu foncé
                  return "#90caf9";
                })(),
              })),
            },
            bestSerenite && {
              name: "🧘 Sérénité",
              data: [
                {
                  x: bestSerenite.Drawdown,
                  y: Math.round(bestSerenite.Gain),
                  meta: bestSerenite,
                  fillColor: "#00e676",
                  marker: { size: 16, strokeWidth: 2, strokeColor: "#00c853" },
                },
              ],
            },
            bestPerformance && {
              name: "⚡ Performance",
              data: [
                {
                  x: bestPerformance.Drawdown,
                  y: Math.round(bestPerformance.Gain),
                  meta: bestPerformance,
                  fillColor: "#ffab00",
                  marker: { size: 16, strokeWidth: 2, strokeColor: "#ff6f00" },
                },
              ],
            },
          ].filter(Boolean)
        : []
    }
    options={{
      chart: {
        zoom: { enabled: true },
        toolbar: { show: true,
		  tools: {
			download: true,
			selection: false,
			zoom: false,
			zoomin: true,
			zoomout: true,
			pan: false,
			reset: true
		  } },
      },

      colors: [], // important pour que fillColor fonctionne

      xaxis: {
        title: { text: "Drawdown (€)" },
        tickAmount: 6,
        labels: { formatter: (v) => Math.round(v) },
      },

      yaxis: {
        title: { text: "Gain (€)" },
        labels: { formatter: (v) => Math.round(v) },
      },

      tooltip: {
        shared: false,
        intersect: true,
        custom: function ({ seriesIndex, dataPointIndex, w }) {
          const p = w.config.series[seriesIndex].data[dataPointIndex].meta;
          if (!p) return "<div style='padding:5px'>Aucune donnée</div>";

          return `
            <div style="padding:10px; font-size:14px">
              <strong>${Math.round(p.Gain)} € de gain</strong><br/>
              📉 Drawdown : <b>${Math.round(p.Drawdown)} €</b><br/>
              🏦 Capital : <b>${p.Capital} €</b><br/>
              📈 Actif : <b>${p.Actif}</b><br/>
              🎯 Risque/trade : <b>${p.pRisque.toFixed(2)} %</b><br/>
              🔥 % capital ventes : <b>${Math.round(p.pCapitalVente * 100)} %</b>
            </div>
          `;
        },
      },
    }}
  />
</section>

)}







        </main>
      </div>
    </div>
  );
}

export default App;
