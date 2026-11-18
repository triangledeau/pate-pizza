import { donneesExpert, formaterTemps, formaterVitesse, SANS_CHAUFFE } from '../lib/protocole.js';
import { convertirEtape } from '../lib/conversion.js';
import { formaterPoids, uniteSuivante, nomUnite } from '../lib/balance.js';
import { Robot } from './robot.js';
import { Balance } from './balance.js';
import * as stock from './stockage.js';
import { VERSION } from './version.js';

const $ = (sel, racine = document) => racine.querySelector(sel);
const $$ = (sel, racine = document) => [...racine.querySelectorAll(sel)];
const esc = (t) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const robot = new Robot();
const balance = new Balance();

const NOMS_ETATS = ['Sécurité enfants', 'Menu principal', 'Sous-menu', 'Prêt', 'En marche', 'En pause', 'Arrêté', 'Défaut'];
const NOMS_MODES = ['Réglages', 'Recettes', 'Nettoyage', 'Expert', 'Cuisson', 'Blender', 'Boulangerie', 'Robot', 'Cocotte'];
const EN_COURS = new Set([4, 5]);
/** Notice du Cook Expert : vitesse 15 au plus au-dessus de 60 °C. */
const VITESSE_MAX_A_CHAUD = 15;

// ---------- Outils d'interface ----------

let minuteurToast;
function toast(texte) {
  const el = $('#toast');
  el.textContent = texte;
  el.classList.add('visible');
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => el.classList.remove('visible'), 3000);
}

const vibrer = (motif) => navigator.vibrate?.(motif);

async function tenter(action) {
  try {
    return await action();
  } catch (erreur) {
    if (erreur?.name === 'NotFoundError') return; // sélecteur fermé sans choix
    toast(erreur.message ?? String(erreur));
    journal(`✗ ${erreur.message ?? erreur}`);
  }
}

const lignesJournal = [];
function rendreJournal() {
  $('#journal').innerHTML = lignesJournal.map((l) => `<li>${esc(l)}</li>`).join('') || '<li>Rien pour l\u2019instant</li>';
}
function journal(texte) {
  lignesJournal.unshift(`${new Date().toLocaleTimeString('fr-FR')}  ${texte}`);
  lignesJournal.length = Math.min(lignesJournal.length, 200);
  if (!$('#vue-plus').hidden) rendreJournal();
}

const resume = (p) =>
  `${formaterTemps(p.tempsS)} · ${p.temperature === SANS_CHAUFFE ? 'sans chauffe' : `${p.temperature} °C`} · vitesse ${formaterVitesse(p.vitesse)}`;

/** Vérifie un réglage ; renvoie un message d'erreur ou null. */
function verifier(p) {
  try {
    donneesExpert(p);
  } catch (e) {
    return e.message;
  }
  if (p.temperature > 60 && p.vitesse > VITESSE_MAX_A_CHAUD) {
    return `Au-dessus de 60 °C, la vitesse est limitée à ${VITESSE_MAX_A_CHAUD} (notice du robot).`;
  }
  return null;
}

// ---------- Composant de réglage (durée, température, vitesse) ----------

