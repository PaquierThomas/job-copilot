# 📘 Guide de Projet : Extension Firefox de Candidature Express (« Job Copilot »)

Ce projet consiste à développer une extension Firefox qui **remplit à ta place les formulaires de candidature, quel que soit le site**, et qui **joint automatiquement le bon CV et la bonne lettre de motivation** (fichiers PDF que tu as importés dans l'extension). Le score de correspondance avec l'offre est une fonctionnalité **bonus, développée en dernier**.

Le projet est pensé pour un **premier contact avec les extensions** : chaque phase introduit une notion nouvelle et se termine par un résultat visible. Il n'y a ni serveur, ni compte utilisateur : tout est stocké localement dans le navigateur.

---

## 🎯 Objectifs Principaux

* **Comprendre l'anatomie d'une extension Firefox** : manifest, popup, content scripts, background, page d'options.
* **Faire communiquer les différents contextes** de l'extension (messagerie interne).
* **Persister des données localement** : profil en JSON (`storage`) et fichiers PDF (IndexedDB).
* **Remplir des formulaires inconnus** en détectant les champs de façon heuristique, sans dépendre d'un site précis.
* **Injecter des fichiers** dans des champs `<input type="file">` par programmation.
* **Construire une interface de gestion de documents** (zone de dépôt / drag & drop, choix du CV par défaut).
* **Packager et tester** l'extension avec les outils officiels (`web-ext`).
* *(Bonus final)* **Consommer une API de LLM** pour calculer un score de correspondance.

---

## 🛠️ Stack Technique

* **Navigateur cible :** Firefox (Desktop)
* **Format d'extension :** WebExtension, **Manifest V3**
* **Langage :** JavaScript moderne (ES Modules). TypeScript optionnel, plus tard.
* **Outillage :** Node.js + `web-ext` (lancement, rechargement automatique, lint, packaging)
* **Stockage du profil et des réglages :** `browser.storage.local`
* **Stockage des fichiers PDF :** IndexedDB (adapté aux fichiers volumineux, contrairement à `storage.local`)
* **Format du profil :** JSON inspiré du standard *JSON Resume*, avec une section `preferences` ajoutée
* **Bonus :** API d'un LLM (Anthropic, OpenAI, ou Ollama en local)

> 💡 **Conseil de débutant :** pas de framework (React, Vue...) ni de bundler au début. Des fichiers HTML/JS simples suffisent et évitent de mélanger les difficultés.

---

## 🧭 Les notions à comprendre avant de commencer

| Élément | Rôle | Analogie |
|---|---|---|
| `manifest.json` | Carte d'identité : nom, version, permissions, fichiers à charger | Le `package.json` de l'extension |
| **Popup** (`action`) | Petite fenêtre qui s'ouvre au clic sur l'icône | Le « tableau de bord » |
| **Content script** | Script qui s'exécute **dans** une page web et peut lire/modifier son DOM | Les yeux et les mains de l'extension |
| **Background script** | Script d'arrière-plan, sans page visible | Le « cerveau » central |
| **Page d'options** | Page HTML de réglages (profil, documents) | Les paramètres |

Les contextes sont **isolés** : ils ne partagent pas leurs variables et communiquent par **messages** (`browser.runtime.sendMessage`, `browser.tabs.sendMessage`).

**Particularité Firefox :** on utilise `browser.*` (fonctions qui renvoient des *Promises*), pas `chrome.*` (callbacks).

**Différences Manifest V3 à retenir :** la clé du bouton de barre d'outils s'appelle `action` (et non `browser_action`), les accès aux sites passent par `host_permissions`, et `manifest_version` vaut `3`.

---

## 🏗️ Phase 0 : Découverte et « Hello World »

*L'objectif de cette phase est de mettre en place l'environnement et de voir une extension minimale tourner dans Firefox.*

### 0.1 Environnement de développement
* **Objectif :** Installer les outils et comprendre la boucle de développement. `FAIT`
* **Livrable :**
    * Node.js et `web-ext` installés (`npm install --global web-ext`).
    * Un dépôt Git initialisé avec un `.gitignore`.
    * Une arborescence de départ :
      ```
      job-copilot/
      ├── manifest.json
      ├── popup/        (popup.html, popup.js, popup.css)
      ├── content/      (content.js)
      ├── background/   (background.js)
      ├── options/      (options.html, options.js, options.css)
      └── icons/
      ```

### 0.2 Première extension
* **Objectif :** Écrire un `manifest.json` **minimal** et le charger sans erreur. `FAIT`
* **Livrable :**
    * Un manifest contenant uniquement : `manifest_version`, `name`, `version`, `action` (popup), `icons`, et `browser_specific_settings.gecko.id`.
    * Un popup affichant « Hello » avec un bouton.
    * Le chargement via `about:debugging` → *Ce Firefox* → *Charger un module complémentaire temporaire*, puis via `web-ext run`.
    * Un script qui écrit dans la console et la capacité de retrouver ce message dans les **3 consoles de debug** (page, popup, background).

> ⚠️ **Règle d'or du manifest :** n'ajoute une clé que quand tu en as besoin, et vérifie que **chaque fichier référencé existe**. Un manifest d'exemple copié depuis la documentation contient des clés et des fichiers qui ne sont pas les tiens.

---

## 🧱 Phase 1 : Socle, Profil Utilisateur et Stockage

*L'objectif de cette phase est de définir les données de l'utilisateur et de pouvoir les saisir et les conserver.*

### 1.1 Le format du profil maître
* **Objectif :** Définir un schéma JSON unique, source de vérité pour tout le projet. `EN COURS`
* **Livrable :** Un fichier `profile.example.json` basé sur le standard **JSON Resume** (<https://jsonresume.org/schema>), avec :
    * `basics` : prénom/nom, email, téléphone, ville, adresse, code postal, pays, liens (LinkedIn, GitHub, site web), accroche.
    * `work`, `education`, `skills`, `languages`.
    * Une section **`preferences`** ajoutée par toi : prétentions salariales, disponibilité / préavis, mobilité, télétravail, autorisation de travail, types de contrat.
    * Des **champs « réponses types »** pour les questions récurrentes des formulaires (ex. `answers.availability`, `answers.salaryExpectation`, `answers.whyJoin`).

> 💡 Ces « réponses types » seront très utiles en Phase 3 : beaucoup de formulaires posent toujours les mêmes questions.

### 1.2 La page d'options : le profil
* **Objectif :** Permettre de saisir, modifier et sauvegarder le profil. `À FAIRE`
* **Livrable :**
    * Une page `options.html` déclarée dans le manifest (`options_ui`) avec un champ texte JSON dans un premier temps, puis un formulaire structuré.
    * Sauvegarde et lecture via `browser.storage.local.set()` / `.get()`.
    * Boutons **Exporter** et **Importer** le profil en JSON (sauvegarde de sécurité).
* **Notion clé :** permission `"storage"` à déclarer dans le manifest.

### 1.3 Le popup lit le profil
* **Objectif :** Vérifier que les données circulent entre options et popup. `À FAIRE`
* **Livrable :** Le popup affiche « Bonjour *Prénom* » à partir du profil stocké, et invite à le remplir s'il est vide. Un lien ouvre la page d'options (`browser.runtime.openOptionsPage()`).

---

## 📂 Phase 2 : Bibliothèque de Documents (CV et Lettres de Motivation)

*L'objectif de cette phase est de pouvoir importer plusieurs fichiers PDF dans l'extension, les nommer, et choisir lesquels utiliser.*

### 2.1 Stockage des fichiers
* **Objectif :** Conserver des PDF dans le navigateur de façon fiable. `À FAIRE`
* **Livrable :**
    * Une petite couche d'accès à **IndexedDB** (fonctions `saveDocument`, `listDocuments`, `getDocument`, `deleteDocument`).
    * Chaque document possède : un identifiant, un **libellé** choisi par toi (« CV Dev Python », « CV Data »), un **type** (`cv` ou `lettre`), le nom d'origine, la taille, la date d'ajout, et le contenu (`Blob`).
* **Pourquoi IndexedDB :** `storage.local` est limité et sérialise mal les gros fichiers. IndexedDB stocke nativement les `Blob`.

> ⚠️ **Piège :** l'IndexedDB d'une **page web** n'appartient pas à ton extension. Seules les pages de l'extension (options, popup, background) accèdent à **ton** IndexedDB. Un content script, lui, voit celui du site visité : il devra donc **demander** les fichiers au background par messagerie (voir Phase 4).

### 2.2 Zone de dépôt (drop zone) dans la page d'options
* **Objectif :** Importer des PDF par glisser-déposer ou via un sélecteur. `À FAIRE`
* **Livrable :**
    * Une zone `div` qui réagit aux événements `dragenter`, `dragover`, `dragleave` et `drop` (avec `preventDefault()`), et lit les fichiers via `event.dataTransfer.files`.
    * Un bouton de secours `<input type="file" accept="application/pdf" multiple>`.
    * **Validation** : refuser ce qui n'est pas un PDF (vérifier le type MIME, pas seulement l'extension) et fixer une taille maximale raisonnable.
    * Un retour visuel : zone surlignée pendant le survol, message de succès ou d'erreur.

### 2.3 Gestion de la liste
* **Objectif :** Organiser tes documents. `À FAIRE`
* **Livrable :** Une liste des documents importés avec : renommer, supprimer, télécharger à nouveau, prévisualiser (`URL.createObjectURL(blob)` dans un nouvel onglet), et marquer un **CV par défaut** et une **lettre par défaut**.

---

## ✍️ Phase 3 : Remplissage Universel des Champs de Texte

*L'objectif de cette phase est de remplir un formulaire inconnu, sur n'importe quel site.*

### 3.1 Stratégie d'injection
* **Objectif :** Choisir comment le code arrive dans les pages. `À FAIRE`
* **Livrable :** Un choix argumenté entre deux approches, documenté dans le README :
    * **A. Content script sur toutes les pages** (`matches: ["<all_urls>"]`) : toujours prêt, mais demande une permission très large.
    * **B. Injection à la demande** avec la permission `activeTab` et l'API `scripting.executeScript` : le code n'est injecté que quand tu cliques sur le bouton du popup. **Recommandée** (moins de permissions, plus respectueuse de la vie privée).
* Dans les deux cas : prévoir `allFrames: true` pour les formulaires placés dans des iframes.

### 3.2 Détection des champs
* **Objectif :** Savoir quel champ correspond à quelle donnée du profil. `À FAIRE`
* **Livrable :** Une fonction qui parcourt les `input`, `textarea` et `select` visibles et associe chacun à une clé du profil, en s'appuyant par ordre de fiabilité sur :
    1. l'attribut **`autocomplete`** (`given-name`, `family-name`, `email`, `tel`, `postal-code`...) : le plus fiable,
    2. `type` (`email`, `tel`, `url`),
    3. le texte du **`<label>`** associé (`for`/`id`, label parent, `aria-label`, `aria-labelledby`),
    4. `name`, `id` et `placeholder`.
    * Un **dictionnaire de mots-clés multilingues** (« prénom », « first name », « nom de famille », « surname », « téléphone », « mobile »...).
    * Un **score de confiance** par champ : on ne remplit pas ce dont on n'est pas sûr.

### 3.3 Injection des valeurs
* **Objectif :** Remplir sans casser les frameworks front-end. `À FAIRE`
* **Livrable :** Une fonction `fillField(el, value)` qui :
    * écrit la valeur via le **setter natif** de l'élément (`HTMLInputElement.prototype`, `HTMLTextAreaElement.prototype`),
    * déclenche `input` et `change` avec `bubbles: true`.
    * Gère aussi : `select` (correspondance sur le texte ou la valeur), cases à cocher, boutons radio, champs de date.
* **Pourquoi :** sur React/Vue/Angular, écrire simplement `el.value = ...` ne suffit pas, le framework ne voit pas le changement.

### 3.4 Contrôle utilisateur
* **Objectif :** Ne jamais remplir à l'insu de l'utilisateur. `À FAIRE`
* **Livrable :**
    * Un bouton « Remplir le formulaire » dans le popup.
    * Un surlignage temporaire des champs remplis et un compteur (« 8 remplis, 3 non reconnus »).
    * Une option « Aperçu avant remplissage » permettant de corriger l'association d'un champ.
    * **Aucune soumission automatique** du formulaire.

### 3.5 Questions ouvertes (réponses types)
* **Objectif :** Réutiliser tes réponses habituelles. `À FAIRE`
* **Livrable :** Les `textarea` et champs correspondant à des questions courantes (disponibilité, prétentions salariales, autorisation de travail...) sont pré-remplis avec les `answers` du profil.

---

## 📎 Phase 4 : Injection du CV et de la Lettre de Motivation

*L'objectif de cette phase est de joindre automatiquement les bons fichiers dans les champs d'upload.*

### 4.1 Choix des documents dans le popup
* **Objectif :** Choisir, pour chaque candidature, quel CV et quelle lettre utiliser. `À FAIRE`
* **Livrable :** Deux listes déroulantes dans le popup (CV, lettre), alimentées par la bibliothèque de la Phase 2 et pré-sélectionnées sur les documents par défaut, avec un choix « Aucune lettre ».

### 4.2 Détection des champs d'upload
* **Objectif :** Identifier quel `<input type="file">` attend le CV et lequel attend la lettre. `À FAIRE`
* **Livrable :** Une fonction qui recense les `input[type=file]` de la page (y compris masqués par du CSS, car les sites cachent souvent le vrai champ derrière un joli bouton) et les classe par mots-clés (« CV », « resume », « curriculum », « lettre », « cover letter », « motivation »), en s'aidant de l'attribut `accept`, du label et du texte voisin. En cas de doute, demander à l'utilisateur.

### 4.3 Transmission des fichiers au content script
* **Objectif :** Faire passer un PDF du stockage de l'extension jusqu'à la page. `À FAIRE`
* **Livrable :** Le content script envoie `{ type: "GET_DOCUMENT", id }` au background ; le background lit IndexedDB et répond avec le fichier (les `Blob` et `ArrayBuffer` peuvent être transmis par messagerie sur Firefox).

### 4.4 Injection dans le champ
* **Objectif :** Attacher le fichier comme si l'utilisateur l'avait choisi lui-même. `À FAIRE`
* **Livrable :** Une fonction qui :
    * construit un objet `File` à partir du `Blob` (avec le bon nom et `type: "application/pdf"`),
    * le place dans un `DataTransfer` (`dt.items.add(file)`),
    * affecte `input.files = dt.files`,
    * déclenche les événements `input` et `change` avec `bubbles: true`.
* **Notion clé :** on ne peut jamais modifier `input.value` d'un champ fichier ; c'est `input.files` qu'on remplace.

### 4.5 Zones de glisser-déposer des sites (optionnel)
* **Objectif :** Gérer les formulaires qui n'ont pas de vrai `input` visible. `À FAIRE`
* **Livrable :** Simulation d'un événement `drop` portant un `DataTransfer` sur la zone cible. Fonctionne sur certains sites seulement : documenter les échecs.

### 4.6 Vérification visuelle
* **Objectif :** S'assurer que le site a bien « vu » le fichier. `À FAIRE`
* **Livrable :** Un message de retour dans le popup (« CV joint : *CV Dev Python* ») et un test manuel confirmant que le nom du fichier apparaît sur la page.

---

## 🧪 Phase 5 : Robustesse, Tests et Packaging

*L'objectif de cette phase est de fiabiliser l'extension sur de vrais sites et de pouvoir l'installer durablement.*

### 5.1 Cas difficiles
* **Objectif :** Traiter les formulaires qui résistent. `À FAIRE`
* **Livrable :** Prise en charge ou limite documentée pour : les **iframes**, le **Shadow DOM** (parcours récursif de `element.shadowRoot`), les formulaires **multi-étapes** (bouton « Remplir » rejouable à chaque étape), les champs ajoutés dynamiquement (`MutationObserver`).

### 5.2 Tests sur sites réels
* **Objectif :** Mesurer la robustesse. `À FAIRE`
* **Livrable :** Un tableau de tests (site × fonctionnalité : texte, select, upload CV, upload lettre) sur **au moins 5 sites** différents (sites d'emploi, pages carrière d'entreprises, formulaires d'ATS courants).

### 5.3 Lint et permissions
* **Objectif :** Détecter les erreurs et réduire les droits demandés. `À FAIRE`
* **Livrable :** `web-ext lint` sans erreur bloquante et revue des permissions (principe de moindre privilège).

### 5.4 Packaging
* **Objectif :** Produire un fichier installable durablement. `À FAIRE`
* **Livrable :** `web-ext build` générant un `.zip`. Documentation de l'installation : soumission **non listée** sur addons.mozilla.org pour obtenir une extension signée (Firefox exige la signature pour une installation permanente), ou chargement temporaire pour les tests.

---

## 🧠 Phase 6 (Bonus final) : Extraction de l'Offre et Score de Correspondance

*À faire uniquement quand tout le reste fonctionne. Cette phase est la plus complexe et la moins vitale.*

### 6.1 Extraction de l'offre
* **Objectif :** Récupérer titre, entreprise, description et lieu de l'offre ouverte. `À FAIRE`
* **Livrable :**
    * **Méthode 1 :** lire les balises `<script type="application/ld+json">` et chercher un objet `JobPosting` (standard schema.org).
    * **Méthode 2 (repli) :** extraire le texte visible de la page (`document.body.innerText`, nettoyé et tronqué).
    * Affichage du résultat dans le popup.

### 6.2 Appel du LLM
* **Objectif :** Obtenir une analyse structurée. `À FAIRE`
* **Livrable :**
    * Un champ « clé API » dans la page d'options (stockée localement, jamais affichée en clair ensuite).
    * Un appel `fetch` depuis le background, avec `host_permissions` pour l'API choisie.
    * Un prompt imposant une réponse JSON : `{ "score": 0-100, "points_forts": [], "lacunes": [], "resume_offre": "" }`, avec validation avant affichage.

### 6.3 Affichage et cache
* **Objectif :** Rendre le score lisible sans payer deux fois. `À FAIRE`
* **Livrable :** Une jauge colorée (vert / orange / rouge), la liste des points forts et des lacunes, et une mise en cache par URL d'offre.

> 🔒 **Confidentialité :** l'offre et le profil sont envoyés à l'API. L'utilisateur doit en être informé. Ollama (modèle local) permet de ne rien envoyer en dehors de la machine.

---

## 🏁 Critères de Validation

Le projet sera considéré comme finalisé lorsque le scénario suivant sera opérationnel :

1. L'extension se charge dans Firefox sans erreur, et **le profil saisi persiste après redémarrage** du navigateur.
2. Plusieurs PDF (CV et lettres) peuvent être **importés par glisser-déposer**, listés, renommés et supprimés, et **restent disponibles après redémarrage**.
3. Sur un formulaire de candidature **d'un site jamais vu pendant le développement**, le bouton de remplissage renseigne correctement au moins l'identité et les coordonnées.
4. Le CV et la lettre **choisis dans le popup** sont joints dans les bons champs d'upload, et le site affiche leur nom.
5. **Aucun formulaire n'est soumis automatiquement.**
6. Les tests sur 5 sites sont documentés avec leurs limites connues.
7. `web-ext lint` ne remonte aucune erreur.
8. *(Bonus)* Sur une offre, un score argumenté s'affiche.

---

## ⚠️ Pièges Fréquents

* **Manifest copié d'un exemple :** il référence des fichiers qui n'existent pas chez toi. Partir du minimum et ajouter au fur et à mesure.
* **`manifest_version` incohérent** avec les clés utilisées (`action` ↔ MV3, `browser_action` ↔ MV2).
* **Oublier l'ID Gecko** : `browser_specific_settings.gecko.id` est requis pour un fonctionnement stable de `storage`.
* **Mélanger `chrome.*` et `browser.*`** en copiant des tutoriels Chrome.
* **Background en service worker :** Firefox utilise `"background": { "scripts": [...] }`.
* **Content script absent :** un script n'est injecté qu'au chargement ; recharger la page après avoir rechargé l'extension.
* **Remplissage qui « ne prend pas » sur React/Angular :** passer par le setter natif et déclencher `input`/`change`.
* **Champ fichier :** impossible d'écrire `input.value` ; il faut passer par `input.files` et un `DataTransfer`.
* **IndexedDB confondu :** un content script n'accède pas à l'IndexedDB de l'extension, il passe par le background.
* **Champs fichiers masqués :** ne pas se limiter aux champs visibles.
* **Données sensibles :** profil, CV et lettres restent **en local**. Ne jamais les committer dans Git (ajouter un `.gitignore` adapté).
* **Pas de code distant :** toutes les bibliothèques doivent être incluses dans le paquet.

---

## 📚 Ressources Utiles

* **MDN : Extensions du navigateur :** <https://developer.mozilla.org/fr/docs/Mozilla/Add-ons/WebExtensions>
* **MDN : Votre première extension :** <https://developer.mozilla.org/fr/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension>
* **Exemples officiels** (dossier `favourite-colour` pour options + stockage) : <https://github.com/mdn/webextensions-examples>
* **Schéma JSON Resume :** <https://jsonresume.org/schema>
* **Documentation `web-ext` :** <https://extensionworkshop.com/documentation/develop/web-ext-command-reference/>
* **À chercher sur MDN :** `scripting.executeScript`, `activeTab`, `storage.local`, `options_ui`, `DataTransfer`, `HTMLInputElement.files`, *Using IndexedDB*, *File drag and drop*.

---

## 🗺️ Ordre de Progression Recommandé

| Phase | Notion apprise | Difficulté |
|---|---|---|
| 0 | Manifest, chargement, debug | ⭐ |
| 1 | Popup, options, `storage` | ⭐ |
| 2 | IndexedDB, drag & drop, fichiers | ⭐⭐ |
| 3 | Content scripts, DOM, heuristiques | ⭐⭐⭐ |
| 4 | `DataTransfer`, messagerie, upload | ⭐⭐⭐ |
| 5 | Tests, robustesse, distribution | ⭐⭐ |
| 6 | API externe, LLM (bonus) | ⭐⭐⭐ |

> 🎓 **Conseil final :** ne passe à la phase suivante que lorsque la précédente fonctionne de bout en bout. Une extension qui remplit parfaitement 80 % des formulaires est bien plus utile qu'une extension qui fait dix choses à moitié.