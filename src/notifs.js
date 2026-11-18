// Rappels locaux : programmés dans Android (AlarmManager), ils sonnent même appli fermée.
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { KeepAwake } from "@capacitor-community/keep-awake";

const CHANNEL = "etapes";
const BASE_ID = 1000;
const native = Capacitor.isNativePlatform();

async function setup() {
  if (!native) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: "Étapes de la pâte",
      description: "Un rappel à chaque étape du planning",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  } catch (e) { /* canal déjà créé */ }
}
const ready = setup();

async function ensurePermission() {
  if (!native) return { ok: false, reason: "web" };
  await ready;
  let p = await LocalNotifications.checkPermissions();
  if (p.display !== "granted") p = await LocalNotifications.requestPermissions();
  if (p.display !== "granted") return { ok: false, reason: "denied" };
  try {
    const ex = await LocalNotifications.checkExactNotificationSetting();
    if (ex.exact_alarm !== "granted") return { ok: true, exact: false };
  } catch (e) { /* versions d'Android sans ce réglage */ }
  return { ok: true, exact: true };
}

async function pending() {
  if (!native) return [];
  const r = await LocalNotifications.getPending();
  return (r.notifications || []).filter(n => n.id >= BASE_ID && n.id < BASE_ID + 100);
}

async function cancel() {
  const list = await pending();
  if (list.length) await LocalNotifications.cancel({ notifications: list.map(n => ({ id: n.id })) });
}

async function cancelIds(ids) {
  if (!native || !ids.length) return;
  await LocalNotifications.cancel({ notifications: ids.map(i => ({ id: BASE_ID + i })) });
}

// events : [{id, at: Date, title, body}]
async function schedule(events) {
  const perm = await ensurePermission();
  if (!perm.ok) return perm;
  await cancel();
  const now = Date.now() + 5000;
  const future = events.filter(e => e.at.getTime() > now);
  if (!future.length) return { ok: true, count: 0, exact: perm.exact };
  await LocalNotifications.schedule({
    notifications: future.map((e) => ({
      id: BASE_ID + e.id,
      title: e.title,
      body: e.body,
      largeBody: e.body,
      channelId: CHANNEL,
      smallIcon: "ic_stat_pizza",
      iconColor: "#2C6A44",
      schedule: { at: e.at, allowWhileIdle: true },
    })),
  });
  return { ok: true, count: future.length, skipped: events.length - future.length, exact: perm.exact };
}

async function openExactSettings() {
  if (native) await LocalNotifications.changeExactNotificationSetting();
}

// Écran allumé pendant les étapes actives
let awake = false;
async function keepAwake(on) {
  if (on === awake) return;
  awake = on;
  try {
    if (on) await KeepAwake.keepAwake(); else await KeepAwake.allowSleep();
  } catch (e) { awake = !on; }
}

// Toucher une notification ouvre le suivi
let tapCb = null;
if (native) {
  LocalNotifications.addListener("localNotificationActionPerformed", () => { if (tapCb) tapCb(); });
}
function onTap(cb) { tapCb = cb; }

window.PizzaNotifs = { native, schedule, cancel, pending, openExactSettings, keepAwake, onTap, cancelIds };
window.dispatchEvent(new Event("pizzanotifs"));
