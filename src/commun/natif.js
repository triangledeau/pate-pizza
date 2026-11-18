// Pont entre les pages web de l'appli et Android (Capacitor) : rappels, écran allumé,
// Bluetooth du Cook Expert (série classique) et de la balance (BLE), données de la cuisine.
// Compilé par esbuild vers www/commun/natif.js ; dans un navigateur, tout se replie sur le web.
import { Capacitor, registerPlugin } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { BleClient, numberToUUID } from "@capacitor-community/bluetooth-le";

const natif = Capacitor.isNativePlatform();

/* ================= rappels ================= */
// Chaque page a sa plage d'identifiants : replanifier les repas n'efface pas les rappels de la pâte.
const PLAGES = { pizza: 1000, repas: 2000, robot: 3000 };
const CANAUX = [
  { id: "etapes", name: "Étapes de la pâte", description: "Un rappel à chaque étape du planning" },
  { id: "repas", name: "Lancement des repas", description: "L'heure de lancer le dîner, et ce qu'il faut sortir du congélateur" },
  { id: "robot", name: "Cook Expert", description: "Fin d'un programme du robot" },
];
const CANAL = { pizza: "etapes", repas: "repas", robot: "robot" };

const pret = (async () => {
  if (!natif) return;
  for (const c of CANAUX) {
    try { await LocalNotifications.createChannel({ ...c, importance: 5, visibility: 1, vibration: true }); } catch (e) {}
  }
})();

async function autorisation(demander = true) {
  if (!natif) return { ok: false, reason: "web" };
  await pret;
  let p = await LocalNotifications.checkPermissions();
  if (p.display !== "granted" && demander) p = await LocalNotifications.requestPermissions();
  if (p.display !== "granted") return { ok: false, reason: p.display === "denied" ? "denied" : "prompt" };
  try {
    const ex = await LocalNotifications.checkExactNotificationSetting();
    if (ex.exact_alarm !== "granted") return { ok: true, exact: false };
  } catch (e) {}
  return { ok: true, exact: true };
}

async function enAttente(groupe) {
  if (!natif) return [];
  const base = PLAGES[groupe];
  const r = await LocalNotifications.getPending();
  return (r.notifications || []).filter((n) => n.id >= base && n.id < base + 1000);
}

async function annuler(groupe) {
  const l = await enAttente(groupe);
  if (l.length) await LocalNotifications.cancel({ notifications: l.map((n) => ({ id: n.id })) });
}

// evenements : [{id, at: Date, title, body}] ; id relatif à la plage du groupe
async function planifier(groupe, evenements, { demander = true } = {}) {
  const perm = await autorisation(demander);
  if (!perm.ok) return perm;
  await annuler(groupe);
  const base = PLAGES[groupe];
  const seuil = Date.now() + 5000;
  const futurs = evenements.filter((e) => e.at.getTime() > seuil);
  if (futurs.length) {
    await LocalNotifications.schedule({
      notifications: futurs.map((e) => ({
        id: base + e.id, title: e.title, body: e.body, largeBody: e.body,
        channelId: CANAL[groupe], smallIcon: "ic_stat_pizza", iconColor: "#2C6A44",
        extra: { page: e.page || null },
        schedule: { at: e.at, allowWhileIdle: true },
      })),
    });
  }
  return { ok: true, count: futurs.length, skipped: evenements.length - futurs.length, exact: perm.exact };
}

let compteurImmediat = 0;
async function notifier(titre, texte, groupe = "robot") {
  if (natif) {
    const perm = await autorisation(false);
    if (!perm.ok) return false;
    await LocalNotifications.schedule({ notifications: [{ id: PLAGES[groupe] + 900 + (compteurImmediat++ % 50), title: titre, body: texte, channelId: CANAL[groupe], smallIcon: "ic_stat_pizza", iconColor: "#2C6A44" }] });
    return true;
  }
  if ("Notification" in window && Notification.permission === "granted") { new Notification(titre, { body: texte }); return true; }
  return false;
}

async function ouvrirReglagesExacts() { if (natif) await LocalNotifications.changeExactNotificationSetting(); }

