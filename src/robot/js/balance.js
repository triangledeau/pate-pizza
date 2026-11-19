// Balance XL Connect : Bluetooth basse consommation (pas d'appairage). Dans l'appli Android,
// window.Natif.bluetooth imite Web Bluetooth avec le plugin bluetooth-le ; dans Chrome, Web Bluetooth.
// Android n'accepte qu'une opération GATT à la fois : toutes les opérations passent par une file.
import {
  CARACTERISTIQUE_COMMANDES,
  CARACTERISTIQUE_MESURES,
  commandeTare,
  commandeUnite,
  commandeVersion,
  enGrammes,
  lirePesee,
  SERVICE_BALANCE,
} from '../lib/balance.js';
import { enHexa } from '../lib/protocole.js';

const DELAI_GATT_MS = 12000;
const bt = () => window.Natif?.bluetooth ?? navigator.bluetooth;
const MAX_TRAMES_INCONNUES = 10;

const pause = (ms) => new Promise((fin) => setTimeout(fin, ms));

function avecDelai(promesse, quoi, delaiMs = DELAI_GATT_MS) {
  let minuteur;
  const delai = new Promise((_, rejeter) => {
    minuteur = setTimeout(() => rejeter(new Error(`balance : pas de réponse (${quoi})`)), delaiMs);
  });
  return Promise.race([promesse, delai]).finally(() => clearTimeout(minuteur));
}

export class Balance extends EventTarget {
  #commandes = null;
  #appareil = null;
  #type = 5;
  #file = Promise.resolve();
  #connexionEnCours = null;
  #tramesInconnues = 0;
  #premierePesee = true;
  #surveillance = null;
  #releve = null;
  #ignorerDeconnexion = false;
  grammes = null;
  stable = false;

  static disponible() {
    return !!bt();
  }

  get connectee() {
    return this.#commandes !== null;
  }

