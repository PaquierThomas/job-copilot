# 📘 Guide de Projet : Extension Firefox d'Aide à la Candidature (« Job Copilot »)

Ce projet consiste à développer une extension Firefox qui aide un candidat à analyser des offres d'emploi, à évaluer sa compatibilité avec chacune, à pré-remplir les formulaires de candidature et à générer un CV adapté. Le projet est pensé pour un **premier contact avec le développement d'extensions** : chaque phase introduit une notion nouvelle et se termine par quelque chose de visible et testable.

Afin de se concentrer sur l'architecture de l'extension, **il n'y a ni serveur, ni compte utilisateur** : tout est stocké localement dans le navigateur.

---

## 🎯 Objectifs Principaux

* **Comprendre l'anatomie d'une extension Firefox** : manifest, popup, content scripts, background, pages d'options.
* **Faire communiquer les différents contextes** de l'extension entre eux (messagerie interne).
* **Persister des données localement** avec l'API `storage` du navigateur.
* **Manipuler le DOM de sites tiers** de manière robuste (extraction et injection).
* **Consommer une API externe de LLM** pour analyser du texte et produire des données structurées.
* **Générer un document PDF** à partir d'un modèle HTML.
* **Packager et tester** l'extension avec les outils officiels (`web-ext`).

---

## 🛠️ Stack Technique

* **Navigateur cible :** Firefox (Desktop)
* **Format d'extension :** WebExtension, **Manifest V3** (supporté par Firefox)
* **Langage :** JavaScript moderne (ES Modules). TypeScript optionnel, à envisager seulement une fois la Phase 3 terminée.
* **Outillage :** Node.js + `web-ext` (lancement, rechargement automatique, lint, packaging)
* **Stockage :** `browser.storage.local`
* **IA :** API d'un LLM (Anthropic, OpenAI, ou modèle local via Ollama) appelée depuis le background
* **PDF :** impression d'une page HTML dédiée (`window.print()`), ou bibliothèque `pdf-lib` / `jsPDF`

> 💡 **Conseil de débutant :** pas de framework (React, Vue...) ni de bundler au début. Des fichiers HTML/JS simples suffisent largement et évitent de mélanger les difficultés.

---

## 🧭 Les 5 notions à comprendre avant de commencer

| Élément | Rôle | Analogie |
|---|---|---|
| `manifest.json` | Carte d'identité : nom, version, permissions, fichiers à charger | Le `package.json` de l'extension |
| **Popup** (`browser_action`) | Petite fenêtre qui s'ouvre au clic sur l'icône | Le « tableau de bord » |
| **Content script** | Script injecté **dans** les pages web visitées, il peut lire et modifier leur DOM | Les yeux et les mains de l'extension |
| **Background script** | Script qui tourne en arrière-plan, sans page visible | Le « cerveau » central |
| **Page d'options** | Page HTML de réglages (profil, clé API) | Les paramètres |

Les contextes sont **isolés** : un content script ne partage pas ses variables avec le popup. Ils communiquent par **messages** (`browser.runtime.sendMessage`, `browser.tabs.sendMessage`).

**Particularité Firefox :** on utilise l'espace de noms `browser.*` (fonctions qui renvoient des *Promises*), alors que Chrome utilise `chrome.*` (callbacks). Dans ce projet, on s'en tient à `browser.*`.

---

## 🏗️ Phase 0 : Découverte et « Hello World »

*L'objectif de cette phase est de mettre en place l'environnement et de voir une extension minimale tourner dans Firefox.*

### 0.1 Environnement de développement
* **Objectif :** Installer les outils et comprendre la boucle de développement. `À FAIRE`
* **Livrable :**
    * Node.js installé et `web-ext` installé (`npm install --global web-ext`).
    * Un dépôt Git initialisé avec un `.gitignore`.
    * Une arborescence de départ :
      ```
      job-copilot/
      ├── manifest.json
      ├── popup/        (popup.html, popup.js, popup.css)
      ├── content/      (content.js)
      ├── background/   (background.js)
      ├── options/      (options.html, options.js)
      └── icons/
      ```

