/* Illustrations de l'appli : emblème, plats par famille, icônes d'enseignes.
   Dessins vectoriels maison (64 × 64), traits arrondis et aplats de la palette ; couleurs dans theme.css (--il-*),
   pour qu'une même image passe sur une vignette claire, en mode sombre ou sur la plaque émaillée. */
(() => {
  const T = 'stroke="var(--il-trait)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
  const L = (c, w = 2.2) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const F = c => `fill="var(--il-${c})"`;
  const vapeur = (xs, y = 14) => `<path ${L("var(--il-vapeur)", 2)} d="${xs.map(x => `M${x} ${y}c-2.4-2.6 2.4-4.4 0-7`).join("")}"/>`;

  const PLATS = {
    pizza: `
      <circle cx="32" cy="32" r="25.5" ${F("croute")} ${T}/>
      <circle cx="32" cy="32" r="19.5" ${F("tomate")}/>
      <path ${L("var(--il-trait)", 1.3)} stroke-opacity=".28" d="M32 12.5v39M15.1 22.2l33.8 19.6M15.1 41.8l33.8-19.6"/>
      <path ${F("creme")} d="M20.5 25.5c1.2-3.2 6.4-3.6 7.6-.6 1 2.6-.8 5.6-3.8 5.8-2.8.2-4.8-2.6-3.8-5.2z"/>
      <path ${F("creme")} d="M35.4 35.6c1.6-2.8 6.6-2.4 7.4.8.6 2.8-2 5.2-4.8 4.8-2.6-.4-3.8-3.2-2.6-5.6z"/>
      <path ${F("creme")} d="M22.6 39.2c1.4-2 4.8-1.6 5.2.8.4 2-1.6 3.6-3.6 3.2-1.8-.4-2.6-2.4-1.6-4z"/>
      <path ${F("creme")} d="M37.6 20.6c1.2-1.6 4-1.2 4.4.6.4 1.8-1.4 3-3 2.6-1.6-.4-2.2-1.8-1.4-3.2z"/>
      <path ${F("basilic")} d="M30.5 30.8c2.2-4.4 7.6-5 9.8-3.2-1.6 3.8-6.6 5.4-9.8 3.2z"/>
      <path ${F("basilic")} d="M30.8 47.2c-1-4.6 2.6-8.4 5.6-8.4.6 3.8-2.6 7.6-5.6 8.4z"/>
      <path ${F("basilic")} d="M14.8 31c3.4-2.6 7.6-1.4 8.8.8-2.8 2.4-7.2 2-8.8-.8z"/>`,
    bol: `
      <path ${L("var(--il-bois)", 2.6)} d="M47 5 29 27M53.5 8.5 33.5 28.5"/>
      <ellipse cx="21.5" cy="27.5" rx="6.8" ry="4.6" ${F("creme")} ${T}/>
      <circle cx="21.5" cy="27.5" r="2.4" ${F("safran")}/>
      <path ${L("var(--il-safran)", 2.4)} d="M30 30c2-3.4 4.2-3.4 6.2 0s4.2 3.4 6.2 0 3.6-3 5.6 0"/>
      <path fill="var(--il-nori)" d="M44.6 18.4l7.2 1.6-2.2 10.6-7.2-1.6z"/>
      ${vapeur([27, 34])}
      <path ${F("bol")} ${T} d="M7 30.5h50c0 13.2-11.2 22.5-25 22.5S7 43.7 7 30.5z"/>
      <path ${L("var(--il-creme)", 1.8)} d="M13 39.5c3 2 6 2 9 0s6-2 9 0 6 2 9 0 6-2 9 0 5 1.6 7 0"/>
      <path ${F("bol")} ${T} d="M24 52.5h16l-1.2 4.5H25.2z"/>`,
    riz: `
      <path ${F("creme")} ${T} d="M10.5 30c1.6-9 10-14 21.5-14s19.9 5 21.5 14z"/>
      <path ${F("safran")} d="M16 28.6c3.2-6.4 12.6-9 21.2-7.2 5.4 1.2 9 4 10.4 7.2-9.6 2.6-21.6 2.4-31.6 0z"/>
      <path ${L("var(--il-basilic)", 2.2)} d="M24 23.5l1.6 1.4M31.6 21.2l1.4 1.6M38.8 23.2l1.8 1M28 26.4l1.6 1"/>
      <path ${F("bol-2")} ${T} d="M6 30.5h52c0 13.4-11.6 22.5-26 22.5S6 43.9 6 30.5z"/>
      <circle cx="20" cy="40" r="2.2" ${F("creme")}/><circle cx="32" cy="43" r="2.2" ${F("creme")}/><circle cx="44" cy="40" r="2.2" ${F("creme")}/>
      <path ${F("bol-2")} ${T} d="M23 52.5h18l-1.2 4.5H24.2z"/>
      <path ${L("var(--il-bois)", 2.6)} d="M8 12.5l34 6M10 7.5l34 6"/>`,
    pates: `
      <ellipse cx="32" cy="39" rx="27.5" ry="17" ${F("creme")} ${T}/>
      <ellipse cx="32" cy="38" rx="19" ry="11" ${L("var(--il-trait)", 1.4)} stroke-opacity=".22"/>
      <ellipse cx="31" cy="36.5" rx="14.5" ry="8.4" ${F("pate")}/>
      <path ${L("var(--il-safran)", 2.2)} d="M18.5 37c1-6.6 20-9.6 25-2.4 3.4 5-7.6 9.4-15.6 7.4-6.6-1.6-5.4-7.6 2-8.4 5.4-.6 9 1.6 8.6 4.2"/>
      <circle cx="37.5" cy="31.5" r="3.4" ${F("tomate")} ${T}/>
      <path ${F("basilic")} d="M22 30.2c2.6-3.4 7-3.2 8.6-1.4-1.8 3-6 3.6-8.6 1.4z"/>
      <path ${L("var(--il-trait)", 2.2)} d="M47.5 5.5 41 33M43.3 4.6l-1.9 7.8M46.8 5.4l-1.9 7.8M50.3 6.2l-1.9 7.8M41.4 12.4c2.4 1.4 4.6 1.8 7 1.6"/>`,
    pain: `
      <rect x="4" y="49" width="56" height="8" rx="4" ${F("bois")} ${T}/>
      <path ${F("croute")} ${T} d="M8.5 45.5C8.5 30 18.6 17 32 17s23.5 13 23.5 28.5c0 2.6-2 4-4.6 4H13.1c-2.6 0-4.6-1.4-4.6-4z"/>
      <path ${L("var(--il-mie)", 2.4)} d="M19 30.5c4.6 2.6 7.4 8 7.6 13.4M30.4 24.4c4.6 3.6 7 10 7 18.2M42.6 28.4c3 3.6 4.4 8.6 4.4 14"/>
      <circle cx="16" cy="38" r="1" ${F("creme")} opacity=".8"/><circle cx="36" cy="22.5" r="1" ${F("creme")} opacity=".8"/><circle cx="49" cy="38" r="1" ${F("creme")} opacity=".8"/><circle cx="24" cy="22" r=".9" ${F("creme")} opacity=".8"/>`,
    poulet: `
      <path ${L("var(--il-trait)", 9.4)} d="M37 38.5l10.5 10.5"/>
      <path ${L("var(--il-creme)", 5)} d="M37 38.5l10.5 10.5"/>
      <circle cx="51.2" cy="47.6" r="4.1" ${F("creme")} ${T}/><circle cx="46.4" cy="52.4" r="4.1" ${F("creme")} ${T}/>
      <path ${L("var(--il-creme)", 5)} d="M47 48.8l1.4 1.4"/>
      <path ${F("croute")} ${T} d="M27.6 8.6c11.4-1.4 21 6.6 19.6 17.2-.8 6.4-5.4 10.6-10.2 13.2-2.8 1.6-5.2 3.4-7 5.6C17.8 44.4 9.8 36 10.4 25.8 11 16.6 18.4 9.8 27.6 8.6z"/>
      <path ${L("var(--il-mie)", 2.2)} d="M18.6 19.6c2.4-3.4 6.6-5.2 10.6-5M16.2 27.2c.2-1.4.6-2.6 1.2-3.8"/>
      <path ${L("var(--il-basilic)", 2)} d="M6.5 54.5c6.6-5.8 13.6-8.4 21-8.6"/>
      <path ${L("var(--il-basilic)", 1.8)} d="M11 51l-.6-4M15.4 48.6l-.4-4M19.8 47.2l.2-3.8M12.2 52.4l3.2 1.6M16.8 50.2l3.4 1.4M21.4 48.6l3.4 1.2"/>`,
    poisson: `
      <path ${F("saumon")} ${T} d="M6.5 31.5c8.6-11.6 24-14.4 35.6-7.4L53 15.5v32l-10.9-8.6C30.5 46 15.1 43.1 6.5 31.5z"/>
      <path ${L("var(--il-trait)", 1.8)} stroke-opacity=".45" d="M22.6 23.6c2.4 4.6 2.4 11.2 0 15.8"/>
      <path ${L("var(--il-creme)", 1.8)} d="M28.6 31.5h10M29.8 27.4c3 .6 6 .6 8.6 0M29.8 35.6c3-.6 6-.6 8.6 0"/>
      <circle cx="14.6" cy="29.6" r="2.1" fill="var(--il-trait)"/>
      <circle cx="47" cy="50" r="7.6" ${F("safran")} ${T}/>
      <path ${L("var(--il-creme)", 1.5)} d="M47 44.6v10.8M41.6 50h10.8M43.2 46.2l7.6 7.6M50.8 46.2l-7.6 7.6"/>`,
    soupe: `
      <path ${L("var(--il-trait)", 2.4)} d="M51 5.5 40.5 27"/>
      ${vapeur([22, 29], 16)}
      <path ${F("creme")} ${T} d="M7 30.5h50c0 13.2-11.2 22.5-25 22.5S7 43.7 7 30.5z"/>
      <ellipse cx="32" cy="30.5" rx="25" ry="6.2" ${F("potiron")} ${T}/>
      <path ${L("var(--il-creme)", 2)} d="M20 30.5c2-3.2 9-3.4 10.2-.2 1 2.6-5 3.6-5.6 1.4"/>
      <circle cx="36" cy="29" r="1.3" ${F("basilic")}/><circle cx="40.5" cy="31.5" r="1.3" ${F("basilic")}/><circle cx="44" cy="28.6" r="1.3" ${F("basilic")}/>
      <path ${L("var(--il-tomate)", 1.8)} d="M15 41c3.4 1.8 7 1.8 10.4 0M28.8 43c2 .8 4.4.8 6.4 0M39 41c3.4 1.8 6.8 1.8 10 0"/>
      <path ${F("creme")} ${T} d="M24 52.5h16l-1.2 4.5H25.2z"/>`,
    galette: `
      <path ${F("croute")} ${T} d="M32 5 59 32 32 59 5 32z"/>
      <path ${F("fromage")} ${T} d="M32 17.5 46.5 32 32 46.5 17.5 32z"/>
      <path ${L("var(--il-trait)", 1.4)} stroke-opacity=".3" d="M18.5 18.5 25 25M45.5 18.5 39 25M18.5 45.5 25 39M45.5 45.5 39 39"/>
      <path ${F("jambon")} d="M23 30.5c2-2.6 4.6-3.6 7-2.6-1.4 2.4-4.2 3.8-7 2.6zM34.6 37.6c2.2-1.6 5-1.6 6.6.2-2.2 1.8-4.8 2-6.6-.2z"/>
      <circle cx="32" cy="32" r="7.2" ${F("creme")}/>
      <circle cx="32.4" cy="32.4" r="3.6" ${F("safran")} ${T}/>`,
    taco: `
      <path ${F("tortilla-2")} ${T} d="M10 40.5a22 22 0 0 1 44 0z"/>
      <path ${L("var(--il-basilic)", 3.2)} d="M13.5 32.5c2.4-1.4 3.4 1.4 5.6 0s2.6-4 5.4-3.4 3.2 2.4 5.6.8 3.4-3 6.2-1.6 2.6 3 5.4 2.4 3.4 2 5.2 3.4"/>
      <circle cx="21" cy="29.4" r="2.6" ${F("tomate")}/><circle cx="33" cy="26.4" r="2.6" ${F("tomate")}/><circle cx="44" cy="30" r="2.6" ${F("tomate")}/>
      <path ${L("var(--il-safran)", 2)} d="M26 27.5l2.4-3.2M38.4 27.6l2.6-2.6M16.6 33l1.4-3"/>
      <path ${F("tortilla")} ${T} d="M7 43.5c0-9.6 11.2-15.6 25-15.6s25 6 25 15.6c0 2.6-2 4-4.6 4H11.6C9 47.5 7 46.1 7 43.5z"/>
      <circle cx="18" cy="40" r="1.1" ${F("croute")}/><circle cx="28" cy="36.5" r="1.1" ${F("croute")}/><circle cx="40" cy="38.6" r="1.1" ${F("croute")}/><circle cx="48" cy="42" r="1.1" ${F("croute")}/>
      <path ${L("var(--il-trait)", 2.6)} d="M10 54h44"/>`,
    wok: `
      <path ${F("pate")} ${T} d="M12.5 33c.6-6.6 5.4-9.6 9.6-7.6 1.8-5.4 8.4-6.4 11.6-2.4 4.2-3 10.6-.6 11 5.8 2.4 0 4 1.6 4.4 4.2z"/>
      <path ${L("var(--il-safran)", 2)} d="M17 32c2-3 4-3 6 0M24 30c2-3.6 4.6-3.6 6.6 0M32 29c2-3.6 4.6-3.6 6.6 0M39.4 31c1.6-2.6 3.6-2.6 5.2 0"/>
      <path ${L("var(--il-tomate)", 2.8)} d="M20 26.2l3.4 2.4M35.6 23.6l2 3.4"/>
      <path ${L("var(--il-basilic)", 2.8)} d="M28.4 24.6l3.2-1.4M42 27.6l3.2 1"/>
      <path ${L("var(--il-safran)", 2)} d="M30 13l1.4-2.4M37.6 15.6l2.4-1.2M23.6 16.4l-1-2.6"/>
      <path fill="var(--il-fonte)" ${T} d="M6 33h44c0 10.4-9.4 17-22 17S6 43.4 6 33z"/>
      <path ${L("var(--il-trait)", 5.6)} d="M49 35.5l11.5-3.4"/>
      <path ${L("var(--il-bois)", 3.2)} d="M50.4 35l9.8-2.9"/>
      <path ${F("tomate")} d="M20 57c-2.4-2.6.2-5.2 1.6-7.4 1.4 2 4 4.4 1.8 7.4zM29.6 57.6c-2.6-3 .2-6 1.8-8.4 1.6 2.4 4.4 5 2 8.4zM39.6 57c-2.4-2.6.2-5.2 1.6-7.4 1.4 2 4 4.4 1.8 7.4z"/>
      <path ${F("safran")} d="M21.4 56.6c-.8-1.2 0-2.4.6-3.4.6 1 1.4 2.2.6 3.4zM31.2 57.2c-.8-1.4 0-2.8.8-4 .8 1.2 1.6 2.6.6 4zM41 56.6c-.8-1.2 0-2.4.6-3.4.6 1 1.4 2.2.6 3.4z"/>`,
    gyoza: `
      <ellipse cx="44" cy="51" rx="13" ry="5.6" ${F("bol")} ${T}/>
      <ellipse cx="44" cy="50" rx="8.6" ry="2.8" fill="var(--il-sauce)"/>
      <path ${F("creme")} ${T} d="M24 25.5c0-8 7.4-13 16-13s16 5 16 13z"/>
      <path ${L("var(--il-trait)", 1.6)} stroke-opacity=".55" d="M30 15.6l1.6 3.2M35.4 13.4l1.2 3.4M41 12.8l.6 3.4M46.4 13.6l-.2 3.4M51.4 16l-1 3.2"/>
      <path ${L("var(--il-croute)", 3)} d="M25.6 25.5h28.8"/>
      <path ${F("creme")} ${T} d="M6 41.5c0-9 8.4-14.6 18-14.6s18 5.6 18 14.6z"/>
      <path ${L("var(--il-trait)", 1.6)} stroke-opacity=".55" d="M12.6 30.6l1.8 3.4M18.6 28.2l1.4 3.6M24.8 27.6l.6 3.6M31 28.4l-.2 3.6M36.6 30.8l-1.2 3.4"/>
      <path ${L("var(--il-croute)", 3.4)} d="M7.8 41.5h32.4"/>
      <path ${L("var(--il-basilic)", 2)} d="M8 53.5c3.6-1.4 6.8-1.4 10 0M14 57c2.6-1 5-1 7.4 0"/>`,
    cloche: `
      <path ${L("var(--il-trait)", 3)} d="M4.5 47.5h55"/>
      <path ${F("metal")} ${T} d="M9 44.5c0-13.2 10.3-23.5 23-23.5s23 10.3 23 23.5z"/>
      <path ${L("var(--il-creme)", 2.4)} d="M17.4 36.4c1.8-4.6 5.6-8 10.4-9.4"/>
      <circle cx="32" cy="17.5" r="3.6" ${F("tomate")} ${T}/>
      <path ${F("metal")} ${T} d="M9 44.5h46v2.4c0 .6-.4 1-1 1H10c-.6 0-1-.4-1-1z"/>`
  };

  // Famille d'un plat d'après son nom puis sa catégorie
  const REGLES = [
    [/pizza|pâte à pizza|calzone|focaccia/i, "pizza"],
    [/gyoza|ravioli chinois|dumpling/i, "gyoza"],
    [/ramen|udon|soba(?!.*yaki)|pho|bouillon/i, "bol"],
    [/yakisoba|cantonais|wok|sauté|nouilles/i, "wok"],
    [/curry|donburi|oyakodon|omuraisu|teriyaki|bibimbap|riz/i, "riz"],
    [/spaghetti|tagliatell|penne|lasagne|cacio|carbonara|risotto|gnocchi|pâtes|pasta/i, "pates"],
    [/pain|brioche|baguette|fougasse/i, "pain"],
    [/velouté|soupe|potage|minestrone/i, "soupe"],
    [/galette|crêpe/i, "galette"],
    [/quesadilla|taco|burrito|fajita|nachos/i, "taco"],
    [/fish|saumon|poisson|cabillaud|thon|crevette/i, "poisson"],
    [/poulet|cuisse|dinde|canard/i, "poulet"]
  ];
  const PAR_CATEGORIE = {Pizza: "pizza", Japonais: "bol", Italien: "pates", Boulangerie: "pain", Asiatique: "wok", "Tex-mex": "taco"};
  function famille(r) {
    if (!r) return "cloche";
    const nom = (r.nom || "") + " " + (r.libre || "");
    for (const [re, f] of REGLES) if (re.test(nom)) return f;
    return PAR_CATEGORIE[r.categorie] || "cloche";
  }
  // Teinte de la vignette, par famille
  const TEINTE = {pizza: "tomate", taco: "tomate", soupe: "tomate", bol: "safran", riz: "safran", gyoza: "safran", wok: "safran", poulet: "safran",
    pates: "basilic", pain: "pla", galette: "pla", poisson: "pic", cloche: "neutre"};

  const plat = (nom, cls = "") => `<svg class="illus ${cls}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">${PLATS[nom] || PLATS.cloche}</svg>`;
  const vignette = (r, cls = "") => { const f = famille(r); return `<span class="vignette t-${TEINTE[f]} ${cls}" aria-hidden="true">${plat(f)}</span>`; };

  // Emblème : la plaque émaillée basilic, une cocotte tomate au couvercle crème et une feuille de basilic pour bouton
  const embleme = (cls = "") => `<svg class="embleme ${cls}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <rect x="1.5" y="1.5" width="45" height="45" rx="14" fill="var(--em-fond)"/>
    <rect x="4.6" y="4.6" width="38.8" height="38.8" rx="11" fill="none" stroke="var(--em-filet)" stroke-width="1.2"/>
    <path fill="var(--em-tomate)" d="M12.6 25.6h22.8v4.6c0 4.2-3.4 7.4-7.6 7.4h-7.6c-4.2 0-7.6-3.2-7.6-7.4z"/>
    <path fill="var(--em-creme)" d="M9.6 26.4h4v2.8h-4a1.4 1.4 0 0 1 0-2.8zM38.4 26.4h-4v2.8h4a1.4 1.4 0 0 0 0-2.8z"/>
    <path fill="var(--em-creme)" d="M11.4 23.6c.8-5.4 6-8.8 12.6-8.8s11.8 3.4 12.6 8.8z"/>
    <path fill="var(--em-feuille)" d="M23.2 14.8c-.6-3.6 2-6.6 5.8-6.8.4 3.6-2.2 6.4-5.8 6.8z"/>
    <path fill="none" stroke="var(--em-fond)" stroke-width=".9" stroke-linecap="round" d="M23.6 14.2c1.4-1.8 2.8-3.2 4.4-4.4"/>
  </svg>`;

  // Icônes d'enseignes (24 × 24, trait)
  const ENSEIGNES = {
    GF: '<path d="M15.6 8.4c-2.6-2.6-6.4-1.4-8 1.8L4 19.8c-.4.8.4 1.6 1.2 1.2l9.6-3.6c3.2-1.6 4.4-5.4 1.8-8z"/><path d="M15.6 8.4l1.6-4.4M15.6 8.4 20 6.8M15.6 8.4l3.8 1.6M9.2 12.4l2 2M7.2 16.2l1.8 1.6"/>',
    LEC: '<path d="M3.5 5h2.4l2.2 10.2a1.6 1.6 0 0 0 1.6 1.3h7.6a1.6 1.6 0 0 0 1.5-1.2L20.5 9H7"/><circle cx="10" cy="19.6" r="1.3"/><circle cx="17" cy="19.6" r="1.3"/>',
    PIC: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4"/>',
    PLA: '<path d="M8 3.5h8M7 6.5h10"/><path d="M7 6.5c-1.6 1.2-2 2.6-2 4.2v7.6a2.2 2.2 0 0 0 2.2 2.2h9.6a2.2 2.2 0 0 0 2.2-2.2v-7.6c0-1.6-.4-3-2-4.2"/><path d="M8.5 13h7"/>'
  };
  const enseigne = e => `<svg class="ico-ens" viewBox="0 0 24 24" aria-hidden="true">${ENSEIGNES[e] || ""}</svg>`;

  // Le robot (pour la page Robot) : socle, écran, bol et couvercle à cheminée
  const robot = (cls = "") => `<svg class="illus ${cls}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    ${vapeur([32], 8)}
    <path ${F("verre")} ${T} d="M16.5 19h31l-2.2 22.5H18.7z"/>
    <path ${F("potiron")} d="M18.3 31h27.4l-1 10.5H19.3z"/>
    <path ${L("var(--il-creme)", 1.6)} d="M21 23.5l.8 6"/>
    <path ${L("var(--il-trait)", 2.2)} d="M47 23.5c6 0 8.2 3 8.2 7.6S53 38.6 47 38.6"/>
    <rect x="14" y="14" width="36" height="5.4" rx="2.7" ${F("metal")} ${T}/>
    <rect x="28.4" y="8.6" width="7.2" height="5.4" rx="1.6" ${F("metal")} ${T}/>
    <path ${F("metal")} ${T} d="M13.6 41.5h36.8l2.6 13.2c.3 1.6-.9 2.8-2.5 2.8H13.5c-1.6 0-2.8-1.2-2.5-2.8z"/>
    <rect x="23.5" y="45.4" width="17" height="7.4" rx="2" fill="var(--il-fonte)"/>
    <path ${L("var(--il-safran)", 1.8)} d="M27 49.1h4.4M34 49.1h3"/>
  </svg>`;

  // Remplit les emplacements marqués dans les pages : <span data-embleme>, <span data-illus="robot">
  function remplir(racine = document) {
    racine.querySelectorAll("[data-embleme]:empty").forEach(el => el.innerHTML = embleme());
    racine.querySelectorAll("[data-illus]:empty").forEach(el => { const n = el.dataset.illus; el.innerHTML = n === "robot" ? robot() : plat(n); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => remplir()); else remplir();

  window.Illus = {plat, vignette, famille, embleme, enseigne, robot, remplir, FAMILLES: Object.keys(PLATS)};
})();
