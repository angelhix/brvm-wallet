# Kauri BRVM Compass

Créer et finaliser toutes les pages de la plateforme de suivi de portefeuille BRVM (Kauri) en se basant sur le dépôt https://github.com/angelhix/brvm-capital-insights/ , la version https://brvm-capital-compass.lovable.app et le cahier des charges PDF joint.

Ne pas s'attarder sur la base de données, finaliser l'ensemble des pages du site :
1. Page d'import des relevés (/dashboard/transactions/import) avec l'écran de vérification des opérations détectées et validation.
2. Analyse globale (/dashboard/analyse-globale) avec les onglets Variations, Résiduelles, Volumes, Par titre, Dividendes.
3. Fiche titre (/dashboard/analyse) avec les fondamentaux, ratios et historique du titre.
4. Screener (/dashboard/analyse/screener) pour filtrer les 48 titres cotés selon les critères financiers.
5. Paramètres (/dashboard/settings) avec profil, sécurité, gestion du portefeuille, visites guidées et export des données.
6. Rendez-vous (/rendez-vous) avec formulaire de réservation d'un échange de 30 minutes.
7. Parrainage (/parrainage) avec lien unique, statistiques et liste des filleuls.
8. Back-office administrateur (/admin) avec gestion des utilisateurs, messages de contact et supervision des données.
9. Configuration PWA pour l'installation sur smartphone (manifest, icônes, offline).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kauri-brvm-compass.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f96f3e1e-1400-4b9c-b058-7b184f97fac0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