### 0.2 Première extension
* **Objectif :** Écrire un `manifest.json` minimal et charger l'extension. `À FAIRE`
* **Livrable :**
    * Un `manifest.json` (Manifest V3) contenant : `manifest_version`, `name`, `version`, `action` (popup), et `browser_specific_settings.gecko.id` (un identifiant de type `job-copilot@tonnom.dev`, **requis par Firefox** pour utiliser `storage` de façon stable).
    * Un popup affichant « Hello » avec un bouton.
    * Le chargement réussi via `about:debugging` → *Ce Firefox* → *Charger un module complémentaire temporaire*, **puis** via `web-ext run` (rechargement automatique à chaque sauvegarde).
    * Un content script qui affiche un message dans la console de la page (`console.log`) sur n'importe quel site, et la capacité de retrouver ce message dans les bonnes **consoles de debug** (page, popup, background).

> 🐛 **À retenir :** le debug se fait à 3 endroits différents. La console de la page affiche les logs du content script ; le popup se débogue via un clic droit → *Inspecter* ; le background via `about:debugging` → *Examiner*.

---

## 🧱 Phase 1 : Socle, Profil Utilisateur et Stockage

*L'objectif de cette phase est de définir les données de l'utilisateur et de pouvoir les saisir et les conserver.*

### 1.1 Le format du profil maître
* **Objectif :** Définir un schéma JSON unique, source de vérité pour tout le projet. `À FAIRE`
* **Livrable :** Un fichier `profile.schema.md` ou un exemple `profile.example.json` décrivant au minimum :
    * Identité et contact (prénom, nom, email, téléphone, ville, LinkedIn, site web).
    * Résumé / accroche.
    * Expériences (poste, entreprise, dates, liste de réalisations).
    * Formations.
    * Compétences (avec niveau éventuel) et langues.
    * Préférences de recherche (télétravail, localisation, types de contrat).

### 1.2 La page d'options
* **Objectif :** Permettre de saisir, modifier et sauvegarder le profil. `À FAIRE`
* **Livrable :**
    * Une page `options.html` avec un formulaire (ou un simple champ texte JSON dans un premier temps, puis un formulaire structuré).
    * Sauvegarde et lecture via `browser.storage.local.set()` / `.get()`.
    * Boutons **Exporter** et **Importer** le profil au format JSON (sauvegarde de sécurité).
    * Un champ pour la **clé API du LLM** (stockée localement, jamais affichée en clair après saisie).
* **Notion clé :** permission `"storage"` à déclarer dans le manifest.

### 1.3 Le popup lit le profil
* **Objectif :** Vérifier que les données circulent entre options et popup. `À FAIRE`
* **Livrable :** Le popup affiche « Bonjour *Prénom* » à partir du profil stocké, et un message d'invitation à remplir le profil s'il est vide. Un lien ouvre la page d'options (`browser.runtime.openOptionsPage()`).

---

## 🔍 Phase 2 : Extraction des Offres d'Emploi (Content Scripts)

*L'objectif de cette phase est d'extraire de façon fiable les informations d'une offre depuis la page active.*

### 2.1 Cibler les bonnes pages
* **Objectif :** Injecter le content script uniquement où c'est utile. `À FAIRE`
* **Livrable :**
    * Une section `content_scripts` dans le manifest avec des `matches` limités à 2 ou 3 sites cibles (par exemple Welcome to the Jungle, Indeed, LinkedIn).
    * Les `host_permissions` correspondantes.

