import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Firmen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    firmenname?: string;
    strukturebene?: LookupValue;
    branche?: string;
    kundenstatus?: LookupValue;
    kundennummer_planungssystem?: string;
    umsatzpotenzial?: number;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    telefon?: string;
    email?: string;
    website?: string;
    kundenmanager_vorname?: string;
    kundenmanager_nachname?: string;
    uebergeordnete_firma?: RecordUrl; // applookup -> URL zu 'Firmen' Record
  };
}

export interface Ansprechpartner {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    position?: string;
    email?: string;
    telefon?: string;
    mobil?: string;
    entscheider?: boolean;
    firma?: RecordUrl; // applookup -> URL zu 'Firmen' Record
  };
}

export interface Leads {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    erfassungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    herkunft?: LookupValue;
    kampagne?: string;
    vorname?: string;
    nachname?: string;
    firma?: RecordUrl; // applookup -> URL zu 'Firmen' Record
    firmenname?: string;
    email?: string;
    telefon?: string;
    interesse?: string;
    leadstatus?: LookupValue;
    bewertung?: LookupValue;
    disqualifizierungsgrund?: string;
    verantwortlich_vorname?: string;
    verantwortlich_nachname?: string;
  };
}

export interface Chancen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    phase?: LookupValue;
    vertragsvolumen_jaehrlich?: number;
    vertragsvolumen_gesamt?: number;
    wahrscheinlichkeit?: number;
    abschlussdatum?: string; // Format: YYYY-MM-DD oder ISO String
    abschlussgrund?: string;
    wettbewerber?: string;
    auftragsnummer_planungssystem?: string;
    bemerkungen?: string;
    firma?: RecordUrl; // applookup -> URL zu 'Firmen' Record
    ansprechpartner?: RecordUrl; // applookup -> URL zu 'Ansprechpartner' Record
    lead?: RecordUrl; // applookup -> URL zu 'Leads' Record
  };
}

export interface Aktivitaeten {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    art?: LookupValue;
    zeitpunkt?: string; // Format: YYYY-MM-DD oder ISO String
    betreff?: string;
    beschreibung?: string;
    ergebnis?: string;
    folgeaufgabe?: string;
    faelligkeit?: string; // Format: YYYY-MM-DD oder ISO String
    durchgefuehrt_vorname?: string;
    durchgefuehrt_nachname?: string;
    firma?: RecordUrl; // applookup -> URL zu 'Firmen' Record
    ansprechpartner?: RecordUrl; // applookup -> URL zu 'Ansprechpartner' Record
    lead?: RecordUrl; // applookup -> URL zu 'Leads' Record
    chance?: RecordUrl; // applookup -> URL zu 'Chancen' Record
  };
}

