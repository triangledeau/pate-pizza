# Pâte à pizza

Calculateur de pâte à pizza pour Android : pesée, planning, rappels à chaque grande étape et suivi pas à pas.

**Installer la dernière version :** ouvre ce lien sur le téléphone
https://github.com/triangledeau/pate-pizza/releases/latest/download/pate-pizza.apk

Chaque modification poussée sur `main` recompile l'appli (GitHub Actions) et publie une nouvelle version.

## Structure

- `src/index.html` : l'appli (calculs, planning, suivi)
- `src/notifs.js` : notifications locales et écran maintenu allumé (plugins Capacitor)
- `android/` : projet Android généré par Capacitor
