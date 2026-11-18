// Généré depuis cookexpert-bt (github.com/Julien-Deudon/cookexpert-bt), commit b935c7a.
// Licence MIT © 2026 Julien Deudon — voir LICENSE-cookexpert-bt. Ne pas modifier à la main.
const ENTETE_ENVOI = 165;
const ENTETE_RECEPTION = 90;
const Commande = {
  ok: 1,
  droite: 2,
  droiteBas: 3,
  gaucheBas: 4,
  gauche: 5,
  retour: 6,
  stop: 7,
  auto: 8,
  pulse: 9,
  pulseRelache: 10,
  majProgramme: 13,
  sauvegardes: 14,
  lireEtat: 15,
  envoyerEtat: 16,
  compteurs: 17,
  nomTelephone: 18,
  version: 19
};
const REPONSES_AVEC_DONNEES = /* @__PURE__ */ new Set([
  Commande.sauvegardes,
  Commande.lireEtat,
  Commande.compteurs,
  Commande.version
]);
const REPONSES_A_CODE = /* @__PURE__ */ new Set([Commande.envoyerEtat]);
const TABLE_CRC8 = Uint8Array.from({ length: 256 }, (_, i) => i & 1 ? 255 - (i >> 1) : i >> 1);
function crc8(octets) {
  let crc = 0;
  for (const octet of octets) crc = TABLE_CRC8[(crc ^ octet) & 255];
  return crc;
}
function trame(commande, donnees = []) {
  const debut = donnees.length === 0 ? [ENTETE_ENVOI, commande] : [ENTETE_ENVOI, commande, donnees.length + 4, ...donnees];
  return Uint8Array.from([...debut, crc8(debut)]);
}
function trameNomTelephone(nom) {
  return trame(Commande.nomTelephone, [...new TextEncoder().encode(nom)]);
}
function decouperTrames(flux) {
  const trames = [];
  let i = 0;
  lecture: while (i < flux.length) {
    if (flux[i] !== ENTETE_RECEPTION) {
      i++;
      continue;
    }
    if (i + 3 > flux.length) break;
    const commande = flux[i + 1];
    const annoncee = flux[i + 2];
    const aCode = REPONSES_A_CODE.has(commande);
    const longueurs = REPONSES_AVEC_DONNEES.has(commande) ? [annoncee] : aCode ? [4] : [3, annoncee];
    for (const longueur of longueurs) {
      if (longueur < 3 || longueur > 64) continue;
      if (i + longueur > flux.length) break lecture;
      const brut = flux.slice(i, i + longueur);
      if (crc8(brut.slice(0, -1)) === brut[longueur - 1]) {
        trames.push({ commande, donnees: brut.slice(aCode ? 2 : 3, -1) });
        i += longueur;
        continue lecture;
      }
    }
    i++;
  }
  return { trames, reste: flux.slice(i) };
}
const EtatMachine = {
  securiteEnfants: 0,
  menu: 1,
  sousMenu: 2,
  pret: 3,
  enMarche: 4,
  pause: 5,
  arret: 6,
  defaut: 7
};
const Mode = {
  reglages: 0,
  recettes: 1,
  nettoyage: 2,
  expert: 3,
  cuisson: 4,
  blender: 5,
  boulangerie: 6,
  robot: 7,
  cocotte: 8
};
const SANS_OBJET = 255;
const SANS_CHAUFFE = 29;
const NOMS_ETATS = ["sécurité enfants", "menu principal", "sous-menu", "prêt", "en marche", "pause", "arrêt", "défaut"];
const NOMS_MODES = ["Réglages", "Recettes", "Nettoyage", "Expert", "Cuisson", "Blender", "Boulangerie", "Robot", "Cocotte"];
const NOMS_SOUS_PROGRAMMES = {
  [Mode.nettoyage]: ["Éco", "Normal", "Intensif"],
  [Mode.cuisson]: ["Vapeur", "Soupe veloutée", "Soupe moulinée", "Mijotage", "Rissolage", "Vapeur XXL"],
  [Mode.blender]: ["Smoothie", "Glace pilée", "Dessert glacé"],
  [Mode.boulangerie]: ["Blancs en neige", "Pâtisserie", "Pain et brioche", "Pain et brioche XXL", "Crêpes", "Pizza", "Chocolat"],
  [Mode.cocotte]: ["Rissoler", "Mijoter", "Maintien au chaud"]
};
const DEFAUTS = [
  [1, "couvercle à fermer"],
  [2, "manque d'eau"],
  [4, "moteur en surcharge"],
  [8, "bol à changer"],
  [16, "chauffe en défaut"],
  [32, "sonde de température en court-circuit"],
  [64, "sonde de température coupée"]
];
function lireEtat(donnees) {
  const [
    etat = SANS_OBJET,
    mode = SANS_OBJET,
    sousProgramme = SANS_OBJET,
    tempsHaut = SANS_OBJET,
    tempsBas = SANS_OBJET,
    vitesse = SANS_OBJET,
    temperature = SANS_OBJET
  ] = donnees;
  const temps = tempsHaut << 8 | tempsBas;
  const bitsDefauts = donnees[10] ?? SANS_OBJET;
  return {
    etat,
    mode,
    sousProgramme,
    tempsS: temps === 65535 ? null : temps,
    vitesse: vitesse === SANS_OBJET ? null : vitesse,
    temperature: temperature === SANS_OBJET ? null : temperature,
    defauts: bitsDefauts === SANS_OBJET ? [] : DEFAUTS.filter(([bit]) => bitsDefauts & bit).map(([, nom]) => nom),
    brut: [...donnees]
  };
}
function formaterTemps(secondes) {
  const deux = (n) => String(n).padStart(2, "0");
  const h = Math.floor(secondes / 3600);
  const min = Math.floor(secondes % 3600 / 60);
  const s = secondes % 60;
  return h > 0 ? `${h}:${deux(min)}:${deux(s)}` : `${min}:${deux(s)}`;
}
function formaterVitesse(vitesse) {
  return vitesse === 1 || vitesse === 2 ? `${vitesse}A` : String(vitesse);
}
function formaterTemperature(temperature) {
  return temperature === SANS_CHAUFFE ? "sans chauffe" : `${temperature} °C`;
}
function decrireEtat(e) {
  const morceaux = [NOMS_ETATS[e.etat] ?? `état ${e.etat}`];
  if (e.mode !== SANS_OBJET) morceaux.push(NOMS_MODES[e.mode] ?? `mode ${e.mode}`);
  const sousProgramme = NOMS_SOUS_PROGRAMMES[e.mode]?.[e.sousProgramme];
  if (sousProgramme) morceaux.push(sousProgramme);
  if (e.tempsS !== null) morceaux.push(formaterTemps(e.tempsS));
  if (e.temperature !== null) morceaux.push(formaterTemperature(e.temperature));
  if (e.vitesse !== null) morceaux.push(`vitesse ${formaterVitesse(e.vitesse)}`);
  if (e.defauts.length > 0) morceaux.push(`⚠ ${e.defauts.join(", ")}`);
  return morceaux.join(" · ");
}
function donneesExpert(p) {
  const { tempsS, temperature, vitesse, etat = EtatMachine.pret, sousProgramme = 0 } = p;
  verifierEntier("temps (s)", tempsS, 0, 14400);
  verifierEntier("vitesse", vitesse, 0, 18);
  verifierEntier("température", temperature, SANS_CHAUFFE, 140);
  if (temperature > 120 && tempsS >= 7200) {
    throw new RangeError("Au-dessus de 120 °C, l'appli Magimix limite la durée à moins de 2 h.");
  }
  return [etat, Mode.expert, sousProgramme, tempsS >> 8, tempsS & 255, vitesse, temperature, 0];
}
function verifierEntier(nom, valeur, min, max) {
  if (!Number.isInteger(valeur) || valeur < min || valeur > max) {
    throw new RangeError(`${nom} hors limites : ${valeur} (attendu de ${min} à ${max})`);
  }
}
function enHexa(octets) {
  return [...octets].map((o) => o.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}
export {
  Commande,
  ENTETE_ENVOI,
  ENTETE_RECEPTION,
  EtatMachine,
  Mode,
  SANS_CHAUFFE,
  SANS_OBJET,
  crc8,
  decouperTrames,
  decrireEtat,
  donneesExpert,
  enHexa,
  formaterTemperature,
  formaterTemps,
  formaterVitesse,
  lireEtat,
  trame,
  trameNomTelephone
};