// Toucher une notification : ouvre la page concernée
if (natif) {
  LocalNotifications.addListener("localNotificationActionPerformed", (a) => {
    const page = a?.notification?.extra?.page;
    const id = a?.notification?.id || 0;
    const cible = page || (id >= PLAGES.pizza && id < PLAGES.pizza + 1000 ? "pizza.html" : null);
    if (cible && !location.pathname.endsWith(cible.split("#")[0])) location.href = cible;
    else if (tapCb) tapCb();
  });
}
let tapCb = null;

/* ================= écran allumé ================= */
let eveil = false, verrouWeb = null;
async function garderAllume(oui) {
  if (oui === eveil) return;
  eveil = oui;
  try {
    if (natif) { if (oui) await KeepAwake.keepAwake(); else await KeepAwake.allowSleep(); }
    else if (oui) verrouWeb = await navigator.wakeLock?.request("screen");
    else { await verrouWeb?.release(); verrouWeb = null; }
  } catch (e) { eveil = !oui; }
}

// Compatibilité avec la page Pizza (ancienne API PizzaNotifs)
window.PizzaNotifs = {
  native: natif,
  schedule: (ev) => planifier("pizza", ev),
  cancel: () => annuler("pizza"),
  pending: () => enAttente("pizza"),
  cancelIds: async (ids) => { if (natif && ids.length) await LocalNotifications.cancel({ notifications: ids.map((i) => ({ id: PLAGES.pizza + i })) }); },
  openExactSettings: ouvrirReglagesExacts,
  keepAwake: garderAllume,
  onTap: (cb) => { tapCb = cb; },
};

/* ================= Bluetooth : robot (série classique, plugin maison SerieBt) ================= */
const SerieBt = registerPlugin("SerieBt");
const SPP = "00001101-0000-1000-8000-00805f9b34fb";
const CLE_ROBOT = "cuisine/robot-adresse";
const b64enOctets = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
const octetsEnB64 = (o) => btoa(String.fromCharCode(...o));

class PortNatif extends EventTarget {
  constructor(adresse, nom) { super(); this.adresse = adresse; this.nom = nom; this.readable = null; this.writable = null; this._ecoutes = []; }
  getInfo() { return { bluetoothServiceClassId: SPP }; }
  async open() {
    await SerieBt.connecter({ adresse: this.adresse });
    let ctrl;
    this.readable = new ReadableStream({ start: (c) => { ctrl = c; }, cancel: () => {} });
    this._ecoutes.push(await SerieBt.addListener("donnees", (d) => { try { ctrl.enqueue(b64enOctets(d.b64)); } catch (e) {} }));
    this._ecoutes.push(await SerieBt.addListener("coupure", () => {
      try { ctrl.close(); } catch (e) {}
      this.dispatchEvent(new Event("disconnect"));
    }));
    this.writable = new WritableStream({ write: (o) => SerieBt.ecrire({ b64: octetsEnB64(o) }) });
  }
  async close() {
    for (const e of this._ecoutes) { try { await e.remove(); } catch (er) {} }
    this._ecoutes = [];
    await SerieBt.deconnecter();
  }
}

function choisirAppareil(appareils) {
  return new Promise((ok, ko) => {
    const voile = document.createElement("div");
    voile.className = "voile";
    const f = document.createElement("div");
    f.className = "feuille";
    f.setAttribute("role", "dialog");
    f.innerHTML = `<div class="poignee"></div><h2 style="font-family:var(--titre);font-size:26px;margin:0 0 6px">Quel robot ?</h2>
      <p class="muted" style="margin:0 0 14px">Appareils appairés dans les réglages Bluetooth d'Android.</p>
      <div style="display:flex;flex-direction:column;gap:8px">${appareils.map((a, i) => `<button class="btn" data-i="${i}" style="justify-content:flex-start">${(a.nom || "Sans nom").replace(/[<&]/g, "")}<span class="muted" style="font-weight:400;margin-left:auto">${a.adresse.slice(-5)}</span></button>`).join("")}
      <button class="btn ghost" data-i="-1">Annuler</button></div>`;
    const fin = (i) => { voile.remove(); f.remove(); i >= 0 ? ok(appareils[i]) : ko(Object.assign(new Error("Aucun robot choisi"), { name: "NotFoundError" })); };
    f.addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b) fin(Number(b.dataset.i)); });
    voile.addEventListener("click", () => fin(-1));
    document.body.append(voile, f);
  });
}

