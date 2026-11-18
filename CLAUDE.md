# Appli Cuisine : consignes

Appli Android (Capacitor) en français, faite de pages HTML/JS sans framework. Interface et code en français.

## Données (`data/cuisine.json`)

L'appli lit ce fichier sur GitHub (raw.githubusercontent.com, branche `main`) à chaque ouverture et le fusionne avec sa base locale. C'est par lui que Claude livre les menus et les recettes.

- Format : `{"maj": ISO, "docs": {"<collection>/<id>": {"t": ISO, "d": {...}}}}`. Collections : `recettes`, `semaines` (id = vendredi de début, AAAA-MM-JJ), `config/reglages`, `config/reperes`, `config/drive`, `equipement`, `courses/actuel`.
- Toujours mettre `t` à l'heure de la modification et `maj` au niveau du fichier. Un document modifié sur le téléphone n'est remplacé que si `t` est plus récent ; un document absent du fichier est retiré du téléphone, sauf s'il y a été modifié.
- Repas : `semaines/<vendredi>.d.repas["AAAA-MM-JJ_midi|soir"] = {"r": id de recette, "p": portions, "lancer": "HH:MM" (dîners), "note": "..."}`. Chaque `r` doit exister dans `recettes/`.
- Recettes : `etapes` est une liste de lignes ; « ## Titre · durée » ouvre une partie, « > … » est un encadré. Les réglages « EXPERT 120 °C, vitesse 1, 3 min » deviennent un bouton qui règle le robot. Ingrédients `{q, u, n, e, g?}`, `e` ∈ GF, LEC, PIC, PLA, RES, NON.
- Les modifications faites dans l'appli restent sur le téléphone ; Antoine peut les copier (Repères › Données) et les coller dans la conversation pour qu'elles soient reportées ici.
- Dépôt public : pas de prénom ni d'informations privées dans les données.
- Pousser une modification de `data/` seule ne relance pas la compilation.

## Code

- Robot : ne jamais envoyer AUTO ni PULSE (touches autorisées : `TOUCHES` dans `src/robot/js/robot.js`). `src/robot/lib/` est généré, ne pas le modifier à la main. Jamais de nom ni d'adresse Bluetooth d'un robot réel dans le dépôt.
- Thème commun dans `src/commun/theme.css` : une police (Bricolage Grotesque), basilic pour agir, tomate pour ce qui chauffe, safran pour « aujourd'hui », la plaque émaillée pour ce qui se passe maintenant. Pas de libellés en capitales.
- Tester en local : `npm run build`, puis servir `www/` (le Bluetooth et les notifications ne fonctionnent que dans l'APK).