function rendreReglage(conteneur, p) {
  conteneur.innerHTML = `
    <div class="champ">
      <div class="etiquette">Durée</div>
      <div class="duree">
        <input type="number" inputmode="numeric" name="min" min="0" max="240" value="${Math.floor(p.tempsS / 60)}" aria-label="minutes"> min
        <input type="number" inputmode="numeric" name="s" min="0" max="59" value="${p.tempsS % 60}" aria-label="secondes"> s
      </div>
      <div class="puces">${[[10, '10 s'], [30, '30 s'], [60, '1 min'], [300, '5 min'], [600, '10 min'], [1200, '20 min']]
        .map(([s, t]) => `<button type="button" class="puce" data-temps="${s}">${t}</button>`).join('')}</div>
    </div>
    <div class="champ">
      <div class="etiquette">Température <output name="temp-aff"></output></div>
      <input type="range" name="temp" min="${SANS_CHAUFFE}" max="140" step="1" value="${p.temperature}">
      <div class="puces">${[[SANS_CHAUFFE, 'sans'], [50, '50'], [80, '80'], [95, '95'], [100, '100'], [120, '120'], [130, '130']]
        .map(([v, t]) => `<button type="button" class="puce" data-temp="${v}">${t}${v === SANS_CHAUFFE ? '' : ' °C'}</button>`).join('')}</div>
    </div>
    <div class="champ">
      <div class="etiquette">Vitesse <output name="vit-aff"></output></div>
      <input type="range" name="vit" min="0" max="18" step="1" value="${p.vitesse}">
      <div class="discret">1A et 2A : brassage intermittent · 3 à 5 : mélanger · 12 à 18 : hacher, mixer</div>
    </div>`;
  const maj = () => {
    const t = Number($('[name=temp]', conteneur).value);
    $('[name=temp-aff]', conteneur).textContent = t === SANS_CHAUFFE ? 'sans chauffe' : `${t} °C`;
    $('[name=vit-aff]', conteneur).textContent = formaterVitesse(Number($('[name=vit]', conteneur).value));
  };
  conteneur.oninput = maj;
  conteneur.onclick = (e) => {
    const b = e.target.closest('.puce');
    if (!b) return;
    if (b.dataset.temps) {
      $('[name=min]', conteneur).value = Math.floor(b.dataset.temps / 60);
      $('[name=s]', conteneur).value = b.dataset.temps % 60;
    }
    if (b.dataset.temp) $('[name=temp]', conteneur).value = b.dataset.temp;
    maj();
  };
  maj();
}

function lireReglage(conteneur) {
  const n = (nom) => Math.round(Number($(`[name=${nom}]`, conteneur).value) || 0);
  return { tempsS: n('min') * 60 + n('s'), temperature: n('temp'), vitesse: n('vit') };
}

// ---------- Onglets ----------

function afficherVue(nom) {
  for (const v of $$('.vue')) v.hidden = v.id !== `vue-${nom}`;
  for (const b of $$('.onglets button')) b.classList.toggle('actif', b.dataset.vue === nom);
  if (nom === 'plus') rendreJournal();
  window.scrollTo(0, 0);
}
for (const b of $$('.onglets button')) b.addEventListener('click', () => afficherVue(b.dataset.vue));

// ---------- Connexions ----------

function majPastilles() {
  const pr = $('#pastille-robot');
  pr.classList.toggle('actif', robot.connecte);
  pr.title = robot.connecte ? 'Robot connecté' : 'Connecter le robot';
  const pb = $('#pastille-balance');
  pb.classList.toggle('actif', balance.connectee);
  pb.title = balance.connectee ? 'Balance connectée' : 'Connecter la balance';
}

$('#pastille-robot').addEventListener('click', () =>
  tenter(async () => {
    if (robot.connecte) {
      if (confirm('Déconnecter le robot ?')) await robot.deconnecter();
      return;
    }
    $('#pastille-robot').classList.add('attente');
    try {
      await robot.connecter();
    } finally {
      $('#pastille-robot').classList.remove('attente');
    }
  }),
);
$('#pastille-balance').addEventListener('click', () =>
  tenter(async () => {
    if (balance.connectee) {
      if (confirm('Déconnecter la balance ?')) balance.deconnecter();
      return;
    }
    await connecterBalance();
  }),
);

async function connecterBalance() {
  robot.suspendre(true);
  $('#pastille-balance').classList.add('attente');
  toast('Connexion de la balance…');
  try {
    await balance.connecter();
  } finally {
    robot.suspendre(false);
    $('#pastille-balance').classList.remove('attente');
  }
}

robot.addEventListener('connexion', () => {
  majPastilles();
  majEtat(null);
});
balance.addEventListener('connexion', () => {
  majPastilles();
  majPoids();
});
robot.addEventListener('journal', (e) => journal(e.detail));
balance.addEventListener('journal', (e) => journal(e.detail));

// ---------- Piloter ----------

const conteneurReglage = $('#reglage-piloter');
rendreReglage(conteneurReglage, { tempsS: 300, temperature: 100, vitesse: 3 });

