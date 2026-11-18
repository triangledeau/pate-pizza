# Cuisine

L'appli Android de la cuisine : menus de la semaine, recettes avec mode pas à pas, courses, pâte à pizza (pesée, planning, rappels) et pilotage du Magimix Cook Expert et de sa balance en Bluetooth.

**Installer la dernière version :** ouvre ce lien sur le téléphone
https://github.com/triangledeau/pate-pizza/releases/latest/download/cuisine.apk

Chaque modification du code poussée sur `main` recompile l'appli (GitHub Actions) et publie une nouvelle version. Une modification de `data/` seule ne recompile rien : l'appli relit le fichier à l'ouverture.

## Structure

- `src/index.html` : Semaine, Recettes, Courses, Repères
- `src/pizza.html` : calculateur et suivi de la pâte à pizza
- `src/robot.html`, `src/robot/` : pilotage du Cook Expert (protocole dans `src/robot/lib/`, généré depuis [cookexpert-bt](https://github.com/Julien-Deudon/cookexpert-bt), licence MIT)
- `src/commun/theme.css` : couleurs, police, composants communs
- `src/commun/natif.js` : rappels, écran allumé, Bluetooth (plugin `SerieBt` pour le robot, `bluetooth-le` pour la balance), base de données locale
- `android/.../SerieBtPlugin.java` : liaison série Bluetooth classique avec le robot
- `data/cuisine.json` : menus, recettes, repères, produits du drive

## Sécurité du robot

L'appli règle les programmes mais ne démarre jamais le moteur ni la chauffe : c'est le cuisinier qui appuie sur AUTO. Ni AUTO ni PULSE ne sont envoyés.

Projet personnel, sans lien avec Magimix.
