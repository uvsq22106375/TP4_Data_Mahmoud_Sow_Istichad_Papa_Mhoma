// C · DATA — Adapter : deux sources de mesures hétérogènes, un seul contrat.
//
// Contrat attendu par le reste de QueenBee (contexte « Santé des colonies ») :
//   Mesure = { hiveId: string, at: string ISO 8601 (UTC), poidsKg: number, temperatureC: number, source: string }

// --- Source 1 : trames capteurs déjà décodées (format 6.5 du cahier des charges) — NON modifiable
export class CapteurLoRaSource {
  async trames() {
    return [
      { hive_id: 'SN-CASA-014', site_id: 'SN-CASA', timestamp: '2027-03-14T08:15:00Z', weight_kg: 34.2, temp_internal_c: 34.8 },
      { hive_id: 'SN-CASA-015', site_id: 'SN-CASA', timestamp: '2027-03-14T08:30:00Z', weight_kg: 29.9, temp_internal_c: 35.1 },
    ];
  }
}

// --- Source 2 : anciens relevés papier numérisés (CSV) — NON modifiable
// colonnes : ruche ; date « JJ/MM/AAAA HH:MM » (heure UTC) ; poids en GRAMMES ; température en °F
export class ReleveManuelSource {
  async lignes() {
    return [
      'CM-BAF-003;13/03/2027 07:00;41850;93.2',
      'CM-BAF-004;13/03/2027 07:20;;95.0', // poids manquant : ligne inexploitable
      'CM-BAF-005;14/03/2027 09:05;38100;94.1',
    ];
  }
}

// --- Adaptateurs : À VOUS
// TODO C-Data.1 : LoRaAdapter — renommer les champs vers le contrat Mesure (source: 'capteur')
export class LoRaAdapter {
  constructor(source) { this.source = source; }
  async mesures() {
    const trames = await this.source.trames();
    return trames.map(t => ({
      hiveId: t.hive_id,
      at: new Date(t.timestamp).toISOString(),
      poidsKg: Number(t.weight_kg),
      temperatureC: Number(t.temp_internal_c),
      source: 'capteur',
    }));
  }
}

// TODO C-Data.2 : ReleveManuelAdapter — découper la ligne CSV, convertir
//   - la date « JJ/MM/AAAA HH:MM » (UTC) en ISO 8601 (indice : Date.UTC)
//   - les grammes en kilogrammes, les °F en °C arrondis au dixième : (F − 32) × 5 / 9
//   - ignorer les lignes incomplètes (qualité des données) ; source: 'releve-manuel'
export class ReleveManuelAdapter {
  constructor(source) { this.source = source; }
  async mesures() {
    const lignes = await this.source.lignes();
    const mesures = [];

    for (const ligne of lignes) {
      if (typeof ligne !== 'string' || !ligne.trim()) continue;
      const champs = ligne.split(';').map(v => v.trim());
      if (champs.length !== 4) continue;

      const [hiveId, dateHeure, grammesTexte, fahrenheitTexte] = champs;
      if (!hiveId || !dateHeure || !grammesTexte || !fahrenheitTexte) continue;

      const [dateTexte, heureTexte] = dateHeure.split(' ');
      const dateParts = dateTexte?.split('/').map(Number);
      const heureParts = heureTexte?.split(':').map(Number);
      if (dateParts?.length !== 3 || heureParts?.length !== 2) continue;

      const [jour, mois, annee] = dateParts;
      const [heure, minute] = heureParts;
      const grammes = Number(grammesTexte);
      const fahrenheit = Number(fahrenheitTexte);
      if (![jour, mois, annee, heure, minute, grammes, fahrenheit].every(Number.isFinite)) continue;
      if (mois < 1 || mois > 12 || jour < 1 || jour > 31 || heure < 0 || heure > 23 || minute < 0 || minute > 59) continue;

      const timestamp = Date.UTC(annee, mois - 1, jour, heure, minute);
      const date = new Date(timestamp);
      // Écarter les dates impossibles (ex. 31/02) au lieu de les normaliser silencieusement.
      if (date.getUTCFullYear() !== annee || date.getUTCMonth() !== mois - 1 || date.getUTCDate() !== jour) continue;

      mesures.push({
        hiveId,
        at: date.toISOString(),
        poidsKg: grammes / 1000,
        temperatureC: Math.round(((fahrenheit - 32) * 5 / 9) * 10) / 10,
        source: 'releve-manuel',
      });
    }
    return mesures;
  }
}

// --- Client : ne connaît que le contrat Mesure (fourni)
export async function toutesLesMesures(adaptateurs) {
  const lots = await Promise.all(adaptateurs.map(a => a.mesures()));
  return lots.flat().sort((a, b) => a.at.localeCompare(b.at));
}