const serieNatif = {
  async getPorts() {
    const adresse = localStorage.getItem(CLE_ROBOT);
    return adresse ? [new PortNatif(adresse, "")] : [];
  },
  async requestPort() {
    let liste;
    try { liste = (await SerieBt.appareils()).appareils || []; }
    catch (e) { throw new Error(e.message || "Bluetooth indisponible"); }
    if (!liste.length) throw new Error("Aucun appareil appairé : appaire le robot dans les réglages Bluetooth d'Android (code 0000).");
    const robots = liste.filter((a) => /cook\s*expert/i.test(a.nom || ""));
    const choix = robots.length === 1 ? robots[0] : await choisirAppareil(robots.length ? robots : liste);
    localStorage.setItem(CLE_ROBOT, choix.adresse);
    return new PortNatif(choix.adresse, choix.nom);
  },
};

/* ================= Bluetooth : balance (BLE) ================= */
const uuid = (u) => (typeof u === "number" ? numberToUUID(u) : String(u).toLowerCase());
let bleInit = null;
const initBle = () => (bleInit ??= BleClient.initialize({ androidNeverForLocation: true }));

class Caracteristique extends EventTarget {
  constructor(app, service, c) { super(); this.app = app; this.service = service; this.uuid = c.uuid; this.properties = c.properties || {}; this.value = null; }
  async startNotifications() {
    await BleClient.startNotifications(this.app.id, this.service, this.uuid, (v) => {
      this.value = v;
      const e = new Event("characteristicvaluechanged");
      Object.defineProperty(e, "target", { value: this });
      this.dispatchEvent(e);
    });
  }
  writeValueWithoutResponse(o) { return BleClient.writeWithoutResponse(this.app.id, this.service, this.uuid, new DataView(o.buffer, o.byteOffset, o.byteLength)); }
  writeValue(o) { return BleClient.write(this.app.id, this.service, this.uuid, new DataView(o.buffer, o.byteOffset, o.byteLength)); }
  async readValue() { return BleClient.read(this.app.id, this.service, this.uuid); }
}
class AppareilBle extends EventTarget {
  constructor(d) {
    super(); this.id = d.deviceId; this.name = d.name;
    const app = this;
    this.gatt = {
      async connect() {
        await initBle();
        await BleClient.connect(app.id, () => app.dispatchEvent(new Event("gattserverdisconnected")));
        return {
          async getPrimaryService(s) {
            const su = uuid(s);
            const services = await BleClient.getServices(app.id);
            const sv = services.find((x) => x.uuid.toLowerCase() === su);
            if (!sv) throw new Error("service de la balance introuvable");
            return {
              async getCharacteristic(c) {
                const cu = uuid(c);
                const ca = sv.characteristics.find((x) => x.uuid.toLowerCase() === cu);
                if (!ca) throw new Error("caractéristique introuvable");
                return new Caracteristique(app, su, ca);
              },
            };
          },
        };
      },
      disconnect() { BleClient.disconnect(app.id).catch(() => {}); },
    };
  }
}
const bluetoothNatif = {
  async requestDevice({ filters }) {
    await initBle();
    const services = (filters || []).flatMap((f) => f.services || []).map(uuid);
    const d = await BleClient.requestDevice({ services });
    return new AppareilBle(d);
  },
};

/* ================= données de la cuisine ================= */
// Base locale au format des collections de l'ancienne appli (claude.ai), complétée par le fichier
// data/cuisine.json du dépôt GitHub : Claude y dépose menus et recettes, l'appli le relit à l'ouverture.
const DISTANT = "https://raw.githubusercontent.com/triangledeau/pate-pizza/main/data/cuisine.json";
const CLE_DB = "cuisine/db-v1";

