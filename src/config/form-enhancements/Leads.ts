// Auto-generated. Per-entity form-enhancements config for "Leads".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: [{"row": ["vorname", "nachname"]}, "firma", "firmenname", {"row": ["erfassungsdatum", "herkunft"], "cols": "1fr 1fr"}, "leadstatus", "kampagne", {"row": ["email", "telefon"], "cols": "1fr 1fr"}, "bewertung", {"row": ["verantwortlich_vorname", "verantwortlich_nachname"]}, "interesse", "disqualifizierungsgrund"],
  defaults: {
    'erfassungsdatum': { kind: 'today' },
    'leadstatus': { kind: 'lookup', key: 'neu', label: 'Neu' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
