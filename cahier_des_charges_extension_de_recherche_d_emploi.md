# Cahier des charges : Extension de navigateur pour l'optimisation de la recherche d'emploi

## 1. Contexte
La recherche d'emploi active est un processus lourd, répétitif et extrêmement chronophage. Les candidats doivent constamment jongler entre différentes plateformes d'emploi (LinkedIn, Indeed, Welcome to the Jungle, etc.), analyser manuellement chaque offre, rédiger des lettres de motivation, remplir des formulaires de candidature souvent redondants et adapter leur CV pour correspondre au mieux aux attentes des recruteurs et aux mots-clés des ATS (Applicant Tracking Systems).

## 2. Problématique
Le flux de travail actuel du demandeur d'emploi souffre de plusieurs inefficacités majeures :
* **Dispersion et perte de temps :** Visiter de multiples sites, conserver des listes de liens et lire chaque offre en détail demande un effort cognitif élevé.
* **Manque de visibilité immédiate :** Il est difficile d'évaluer rapidement si une offre correspond réellement à son profil avant d'entamer le processus de postulation.
* **Tâches répétitives :** Remplir les mêmes champs de formulaire (nom, prénom, expériences, formations) sur chaque site web est fastidieux.
* **Personnalisation complexe du CV :** Adapter un CV PDF de manière granulaire pour chaque offre d'emploi nécessite des manipulations manuelles répétées sur des logiciels de mise en page ou des outils d'édition PDF.

## 3. Objectif souhaité
Développer une extension de navigateur intelligente qui centralise, automatise et personnalise le parcours de candidature. L'outil doit permettre de gagner un temps précieux en extrayant les données des offres, en évaluant la pertinence du profil, en pré-remplissant les formulaires en ligne et en générant dynamiquement une version adaptée du CV.

## 4. Fonctionnalités principales
1. **Extraction des détails de l'offre :**
   * Analyse de la page web active sur un site d'emploi.
   * Récupération automatique du titre du poste, de l'entreprise, de la description complète, des compétences requises et des modalités (télétravail, localisation, type de contrat).
2. **Score de correspondance (Matching Score) :**
   * Comparaison entre le profil de référence de l'utilisateur (compétences, expériences, appétences) et l'offre extraite.
   * Affichage d'un score de compatibilité (ex. pourcentage ou indicateur visuel) avec mise en avant des points forts et des lacunes.
3. **Remplissage automatique des formulaires (Form Filler) :**
   * Détection des champs de formulaires sur les pages de candidature (informations personnelles, liens, questions ouvertes).
   * Injection automatique des données issues du profil utilisateur pour accélérer la soumission.
4. **Génération et adaptation dynamique du CV :**
   * Utilisation d'un modèle de CV de base.
   * Réécriture ou ajustement ciblé des compétences et des expériences pour les aligner avec les mots-clés de l'offre.
   * Intégration potentielle d'outils ou d'APIs tiers (tels qu'Adobe Acrobat ou des bibliothèques de manipulation de PDF) pour générer le fichier final prêt à l'emploi.

## 5. Étapes de réalisation du projet
* **Étape 1 : Spécification et Architecture**
  * Définition du format de stockage du profil utilisateur (profil maître en JSON).
  * Choix de la stack technique pour l'extension (Manifest V3, JavaScript/TypeScript).
* **Étape 2 : Développement du Module de Scraping / Parsing**
  * Création des scripts de contenu pour extraire le texte des principales plateformes d'emploi ciblées.
* **Étape 3 : Moteur de Matching (Logique & IA)**
  * Conception de l'algorithme de comparaison (analyse sémantique ou correspondance de mots-clés via une API de LLM).
* **Étape 4 : Automatisation des Formulaires**
  * Développement de la logique d'injection DOM pour reconnaître et remplir les champs standards des formulaires de recrutement.
* **Étape 5 : Module d'adaptation du CV**
  * Mise en place du mécanisme de modification du CV (génération à partir d'un template HTML converti en PDF ou manipulation programmatique via Acrobat/bibliothèques PDF).
* **Étape 6 : Tests et Itérations**
  * Phase de test sur différents sites d'emploi et ajustement de la précision de l'extraction et du matching.

## 6. Limites et Contraintes techniques potentielles
* **Variabilité des structures de sites web :** Les plateformes d'emploi modifient régulièrement leur code HTML. Le module d'extraction devra être robuste ou s'appuyer sur une analyse textuelle intelligente (IA) plutôt que sur des sélecteurs CSS trop rigides.
* **Complexité de la manipulation PDF :** Modifier directement un PDF existant via Acrobat ou du code de manière fluide et esthétique peut s'avérer complexe (risques de décalage de mise en page). Une alternative consisterait à générer le CV à partir d'un format modifiable (Markdown, HTML/CSS ou LaTeX) avant de l'exporter en PDF.
* **Sécurité et Confidentialité :** L'extension manipule des données personnelles sensibles et des identifiants. Le stockage des données doit idéalement rester local (chiffré dans le navigateur) pour garantir la confidentialité.
* **Restrictions des formulaires complexes :** Certains sites utilisent des composants React/Angular hautement dynamiques ou des iframes sécurisées qui peuvent bloquer l'auto-remplissage automatique.