function creerBase() {
  let docs = {};
  try { docs = JSON.parse(localStorage.getItem(CLE_DB) || "{}"); } catch (e) {}
  const ecouteurs = new Set();
  let infos = { source: Object.keys(docs).length ? "local" : "vide", maj: localStorage.getItem(CLE_DB + ":maj") || null };
  const sauver = () => { try { localStorage.setItem(CLE_DB, JSON.stringify(docs)); } catch (e) {} };
  const copie = (x) => JSON.parse(JSON.stringify(x));
  const avertir = () => { for (const f of ecouteurs) f(); };

  function fusionner(distant) {
    let change = false;
    const vus = new Set();
    for (const [chemin, d] of Object.entries(distant.docs || {})) {
      vus.add(chemin);
      const local = docs[chemin];
      if (!local || (!local.l && JSON.stringify(local.d) !== JSON.stringify(d.d)) || (local.l && (d.t || "") > (local.t || ""))) {
        docs[chemin] = { d: d.d, t: d.t || "" }; change = true;
      }
    }
    for (const [chemin, local] of Object.entries(docs)) {
      if (!vus.has(chemin) && !local.l) { delete docs[chemin]; change = true; }
    }
    if (change) sauver();
    return change;
  }

  async function charger(url, delai) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), delai);
    try {
      const r = await fetch(url, { cache: "no-store", signal: ctl.signal });
      if (!r.ok) throw new Error("http " + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  const demarrage = (async () => {
    if (!Object.keys(docs).length) {
      try { fusionner(await charger("data/cuisine.json", 4000)); infos.source = "intégré"; avertir(); } catch (e) {}
    }
    try {
      const distant = await charger(DISTANT + "?t=" + Date.now(), 8000);
      fusionner(distant);
      infos = { source: "distant", maj: distant.maj || new Date().toISOString() };
      localStorage.setItem(CLE_DB + ":maj", infos.maj);
      avertir();
    } catch (e) { infos.erreur = true; avertir(); }
  })();

  const vivants = (prefixe) => Object.entries(docs).filter(([k, v]) => k.startsWith(prefixe + "/") && !v.supprime && k.split("/").length === 2);

  return {
    infos: () => infos,
    pret: demarrage,
    modifications() {
      const out = {};
      for (const [k, v] of Object.entries(docs)) if (v.l) out[k] = v.supprime ? null : v.d;
      return out;
    },
    collection(nom) {
      return {
        onSnapshot(cb) {
          const f = () => cb({ docs: vivants(nom).map(([k, v]) => ({ id: k.split("/")[1], data: () => copie(v.d) })) });
          ecouteurs.add(f); f();
          return () => ecouteurs.delete(f);
        },
      };
    },
    doc(chemin) {
      return {
        onSnapshot(cb) {
          const f = () => { const v = docs[chemin]; const ok = v && !v.supprime; cb({ exists: !!ok, data: () => (ok ? copie(v.d) : undefined), metadata: {} }); };
          ecouteurs.add(f); f();
          return () => ecouteurs.delete(f);
        },
        async set(data) { docs[chemin] = { d: copie(data), t: new Date().toISOString(), l: true }; sauver(); },
        async delete() { docs[chemin] = { d: null, t: new Date().toISOString(), l: true, supprime: true }; sauver(); },
      };
    },
  };
}
let base = null;
const baseCuisine = () => (base ??= creerBase());

// Même interface que le runtime des artefacts claude.ai : la page Cuisine fonctionne sans changement.
window.claude = {
  async use(nom) {
    if (nom === "db") return baseCuisine();
    if (nom === "user") return { can: async () => true };
    return null;
  },
};

window.Natif = {
  natif,
  autorisation, planifier, annuler, enAttente, notifier, ouvrirReglagesExacts, garderAllume,
  serie: natif ? serieNatif : navigator.serial,
  bluetooth: natif ? bluetoothNatif : navigator.bluetooth,
  baseCuisine,
};
window.dispatchEvent(new Event("pizzanotifs"));
window.dispatchEvent(new Event("natif"));
