/* Habillage commun : l'en-tête prend une ombre quand la page défile, les changements d'écran passent
   par une transition de vue quand le WebView la connaît (sinon tout se fait sans animation, sans attendre). */
(() => {
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
  const go = () => {
    const e = document.querySelector(".entete"); if (!e) return;
    let haut = null;
    const maj = () => { const h = scrollY > 6; if (h !== haut) { haut = h; e.classList.toggle("defile", h); } };
    addEventListener("scroll", maj, {passive: true}); maj();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
