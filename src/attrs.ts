// Beschriftungen für Attribute und Positionen (deutsche FC-Bezeichnungen)

export interface AttrDef {
  key: string;
  label: string;
  group: string;
}

// Reihenfolge der Spielerwerte in fc26.json -> "s" (muss zu ATTRS in scripts/build_data.py passen)
export const STAT_KEYS = [
  'pac', 'sho', 'pas', 'dri', 'def', 'phy',
  'acc', 'spr', 'pos', 'fin', 'sho_p', 'lsh', 'vol', 'pen', 'vis', 'cro', 'fka', 'spa', 'lpa', 'cur',
  'agi', 'bal', 'rea', 'bco', 'drb', 'com', 'int', 'hea', 'awa', 'sta_t', 'sli', 'jum', 'sta', 'str', 'agg',
  'gkd', 'gkh', 'gkk', 'gkp', 'gkr',
] as const;

export const ATTRS: AttrDef[] = [
  { key: 'pac', label: 'Tempo', group: 'Hauptwerte' },
  { key: 'sho', label: 'Schießen', group: 'Hauptwerte' },
  { key: 'pas', label: 'Passen', group: 'Hauptwerte' },
  { key: 'dri', label: 'Dribbling', group: 'Hauptwerte' },
  { key: 'def', label: 'Verteidigung', group: 'Hauptwerte' },
  { key: 'phy', label: 'Physis', group: 'Hauptwerte' },
  { key: 'ovr', label: 'Gesamtstärke', group: 'Spieler' },
  { key: 'h', label: 'Größe (cm)', group: 'Spieler' },
  { key: 'ag', label: 'Alter', group: 'Spieler' },
  { key: 'sm', label: 'Technik-Sterne', group: 'Spieler' },
  { key: 'wf', label: 'Schwacher Fuß', group: 'Spieler' },
  { key: 'acc', label: 'Beschleunigung', group: 'Tempo' },
  { key: 'spr', label: 'Sprintgeschw.', group: 'Tempo' },
  { key: 'pos', label: 'Stellungsspiel', group: 'Schießen' },
  { key: 'fin', label: 'Abschluss', group: 'Schießen' },
  { key: 'sho_p', label: 'Schusskraft', group: 'Schießen' },
  { key: 'lsh', label: 'Fernschüsse', group: 'Schießen' },
  { key: 'vol', label: 'Volleys', group: 'Schießen' },
  { key: 'pen', label: 'Elfmeter', group: 'Schießen' },
  { key: 'vis', label: 'Übersicht', group: 'Passen' },
  { key: 'cro', label: 'Flanken', group: 'Passen' },
  { key: 'fka', label: 'Freistoßgenauigkeit', group: 'Passen' },
  { key: 'spa', label: 'Kurzpass', group: 'Passen' },
  { key: 'lpa', label: 'Langpass', group: 'Passen' },
  { key: 'cur', label: 'Effet', group: 'Passen' },
  { key: 'agi', label: 'Beweglichkeit', group: 'Dribbling' },
  { key: 'bal', label: 'Balance', group: 'Dribbling' },
  { key: 'rea', label: 'Reaktionen', group: 'Dribbling' },
  { key: 'bco', label: 'Ballkontrolle', group: 'Dribbling' },
  { key: 'drb', label: 'Dribbling (Einzelwert)', group: 'Dribbling' },
  { key: 'com', label: 'Ruhe am Ball', group: 'Dribbling' },
  { key: 'int', label: 'Abfangen', group: 'Verteidigung' },
  { key: 'hea', label: 'Kopfballgenauigkeit', group: 'Verteidigung' },
  { key: 'awa', label: 'Def. Bewusstsein', group: 'Verteidigung' },
  { key: 'sta_t', label: 'Stehendes Tackling', group: 'Verteidigung' },
  { key: 'sli', label: 'Grätsche', group: 'Verteidigung' },
  { key: 'jum', label: 'Sprungkraft', group: 'Physis' },
  { key: 'sta', label: 'Ausdauer', group: 'Physis' },
  { key: 'str', label: 'Stärke', group: 'Physis' },
  { key: 'agg', label: 'Aggressivität', group: 'Physis' },
  { key: 'gkd', label: 'TW-Hechtsprung', group: 'Torwart' },
  { key: 'gkh', label: 'TW-Ballsicherheit', group: 'Torwart' },
  { key: 'gkk', label: 'TW-Abschlag', group: 'Torwart' },
  { key: 'gkp', label: 'TW-Stellungsspiel', group: 'Torwart' },
  { key: 'gkr', label: 'TW-Reflexe', group: 'Torwart' },
];