  #emettre(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  #journal(texte) {
    this.#emettre('journal', texte);
  }

  // Une seule opération GATT à la fois.
  #enFile(action, quoi, delaiMs) {
    const suite = this.#file.then(() => avecDelai(action(), quoi, delaiMs));
    this.#file = suite.catch(() => {});
    return suite;
  }

  get occupee() {
    return this.#connexionEnCours !== null;
  }

  /** Affiche le sélecteur ; si une balance est déjà connue et allumée, s'y connecte directement. */
  connecter(avantConnexion) {
    // Deux appuis rapprochés ne lancent qu'une connexion.
    this.#connexionEnCours ??= (async () => {
      if (!Balance.disponible()) throw new Error('Bluetooth indisponible sur cet appareil.');
      const connue = await this.#connue();
      if (connue) {
        avantConnexion?.();
        try {
          return await this.#connecter(connue);
        } catch (e) {
          this.#journal(`balance enregistrée : échec (${e.message}), choix manuel`);
        }
      }
      const appareil = await bt().requestDevice({ filters: [{ services: [SERVICE_BALANCE] }] });
      avantConnexion?.();
      await this.#connecter(appareil);
    })().finally(() => (this.#connexionEnCours = null));
    return this.#connexionEnCours;
  }

  /** Reconnexion silencieuse à la balance enregistrée ; false si elle est absente ou éteinte. */
  reconnecter(avantConnexion) {
    if (this.connectee || this.#connexionEnCours || !Balance.disponible()) return Promise.resolve(false);
    this.#connexionEnCours = (async () => {
      const connue = await this.#connue();
      if (!connue) return false;
      avantConnexion?.();
      this.#journal('balance enregistrée trouvée : reconnexion…');
      await this.#connecter(connue);
      return true;
    })().finally(() => (this.#connexionEnCours = null));
    return this.#connexionEnCours;
  }

  // Balance enregistrée et en train d'émettre, sinon null.
  async #connue() {
    const appareils = (await bt().getDevices?.().catch(() => [])) ?? [];
    const appareil = appareils[0];
    if (!appareil) return null;
    if (appareil.present && !(await appareil.present(4000))) return null;
    return appareil;
  }

  async #connecter(appareil) {
    this.#appareil = appareil;
    appareil.addEventListener('gattserverdisconnected', () => {
      if (this.#ignorerDeconnexion) return;
      clearTimeout(this.#surveillance);
      clearInterval(this.#releve);
      this.#commandes = null;
      this.grammes = null;
      this.#journal('balance déconnectée');
      this.#emettre('connexion', false);
    });

    let commandes = null;
    let notifications = false;
    for (let essai = 1; essai <= 2 && !notifications; essai++) {
      if (essai > 1) {
        // Nouvelle connexion GATT : Chrome oublie l'abonnement resté bloqué.
        this.#journal('balance : nouvel essai après reconnexion…');
        this.#ignorerDeconnexion = true;
        appareil.gatt.disconnect();
        this.#file = Promise.resolve();
        await pause(1500);
        this.#ignorerDeconnexion = false;
      }
      this.#journal('balance : connexion…');
      const serveur = await this.#enFile(() => appareil.gatt.connect(), 'connexion');
      // Android : laisser la connexion se stabiliser avant les premières opérations.
      await pause(1000);
      const service = await this.#enFile(() => serveur.getPrimaryService(SERVICE_BALANCE), 'service');
      commandes = await this.#enFile(() => service.getCharacteristic(CARACTERISTIQUE_COMMANDES), 'commandes');
      const mesures = await this.#enFile(() => service.getCharacteristic(CARACTERISTIQUE_MESURES), 'mesures');
      const pm = mesures.properties;
      if (essai === 1) {
        const pc = commandes.properties;
        this.#journal(
          `balance : mesures notify=${pm.notify} indicate=${pm.indicate} read=${pm.read} · ` +
            `commandes write=${pc.write} sansRéponse=${pc.writeWithoutResponse}`,
        );
      }
      this.#tramesInconnues = 0;
      this.#premierePesee = true;
      mesures.addEventListener('characteristicvaluechanged', (e) => this.#recevoir(e.target.value));
      if (essai > 1) {
        // 2e essai : réveiller la balance par une commande avant de demander les notifications.
        this.#journal(`balance → ${enHexa(commandeVersion(this.#type))} (avant notifications)`);
        await this.#enFile(() => commandes.writeValueWithoutResponse(commandeVersion(this.#type)), 'commande');
        await pause(500);
      }
      // Quand ça marche, c'est immédiat ; un blocage vient en général de l'appli Magimix restée connectée.
      const delai = 8000;
      this.#journal(`balance : activation des notifications (essai ${essai}, jusqu'à ${delai / 1000} s)…`);
      const debut = Date.now();
      try {
        await this.#enFile(() => mesures.startNotifications(), 'notifications', delai);
        notifications = true;
        this.#journal(`balance : notifications activées en ${((Date.now() - debut) / 1000).toFixed(1)} s`);
      } catch (erreur) {
        this.#journal(
          `✗ balance : notifications impossibles, essai ${essai}, après ${((Date.now() - debut) / 1000).toFixed(1)} s ` +
            `(${erreur.name} : ${erreur.message})`,
        );
        if (this.grammes !== null) {
          // Le poids arrive quand même : on s'en contente.
          this.#journal('balance : des mesures arrivent malgré l\u2019erreur, on continue');
          notifications = true;
        }
        if (pm.read) {
          // Plan B : lire la valeur à intervalles réguliers.
          try {
            await this.#lancerReleve(mesures);
            notifications = true;
          } catch (e2) {
            this.#journal(`✗ balance : lecture impossible (${e2.message})`);
          }
        }
      }
    }
    if (!notifications) {
      appareil.gatt.disconnect();
      throw new Error(
        'La balance ne répond pas. Force l\u2019arrêt de l\u2019appli Magimix (Paramètres › Applications), éteins et rallume la balance, puis réessaie.',
      );
    }

    this.#commandes = commandes;
    await this.#ecrire(commandeVersion(this.#type));
    this.#journal('balance connectée');
    this.#emettre('connexion', true);

    // Diagnostic : rien reçu au bout de 5 s ?
    clearTimeout(this.#surveillance);
    this.#surveillance = setTimeout(() => {
      if (this.connectee && this.grammes === null) {
        this.#journal('✗ balance : aucune mesure reçue (balance allumée ? pose un objet dessus)');
      }
    }, 5000);
  }

  async #lancerReleve(mesures) {
    // Une première lecture doit réussir, sinon on abandonne.
    const vue = await this.#enFile(() => mesures.readValue(), 'lecture', 4000);
    this.#journal('balance : mode relevé (lecture toutes les 0,4 s)');
    this.#recevoir(vue);
    let enCours = false;
    clearInterval(this.#releve);
    this.#releve = setInterval(async () => {
      if (enCours || !this.connectee) return;
      enCours = true;
      try {
        this.#recevoir(await this.#enFile(() => mesures.readValue(), 'lecture', 3000));
      } catch {}
      enCours = false;
    }, 400);
  }

  #recevoir(vue) {
    const octets = new Uint8Array(vue.buffer, vue.byteOffset, vue.byteLength);
    const pesee = lirePesee(octets);
    if (!pesee) {
      // Trames non reconnues : on en garde quelques-unes dans le journal pour comprendre.
      if (this.#tramesInconnues++ < MAX_TRAMES_INCONNUES) this.#journal(`balance ← ${enHexa(octets)}`);
      return;
    }
    if (this.#premierePesee) {
      this.#premierePesee = false;
      this.#journal(`balance ← ${enHexa(octets)} (1re pesée)`);
    }
    this.#type = pesee.type;
    const g = enGrammes(pesee);
    if (g === null) return;
    this.grammes = g;
    this.stable = pesee.stable;
    this.#emettre('pesee', { grammes: g, stable: pesee.stable });
  }

  deconnecter() {
    this.#appareil?.gatt?.disconnect();
  }

  #ecrire(octets) {
    if (!this.#commandes) return Promise.reject(new Error('balance non connectée'));
    const commandes = this.#commandes;
    return this.#enFile(() => {
      this.#journal(`balance → ${enHexa(octets)}`);
      return commandes.writeValueWithoutResponse(octets);
    }, 'commande');
  }

  tare() {
    return this.#ecrire(commandeTare(this.#type));
  }

  unite(code) {
    return this.#ecrire(commandeUnite(this.#type, code));
  }
}
