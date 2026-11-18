// Généré depuis cookexpert-bt (github.com/Julien-Deudon/cookexpert-bt), commit b935c7a.
// Licence MIT © 2026 Julien Deudon — voir LICENSE-cookexpert-bt. Ne pas modifier à la main.
import { donneesExpert, formaterTemperature, formaterTemps, formaterVitesse, SANS_CHAUFFE } from './protocole.js';
const VITESSES_COOK_EXPERT = {
  cuillère: 1,
  "0": 0,
  "0.5": 2,
  "1": 3,
  "1.5": 3,
  "2": 3,
  "2.5": 5,
  "3": 7,
  "3.5": 10,
  "4": 12,
  "4.5": 13,
  "5": 14,
  "5.5": 15,
  "6": 15,
  "6.5": 16,
  "7": 16,
  "7.5": 17,
  "8": 17,
  "8.5": 18,
  "9": 18,
  "9.5": 18,
  "10": 18
};
const TEMPERATURE_VAROMA = 120;
const VITESSE_MAX_A_CHAUD = 15;
const ETAPE = /^(Mélanger|Cuire|Pulvériser|Chauffer|Rissoler|Remuer)\s+(?:(\d+)\s*min)?\s*(?:(\d+)\s*sec)?\s*(?:\/\s*(?:(\d+)\s*°C|(Varoma)))?\s*\/\s*vitesse\s+(\d+(?:[.,]5)?|cuillère|pétrin)\s*\.?\s*(.*)$/i;
const PROGRESSIF = /augmentez progressivement la vitesse jusqu'à (\d+(?:[.,]5)?)\.?/i;
function convertirEtape(instruction) {
  const morceaux = ETAPE.exec(instruction.trim());
  if (!morceaux) return null;
  const [, , minutes, secondes, celsius, varoma, vitesseTexte, suite] = morceaux;
  const tempsS = Number(minutes ?? 0) * 60 + Number(secondes ?? 0);
  const vitesseThermomix = vitesseTexte.toLowerCase().replace(",", ".");
  if (vitesseThermomix === "pétrin") {
    return {
      statut: "manuel",
      raison: `Pétrissage de ${formaterTemps(tempsS)} : sur le robot, lancez le programme Boulangerie › Pain et brioche.`
    };
  }
  const remarques = [];
  let temperature = SANS_CHAUFFE;
  if (varoma) {
    temperature = TEMPERATURE_VAROMA;
    remarques.push(`Varoma : vapeur à ${TEMPERATURE_VAROMA} °C, avec le panier vapeur du Cook Expert.`);
  } else if (celsius) {
    temperature = Number(celsius);
  }
  let vitesse = VITESSES_COOK_EXPERT[vitesseThermomix];
  if (vitesse === void 0) return { statut: "manuel", raison: `Vitesse Thermomix inconnue : ${vitesseTexte}.` };
  if (temperature > 60 && vitesse > VITESSE_MAX_A_CHAUD) {
    vitesse = VITESSE_MAX_A_CHAUD;
    remarques.push(`Vitesse ramenée à ${VITESSE_MAX_A_CHAUD} : le Cook Expert ne va pas plus vite au-dessus de 60 °C.`);
  }
  const progressif = PROGRESSIF.exec(suite);
  if (progressif) {
    const cible = VITESSES_COOK_EXPERT[progressif[1].replace(",", ".")];
    if (cible !== void 0) remarques.push(`Augmentez la vitesse à la main jusqu'à ${formaterVitesse(cible)}.`);
  }
  const reste = suite.replace(PROGRESSIF, "").trim();
  if (reste) remarques.push(reste);
  const reglage = { tempsS, temperature, vitesse, remarques };
  try {
    donneesExpert(reglage);
  } catch (erreur) {
    return { statut: "manuel", raison: erreur instanceof Error ? erreur.message : String(erreur) };
  }
  return { statut: "ok", reglage };
}
function decrireReglage(r) {
  return `Expert · ${formaterTemps(r.tempsS)} · ${formaterTemperature(r.temperature)} · vitesse ${formaterVitesse(r.vitesse)}`;
}
export {
  TEMPERATURE_VAROMA,
  VITESSES_COOK_EXPERT,
  VITESSE_MAX_A_CHAUD,
  convertirEtape,
  decrireReglage
};
