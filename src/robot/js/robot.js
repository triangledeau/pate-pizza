// Liaison avec le Cook Expert Connect : Bluetooth classique (SPP). Dans l'appli Android, le port vient
// du plugin natif SerieBt (window.Natif.serie, même interface que Web Serial) ; dans Chrome, de Web Serial.
// Sécurité : l'appli ne démarre jamais le moteur ni la chauffe. Elle n'envoie ni AUTO ni PULSE ;
// c'est le cuisinier qui appuie sur AUTO devant le robot.
import { Commande, decouperTrames, donneesExpert, enHexa, lireEtat, trame } from '../lib/protocole.js';

const SPP = '00001101-0000-1000-8000-00805f9b34fb';
const serie = () => window.Natif?.serie ?? navigator.serial;
const PERIODE_ETAT_MS = 1000;

// Seules touches autorisées depuis l'appli.
const TOUCHES = {
  ok: Commande.ok,
  droite: Commande.droite,
  gauche: Commande.gauche,
  retour: Commande.retour,
  stop: Commande.stop,
};

export class Robot extends EventTarget {
  #port = null;
  #ecrivain = null;
  #lecteur = null;
  #flux = [];
  #attentes = new Set();
  #file = Promise.resolve();
  #minuteur = null;
  #echecs = 0;
  #suspendu = false;
  etat = null;

  /** Suspend la lecture régulière de l'état (pour laisser le Bluetooth à la balance pendant sa connexion). */
  suspendre(oui) {
    this.#suspendu = oui;
  }

  static disponible() {
    return !!serie();
  }

  get connecte() {
    return this.#port !== null;
  }

  #emettre(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  #journal(texte) {
    this.#emettre('journal', texte);
  }

  /** Reconnexion silencieuse à un robot déjà autorisé ; false s'il n'y en a pas. */
  async reconnecter() {
    if (!Robot.disponible() || this.connecte) return false;
    const ports = await serie().getPorts();
    const port = ports.find((p) => (p.getInfo().bluetoothServiceClassId ?? '').toLowerCase() === SPP) ?? ports[0];
    if (!port) return false;
    await this.#ouvrir(port);
    return true;
  }

  /** Affiche le sélecteur de Chrome (« cook expert XXXXXX »). */
  async connecter() {
    if (!Robot.disponible()) throw new Error('Bluetooth indisponible sur cet appareil.');
    const port = await serie().requestPort({
      allowedBluetoothServiceClassIds: [SPP],
      filters: [{ bluetoothServiceClassId: SPP }],
    });
    await this.#ouvrir(port);
  }

  async #ouvrir(port) {
    await port.open({ baudRate: 115200 });
    this.#port = port;
    this.#ecrivain = port.writable.getWriter();
    this.#flux = [];
    this.#echecs = 0;
    port.addEventListener('disconnect', () => this.#perdu('liaison Bluetooth coupée'));
    this.#ecouter();
    this.#journal('robot connecté');
    this.#emettre('connexion', true);
    await this.lireEtat(5).catch(() => {});
    this.#minuteur = setInterval(() => this.#sonder(), PERIODE_ETAT_MS);
  }

  async deconnecter() {
    const port = this.#port;
    if (!port) return;
    this.#nettoyer();
    try {
      await this.#lecteur?.cancel();
    } catch {}
    try {
      this.#ecrivain?.releaseLock();
    } catch {}
    try {
      await port.close();
    } catch {}
    this.#journal('robot déconnecté');
  }

  #nettoyer() {
    clearInterval(this.#minuteur);
    this.#minuteur = null;
    this.#port = null;
    this.etat = null;
    for (const a of this.#attentes) a.rejeter(new Error('déconnecté'));
    this.#attentes.clear();
    this.#emettre('connexion', false);
  }

  #perdu(raison) {
    if (!this.#port) return;
    this.#journal(`✗ ${raison}`);
    const port = this.#port;
    this.#nettoyer();
    port.close().catch(() => {});
  }

  async #ecouter() {
    const port = this.#port;
    this.#lecteur = port.readable.getReader();
    try {
      for (;;) {
        const { value, done } = await this.#lecteur.read();
        if (done) break;
        this.#emettre('trame', `← ${enHexa(value)}`);
        const { trames, reste } = decouperTrames([...this.#flux, ...value]);
        this.#flux = reste;
        for (const t of trames) {
          for (const attente of this.#attentes) {
            if (attente.commande !== t.commande) continue;
            this.#attentes.delete(attente);
            attente.resoudre(t);
          }
        }
      }
    } catch (erreur) {
      if (this.#port === port) this.#perdu(`lecture interrompue : ${erreur.message}`);
    } finally {
      try {
        this.#lecteur.releaseLock();
      } catch {}
    }
  }

  #attendre(commande, delaiMs = 1500) {
    return new Promise((resoudre, rejeter) => {
      const attente = {
        commande,
        resoudre: (t) => {
          clearTimeout(minuteur);
          resoudre(t);
        },
        rejeter: (e) => {
          clearTimeout(minuteur);
          rejeter(e);
        },
      };
      const minuteur = setTimeout(() => {
        this.#attentes.delete(attente);
        rejeter(new Error(`le robot ne répond pas (commande 0x${commande.toString(16).padStart(2, '0')})`));
      }, delaiMs);
      this.#attentes.add(attente);
    });
  }

  // Une seule commande à la fois sur la liaison.
  #enFile(action) {
    const suite = this.#file.then(action, action);
    this.#file = suite.catch(() => {});
    return suite;
  }

  // Les lectures peuvent être répétées ; jamais les touches ni les programmes (essais = 1).
  #demander(commande, donnees = [], essais = 1) {
    return this.#enFile(async () => {
      if (!this.#port) throw new Error('robot non connecté');
      for (let essai = 1; ; essai++) {
        const reponse = this.#attendre(commande);
        const octets = trame(commande, donnees);
        if (commande !== Commande.lireEtat) this.#journal(`→ ${enHexa(octets)}`);
        this.#emettre('trame', `→ ${enHexa(octets)}`);
        await this.#ecrivain.write(octets);
        try {
          return await reponse;
        } catch (erreur) {
          if (essai >= essais) throw erreur;
        }
      }
    });
  }

  async lireEtat(essais = 1) {
    const t = await this.#demander(Commande.lireEtat, [], essais);
    this.etat = lireEtat(t.donnees);
    this.#emettre('etat', this.etat);
    return this.etat;
  }

  async #sonder() {
    if (this.#suspendu) return;
    try {
      await this.lireEtat();
      this.#echecs = 0;
    } catch {
      this.#echecs++;
      if (this.#echecs === 3) this.#journal('✗ le robot ne répond plus (en veille ?)');
      if (this.#echecs >= 3) this.#emettre('silence', this.#echecs);
    }
  }

  /** Règle un programme Expert ; le robot passe en « prêt » sans démarrer. Renvoie le code (0 = accepté). */
  async envoyerProgramme({ tempsS, temperature, vitesse }) {
    const donnees = donneesExpert({ tempsS, temperature, vitesse });
    const reponse = await this.#demander(Commande.envoyerEtat, donnees);
    const code = reponse.donnees[0];
    this.#journal(code === 0 ? '✓ programme accepté' : `✗ programme refusé (code ${code})`);
    setTimeout(() => this.lireEtat().catch(() => {}), 400);
    return code;
  }

  async touche(nom) {
    const commande = TOUCHES[nom];
    if (commande === undefined) throw new Error(`touche non autorisée : ${nom}`);
    await this.#demander(commande);
    setTimeout(() => this.lireEtat().catch(() => {}), 300);
  }
}