let etatPrecedent = null;
function majEtat(etat) {
  if (!robot.connecte) {
    $('#etat-titre').textContent = 'Robot non connecté';
    $('#etat-temps').textContent = '--:--';
    $('#etat-temp').textContent = '';
    $('#etat-vit').textContent = '';
    $('#etat-defauts').textContent = '';
    $('#bandeau-auto').hidden = true;
    $('#carte-etat').classList.remove('chaude', 'eteinte');
    $('#carte-etat').classList.add('eteinte');
    return;
  }
  if (!etat) return;
  $('#carte-etat').classList.remove('eteinte');
  $('#carte-etat').classList.toggle('chaude', EN_COURS.has(etat.etat));
  const mode = NOMS_MODES[etat.mode];
  $('#etat-titre').textContent = [NOMS_ETATS[etat.etat] ?? `État ${etat.etat}`, mode].filter(Boolean).join(' · ');
  $('#etat-temps').textContent = etat.tempsS === null ? '—' : formaterTemps(etat.tempsS);
  $('#etat-temp').textContent =
    etat.temperature === null ? '' : etat.temperature === SANS_CHAUFFE ? 'sans chauffe' : `${etat.temperature} °C`;
  $('#etat-vit').textContent = etat.vitesse === null ? '' : `vitesse ${formaterVitesse(etat.vitesse)}`;
  $('#etat-defauts').textContent = etat.defauts.length ? `⚠ ${etat.defauts.join(', ')}` : '';
  if (etat.etat !== 3) $('#bandeau-auto').hidden = true;
}

robot.addEventListener('etat', (e) => {
  const etat = e.detail;
  majEtat(etat);
  const avant = etatPrecedent;
  etatPrecedent = etat.etat;
  if (avant !== null && EN_COURS.has(avant) && !EN_COURS.has(etat.etat)) finProgramme();
  guide.surEtat?.(etat);
});

function finProgramme() {
  vibrer([300, 150, 300, 150, 300]);
  toast('Programme terminé');
  journal('programme terminé');
  if (document.hidden) window.Natif?.notifier('Cook Expert', 'Programme terminé : le robot attend la suite.');
}

$('#btn-envoyer').addEventListener('click', () =>
  tenter(async () => {
    const p = lireReglage(conteneurReglage);
    const erreur = verifier(p);
    $('#erreur-piloter').hidden = !erreur;
    $('#erreur-piloter').textContent = erreur ?? '';
    if (erreur) return;
    if (!robot.connecte) await robot.connecter();
    const code = await robot.envoyerProgramme(p);
    if (code === 0) {
      $('#bandeau-auto').hidden = false;
      vibrer(200);
    } else toast(`Programme refusé par le robot (code ${code})`);
  }),
);

$('#btn-favori').addEventListener('click', () => {
  const p = lireReglage(conteneurReglage);
  const erreur = verifier(p);
  if (erreur) return toast(erreur);
  const nom = prompt('Nom du favori', '');
  if (!nom) return;
  stock.enregistrerFavori({ nom: nom.trim(), ...p });
  rendreFavoris();
  toast('Favori enregistré');
});

function rendreFavoris() {
  const f = stock.favoris();
  $('#liste-favoris').innerHTML = f.length
    ? f
        .map(
          (x) => `<li data-id="${esc(x.id)}">
        <div class="infos"><div class="nom">${esc(x.nom)}</div><div class="discret">${esc(resume(x))}</div></div>
        <button class="btn-icone" data-action="suppr" type="button" aria-label="Supprimer">✕</button>
        <button class="btn petit" data-action="charger" type="button">Charger</button>
        <button class="btn petit principal" data-action="envoyer" type="button">Envoyer</button>
      </li>`,
        )
        .join('')
    : '<li class="vide">Aucun favori</li>';
}

$('#liste-favoris').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  const f = stock.favoris().find((x) => x.id === b.closest('li').dataset.id);
  if (!f) return;
  if (b.dataset.action === 'suppr') {
    if (confirm(`Supprimer « ${f.nom} » ?`)) {
      stock.supprimerFavori(f.id);
      rendreFavoris();
    }
    return;
  }
  rendreReglage(conteneurReglage, f);
  if (b.dataset.action === 'envoyer') $('#btn-envoyer').click();
  else toast(`« ${f.nom} » chargé`);
});

for (const b of $$('[data-touche]')) {
  b.addEventListener('click', () =>
    tenter(async () => {
      if (b.dataset.touche === 'stop') vibrer(80);
      await robot.touche(b.dataset.touche);
    }),
  );
}

