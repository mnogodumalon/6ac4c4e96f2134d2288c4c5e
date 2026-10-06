// Auto-generated. Per-entity form-enhancements config for "Firmen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["firmenname", {"row": ["kundenstatus", "strukturebene"], "cols": "1fr 1fr"}, {"row": ["branche", "kundennummer_planungssystem"], "cols": "1fr 1fr"}, "umsatzpotenzial", {"row": ["strasse", "hausnummer"], "cols": "2fr 1fr"}, {"row": ["plz", "ort"], "cols": "1fr 2fr"}, {"row": ["telefon", "email"], "cols": "1fr 1fr"}, "website", {"row": ["kundenmanager_vorname", "kundenmanager_nachname"], "cols": "1fr 1fr"}, "uebergeordnete_firma"],
  defaults: {
    'kundenstatus': { kind: 'lookup', key: 'interessent', label: 'Interessent' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
