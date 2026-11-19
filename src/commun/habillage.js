/* Habillage commun : l'en-tête prend une ombre quand la page défile, les changements d'écran passent
   par une transition de vue quand le WebView la connaît (sinon tout se fait sans animation, sans attendre). */
(() => {
  // Mode jour/nuit : « auto » suit le téléphone ; « clair » ou « sombre » forcent les règles
  // @media (prefers-color-scheme:dark) de toutes les feuilles de la page (réglage dans Repères).
  const CLE_THEME = "cuisine/theme", SOMBRE = /prefers-color-scheme:\s*dark/;
  const MEDIA = {auto: "(prefers-color-scheme: dark)", sombre: "all, (prefers-color-scheme: dark)", clair: "(prefers-color-scheme: dark) and (max-width: 0px)"};
  const lireTheme = () => { try { return localStorage.getItem(CLE_THEME) || "auto"; } catch (e) { return "auto"; } };
  const parcourir = (regles, texte) => {
    for (const r of regles) {
      if (r.media && SOMBRE.test(r.media.mediaText) && r.media.mediaText !== texte) r.media.mediaText = texte;
      if (r.cssRules) parcourir(r.cssRules, texte);
    }
  };
  const appliquerTheme = () => {
    const t = lireTheme(), texte = MEDIA[t] || MEDIA.auto;
    document.documentElement.dataset.theme = t;
    for (const f of document.styleSheets) { let r; try { r = f.cssRules; } catch (e) { continue; } parcourir(r, texte); }
  };
  window.themeChoisi = lireTheme;
  window.choisirTheme = t => { try { localStorage.setItem(CLE_THEME, t); } catch (e) {} appliquerTheme(); };
  appliquerTheme();
  // les <style> écrits après ce script : appliqués dès leur arrivée, avant le premier affichage
  const suivi = new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeName === "STYLE" || n.nodeName === "LINK"))) appliquerTheme(); });
  suivi.observe(document.documentElement, {childList: true, subtree: true});
  document.addEventListener("DOMContentLoaded", () => { suivi.disconnect(); appliquerTheme(); });
  addEventListener("load", appliquerTheme);
  const calme = matchMedia("(prefers-reduced-motion: reduce)");
  // Transition de vue pour un changement fait en JS ; renvoie toujours tout de suite
  window.transitionVue = fn => {
    if (!document.startViewTransition || calme.matches || document.hidden) { fn(); return; }
    try { document.startViewTransition(fn); } catch (e) { fn(); }
  };
  // Pose une classe le temps d'une animation, puis la retire
  window.animerUneFois = (el, cls, ms = 600) => {
    if (!el || calme.matches) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    clearTimeout(el._anim); el._anim = setTimeout(() => el.classList.remove(cls), ms);
  };
  // Bulles d'info : un bouton « i » suivi d'un <span class="info-txt" hidden> ; un appui affiche le texte
  // dans une bulle sous le bouton, un appui ailleurs (ou le défilement) la ferme.
  window.info = (html, nom = "Plus d'infos") =>
    `<button type="button" class="info" aria-label="${nom}" aria-expanded="false">i</button><span class="info-txt" hidden>${html}</span>`;
  let bulle = null, source = null;
  const fermer = () => {
    if (!bulle) return;
    source?.setAttribute("aria-expanded", "false");
    bulle.remove(); bulle = null; source = null;
  };
  window.fermerInfo = fermer;
  document.addEventListener("click", e => {
    const b = e.target.closest(".info");
    if (!b) { if (bulle && !e.target.closest(".bulle")) fermer(); return; }
    e.preventDefault(); e.stopPropagation();
    if (source === b) return fermer();
    fermer();
    const txt = b.nextElementSibling;
    if (!txt || !txt.classList.contains("info-txt")) return;
    bulle = document.createElement("div");
    bulle.className = "bulle"; bulle.setAttribute("role", "note");
    bulle.innerHTML = txt.innerHTML;
    document.body.append(bulle);
    source = b; b.setAttribute("aria-expanded", "true");
    const r = b.getBoundingClientRect(), l = bulle.offsetWidth, h = bulle.offsetHeight;
    const x = Math.min(Math.max(12, r.left + r.width / 2 - l / 2), innerWidth - l - 12);
    const enBas = r.bottom + 10 + h < innerHeight - 90 || r.top - 10 - h < 70;
    bulle.style.left = x + "px";
    bulle.style.top = (enBas ? r.bottom + 10 : r.top - 10 - h) + scrollY + "px";
    bulle.style.setProperty("--fleche", (r.left + r.width / 2 - x) + "px");
    bulle.classList.add(enBas ? "dessous" : "dessus");
  }, true);
  addEventListener("scroll", fermer, {passive: true});
  addEventListener("resize", fermer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") fermer(); });
  const go = () => {
    const e = document.querySelector(".entete"); if (!e) return;
    let haut = null;
    const maj = () => { const h = scrollY > 6; if (h !== haut) { haut = h; e.classList.toggle("defile", h); } };
    addEventListener("scroll", maj, {passive: true}); maj();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