// ---------- Balance ----------

let uniteAffichee = 0;
function majPoids() {
  const ok = balance.connectee && balance.grammes !== null;
  $('#poids').textContent = ok ? formaterPoids(balance.grammes, uniteAffichee) : '—';
  $('#poids-info').textContent = !balance.connectee
    ? 'Balance non connectée'
    : balance.grammes === null
      ? 'En attente de mesure…'
      : balance.stable
        ? 'Poids stable'
        : 'Pesée en cours…';
  $('#btn-unite').textContent = `Unité : ${nomUnite(uniteAffichee)}`;
}
balance.addEventListener('pesee', () => {
  majPoids();
  guide.surPesee?.();
});
$('#btn-tare').addEventListener('click', () => tenter(() => balance.tare()));
$('#btn-unite').addEventListener('click', () =>
  tenter(async () => {
    uniteAffichee = uniteSuivante(uniteAffichee);
    majPoids();
    if (balance.connectee) await balance.unite(uniteAffichee);
  }),
);

// ---------- Écran plein (éditeur et mode guidé) ----------

let fermerEcranActuel = null;
function ouvrirEcran(html, surFermeture) {
  // Élément neuf à chaque ouverture : les écouteurs de l'écran précédent disparaissent avec l'ancien.
  // (Sinon ils s'accumulaient : étapes sautées en double, programmes et tares envoyés deux fois.)
  const ancien = $('#ecran');
  const el = ancien.cloneNode(false);
  ancien.replaceWith(el);
  el.innerHTML = html;
  el.hidden = false;
  el.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  fermerEcranActuel = surFermeture;
  history.pushState({ ecran: true }, '');
  return el;
}
function fermerEcran(viaHistorique = false) {
  if ($('#ecran').hidden) return;
  $('#ecran').hidden = true;
  $('#ecran').innerHTML = '';
  document.body.style.overflow = '';
  const f = fermerEcranActuel;
  fermerEcranActuel = null;
  f?.();
  if (!viaHistorique) history.back();
}
window.addEventListener('popstate', () => fermerEcran(true));

// ---------- Recettes : liste ----------

function rendreRecettes() {
  const r = stock.recettes();
  $('#liste-recettes').innerHTML = r.length
    ? r
        .map(
          (x) => `<li data-id="${esc(x.id)}">
        <div class="infos"><div class="nom">${esc(x.titre)}</div><div class="discret">${x.etapes.length} étape${x.etapes.length > 1 ? 's' : ''}</div></div>
        <button class="btn petit" data-action="modifier" type="button">Modifier</button>
        <button class="btn petit principal" data-action="cuisiner" type="button">Cuisiner</button>
      </li>`,
        )
        .join('')
    : '<li class="vide">Aucune recette</li>';
}

$('#liste-recettes').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  const r = stock.recette(b.closest('li').dataset.id);
  if (!r) return;
  if (b.dataset.action === 'modifier') ouvrirEditeur(r);
  else ouvrirGuide(r);
});
$('#btn-nouvelle-recette').addEventListener('click', () =>
  ouvrirEditeur({ id: stock.nouvelId(), titre: '', etapes: [] }, true),
);

// ---------- Recettes : éditeur ----------

const TYPES = { pesee: 'Pesée', programme: 'Programme', texte: 'Instruction' };

