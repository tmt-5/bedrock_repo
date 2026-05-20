export const HF = {
  bg: '#fafaf9',
  bgSubtle: '#f5f5f4',
  card: '#ffffff',
  border: '#e7e5e4',
  borderStrong: '#d6d3d1',
  ink: '#1c1917',
  ink2: '#44403c',
  ink3: '#78716c',
  ink4: '#a8a29e',
  accent: '#4f46e5',
  accentBg: '#eef2ff',
  accentInk: '#3730a3',
  raw:     { ink: '#57534e', bg: '#f5f5f4', dot: '#a8a29e', label: 'Raw' },
  fact:    { ink: '#92400e', bg: '#fef3c7', dot: '#d97706', label: 'Fact' },
  insight: { ink: '#5b21b6', bg: '#ede9fe', dot: '#7c3aed', label: 'Insight' },
  rec:     { ink: '#065f46', bg: '#d1fae5', dot: '#059669', label: 'Rec' },
} as const;

export type AtomicLevel = 'raw' | 'fact' | 'insight' | 'rec';
