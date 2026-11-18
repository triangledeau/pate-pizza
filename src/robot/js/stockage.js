// Favoris et recettes, enregistrés sur le téléphone (localStorage), avec export/import JSON.
const CLE = 'cookexpert-app/v1';

const EXEMPLE = {
  favoris: [
    { id: 'f1', nom: 'Hacher', tempsS: 10, temperature: 29, vitesse: 13 },
    { id: 'f2', nom: 'Rissoler', tempsS: 300, temperature: 130, vitesse: 1 },
    { id: 'f3', nom: 'Mijoter', tempsS: 1200, temperature: 95, vitesse: 1 },
  ],
  recettes: [
    {
      id: 'r1',
      titre: 'Velouté de potimarron (exemple)',
      etapes: [
        { type: 'pesee', ingredient: 'Oignon en quartiers', grammes: 100 },
        { type: 'programme', tempsS: 10, temperature: 29, vitesse: 13, texte: 'Hacher l’oignon.' },
        { type: 'pesee', ingredient: 'Beurre', grammes: 20 },
        { type: 'programme', tempsS: 180, temperature: 120, vitesse: 1, texte: 'Faire revenir.' },
        { type: 'pesee', ingredient: 'Potimarron en morceaux', grammes: 600 },
        { type: 'pesee', ingredient: 'Eau', grammes: 700 },
        { type: 'texte', texte: 'Ajouter un cube de bouillon, sel et poivre.' },
        { type: 'programme', tempsS: 1800, temperature: 100, vitesse: 3, texte: 'Cuire.' },
        { type: 'programme', tempsS: 60, temperature: 29, vitesse: 13, texte: 'Mixer. Couvercle bien fermé, le liquide est brûlant.' },
      ],
    },
  ],
};

let donnees = charger();

function charger() {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) return valider(JSON.parse(brut));
  } catch {}
  return structuredClone(EXEMPLE);
}

function valider(d) {
  if (!d || !Array.isArray(d.favoris) || !Array.isArray(d.recettes)) throw new Error('fichier non reconnu');
  return { favoris: d.favoris, recettes: d.recettes };
}

function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(donnees));
  } catch {}
}

export const nouvelId = () => Math.random().toString(36).slice(2, 10);

export const favoris = () => donnees.favoris;
export const recettes = () => donnees.recettes;
export const recette = (id) => donnees.recettes.find((r) => r.id === id);

export function enregistrerFavori(f) {
  donnees.favoris.push({ ...f, id: nouvelId() });
  sauver();
}

export function supprimerFavori(id) {
  donnees.favoris = donnees.favoris.filter((f) => f.id !== id);
  sauver();
}

export function enregistrerRecette(r) {
  const i = donnees.recettes.findIndex((x) => x.id === r.id);
  if (i >= 0) donnees.recettes[i] = r;
  else donnees.recettes.push(r);
  sauver();
}

export function supprimerRecette(id) {
  donnees.recettes = donnees.recettes.filter((r) => r.id !== id);
  sauver();
}

export function exporter() {
  return JSON.stringify({ format: 'cookexpert-app', version: 1, ...donnees }, null, 2);
}

/** Ajoute les favoris et recettes d'un export (sans écraser l'existant). */
export function importer(texte) {
  const d = valider(JSON.parse(texte));
  const ids = new Set([...donnees.favoris, ...donnees.recettes].map((x) => x.id));
  const neuf = (x) => (ids.has(x.id) ? { ...x, id: nouvelId() } : x);
  donnees.favoris.push(...d.favoris.map(neuf));
  donnees.recettes.push(...d.recettes.map(neuf));
  sauver();
  return { favoris: d.favoris.length, recettes: d.recettes.length };
}