function ouvrirEditeur(recette, nouvelle = false) {
  const brouillon = structuredClone(recette);
  const el = ouvrirEcran(`
    <div class="ecran-tete">
      <button class="btn-icone" data-action="fermer" type="button" aria-label="Fermer">✕</button>
      <h2>${nouvelle ? 'Nouvelle recette' : 'Modifier la recette'}</h2>
      ${nouvelle ? '' : '<button class="btn petit" data-action="supprimer" type="button">Supprimer</button>'}
    </div>
    <div class="ecran-corps">
      <div class="carte"><label class="discret">Titre<input type="text" name="titre" style="width:100%;margin-top:4px" value="${esc(brouillon.titre)}" placeholder="Ex. Risotto aux champignons"></label></div>
      <div id="etapes"></div>
      <div class="carte">
        <h2>Ajouter une étape</h2>
        <div class="rangee" style="margin-bottom:8px">
          <button class="btn" data-ajout="pesee" type="button">+ Pesée</button>
          <button class="btn" data-ajout="programme" type="button">+ Programme</button>
          <button class="btn" data-ajout="texte" type="button">+ Instruction</button>
        </div>
        <details>
          <summary class="discret">Coller des étapes (notation Thermomix, une par ligne)</summary>
          <textarea name="coller" placeholder="Cuire 25 min/100°C/vitesse 1.&#10;Mixer 1 min/vitesse 10."></textarea>
          <button class="btn plein" data-action="coller" type="button">Convertir et ajouter</button>
        </details>
      </div>
    </div>
    <div class="ecran-pied">
      <button class="btn" data-action="fermer" type="button">Annuler</button>
      <button class="btn principal" data-action="enregistrer" type="button">Enregistrer</button>
    </div>`);

  const rendreEtapes = () => {
    $('#etapes', el).innerHTML = brouillon.etapes
      .map((et, i) => {
        let champs = '';
        if (et.type === 'pesee') {
          champs = `<label>Ingrédient<input type="text" data-champ="ingredient" value="${esc(et.ingredient)}"></label>
            <label>Quantité (g)<input type="number" inputmode="numeric" min="1" data-champ="grammes" value="${esc(et.grammes)}"></label>`;
        } else if (et.type === 'programme') {
          const vitesses = Array.from({ length: 19 }, (_, v) => `<option value="${v}" ${v === et.vitesse ? 'selected' : ''}>${formaterVitesse(v)}</option>`).join('');
          champs = `<div class="trois">
              <label>Min<input type="number" inputmode="numeric" min="0" data-champ="min" value="${Math.floor(et.tempsS / 60)}"></label>
              <label>Sec<input type="number" inputmode="numeric" min="0" max="59" data-champ="s" value="${et.tempsS % 60}"></label>
              <label>°C<input type="number" inputmode="numeric" min="${SANS_CHAUFFE}" max="140" data-champ="temperature" value="${et.temperature}"></label>
              <label>Vitesse<select data-champ="vitesse">${vitesses}</select></label>
            </div>
            <p class="discret" style="margin:6px 0">${SANS_CHAUFFE} °C = sans chauffe</p>
            <p class="erreur" data-erreur ${verifier(et) ? '' : 'hidden'}>${esc(verifier(et) ?? '')}</p>
            <label>Consigne (facultatif)<input type="text" data-champ="texte" value="${esc(et.texte)}"></label>`;
        } else {
          champs = `<label>Instruction<textarea data-champ="texte">${esc(et.texte)}</textarea></label>`;
        }
        return `<div class="carte etape" data-i="${i}">
          <div class="etape-tete">
            <span class="type">${i + 1}. ${TYPES[et.type]}</span>
            <button class="btn-icone" data-action="monter" type="button" aria-label="Monter" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn-icone" data-action="descendre" type="button" aria-label="Descendre" ${i === brouillon.etapes.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="btn-icone" data-action="retirer" type="button" aria-label="Retirer">✕</button>
          </div>${champs}</div>`;
      })
      .join('') || '<div class="carte vide">Aucune étape pour l’instant</div>';
  };
  rendreEtapes();

  el.addEventListener('input', (e) => {
    const champ = e.target.dataset.champ;
    if (e.target.name === 'titre') brouillon.titre = e.target.value;
    if (!champ) return;
    const bloc = e.target.closest('.etape');
    const et = brouillon.etapes[Number(bloc.dataset.i)];
    const v = e.target.value;
    if (champ === 'min' || champ === 's') {
      const min = Number($('[data-champ=min]', bloc).value) || 0;
      const s = Number($('[data-champ=s]', bloc).value) || 0;
      et.tempsS = Math.round(min * 60 + s);
    } else if (['grammes', 'temperature', 'vitesse'].includes(champ)) et[champ] = Math.round(Number(v) || 0);
    else et[champ] = v;
    if (et.type === 'programme') {
      const err = verifier(et);
      const p = $('[data-erreur]', bloc);
      p.hidden = !err;
      p.textContent = err ?? '';
    }
  });

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ajout) {
      const neuf = {
        pesee: { type: 'pesee', ingredient: '', grammes: 100 },
        programme: { type: 'programme', tempsS: 300, temperature: 100, vitesse: 3, texte: '' },
        texte: { type: 'texte', texte: '' },
      }[b.dataset.ajout];
      brouillon.etapes.push(neuf);
      rendreEtapes();
      $(`.etape[data-i="${brouillon.etapes.length - 1}"]`, el)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const action = b.dataset.action;
    const i = Number(b.closest('.etape')?.dataset.i);
    const e2 = brouillon.etapes;
    if (action === 'monter') [e2[i - 1], e2[i]] = [e2[i], e2[i - 1]];
    else if (action === 'descendre') [e2[i + 1], e2[i]] = [e2[i], e2[i + 1]];
    else if (action === 'retirer') e2.splice(i, 1);
    else if (action === 'coller') {
      const lignes = $('[name=coller]', el).value.split('\n').map((l) => l.trim()).filter(Boolean);
      let auto = 0;
      for (const l of lignes) {
        const c = convertirEtape(l);
        if (c?.statut === 'ok') {
          const { tempsS, temperature, vitesse, remarques } = c.reglage;
          e2.push({ type: 'programme', tempsS, temperature, vitesse, texte: remarques.join(' ') });
          auto++;
        } else e2.push({ type: 'texte', texte: c?.statut === 'manuel' ? c.raison : l });
      }
      $('[name=coller]', el).value = '';
      toast(`${lignes.length} étape(s) ajoutée(s), dont ${auto} programme(s)`);
    } else if (action === 'enregistrer') {
      brouillon.titre = brouillon.titre.trim() || 'Sans titre';
      const fautive = brouillon.etapes.findIndex((et) => et.type === 'programme' && verifier(et));
      if (fautive >= 0) return toast(`Étape ${fautive + 1} : ${verifier(brouillon.etapes[fautive])}`);
      stock.enregistrerRecette(brouillon);
      rendreRecettes();
      fermerEcran();
      toast('Recette enregistrée');
      return;
    } else if (action === 'supprimer') {
      if (!confirm(`Supprimer « ${recette.titre} » ?`)) return;
      stock.supprimerRecette(recette.id);
      rendreRecettes();
      fermerEcran();
      return;
    } else if (action === 'fermer') return fermerEcran();
    else return;
    rendreEtapes();
  });
}

