# PATTERNS — TP 4 · parcours Data

**Binôme : SOW Mahmoud et Istichad Papa Mhoma**

## Tableau des patterns — Partie A

| N° | Pattern | Problème résolu dans QueenBee | Indice dans le code |
|---:|---|---|---|
| 1 | Factory Method | Créer le type de capteur demandé par la configuration sans disperser la création des objets dans le code métier. | Le registre `types` associe chaque type à une classe ; `creerCapteur()` sélectionne la classe puis l'instancie. |
| 2 | Builder | Construire un rapport étape par étape et vérifier sa validité à la fin de la construction. | Les appels chaînés (`periode`, `sites`, `indicateur`, `format`) se terminent par `construire()`. |
| 3 | Adapter | Rendre une API météo externe compatible avec le format attendu par le modèle de prédiction. | `temperatureExterne()` transforme la réponse HTTP en `{ celsius, mesureLe }`. |
| 4 | Composite | Calculer le poids d'une ruche individuelle ou d'un groupe avec la même méthode. | `Ruche` et `Groupe` exposent `poidsTotal()` ; le groupe additionne récursivement les poids de ses enfants. |
| 5 | Decorator | Ajouter chiffrement/déchiffrement autour d'un dépôt existant sans modifier ce dépôt. | `DepotMesuresChiffre` enveloppe `depot` et transforme les données dans `enregistrer()` et `lire()`. |
| 6 | Proxy | Retarder le chargement d'un modèle de prédiction coûteux jusqu'à la première utilisation. | `ModelePredictionDiffere` conserve le modèle dans `#modele` et le charge à la première invocation de `predire()`. |

Les extraits 5 et 6 ont une structure d'enveloppe similaire, mais leur intention diffère : l'extrait 5 ajoute un comportement (Decorator), tandis que l'extrait 6 contrôle l'accès à une ressource coûteuse et retarde son initialisation (Proxy).

## Partie B1 — Étendre sans modifier

Le canal `sms-groupe` est ajouté en enregistrant `SmsGroupeNotification` avec `registerChannel()`. La classe hérite de `Notification` et implémente `send(msg)`. `creationnels/factory.js` reste intact : c'est l'application du principe ouvert/fermé (OCP), car on étend le système sans modifier la fabrique existante.

## Partie B2 — Ordre des décorateurs

### Composition C choisie

`Log(Retry(Cache(base)))`

La journalisation est extérieure : chaque appel reçu par le client est journalisé, y compris les appels qui se terminent par une erreur. Le décorateur Retry retente une requête qui échoue. Le cache intérieur évite de répéter les requêtes déjà mises en cache. Une réponse en échec n'est pas mise en cache, car `CachingClient` ne stocke la valeur qu'après une résolution réussie.

### 1. Pourquoi le second appel à `/api/ruches` n'est-il pas journalisé dans A, mais l'est dans B ?

Dans A, le cache est à l'extérieur de la chaîne : le second appel est servi directement par le cache et ne traverse donc pas le décorateur de journalisation placé plus à l'intérieur. Dans B, la journalisation est extérieure au cache : chaque appel traverse d'abord le journaliseur, même lorsque le cache répond immédiatement.

### 2. Dans B, voit-on dans les journaux que `/api/instable` a échoué une première fois ? Pourquoi ?

Non, pas directement avec la composition B. Le journaliseur enveloppe le cache, lequel enveloppe Retry. Les nouvelles tentatives ont lieu à l'intérieur du journaliseur ; celui-ci ne voit que le résultat global de l'appel à `get()`, pas chaque tentative interne. Les messages `[retry]` restent toutefois visibles, car ils sont écrits par `RetryClient`.

### 3. Quel ordre choisir sur la passerelle QueenBee (liaison instable, temps d'émission radio limité) ?

Je choisirais `Log(Retry(Cache(base)))` comme compromis : la journalisation extérieure conserve une trace de chaque appel client, Retry permet de récupérer les erreurs transitoires, et le cache intérieur évite de refaire les lectures déjà réussies, ce qui limite le trafic radio. Il faut garder à l'esprit que le cache doit avoir une durée de vie adaptée à la fraîcheur des mesures. Pour diagnostiquer chaque tentative individuellement, il faudrait placer le journaliseur à l'intérieur de Retry.

## Partie C — Data : Adapter pour deux sources de mesures

- **Problème :** les sources LoRa et les relevés manuels ont des noms de champs, unités et formats de date différents, alors que le contexte « Santé des colonies » attend un contrat `Mesure` commun.
- **Pattern retenu : Adapter.** `LoRaAdapter` renomme les champs LoRa ; `ReleveManuelAdapter` convertit la date, les grammes et les degrés Fahrenheit en date ISO UTC, kilogrammes et degrés Celsius. Le client peut ensuite fusionner les mesures sans connaître le format d'origine.
- **Alternative écartée :** modifier directement les deux sources pour qu'elles produisent le contrat commun. Elle est écartée car l'énoncé précise que les sources sont non modifiables ; cela mélangerait aussi les formats fournisseurs avec le contexte métier.
- **Contrat propriétaire :** le contrat `Mesure` doit appartenir au contexte métier qui consomme ces données, ici « Santé des colonies », plutôt qu'à l'une des sources.
- **Lignes incomplètes en production :** les écarter est acceptable pour ce TP et empêche de produire une mesure invalide. En production, il faudrait aussi journaliser la raison et idéalement mettre les lignes en quarantaine pour audit/correction, plutôt que les perdre silencieusement.
- **Ajout d'un capteur d'humidité :** faire évoluer le contrat `Mesure` avec un champ optionnel ou une version compatible, documenter son unité et valider les consommateurs. Les adaptateurs qui possèdent cette information pourront la renseigner ; les sources qui ne la fournissent pas ne doivent pas inventer de valeur.
- **Fusion chronologique :** le client récupère les mesures normalisées auprès des deux adaptateurs, les rassemble et les trie par date croissante. Il obtient ainsi une chronologie unique, sans dépendre du format propre à chaque source.