// Generische Positionen (wie in der Kaderliste) mit deutschem Kürzel
export const POSITIONS: { code: string; de: string; name: string }[] = [
  { code: 'GK', de: 'TW', name: 'Torwart' },
  { code: 'RB', de: 'RV', name: 'Rechtsverteidiger' },
  { code: 'CB', de: 'IV', name: 'Innenverteidiger' },
  { code: 'LB', de: 'LV', name: 'Linksverteidiger' },
  { code: 'RWB', de: 'RAV', name: 'Rechter Außenverteidiger' },
  { code: 'LWB', de: 'LAV', name: 'Linker Außenverteidiger' },
  { code: 'CDM', de: 'ZDM', name: 'Defensives Mittelfeld' },
  { code: 'CM', de: 'ZM', name: 'Zentrales Mittelfeld' },
  { code: 'CAM', de: 'ZOM', name: 'Offensives Mittelfeld' },
  { code: 'RM', de: 'RM', name: 'Rechtes Mittelfeld' },
  { code: 'LM', de: 'LM', name: 'Linkes Mittelfeld' },
  { code: 'RW', de: 'RF', name: 'Rechter Flügel' },
  { code: 'LW', de: 'LF', name: 'Linker Flügel' },
  { code: 'CF', de: 'MS', name: 'Mittelstürmer' },
  { code: 'ST', de: 'ST', name: 'Stürmer' },
];

// Schnellauswahl für häufige Rollen
export const POS_GROUPS: { label: string; codes: string[] }[] = [
  { label: 'Sturm', codes: ['ST', 'CF'] },
  { label: 'Flügel', codes: ['LW', 'RW', 'LM', 'RM'] },
  { label: 'Zentrales Mittelfeld', codes: ['CDM', 'CM', 'CAM'] },
  { label: 'Außenverteidiger', codes: ['LB', 'RB', 'LWB', 'RWB'] },
  { label: 'Innenverteidiger', codes: ['CB'] },
];

const DE = Object.fromEntries(POSITIONS.map((p) => [p.code, p.de]));

// Positionsfelder der Aufstellung (LCB, LDM, LS …) auf generische Position abbilden
const SLOT_BASE: Record<string, string> = {
  LCB: 'CB', RCB: 'CB', LDM: 'CDM', RDM: 'CDM', LCM: 'CM', RCM: 'CM',
  LAM: 'CAM', RAM: 'CAM', LS: 'ST', RS: 'ST', LF: 'CF', RF: 'CF', SW: 'CB',
};

export function posDe(code: string): string {
  return DE[code] ?? DE[SLOT_BASE[code]] ?? code;
}

// Feldkoordinaten in % (x von links, y von oben; Tor unten)
export const SLOT_XY: Record<string, [number, number]> = {
  GK: [50, 90],
  LB: [14, 70], LCB: [36, 74], CB: [50, 74], RCB: [64, 74], RB: [86, 70], SW: [50, 80],
  LWB: [10, 56], RWB: [90, 56],
  LDM: [37, 58], CDM: [50, 58], RDM: [63, 58],
  LCM: [30, 46], CM: [50, 46], RCM: [70, 46],
  LM: [12, 40], RM: [88, 40],
  LAM: [32, 32], CAM: [50, 32], RAM: [68, 32],
  LW: [16, 20], RW: [84, 20],
  LF: [34, 16], CF: [50, 18], RF: [66, 16],
  LS: [38, 10], ST: [50, 10], RS: [62, 10],
};
