import type { Aktivitaeten, Ansprechpartner, Chancen, Firmen, Leads } from './app';

export type EnrichedFirmen = Firmen & {
  uebergeordnete_firmaName: string;
};

export type EnrichedAnsprechpartner = Ansprechpartner & {
  firmaName: string;
};

export type EnrichedLeads = Leads & {
  firmaName: string;
};

export type EnrichedChancen = Chancen & {
  firmaName: string;
  ansprechpartnerName: string;
  leadName: string;
};

export type EnrichedAktivitaeten = Aktivitaeten & {
  firmaName: string;
  ansprechpartnerName: string;
  leadName: string;
  chanceName: string;
};
