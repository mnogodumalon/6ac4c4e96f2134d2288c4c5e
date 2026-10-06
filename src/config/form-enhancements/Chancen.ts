// Auto-generated. Per-entity form-enhancements config for "Chancen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["bezeichnung", "firma", "ansprechpartner", {"row": ["phase", "wahrscheinlichkeit"], "cols": "2fr 1fr"}, {"row": ["vertragsvolumen_jaehrlich", "vertragsvolumen_gesamt"], "cols": "1fr 1fr"}, "abschlussdatum", "lead", {"row": ["wettbewerber", "auftragsnummer_planungssystem"], "cols": "1fr 1fr"}, "abschlussgrund", "bemerkungen"],
  defaults: {
    'phase': { kind: 'lookup', key: 'qualifizierung', label: 'Qualifizierung' },
  },
  computed: {},
  numberFields: {
    'wahrscheinlichkeit': { max: 100 },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
