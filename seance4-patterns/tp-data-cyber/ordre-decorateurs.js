// B2 · L'ordre des décorateurs a-t-il un effet ? Lancer : node seance4-patterns/tp-data-cyber/ordre-decorateurs.js
// Les deux compositions utilisent exactement les mêmes classes, empilées dans un ordre différent.
import { FakeHttpClient, LoggingClient, CachingClient, RetryClient } from '../structuraux/decorator.js';

async function scenario(nom, fabriquer) {
  const base = new FakeHttpClient();
  const client = fabriquer(base);
  console.log(`\n${nom}`);
  await client.get('/api/ruches');
  await client.get('/api/ruches');
  await client.get('/api/instable');
  console.log(`  → appels réels sur le client de base : ${base.calls}`);
}

// Composition A : le cache est à l'extérieur
await scenario('A · Cache( Retry( Log( base ) ) )', base => new CachingClient(new RetryClient(new LoggingClient(base))));

// Composition B : la journalisation est à l'extérieur
await scenario('B · Log( Cache( Retry( base ) ) )', base => new LoggingClient(new CachingClient(new RetryClient(base))));

// Composition C : journalisation extérieure, nouvelle tentative au milieu, cache intérieur.
// Les appels sont journalisés, et Retry peut refaire l'appel si la requête échoue.
await scenario('C · Log( Retry( Cache( base ) ) )', base => new LoggingClient(new RetryClient(new CachingClient(base))));

// Réponses aux questions et justification : voir PATTERNS.md.
//  1. Pourquoi le 2e appel à /api/ruches n'est-il pas journalisé dans A, mais l'est dans B ?
//  2. Dans B, voit-on dans les logs que /api/instable a échoué une première fois ? Pourquoi ?
//  3. Quel ordre choisiriez-vous pour la passerelle QueenBee (liaison instable) et pourquoi ?
