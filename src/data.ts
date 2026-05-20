import type { AtomicLevel } from './tokens';

export interface StoredParticipant {
  id: string;
  label: string;
  notes: string; // innerHTML of the contentEditable div — preserves highlight spans
}

export interface Experiment {
  id: string;
  name: string;
  team: string;
  method: string;
  researchQuestion?: string;
  participants?: StoredParticipant[];
  uploadedAt?: string; // ISO string — only set when uploaded (not draft)
}

export interface AtomicItem {
  id: string;
  type: AtomicLevel;
  text: string;
  blurb?: string;
  experimentId: string;
  supportedBy: string[];
  participantId?: string;
  highlightedText?: string;
  tags?: string[];
}

export const EXPERIMENTS: Experiment[] = [];

export const ITEMS: AtomicItem[] = [];
