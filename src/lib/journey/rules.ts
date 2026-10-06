/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'firmen' | 'ansprechpartner' | 'leads' | 'chancen' | 'aktivitaeten';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "firmen": "firmenname" | "branche" | "kundennummer_planungssystem" | "strasse" | "hausnummer" | "plz" | "ort" | "telefon" | "email" | "website" | "kundenmanager_vorname" | "kundenmanager_nachname";
  "ansprechpartner": "vorname" | "nachname" | "position" | "email" | "telefon" | "mobil";
  "leads": "kampagne" | "vorname" | "nachname" | "firmenname" | "email" | "telefon" | "interesse" | "disqualifizierungsgrund" | "verantwortlich_vorname" | "verantwortlich_nachname";
  "chancen": "bezeichnung" | "abschlussgrund" | "wettbewerber" | "auftragsnummer_planungssystem" | "bemerkungen";
  "aktivitaeten": "betreff" | "beschreibung" | "ergebnis" | "folgeaufgabe" | "durchgefuehrt_vorname" | "durchgefuehrt_nachname";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "firmen": "uebergeordnete_firma";
  "ansprechpartner": "firma";
  "leads": "firma";
  "chancen": "firma" | "ansprechpartner" | "lead";
  "aktivitaeten": "firma" | "ansprechpartner" | "lead" | "chance";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it (`file` is upload-only, never via a journey). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "firmen": {
    "key": "firmen",
    "appId": "6ac4c4c16c7773edde7fdbe4",
    "label": "Firmen",
    "pascal": "Firmen",
    "single": "FirmenEntry"
  },
  "ansprechpartner": {
    "key": "ansprechpartner",
    "appId": "6ac4c4c8a25307776c8ba355",
    "label": "Ansprechpartner",
    "pascal": "Ansprechpartner",
    "single": "AnsprechpartnerEntry"
  },
  "leads": {
    "key": "leads",
    "appId": "6ac4c4c8cf054be638d33f15",
    "label": "Leads",
    "pascal": "Leads",
    "single": "Lead"
  },
  "chancen": {
    "key": "chancen",
    "appId": "6ac4c4c99f3d503626833ec3",
    "label": "Chancen",
    "pascal": "Chancen",
    "single": "ChancenEntry"
  },
  "aktivitaeten": {
    "key": "aktivitaeten",
    "appId": "6ac4c4ca8f5c5f98fa397827",
    "label": "Aktivitäten",
    "pascal": "Aktivitaeten",
    "single": "AktivitaetenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "firmen": {
    "firmenname": {
      "key": "firmenname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Firmenname",
      "writable": true,
      "maxLength": 4000
    },
    "strukturebene": {
      "key": "strukturebene",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Rolle in der Kundenstruktur",
      "writable": true,
      "options": [
        "tochtergesellschaft",
        "niederlassung",
        "abteilung",
        "eigenstaendig",
        "konzern"
      ]
    },
    "branche": {
      "key": "branche",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Branche",
      "writable": true,
      "maxLength": 4000
    },
    "kundenstatus": {
      "key": "kundenstatus",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Kundenstatus",
      "writable": true,
      "options": [
        "interessent",
        "kunde",
        "ehemaliger_kunde"
      ]
    },
    "kundennummer_planungssystem": {
      "key": "kundennummer_planungssystem",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Kundennummer im Planungssystem",
      "writable": true,
      "maxLength": 4000
    },
    "umsatzpotenzial": {
      "key": "umsatzpotenzial",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Jahresumsatz-Potenzial (€)",
      "writable": true,
      "format": "currency"
    },
    "strasse": {
      "key": "strasse",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Straße",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-line1"
    },
    "hausnummer": {
      "key": "hausnummer",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Hausnummer",
      "writable": true,
      "maxLength": 4000
    },
    "plz": {
      "key": "plz",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Postleitzahl",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "postal-code"
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ort",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "website": {
      "key": "website",
      "fulltype": "string/url",
      "kind": "url",
      "required": false,
      "label": "Website",
      "writable": true,
      "autoComplete": "url"
    },
    "kundenmanager_vorname": {
      "key": "kundenmanager_vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Kundenmanager Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "kundenmanager_nachname": {
      "key": "kundenmanager_nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Kundenmanager Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "uebergeordnete_firma": {
      "key": "uebergeordnete_firma",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Übergeordnete Firma",
      "writable": true,
      "targetAppId": "6ac4c4c16c7773edde7fdbe4",
      "targetEntity": "firmen"
    }
  },
  "ansprechpartner": {
    "vorname": {
      "key": "vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "nachname": {
      "key": "nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "position": {
      "key": "position",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Position",
      "writable": true,
      "maxLength": 4000
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "mobil": {
      "key": "mobil",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Mobil",
      "writable": true,
      "autoComplete": "tel"
    },
    "entscheider": {
      "key": "entscheider",
      "fulltype": "bool",
      "kind": "bool",
      "required": false,
      "label": "Entscheider",
      "writable": true
    },
    "firma": {
      "key": "firma",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Firma",
      "writable": true,
      "targetAppId": "6ac4c4c16c7773edde7fdbe4",
      "targetEntity": "firmen"
    }
  },
  "leads": {
    "erfassungsdatum": {
      "key": "erfassungsdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Erfassungsdatum",
      "writable": true
    },
    "herkunft": {
      "key": "herkunft",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Herkunft",
      "writable": true,
      "options": [
        "website",
        "messe",
        "empfehlung",
        "kampagne",
        "kaltakquise",
        "sonstiges"
      ]
    },
    "kampagne": {
      "key": "kampagne",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Kampagne",
      "writable": true,
      "maxLength": 4000
    },
    "vorname": {
      "key": "vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "nachname": {
      "key": "nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "firma": {
      "key": "firma",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Zugeordnete Firma",
      "writable": true,
      "targetAppId": "6ac4c4c16c7773edde7fdbe4",
      "targetEntity": "firmen"
    },
    "firmenname": {
      "key": "firmenname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Firma",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "organization"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": false,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "interesse": {
      "key": "interesse",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Interesse",
      "writable": true
    },
    "leadstatus": {
      "key": "leadstatus",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Lead-Status",
      "writable": true,
      "options": [
        "neu",
        "kontaktiert",
        "qualifiziert",
        "disqualifiziert",
        "konvertiert"
      ]
    },
    "bewertung": {
      "key": "bewertung",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": false,
      "label": "Bewertung",
      "writable": true,
      "options": [
        "heiss",
        "warm",
        "kalt"
      ]
    },
    "disqualifizierungsgrund": {
      "key": "disqualifizierungsgrund",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Disqualifizierungsgrund",
      "writable": true
    },
    "verantwortlich_vorname": {
      "key": "verantwortlich_vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Verantwortlicher Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "verantwortlich_nachname": {
      "key": "verantwortlich_nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Verantwortlicher Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    }
  },
  "chancen": {
    "bezeichnung": {
      "key": "bezeichnung",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Bezeichnung",
      "writable": true,
      "maxLength": 4000
    },
    "phase": {
      "key": "phase",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Funnel-Phase",
      "writable": true,
      "options": [
        "qualifizierung",
        "bedarfsanalyse",
        "angebot",
        "verhandlung",
        "gewonnen",
        "verloren"
      ]
    },
    "vertragsvolumen_jaehrlich": {
      "key": "vertragsvolumen_jaehrlich",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Jährliches Vertragsvolumen (€)",
      "writable": true,
      "format": "currency"
    },
    "vertragsvolumen_gesamt": {
      "key": "vertragsvolumen_gesamt",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Gesamtes Vertragsvolumen (€)",
      "writable": true,
      "format": "currency"
    },
    "wahrscheinlichkeit": {
      "key": "wahrscheinlichkeit",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Wahrscheinlichkeit (%)",
      "writable": true
    },
    "abschlussdatum": {
      "key": "abschlussdatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Erwartetes Abschlussdatum",
      "writable": true
    },
    "abschlussgrund": {
      "key": "abschlussgrund",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Gewinn- oder Verlustgrund",
      "writable": true
    },
    "wettbewerber": {
      "key": "wettbewerber",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Wettbewerber",
      "writable": true,
      "maxLength": 4000
    },
    "auftragsnummer_planungssystem": {
      "key": "auftragsnummer_planungssystem",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Auftragsnummer im Planungssystem",
      "writable": true,
      "maxLength": 4000
    },
    "bemerkungen": {
      "key": "bemerkungen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bemerkungen",
      "writable": true
    },
    "firma": {
      "key": "firma",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Firma",
      "writable": true,
      "targetAppId": "6ac4c4c16c7773edde7fdbe4",
      "targetEntity": "firmen"
    },
    "ansprechpartner": {
      "key": "ansprechpartner",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Ansprechpartner",
      "writable": true,
      "targetAppId": "6ac4c4c8a25307776c8ba355",
      "targetEntity": "ansprechpartner"
    },
    "lead": {
      "key": "lead",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Ursprünglicher Lead",
      "writable": true,
      "targetAppId": "6ac4c4c8cf054be638d33f15",
      "targetEntity": "leads"
    }
  },
  "aktivitaeten": {
    "art": {
      "key": "art",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Art",
      "writable": true,
      "options": [
        "anruf",
        "email",
        "termin",
        "demo",
        "sonstiges"
      ]
    },
    "zeitpunkt": {
      "key": "zeitpunkt",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": true,
      "label": "Datum und Uhrzeit",
      "writable": true
    },
    "betreff": {
      "key": "betreff",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Betreff",
      "writable": true,
      "maxLength": 4000
    },
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung",
      "writable": true
    },
    "ergebnis": {
      "key": "ergebnis",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Ergebnis",
      "writable": true
    },
    "folgeaufgabe": {
      "key": "folgeaufgabe",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Folgeaufgabe",
      "writable": true,
      "maxLength": 4000
    },
    "faelligkeit": {
      "key": "faelligkeit",
      "fulltype": "date/date",
      "kind": "date",
      "required": false,
      "label": "Fälligkeit der Folgeaufgabe",
      "writable": true
    },
    "durchgefuehrt_vorname": {
      "key": "durchgefuehrt_vorname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Durchgeführt von Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "durchgefuehrt_nachname": {
      "key": "durchgefuehrt_nachname",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Durchgeführt von Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "firma": {
      "key": "firma",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Firma",
      "writable": true,
      "targetAppId": "6ac4c4c16c7773edde7fdbe4",
      "targetEntity": "firmen"
    },
    "ansprechpartner": {
      "key": "ansprechpartner",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Ansprechpartner",
      "writable": true,
      "targetAppId": "6ac4c4c8a25307776c8ba355",
      "targetEntity": "ansprechpartner"
    },
    "lead": {
      "key": "lead",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Lead",
      "writable": true,
      "targetAppId": "6ac4c4c8cf054be638d33f15",
      "targetEntity": "leads"
    },
    "chance": {
      "key": "chance",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": false,
      "label": "Chance",
      "writable": true,
      "targetAppId": "6ac4c4c99f3d503626833ec3",
      "targetEntity": "chancen"
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "firmen": [
    {
      "kind": "choice",
      "field": "strukturebene",
      "count": 5
    },
    {
      "kind": "choice",
      "field": "kundenstatus",
      "count": 3
    },
    {
      "kind": "record",
      "field": "uebergeordnete_firma",
      "targetEntity": "firmen"
    }
  ],
  "ansprechpartner": [
    {
      "kind": "record",
      "field": "firma",
      "targetEntity": "firmen"
    }
  ],
  "leads": [
    {
      "kind": "choice",
      "field": "herkunft",
      "count": 6
    },
    {
      "kind": "choice",
      "field": "leadstatus",
      "count": 5
    },
    {
      "kind": "choice",
      "field": "bewertung",
      "count": 3
    },
    {
      "kind": "record",
      "field": "firma",
      "targetEntity": "firmen"
    }
  ],
  "chancen": [
    {
      "kind": "choice",
      "field": "phase",
      "count": 6
    },
    {
      "kind": "record",
      "field": "firma",
      "targetEntity": "firmen"
    },
    {
      "kind": "record",
      "field": "ansprechpartner",
      "targetEntity": "ansprechpartner"
    },
    {
      "kind": "record",
      "field": "lead",
      "targetEntity": "leads"
    }
  ],
  "aktivitaeten": [
    {
      "kind": "choice",
      "field": "art",
      "count": 5
    },
    {
      "kind": "record",
      "field": "firma",
      "targetEntity": "firmen"
    },
    {
      "kind": "record",
      "field": "ansprechpartner",
      "targetEntity": "ansprechpartner"
    },
    {
      "kind": "record",
      "field": "lead",
      "targetEntity": "leads"
    },
    {
      "kind": "record",
      "field": "chance",
      "targetEntity": "chancen"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "firmen": [
    "firmenname"
  ],
  "ansprechpartner": [
    "vorname",
    "nachname"
  ],
  "leads": [
    "vorname",
    "nachname"
  ],
  "chancen": [
    "bezeichnung"
  ],
  "aktivitaeten": [
    "betreff"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
function displayPart(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