### 2.2 Extraction structurée (méthode 1 : données intégrées)
* **Objectif :** Exploiter ce que la page fournit déjà, sans sélecteur CSS fragile. `À FAIRE`
* **Livrable :** Une fonction qui cherche dans la page les balises `<script type="application/ld+json">` et récupère un objet `JobPosting` (standard schema.org utilisé par de nombreux sites d'emploi) : titre, entreprise, description, lieu, type de contrat.

### 2.3 Extraction par repli (méthode 2 : texte brut)
* **Objectif :** Avoir une solution de secours quand la méthode 1 ne fonctionne pas. `À FAIRE`
* **Livrable :** Une fonction qui extrait le texte visible principal de la page (`document.body.innerText`, nettoyé et tronqué), destiné à être analysé par le LLM en Phase 3.

### 2.4 Communication content script → popup
* **Objectif :** Faire remonter l'offre extraite jusqu'au popup. `À FAIRE`
* **Livrable :**
    * Le popup envoie un message `{ type: "EXTRACT_JOB" }` à l'onglet actif, le content script répond avec l'objet offre.
    * Le popup affiche titre, entreprise, localisation et un extrait de la description.
    * Un état d'erreur lisible si la page n'est pas une offre (« Aucune offre détectée »).
* **Notion clé :** `browser.tabs.query({ active: true, currentWindow: true })` puis `browser.tabs.sendMessage()`.

---

## 🧠 Phase 3 : Moteur de Matching (API de LLM)

*L'objectif de cette phase est de comparer le profil et l'offre, et d'afficher un score argumenté.*

### 3.1 Appel de l'API depuis le background
* **Objectif :** Centraliser les appels réseau dans le background script. `À FAIRE`
* **Livrable :**
    * Le popup envoie `{ type: "MATCH", job, profile }` au background.
    * Le background appelle l'API du LLM via `fetch` et renvoie le résultat.
    * Les permissions d'accès réseau de l'API choisie sont déclarées dans `host_permissions`.
    * Gestion des erreurs : clé absente, quota dépassé, réseau coupé.

### 3.2 Le prompt et la sortie structurée
* **Objectif :** Obtenir une réponse exploitable par le code, pas un texte libre. `À FAIRE`
* **Livrable :** Un prompt qui impose une réponse JSON respectant un schéma strict :
    ```json
    {
      "score": 0-100,
      "points_forts": ["..."],
      "lacunes": ["..."],
      "mots_cles_offre": ["..."],
      "resume_offre": "..."
    }
    ```
    avec validation du JSON reçu avant affichage (gérer le cas d'une réponse mal formée).

### 3.3 Affichage du score
* **Objectif :** Rendre le résultat lisible d'un coup d'œil. `À FAIRE`
* **Livrable :** Dans le popup : une jauge ou un badge coloré (vert / orange / rouge selon le score), la liste des points forts et des lacunes, et un bouton « Recalculer ».

### 3.4 Mise en cache
* **Objectif :** Ne pas payer deux fois pour la même offre. `À FAIRE`
* **Livrable :** Les résultats sont mémorisés dans `storage.local`, indexés par l'URL de l'offre (ou un hash du texte).

> 🔒 **Confidentialité :** l'offre et le profil sont envoyés à l'API. Le prévoir dans un message d'information à l'utilisateur lors de la première utilisation. L'option Ollama (modèle local) permet de ne rien envoyer en dehors de la machine.

---

## ✍️ Phase 4 : Remplissage Automatique des Formulaires

*L'objectif de cette phase est d'injecter le profil dans des formulaires de candidature réels.*

### 4.1 Détection des champs
* **Objectif :** Savoir quel champ correspond à quelle donnée du profil. `À FAIRE`
* **Livrable :** Une fonction qui parcourt les `input`, `textarea` et `select` d'une page et associe chacun à une clé du profil, en s'appuyant sur : `name`, `id`, `autocomplete`, `placeholder`, `<label>` associé, `aria-label`. Un dictionnaire de mots-clés multilingues (« prénom », « first name », « firstname »...).

### 4.2 Injection des valeurs
* **Objectif :** Remplir sans casser les frameworks front-end. `À FAIRE`
* **Livrable :** Une fonction `fillField(el, value)` qui :
    * définit la valeur via le setter natif de l'élément,
    * déclenche les événements `input` et `change` (avec `bubbles: true`).
* **Pourquoi :** sur les sites en React/Vue/Angular, modifier simplement `el.value = ...` ne suffit pas, car le framework ne voit pas le changement.

### 4.3 Déclenchement et contrôle utilisateur
* **Objectif :** Ne jamais remplir à l'insu de l'utilisateur. `À FAIRE`
* **Livrable :**
    * Un bouton « Remplir le formulaire » dans le popup.
    * Un surlignage temporaire des champs remplis, et un compteur (« 8 champs remplis, 3 non reconnus »).
    * **Aucune soumission automatique** du formulaire.

### 4.4 Questions ouvertes (optionnel)
* **Objectif :** Aider à répondre à « Pourquoi ce poste ? ». `À FAIRE`
* **Livrable :** Pour les `textarea` libres, proposition d'un texte généré par le LLM à partir du profil et de l'offre, à relire et valider avant insertion.

---

## 📄 Phase 5 : Génération et Adaptation du CV

*L'objectif de cette phase est de produire un CV PDF adapté aux mots-clés de l'offre, sans éditer un PDF existant.*

### 5.1 Le modèle de CV
* **Objectif :** Concevoir un CV en HTML/CSS alimenté par le profil JSON. `À FAIRE`
* **Livrable :** Un fichier `cv/template.html` avec sa feuille de style (dont des règles `@media print` et un format A4), qui affiche toutes les sections du profil.

### 5.2 Adaptation par le LLM
* **Objectif :** Réorganiser et reformuler **sans inventer**. `À FAIRE`
* **Livrable :**
    * Un prompt qui reçoit le profil et les mots-clés de l'offre, et renvoie une **version adaptée du profil au même schéma JSON** : accroche réécrite, compétences priorisées, réalisations reformulées.
    * Une règle explicite dans le prompt : ne jamais ajouter une compétence ou une expérience absente du profil maître.

### 5.3 Aperçu et validation
* **Objectif :** Laisser l'utilisateur relire avant export. `À FAIRE`
* **Livrable :** Une page d'extension (`cv/preview.html`, ouverte dans un nouvel onglet) affichant le CV adapté, avec un mode d'édition rapide des textes (`contenteditable`).

### 5.4 Export PDF
* **Objectif :** Obtenir un fichier prêt à envoyer. `À FAIRE`
* **Livrable :** Un bouton « Télécharger en PDF » qui utilise l'une des deux approches :
    * **Simple :** `window.print()` avec « Enregistrer au format PDF ».
    * **Programmatique :** `pdf-lib` ou `jsPDF` pour produire le fichier et le télécharger via `browser.downloads` (permission `"downloads"`).
* **Bonus :** nommer le fichier automatiquement (`CV_Prenom_Nom_Entreprise.pdf`).

---

## 🧪 Phase 6 : Tests, Qualité et Packaging

*L'objectif de cette phase est de fiabiliser l'extension et de pouvoir la distribuer.*

### 6.1 Tests manuels sur sites réels
* **Objectif :** Mesurer la robustesse sur la durée. `À FAIRE`
* **Livrable :** Un tableau de tests (site × fonctionnalité) indiquant ce qui fonctionne, ce qui échoue et pourquoi, pour au moins 3 sites d'emploi.

### 6.2 Lint et vérification
* **Objectif :** Détecter les erreurs de manifest et de permissions. `À FAIRE`
* **Livrable :** `web-ext lint` sans erreur bloquante, et une revue des permissions pour ne garder que le strict nécessaire (principe de moindre privilège).

### 6.3 Packaging
* **Objectif :** Produire un fichier installable. `À FAIRE`
* **Livrable :** `web-ext build` générant un `.zip`. Documentation dans le README du chemin d'installation :
    * soit via **addons.mozilla.org** (soumission en mode *non listé* pour un usage personnel : Firefox exige une extension signée pour une installation permanente),
    * soit en chargement temporaire pour les tests.

---

## 🏁 Critères de Validation

Le projet sera considéré comme finalisé lorsque le scénario suivant sera opérationnel :

1. L'extension se charge dans Firefox sans erreur et le profil saisi dans la page d'options **persiste après redémarrage du navigateur**.
2. Sur une offre d'emploi d'un site ciblé, le popup affiche correctement le titre, l'entreprise et la description.
3. Un **score de correspondance** accompagné de points forts et de lacunes s'affiche pour cette offre.
4. Sur un formulaire de candidature réel, le bouton de remplissage renseigne au moins les champs d'identité et de contact, **sans soumettre** le formulaire.
5. Un CV adapté à l'offre est généré, relu dans l'aperçu, puis téléchargé en PDF avec une mise en page propre.
6. **Test de confidentialité :** aucune donnée personnelle n'est envoyée ailleurs qu'à l'API de LLM choisie, et le profil peut être exporté puis effacé complètement.
7. `web-ext lint` ne remonte aucune erreur.

---

## ⚠️ Pièges Fréquents (à lire avant de se lancer)

* **Oublier l'ID Gecko** dans le manifest : `storage` et certains comportements échouent sans `browser_specific_settings.gecko.id`.
* **Mélanger `chrome.*` et `browser.*`** en copiant des tutoriels Chrome : privilégier `browser.*` (Promises).
* **Background en service worker :** Firefox utilise des *event pages* (`"background": { "scripts": [...] }`) et non `service_worker`. Ne pas copier la config Chrome telle quelle.
* **Content script qui ne se lance pas :** vérifier les `matches`, puis **recharger la page** (un content script n'est injecté qu'au chargement).
* **Sélecteurs CSS fragiles :** les sites d'emploi changent leur HTML ; préférer JSON-LD, attributs sémantiques et analyse de texte.
* **Formulaires React/Angular :** passer par les événements `input`/`change` (voir 4.2).
* **Clé API exposée :** ne jamais l'écrire dans le code ni la committer ; elle reste dans `storage.local`.
* **Iframes et shadow DOM :** certains formulaires sont isolés ; prévoir `all_frames: true` ou accepter la limite et la documenter.
* **Aucune exécution de code distant :** les règles de Mozilla interdisent de charger et d'exécuter du JavaScript depuis un serveur. Toutes les bibliothèques (ex. `pdf-lib`) doivent être **incluses dans le paquet**.

---

## 📚 Ressources Utiles

* **MDN : Extensions du navigateur** (point de départ officiel) : <https://developer.mozilla.org/fr/docs/Mozilla/Add-ons/WebExtensions>
* **MDN : Votre première extension** : <https://developer.mozilla.org/fr/docs/Mozilla/Add-ons/WebExtensions/Your_first_WebExtension>
* **Dépôt d'exemples officiels** : <https://github.com/mdn/webextensions-examples>
* **Documentation de `web-ext`** : <https://extensionworkshop.com/documentation/develop/web-ext-command-reference/>
* **Extension Workshop (Mozilla)** : <https://extensionworkshop.com>
* **Schéma `JobPosting` (schema.org)** : <https://schema.org/JobPosting>

---

## 🗺️ Ordre de Progression Recommandé

| Phase | Notion apprise | Difficulté |
|---|---|---|
| 0 | Manifest, chargement, debug | ⭐ |
| 1 | Popup, options, `storage` | ⭐ |
| 2 | Content scripts, messagerie | ⭐⭐ |
| 3 | Background, `fetch`, API LLM | ⭐⭐ |
| 4 | Manipulation DOM avancée | ⭐⭐⭐ |
| 5 | Génération de documents | ⭐⭐⭐ |
| 6 | Tests et distribution | ⭐⭐ |

> 🎓 **Conseil final :** ne passez à la phase suivante que lorsque la précédente fonctionne de bout en bout. Une extension qui fait peu de choses mais qui les fait bien est un meilleur apprentissage qu'une extension ambitieuse à moitié cassée.
