# Maisonic

Application mobile installable (PWA) : chaque jour, la séance sans salle, un peu plus dure chaque semaine.

## Lancer

Node 18 ou plus. Aucune dépendance à installer.

```
ANTHROPIC_API_KEY=... SESSION_SECRET=une-longue-chaine-aleatoire node server.js
```

Puis ouvrir http://localhost:3000 sur le téléphone (en production : en HTTPS, indispensable pour l'installation sur l'écran d'accueil et le service worker).

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `ANTHROPIC_API_KEY` | Clé du modèle. Reste côté serveur, jamais envoyée à l'app. |
| `ANTHROPIC_MODEL` | Modèle utilisé (défaut : `claude-sonnet-5-5`). |
| `SESSION_SECRET` | Secret qui signe les connexions. À fixer en production. |
| `GOOGLE_CLIENT_ID` | ID client OAuth Google (type « Application Web », origine autorisée = ton domaine). |
| `APPLE_CLIENT_ID` | Identifiant de service « Sign in with Apple » (domaine et URL de retour = ton domaine). |
| `DATA_DIR` | Dossier de sauvegarde des comptes (défaut : `./data`). Prévoir un disque persistant. |
| `DEV_UNLOCK=1` | Pour tester : considère tous les comptes connectés comme abonnés. À ne jamais activer en production. |
| `PORT` | Port d'écoute (défaut : 3000). |

## Brancher le paiement (prompt suivant)

Aucun paiement n'est codé. Les boutons « Continuer », « Profiter de l'offre » et « Restaurer mes achats » appellent des points d'accroche :

```js
window.Maisonic.prices = { annual: '…', monthly: '…' };      // remplit les emplacements de prix
window.Maisonic.onPurchase = async ({ plan, discount }) => true; // true = achat réussi, l'app se déverrouille
window.Maisonic.onRestore = async () => true;
```

Côté serveur, le statut abonné se lit sur `user.premium` (voir `handleMe` dans `server.js`) : c'est là que le paiement écrira son résultat.

## Fichiers

- `server.js` : API (séance par le modèle, connexion Google/Apple, sauvegarde du compte) et fichiers statiques
- `public/app.js` : tous les écrans
- `public/styles.css` : identité visuelle
- `public/sw.js`, `public/manifest.webmanifest`, icônes : installation sur l'écran d'accueil
- `public/conditions.html`, `public/confidentialite.html` : pages légales (à faire relire par un juriste avant publication)