// ---------- Recettes : mode guidé ----------

const guide = { surEtat: null, surPesee: null };
let verrouEcran = null;

async function garderEcranAllume() {
  try {
    await window.Natif?.garderAllume(true);
    verrouEcran = true;
  } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && guide.surEtat) garderEcranAllume();
});

function ouvrirGuide(recette) {
  if (!recette.etapes.length) return toast('Cette recette n’a pas d’étape');
  let i = 0;
  let suivi = null; // programme : 'envoi' | 'pret' | 'encours' | 'termine' | 'erreur'
  let atteint = false;
  const abandon = new AbortController();

  const el = ouvrirEcran(
    `<div class="ecran-tete">
      <button class="btn-icone" data-action="fermer" type="button" aria-label="Fermer">✕</button>
      <h2>${esc(recette.titre)}</h2>
      <span class="discret chiffres" id="g-compteur"></span>
    </div>
    <div class="ecran-corps"><div class="progression"><div id="g-barre"></div></div><div id="g-etape"></div></div>
    <div class="ecran-pied">
      <button class="btn" data-action="prec" type="button">◀ Précédent</button>
      <button class="btn principal" data-action="suiv" type="button">Suivant ▶</button>
    </div>`,
    () => {
      abandon.abort();
      guide.surEtat = null;
      guide.surPesee = null;
      window.Natif?.garderAllume(false);
      verrouEcran = null;
    },
  );
  garderEcranAllume();

  const etape = () => recette.etapes[i];

  const zoneDynamique = () => {
    const et = etape();
    if (et.type === 'pesee') {
      if (!balance.connectee) return `<button class="btn plein" data-action="balance" type="button">Connecter la balance</button>`;
      const g = balance.grammes ?? 0;
      const ratio = Math.max(0, Math.min(1, g / et.grammes));
      return `<div class="carte">
          <div class="poids-grand chiffres">${esc(formaterPoids(g, 0))}</div>
          <div class="jauge ${atteint ? 'atteint' : ''}"><div style="width:${ratio * 100}%"></div></div>
          <p class="discret" style="text-align:center">${atteint ? '✓ Quantité atteinte' : `Encore ${esc(formaterPoids(Math.max(0, et.grammes - g), 0))}`}</p>
          <button class="btn plein" data-action="tare" type="button">Tare</button>
        </div>`;
    }
    if (et.type === 'programme') {
      if (!robot.connecte) return `<button class="btn plein principal" data-action="robot" type="button">Connecter le robot</button>`;
      const e = robot.etat;
      const msg = {
        envoi: ['bandeau', 'Envoi au robot…'],
        pret: ['bandeau ok', 'Programme prêt : appuie sur <strong>AUTO</strong> sur le robot.'],
        encours: ['bandeau', `En cours${e?.tempsS != null ? ` · <strong class="chiffres">${formaterTemps(e.tempsS)}</strong>` : ''}${e?.etat === 5 ? ' (pause)' : ''}`],
        termine: ['bandeau ok', '✓ Programme terminé'],
        erreur: ['bandeau danger', 'Le robot n’a pas accepté le programme.'],
      }[suivi];
      const defauts = e?.defauts?.length ? `<div class="bandeau danger">⚠ ${esc(e.defauts.join(', '))}</div>` : '';
      return `${msg ? `<div class="${msg[0]}">${msg[1]}</div>` : ''}${defauts}
        <div class="rangee">
          <button class="btn" data-action="envoyer" type="button">${suivi ? 'Renvoyer' : 'Envoyer au robot'}</button>
          <button class="btn-stop" data-action="stop" type="button">STOP</button>
        </div>`;
    }
    return '';
  };

  const majDynamique = () => {
    const z = $('#g-dyn', el);
    if (z) z.innerHTML = zoneDynamique();
  };

  const envoyer = async () => {
    suivi = 'envoi';
    majDynamique();
    try {
      const code = await robot.envoyerProgramme(etape());
      suivi = code === 0 ? 'pret' : 'erreur';
      if (code === 0) vibrer(200);
    } catch (err) {
      suivi = 'erreur';
      toast(err.message);
    }
    majDynamique();
  };

  const afficher = () => {
    const et = etape();
    suivi = null;
    atteint = false;
    $('#g-compteur', el).textContent = `${i + 1}/${recette.etapes.length}`;
    $('#g-barre', el).style.width = `${((i + 1) / recette.etapes.length) * 100}%`;
    let corps = '';
    if (et.type === 'pesee') {
      corps = `<div class="guide-type">Peser</div>
        <div class="guide-titre">${esc(et.ingredient || 'Ingrédient')}</div>
        <div class="guide-reglage"><span class="chiffres">${esc(formaterPoids(et.grammes, 0))}</span></div>`;
    } else if (et.type === 'programme') {
      corps = `<div class="guide-type">Programme Expert</div>
        <div class="guide-titre">${esc(et.texte || 'Lancer le programme')}</div>
        <div class="guide-reglage chiffres">
          <span>⏱ ${formaterTemps(et.tempsS)}</span>
          <span>🌡 ${et.temperature === SANS_CHAUFFE ? 'sans chauffe' : `${et.temperature} °C`}</span>
          <span>⟳ ${formaterVitesse(et.vitesse)}</span>
        </div>`;
    } else {
      corps = `<div class="guide-type">Instruction</div><div class="guide-titre">${esc(et.texte)}</div>`;
    }
    $('#g-etape', el).innerHTML = `${corps}<div id="g-dyn"></div>`;
    $('[data-action=prec]', el).disabled = i === 0;
    $('[data-action=suiv]', el).textContent = i === recette.etapes.length - 1 ? 'Terminer ✓' : 'Suivant ▶';
    majDynamique();
    if (et.type === 'pesee' && balance.connectee) balance.tare().catch(() => {});
    if (et.type === 'programme' && robot.connecte) envoyer();
  };

  guide.surEtat = (e) => {
    if (etape().type !== 'programme' || !suivi) return;
    if (EN_COURS.has(e.etat)) suivi = 'encours';
    else if (suivi === 'encours') suivi = 'termine';
    majDynamique();
  };
  guide.surPesee = () => {
    const et = etape();
    if (et.type !== 'pesee') return;
    if (!atteint && balance.stable && balance.grammes >= et.grammes * 0.97) {
      atteint = true;
      vibrer([150, 80, 150]);
    }
    majDynamique();
  };

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-action]');
    if (!b) return;
    const a = b.dataset.action;
    if (a === 'fermer') return fermerEcran();
    if (a === 'prec' && i > 0) {
      i--;
      afficher();
    } else if (a === 'suiv') {
      if (i < recette.etapes.length - 1) {
        i++;
        afficher();
      } else {
        fermerEcran();
        toast('Bon appétit !');
      }
    } else if (a === 'tare') tenter(() => balance.tare());
    else if (a === 'balance') tenter(async () => (await connecterBalance(), afficher()));
    else if (a === 'robot') tenter(async () => (await robot.connecter(), afficher()));
    else if (a === 'envoyer') envoyer();
    else if (a === 'stop') tenter(() => (vibrer(80), robot.touche('stop')));
  });

  robot.addEventListener('connexion', majDynamique, { signal: abandon.signal });
  balance.addEventListener('connexion', majDynamique, { signal: abandon.signal });
  afficher();
}

