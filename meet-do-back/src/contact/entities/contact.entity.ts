export enum ContactCategorie {
  GENERAL     = 'general',
  COMPTE      = 'compte',
  RESERVATION = 'reservation',
  ACTIVITE    = 'activite',
  PAIEMENT    = 'paiement',
  TECHNIQUE   = 'technique',
  SIGNALEMENT = 'signalement',
  AUTRE       = 'autre',
}

export enum ContactPriorite {
  BASSE   = 'basse',
  NORMALE = 'normale',
  HAUTE   = 'haute',
  URGENTE = 'urgente',
}

export interface ContactMessage {
  id: string;
  nom: string;
  email: string;
  telephone?: string | null;
  sujet: string;
  message: string;
  categorie: ContactCategorie;
  priorite: ContactPriorite;
  lu: boolean;
  repondu: boolean;
  reponse?: string | null;
  reponse_date?: string | null;
  created_at: string;
}

export interface ContactStats {
  total: number;
  nonLus: number;
  nonRepondu: number;
  urgents: number;
  recents7j: number;
  parCategorie: Record<string, number>;
  parPriorite: Record<string, number>;
}

export interface ContactListResult {
  items: ContactMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const LABEL_CATEGORIE: Record<ContactCategorie, string> = {
  [ContactCategorie.GENERAL]:     'Question générale',
  [ContactCategorie.COMPTE]:      'Mon compte',
  [ContactCategorie.RESERVATION]: 'Réservation',
  [ContactCategorie.ACTIVITE]:    'Activité / Publisher',
  [ContactCategorie.PAIEMENT]:    'Paiement / Facturation',
  [ContactCategorie.TECHNIQUE]:   'Problème technique',
  [ContactCategorie.SIGNALEMENT]: 'Signalement',
  [ContactCategorie.AUTRE]:       'Autre',
};

export const LABEL_PRIORITE: Record<ContactPriorite, string> = {
  [ContactPriorite.BASSE]:   'Basse',
  [ContactPriorite.NORMALE]: 'Normale',
  [ContactPriorite.HAUTE]:   'Haute',
  [ContactPriorite.URGENTE]: 'Urgente',
};

export function prioriteVersEmoji(priorite: ContactPriorite): string {
  const emojis: Record<ContactPriorite, string> = {
    [ContactPriorite.BASSE]:   '🟢',
    [ContactPriorite.NORMALE]: '🔵',
    [ContactPriorite.HAUTE]:   '🟠',
    [ContactPriorite.URGENTE]: '🔴',
  };
  return emojis[priorite] ?? '⚪';
}
