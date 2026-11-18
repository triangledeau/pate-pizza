// Généré depuis cookexpert-bt (github.com/Julien-Deudon/cookexpert-bt), commit b935c7a.
// Licence MIT © 2026 Julien Deudon — voir LICENSE-cookexpert-bt. Ne pas modifier à la main.
const SERVICE_BALANCE = 65456;
const CARACTERISTIQUE_MESURES = 65458;
const CARACTERISTIQUE_COMMANDES = 65457;
const ENTETE = 172;
const REGLAGE = 204;
const POIDS_STABLE = 202;
function somme(octets) {
  let total = 0;
  for (let i = 2; i < 7; i++) total += octets[i];
  return total & 255;
}
function commande(type, d2, d3 = 0, d4 = 0, d5 = 0) {
  const octets = [ENTETE, type, d2, d3, d4, d5, REGLAGE, 0];
  octets[7] = somme(octets);
  return Uint8Array.from(octets);
}
const commandeTare = (type) => commande(type, 254, 20, 1);
const commandeUnite = (type, unite) => commande(type, 254, 6, unite);
const commandeGrammes = (type) => commandeUnite(type, 0);
const commandeVersion = (type) => commande(type, 247);
function lirePesee(octets) {
  if (octets.length !== 8 || octets[0] !== ENTETE) return null;
  const type = octets[1];
  if (type !== 4 && type !== 5 || somme(octets) !== octets[7]) return null;
  const etat = octets[6];
  if (etat === REGLAGE || octets[2] === 247 || octets[2] === 241) return null;
  const negatif = (octets[5] & 1) === 1;
  let valeur;
  let unite = 0;
  if (type === 5) {
    const brut = octets[2] << 16 | octets[3] << 8 | octets[4];
    unite = octets[5] >> 4;
    const decimales = octets[5] >> 1 & 7;
    valeur = brut / 10 ** decimales;
  } else {
    valeur = (octets[2] << 8 | octets[3]) / 10;
  }
  return { valeur: negatif ? -valeur : valeur, unite, stable: etat === POIDS_STABLE, type };
}
function nomUnite(unite) {
  return ["g", "ml", "lb", "oz", "kg", "fg", "ml", "ml", "fl oz", "fl oz", "lb"][unite] ?? "";
}
const UNITES_BALANCE = [0, 4, 2, 3];
function uniteSuivante(unite) {
  const rang = UNITES_BALANCE.indexOf(unite ?? -1);
  return UNITES_BALANCE[(rang + 1) % UNITES_BALANCE.length];
}
const GRAMMES_PAR_UNITE = { 0: 1, 4: 1e3, 2: 453.592, 10: 453.592, 3: 28.3495 };
function enGrammes(pesee) {
  const facteur = GRAMMES_PAR_UNITE[pesee.unite];
  return facteur === void 0 ? null : pesee.valeur * facteur;
}
function formaterPoids(grammes, unite) {
  const facteur = GRAMMES_PAR_UNITE[unite] ?? 1;
  const valeur = grammes / facteur;
  const decimales = unite === 0 ? Math.abs(valeur) >= 10 ? 0 : 1 : unite === 3 ? 2 : 3;
  return `${valeur.toLocaleString("fr-FR", { maximumFractionDigits: decimales })} ${nomUnite(unite)}`;
}
export {
  CARACTERISTIQUE_COMMANDES,
  CARACTERISTIQUE_MESURES,
  SERVICE_BALANCE,
  UNITES_BALANCE,
  commandeGrammes,
  commandeTare,
  commandeUnite,
  commandeVersion,
  enGrammes,
  formaterPoids,
  lirePesee,
  nomUnite,
  uniteSuivante
};