export const APP_IDS = {
  FIRMEN: '6ac4c4c16c7773edde7fdbe4',
  ANSPRECHPARTNER: '6ac4c4c8a25307776c8ba355',
  LEADS: '6ac4c4c8cf054be638d33f15',
  CHANCEN: '6ac4c4c99f3d503626833ec3',
  AKTIVITAETEN: '6ac4c4ca8f5c5f98fa397827',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'firmen': {
    strukturebene: [{ key: "tochtergesellschaft", get label() { return lookupLabel('firmen', 'strukturebene', "tochtergesellschaft") ?? "Tochtergesellschaft"; } }, { key: "niederlassung", get label() { return lookupLabel('firmen', 'strukturebene', "niederlassung") ?? "Niederlassung / Standort"; } }, { key: "abteilung", get label() { return lookupLabel('firmen', 'strukturebene', "abteilung") ?? "Abteilung"; } }, { key: "eigenstaendig", get label() { return lookupLabel('firmen', 'strukturebene', "eigenstaendig") ?? "Eigenständige Firma"; } }, { key: "konzern", get label() { return lookupLabel('firmen', 'strukturebene', "konzern") ?? "Konzern / Holding"; } }],
    kundenstatus: [{ key: "interessent", get label() { return lookupLabel('firmen', 'kundenstatus', "interessent") ?? "Interessent"; } }, { key: "kunde", get label() { return lookupLabel('firmen', 'kundenstatus', "kunde") ?? "Kunde"; } }, { key: "ehemaliger_kunde", get label() { return lookupLabel('firmen', 'kundenstatus', "ehemaliger_kunde") ?? "Ehemaliger Kunde"; } }],
  },
  'leads': {
    herkunft: [{ key: "website", get label() { return lookupLabel('leads', 'herkunft', "website") ?? "Website"; } }, { key: "messe", get label() { return lookupLabel('leads', 'herkunft', "messe") ?? "Messe"; } }, { key: "empfehlung", get label() { return lookupLabel('leads', 'herkunft', "empfehlung") ?? "Empfehlung"; } }, { key: "kampagne", get label() { return lookupLabel('leads', 'herkunft', "kampagne") ?? "Kampagne"; } }, { key: "kaltakquise", get label() { return lookupLabel('leads', 'herkunft', "kaltakquise") ?? "Kaltakquise"; } }, { key: "sonstiges", get label() { return lookupLabel('leads', 'herkunft', "sonstiges") ?? "Sonstiges"; } }],
    leadstatus: [{ key: "neu", get label() { return lookupLabel('leads', 'leadstatus', "neu") ?? "Neu"; } }, { key: "kontaktiert", get label() { return lookupLabel('leads', 'leadstatus', "kontaktiert") ?? "Kontaktiert"; } }, { key: "qualifiziert", get label() { return lookupLabel('leads', 'leadstatus', "qualifiziert") ?? "Qualifiziert"; } }, { key: "disqualifiziert", get label() { return lookupLabel('leads', 'leadstatus', "disqualifiziert") ?? "Disqualifiziert"; } }, { key: "konvertiert", get label() { return lookupLabel('leads', 'leadstatus', "konvertiert") ?? "Konvertiert"; } }],
    bewertung: [{ key: "heiss", get label() { return lookupLabel('leads', 'bewertung', "heiss") ?? "Heiß"; } }, { key: "warm", get label() { return lookupLabel('leads', 'bewertung', "warm") ?? "Warm"; } }, { key: "kalt", get label() { return lookupLabel('leads', 'bewertung', "kalt") ?? "Kalt"; } }],
  },
  'chancen': {
    phase: [{ key: "qualifizierung", get label() { return lookupLabel('chancen', 'phase', "qualifizierung") ?? "Qualifizierung"; } }, { key: "bedarfsanalyse", get label() { return lookupLabel('chancen', 'phase', "bedarfsanalyse") ?? "Bedarfsanalyse"; } }, { key: "angebot", get label() { return lookupLabel('chancen', 'phase', "angebot") ?? "Angebot"; } }, { key: "verhandlung", get label() { return lookupLabel('chancen', 'phase', "verhandlung") ?? "Verhandlung"; } }, { key: "gewonnen", get label() { return lookupLabel('chancen', 'phase', "gewonnen") ?? "Gewonnen"; } }, { key: "verloren", get label() { return lookupLabel('chancen', 'phase', "verloren") ?? "Verloren"; } }],
  },
  'aktivitaeten': {
    art: [{ key: "anruf", get label() { return lookupLabel('aktivitaeten', 'art', "anruf") ?? "Anruf"; } }, { key: "email", get label() { return lookupLabel('aktivitaeten', 'art', "email") ?? "E-Mail"; } }, { key: "termin", get label() { return lookupLabel('aktivitaeten', 'art', "termin") ?? "Termin"; } }, { key: "demo", get label() { return lookupLabel('aktivitaeten', 'art', "demo") ?? "Demo"; } }, { key: "sonstiges", get label() { return lookupLabel('aktivitaeten', 'art', "sonstiges") ?? "Sonstiges"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'firmen': {
    'firmenname': 'string/text',
    'strukturebene': 'lookup/select',
    'branche': 'string/text',
    'kundenstatus': 'lookup/select',
    'kundennummer_planungssystem': 'string/text',
    'umsatzpotenzial': 'number',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'website': 'string/url',
    'kundenmanager_vorname': 'string/text',
    'kundenmanager_nachname': 'string/text',
    'uebergeordnete_firma': 'applookup/select',
  },
  'ansprechpartner': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'position': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'mobil': 'string/tel',
    'entscheider': 'bool',
    'firma': 'applookup/select',
  },
  'leads': {
    'erfassungsdatum': 'date/date',
    'herkunft': 'lookup/select',
    'kampagne': 'string/text',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'firma': 'applookup/select',
    'firmenname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'interesse': 'string/textarea',
    'leadstatus': 'lookup/select',
    'bewertung': 'lookup/radio',
    'disqualifizierungsgrund': 'string/textarea',
    'verantwortlich_vorname': 'string/text',
    'verantwortlich_nachname': 'string/text',
  },
  'chancen': {
    'bezeichnung': 'string/text',
    'phase': 'lookup/select',
    'vertragsvolumen_jaehrlich': 'number',
    'vertragsvolumen_gesamt': 'number',
    'wahrscheinlichkeit': 'number',
    'abschlussdatum': 'date/date',
    'abschlussgrund': 'string/textarea',
    'wettbewerber': 'string/text',
    'auftragsnummer_planungssystem': 'string/text',
    'bemerkungen': 'string/textarea',
    'firma': 'applookup/select',
    'ansprechpartner': 'applookup/select',
    'lead': 'applookup/select',
  },
  'aktivitaeten': {
    'art': 'lookup/select',
    'zeitpunkt': 'date/datetimeminute',
    'betreff': 'string/text',
    'beschreibung': 'string/textarea',
    'ergebnis': 'string/textarea',
    'folgeaufgabe': 'string/text',
    'faelligkeit': 'date/date',
    'durchgefuehrt_vorname': 'string/text',
    'durchgefuehrt_nachname': 'string/text',
    'firma': 'applookup/select',
    'ansprechpartner': 'applookup/select',
    'lead': 'applookup/select',
    'chance': 'applookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
  'firmen': [
    { field: 'firma', entity: 'ansprechpartner' },
    { field: 'firma', entity: 'leads' },
    { field: 'firma', entity: 'chancen' },
    { field: 'firma', entity: 'aktivitaeten' },
  ],
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateFirmen = StripLookup<Firmen['fields']>;
export type CreateAnsprechpartner = StripLookup<Ansprechpartner['fields']>;
export type CreateLeads = StripLookup<Leads['fields']>;
export type CreateChancen = StripLookup<Chancen['fields']>;
export type CreateAktivitaeten = StripLookup<Aktivitaeten['fields']>;