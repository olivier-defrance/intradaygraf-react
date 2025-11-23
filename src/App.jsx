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

// Format : 12 500
function formatNumber(n) {
  return n.toLocaleString("fr-FR");
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
  const [objectifUtilise, setObjectifUtilise] = useState(null);

const toggleActif1 = () => {
  const newState = !filterActif1;

  // Si on essaie de décocher la DERNIÈRE case cochée → empêcher et basculer automatiquement l’autre
  if (!newState && !filterActif5) {
    setFilterActif5(true);
  }

  setFilterActif1(newState);
};

const toggleActif5 = () => {
  const newState = !filterActif5;

  if (!newState && !filterActif1) {
    setFilterActif1(true);
  }

  setFilterActif5(newState);
};

  
  const [showToolbar, setShowToolbar] = useState(true);

	const filteredPoints = allPoints.filter((p) => {
	  if (p.Actif === "Allemagne 40 Cash (1€)" && !filterActif1) return false;
	  if (p.Actif === "Allemagne 40 Cash (5€)" && !filterActif5) return false;
	  return true;
	});

useEffect(() => {
  const handleResize = () => {
    setShowToolbar(window.innerWidth > 768); // toolbar visible uniquement desktop
  };
  handleResize();          // appel initial
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
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
	setObjectifUtilise(objectif);

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
    const current = r.Calmar?? -Infinity;
    const bestVal = best.Calmar ?? -Infinity;
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
    (b.Calmar ?? -Infinity) > (a.Calmar ?? -Infinity) ? b : a
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
  
 // ==== Calcul dynamique de l'axe X (Gain) ====
// On prend en priorité le gain de l'objectif Performance
let maxGain = 0;

if (bestPerformance && typeof bestPerformance.Gain === "number") {
  maxGain = bestPerformance.Gain;
} else if (allPoints.length > 0) {
  maxGain = Math.max(...allPoints.map((p) => p.Gain));
}

// Si rien en base, on laisse zéro (le graphique ne s'affichera pas)
if (!Number.isFinite(maxGain) || maxGain < 0) {
  maxGain = 0;
}

// Définition du pas en fonction du gain max
let stepX = 1000;
if (maxGain < 5000) stepX = 500;
else if (maxGain < 12000) stepX = 1000;
else if (maxGain < 20000) stepX = 2000;
else if (maxGain < 30000) stepX = 3000;
else if (maxGain < 40000) stepX = 4000;
else if (maxGain < 50000) stepX = 5000;
else if (maxGain < 60000) stepX = 10000;
else stepX = 20000;

// Arrondi du max au pas supérieur
const roundedMaxGain = Math.ceil(maxGain / stepX) * stepX;

  
  return (
    <div className="app-root">
      <div className="app-gradient" />
      <div className="app-shell">
<header className="header-hero">
  <div style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }}>
    
    <div>
      <h1>Simulateur IntradayGraf 2026</h1>
      <h2>
        Basé sur les résultats du robot en backtest sur la période 2017 → 10/11/2025
      </h2>
    </div>


  </div>
</header>

          {/* Phrase de vigilance */}
			<p className="warning-banner">
			  ⚠️  Les performances passées ne préjugent pas des performances futures  ⚠️
			</p>
			
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
                  Perte maximale de capital supportée (€)
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

          {/* Résultats */}
          {result && (
            <section className="card card-results">
              <h2 className="card-title">📊 Paramétrage optimal constaté en backtest (2017 → 10/11/2025)</h2>
				<p className="context-text">
				  Objectif choisi : {" "}
				  {objectifUtilise && (
					objectifUtilise === "serenite"
					  ? "🧘‍♂️ Sérénité"
					  : "⚡ Performance"
				  )}
				  {" "}• Capital : <strong>{formatMoney(result.capital)}</strong> • Perte maximale de capital supportée : <strong>{formatMoney(result.ddMax)}</strong>
				</p>

              <div className="results-grid">
                {/* Section 1 : paramètres robot */}
                <div className="results-section-label">
                  🧩 Paramètres du backtest :
                </div>

                <div className="stat-card">
                  <div className="stat-label">Instrument</div>
                  <div className="stat-value">
                    <strong>{result.Actif ?? "–"}</strong>
                  </div>
                </div>

				<div className="stat-card">
				  <div className="stat-label">Risque par trade</div>
				  <div className="stat-value">
					<strong>{formatPercentRaw2(result.pRisque)}
					{` (soit ${Math.round(result.capital * (result.pRisque / 100))} €)`}</strong>
				  </div>
				</div>

                <div className="stat-card">
                  <div className="stat-label">
                    Capital max utilisé lors des ventes
                  </div>
                  <div className="stat-value">
                    <strong>{formatPercentNoDecFromFraction(result.pCapitalVente)}</strong>
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
                    {result.Calmar !== null && result.Calmar !== undefined
                      ? result.Calmar.toFixed(2).replace(".", ",")
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
		  

{/* === SECTION GRAPHIQUE === */}
{allPoints.length > 0 && result && (
  <section className="card card-charts">
    <h2 className="card-title">
      📊 Résultats des backtests (2017 → 10/11/2025)
    </h2>

    <p className="context-text">
      Chaque point du graphique représente le résultat d'un backtest utilisant une combinaison spécifique de paramètres <strong>pour un capital alloué de {formatMoney(result.capital)}</strong>.
      Sélectionnez un point sur le graphique pour consulter la combinaison de paramètres associée.
    </p>

    {/* === FILTRES ACTIFS === */}
 
<div className="filters-actifs" style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
<label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
<div
  className="switch"
  style={{ "--switch-color": "#64b5f6" }}   // bleu clair
>
  <input type="checkbox" checked={filterActif1} onChange={toggleActif1} />
  <span className="slider"></span>
</div>
	<span>Allemagne 40 Cash (1€)</span>
</label>


<label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
<div
  className="switch"
  style={{ "--switch-color": "#1565c0" }}   // bleu foncé
>
  <input type="checkbox" checked={filterActif5} onChange={toggleActif5} />
  <span className="slider"></span>
</div>
	<span>Allemagne 40 Cash (5€)</span>
</label>
</div>


    {/* === CHART === */}
	<div className="no-touch-zoom">
    <Chart
      type="scatter"
      height={500}
      series={[
        {
          name: "Toutes les stratégies",
          data: filteredPoints.map((p) => ({
            x: Math.round(p.Gain),       // Gain → axe horizontal
            y: p.Drawdown,               // Drawdown → axe vertical
            meta: p,
            fillColor: (() => {
              const actif = String(p.Actif || "").toLowerCase();
              if (actif.includes("1€")) return "#64b5f6";  // bleu clair
              if (actif.includes("5€")) return "#1565c0";  // bleu foncé
              return "#90caf9";
            })()
          })),
        },

        bestSerenite && {
          name: "🧘‍♂️ Sérénité",
          data: [{
            x: Math.round(bestSerenite.Gain),
            y: bestSerenite.Drawdown,
            meta: bestSerenite,
            fillColor: "#ff2d95",
            marker: { size: 16, strokeWidth: 2, strokeColor: "#c6006f" }
          }],
        },

        bestPerformance && {
          name: "⚡ Performance",
          data: [{
            x: Math.round(bestPerformance.Gain),
            y: bestPerformance.Drawdown,
            meta: bestPerformance,
            fillColor: "#ffab00",
            marker: { size: 16, strokeWidth: 2, strokeColor: "#ff8f00" }
          }],
        }
      ].filter(Boolean)}

      options={{
        chart: {
		  background: "#ffffff",
          zoom: { enabled: true },
          toolbar: {
            show: true,
            tools: {
              download: false,
			  zoom: false
            }
          }
        },
	  legend: {
		show: false   // 👈 on masque complètement la légende ApexCharts
		},

        colors: [], // indispensable pour activer fillColor par point

		xaxis: {
		  title: { text: "Gain (€)" ,
    style: {
      fontSize: "14px",    // 🔥 Taille du texte augmentée
      fontWeight: 600
    }
  },
		  min: 0,
		  max: roundedMaxGain,
		  tickAmount: Math.floor(roundedMaxGain / stepX),
		  labels: {
			formatter: (value) => formatNumber(Math.round(value))
		  }
		},

        yaxis: {
          title: { text: "Drawdown (€)" ,
    style: {
      fontSize: "14px",    // 🔥 Taille du texte augmentée
      fontWeight: 600
    }
  },
          tickAmount: 6,
          labels: {
            formatter: (v) => formatNumber(v),
          }
        },

        tooltip: {
          shared: false,
          intersect: true,
          custom: function({ seriesIndex, dataPointIndex, w }) {
            const p = w.config.series[seriesIndex].data[dataPointIndex].meta;
            if (!p) return "<div style='padding:5px'>Aucune donnée</div>";
            return `
              <div style="padding:10px; font-size:14px">
                <strong>${formatNumber(p.Gain)} € de gain</strong><br/>
                🏦 Capital : <b>${formatNumber(p.Capital)} €</b><br/>				
                📉 Drawdown : <b>${formatNumber(p.Drawdown)} €</b><br/>
                📈 Actif : <b>${p.Actif}</b><br/>
                🎯 Risque/trade : <b>${(p.pRisque ?? 0).toFixed(2)} %</b><br/>
                🔥 % capital ventes : <b>${Math.round((p.pCapitalVente ?? 0) * 100)} %</b>
              </div>
            `;
          }
        }
      }}
    />
	<div className="chart-legend">
	  <span className="legend-item legend-serenite">
		🧘‍♂️ Sérénité
	  </span>
	  <span className="legend-item legend-performance">
		⚡ Performance
	  </span>
	</div>
  </div>
  </section>
)}

		  
		  
		  {/* Bloc code robot */}
			{result && (
			  <section className="card card-results">
				<h2 className="card-title">🧾 Paramétrage du robot</h2>

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
SecurisationGain = 1      // 1= Securisation des gains actif 
CalendrierON = 1          // Filtre jours fériés + FED/BCE`}
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


        </main>
      </div>
    </div>
  );
}

export default App;