// ---------- Plus : sauvegarde, notifications ----------

$('#btn-exporter').addEventListener('click', () => {
  const blob = new Blob([stock.exporter()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cookexpert-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('#btn-importer').addEventListener('click', () => $('#fichier-import').click());
$('#fichier-import').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const n = stock.importer(await f.text());
    rendreFavoris();
    rendreRecettes();
    toast(`Importé : ${n.recettes} recette(s), ${n.favoris} favori(s)`);
  } catch (err) {
    toast(`Import impossible : ${err.message}`);
  }
  e.target.value = '';
});

async function majBoutonNotifs(demander = false) {
  const b = $('#btn-notifs');
  const r = await (window.Natif?.autorisation(demander) ?? Promise.resolve({ ok: false, reason: 'web' }));
  if (r.ok) {
    b.disabled = true;
    b.textContent = 'Notifications activées';
  } else if (r.reason === 'denied') {
    b.disabled = true;
    b.textContent = 'Notifications refusées : réglages Android › Applis › Cuisine';
  } else if (r.reason === 'web') {
    b.disabled = true;
    b.textContent = 'Notifications disponibles dans l’appli Android';
  }
}
$('#btn-copier-journal').addEventListener('click', async () => {
  const texte = [`Cook Expert app v${VERSION} · ${navigator.userAgent}`, ...lignesJournal].join('\n');
  try {
    await navigator.clipboard.writeText(texte);
    toast('Journal copié');
  } catch {
    toast('Copie impossible');
  }
});

$('#btn-notifs').addEventListener('click', () => majBoutonNotifs(true));

// ---------- Démarrage ----------

if (!Robot.disponible() || !Balance.disponible()) {
  const a = $('#alerte-navigateur');
  a.hidden = false;
  a.textContent = 'Le Bluetooth n’est pas disponible ici : ouvre l’appli Cuisine sur le téléphone.';
}
majPastilles();
majPoids();
majBoutonNotifs();
rendreFavoris();
rendreRecettes();
robot.reconnecter().catch(() => {});

$('#version').textContent = `Version ${VERSION}`;

// ---------- Programme envoyé par une recette (robot.html#programme=durée,température,vitesse) ----------

function programmeDepuisAdresse() {
  const m = location.hash.match(/programme=(\d+),(\d+),(\d+)/);
  if (!m) return;
  const p = { tempsS: Number(m[1]), temperature: Number(m[2]), vitesse: Number(m[3]) };
  history.replaceState(null, '', location.pathname);
  afficherVue('piloter');
  rendreReglage(conteneurReglage, p);
  const erreur = verifier(p);
  $('#erreur-piloter').hidden = !erreur;
  $('#erreur-piloter').textContent = erreur ?? '';
  toast(`Réglage de la recette chargé : ${resume(p)}`);
}
programmeDepuisAdresse();
window.addEventListener('hashchange', programmeDepuisAdresse);
