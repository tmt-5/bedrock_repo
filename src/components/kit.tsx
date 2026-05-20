import React from 'react';
import { HF } from '../tokens';
import type { AtomicLevel } from '../tokens';
import { Icon } from './Icon';

// ─── Btn ──────────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'default' | 'ghost' | 'accent' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: string;
  iconRight?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

const BTN_SIZES: Record<BtnSize, { padding: string; height: number; fontSize: number; gap: number }> = {
  sm: { padding: '0 10px', height: 28, fontSize: 12.5, gap: 5 },
  md: { padding: '0 14px', height: 34, fontSize: 13.5, gap: 6 },
  lg: { padding: '0 18px', height: 40, fontSize: 14, gap: 7 },
};

const BTN_VARIANTS: Record<BtnVariant, React.CSSProperties> = {
  primary: { background: HF.ink, color: '#fff', border: `1px solid ${HF.ink}`, boxShadow: '0 1px 0 rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.08)' },
  default: { background: '#fff', color: HF.ink, border: `1px solid ${HF.border}`, boxShadow: '0 1px 0 rgba(0,0,0,0.02)' },
  ghost: { background: 'transparent', color: HF.ink2, border: '1px solid transparent' },
  accent: { background: HF.accent, color: '#fff', border: `1px solid ${HF.accent}`, boxShadow: '0 1px 0 rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.15)' },
  danger: { background: '#fff', color: '#b91c1c', border: '1px solid #fecaca' },
};

export function Btn({ children, variant = 'default', size = 'md', icon, iconRight, style = {}, ...rest }: BtnProps) {
  const sz = BTN_SIZES[size];
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap',
        borderRadius: 8,
        fontWeight: 500,
        cursor: 'pointer',
        gap: sz.gap,
        padding: sz.padding,
        height: sz.height,
        fontSize: sz.fontSize,
        ...BTN_VARIANTS[variant],
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

interface ChipProps {
  children: React.ReactNode;
  color?: AtomicLevel;
  dot?: boolean;
  icon?: string;
  style?: React.CSSProperties;
}

export function Chip({ children, color, dot, icon, style = {} }: ChipProps) {
  const tone = color ? HF[color] : null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: tone ? tone.bg : HF.bgSubtle,
      color: tone ? tone.ink : HF.ink2,
      border: `1px solid ${tone ? 'transparent' : HF.border}`,
      borderRadius: 999, padding: '2px 9px',
      fontSize: 11.5, fontWeight: 500, lineHeight: 1.5,
      ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: tone ? tone.dot : HF.ink4 }} />}
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}

// ─── Level ────────────────────────────────────────────────────────────────────

export function Level({ level, size = 'md' }: { level: AtomicLevel; size?: 'sm' | 'md' }) {
  const t = HF[level];
  const sm = size === 'sm';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      alignSelf: 'flex-start',
      background: t.bg, color: t.ink,
      border: `1px solid ${t.ink}`,
      padding: sm ? '2px 8px 2px 7px' : '3px 10px 3px 8px',
      borderRadius: 999, fontWeight: 500,
      fontSize: sm ? 11 : 12.5,
      lineHeight: 1.4,
    }}>
      <span style={{ width: sm ? 5 : 6, height: sm ? 5 : 6, borderRadius: 3, background: t.dot }} />
      {t.label}
    </span>
  );
}

// ─── Tag ──────────────────────────────────────────────────────────────────────

export function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: 11.5, lineHeight: 1.45,
      color: accent ? HF.accentInk : HF.ink2,
      background: accent ? HF.accentBg : HF.bgSubtle,
      border: `1px solid ${accent ? '#c7d2fe' : HF.border}`,
      borderRadius: 6, padding: '1px 7px',
      fontWeight: 500,
    }}>
      <span style={{ opacity: 0.55, marginRight: 2 }}>#</span>{children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const PALETTE = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777', '#4338ca', '#0d9488'];

export function Avatar({ initial = 'A', size = 28, color }: { initial?: string; size?: number; color?: string }) {
  const c = color || PALETTE[(initial.charCodeAt(0) + (initial.charCodeAt(1) || 0)) % PALETTE.length];
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: c, color: '#fff',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600,
      flex: '0 0 auto',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
    }}>{initial}</span>
  );
}

// ─── Chain mini ───────────────────────────────────────────────────────────────

export interface ChainCounts { raw: number; fact: number; insight: number; rec: number; }

export function Chain({ counts = { raw: 0, fact: 0, insight: 0, rec: 0 } }: { counts?: ChainCounts }) {
  const map: [AtomicLevel, number][] = [
    ['raw', counts.raw],
    ['fact', counts.fact],
    ['insight', counts.insight],
    ['rec', counts.rec],
  ];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: HF.ink3 }}>
      {map.map(([lvl, n], i) => (
        <React.Fragment key={lvl}>
          {i > 0 && <span style={{ width: 8, height: 1, background: HF.border }} />}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: HF[lvl].dot }} />
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: n ? HF.ink2 : HF.ink4 }}>{n}</span>
          </span>
        </React.Fragment>
      ))}
    </span>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export type NavKey = 'home' | 'insights' | 'projects';

interface AppShellProps {
  active?: NavKey;
  leftRail?: boolean;
  children: React.ReactNode;
  breadcrumb?: string[];
  topbarTitle?: string;
  onNavigate?: (screen: string) => void;
  sidebarOpen?: boolean;
  onSidebarToggle?: (open: boolean) => void;
}

export function AppShell({ active = 'home', leftRail = true, children, onNavigate, sidebarOpen = true, onSidebarToggle }: AppShellProps) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: HF.bg, color: HF.ink,
      display: 'flex', overflow: 'hidden',
    }}>
      {leftRail && <Sidebar active={active} onNavigate={onNavigate} open={sidebarOpen} onToggle={onSidebarToggle ?? (() => {})} />}
      <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>{children}</div>
    </div>
  );
}

const NAV = [
  { key: 'home' as NavKey, label: 'Home' },
  { key: 'insights' as NavKey, label: 'Insights' },
  { key: 'projects' as NavKey, label: 'Experiments' },
];

const NAV_ICONS: Record<NavKey, string> = { home: 'home', insights: 'insight', projects: 'project' };
const TEAM_NAMES = ['Team #1', 'Team #2', 'Team #3'];

function Sidebar({ active, onNavigate, open, onToggle }: { active: NavKey; onNavigate?: (screen: string) => void; open: boolean; onToggle: (open: boolean) => void }) {
  return (
    <div style={{
      width: open ? 220 : 64,
      flex: '0 0 auto',
      background: HF.bgSubtle,
      borderRight: `1px solid ${HF.border}`,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: 16,
      overflow: 'hidden',
      transition: 'width 0.18s ease',
    }}>
      {/* Top: brand + nav */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: open ? 'flex-start' : 'center' }}>
          <div
            onClick={() => !open && onToggle(true)}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: HF.ink, overflow: 'hidden', position: 'relative',
              flexShrink: 0,
              cursor: open ? 'default' : 'pointer',
            }}
          >
            <span style={{ position: 'absolute', left: 8, top: 2, fontWeight: 700, fontSize: 13, lineHeight: 1, color: '#fff' }}>B</span>
            <span style={{ position: 'absolute', left: 8, top: 13, fontWeight: 700, fontSize: 11, lineHeight: 1, color: '#fff' }}>R</span>
          </div>
          {open && (
            <>
              <span style={{ fontWeight: 600, fontSize: 14, color: HF.ink, flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>Bedrock Repo</span>
              <button
                onClick={() => onToggle(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                  background: 'transparent', border: `1px solid ${HF.border}`,
                  cursor: 'pointer',
                }}
              >
                <Icon name="chevronLeft" size={11} stroke={HF.ink3} />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {NAV.map((n) => {
            const isActive = n.key === active;
            return (
              <div
                key={n.key}
                onClick={() => onNavigate?.(n.key)}
                title={open ? undefined : n.label}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: open ? 8 : 0,
                  padding: open ? '8px 12px' : '9px 0',
                  justifyContent: open ? 'flex-start' : 'center',
                  borderRadius: 4,
                  background: isActive ? HF.card : 'transparent',
                  border: `1px solid ${isActive ? HF.border : 'transparent'}`,
                  color: isActive ? HF.ink : HF.ink2,
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <Icon name={NAV_ICONS[n.key]} size={16} stroke={isActive ? HF.ink : HF.ink3} />
                {open && <span>{n.label}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: teams + divider + user */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 21 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: open ? 8 : 0 }}>
          {open && (
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', color: HF.ink4 }}>
              ALL TEAMS
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {TEAM_NAMES.map((t) => (
              <div
                key={t}
                title={open ? undefined : t}
                style={{
                  display: 'flex', alignItems: 'center',
                  gap: open ? 8 : 0,
                  padding: '8px 0',
                  justifyContent: open ? 'flex-start' : 'center',
                  cursor: 'pointer',
                }}
              >
                <Icon name="team" size={16} stroke={HF.ink3} />
                {open && <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: HF.ink2 }}>{t}</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: HF.border }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: open ? 8 : 0, justifyContent: open ? 'flex-start' : 'center' }}>
          <Avatar initial="JM" size={26} />
          {open && (
            <div style={{ fontSize: 12.5, lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, color: HF.ink }}>Jordan M.</div>
              <div style={{ color: HF.ink3, fontSize: 11 }}>UX Research</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Flow shell ───────────────────────────────────────────────────────────────

export function FlowShell({ n, label, next, children }: { n: string; label: string; next?: string; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: HF.bg,
    }}>
      <div style={{
        flex: '0 0 auto',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 16px',
        background: '#0c0a09', color: '#fafaf9',
        borderBottom: '1px solid #292524',
      }}>
        <span style={{
          width: 24, height: 24, borderRadius: '50%',
          background: '#fafaf9', color: '#0c0a09',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 12,
        }}>{n}</span>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Step {n}</span>
        <span style={{ color: '#a8a29e', fontSize: 13 }}>·</span>
        <span style={{ fontSize: 13, color: '#e7e5e4' }}>{label}</span>
        {next && (
          <>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: '#a8a29e' }}>next</span>
            <Icon name="arrowRight" size={13} stroke="#a8a29e" />
            <span style={{ fontSize: 12, color: '#e7e5e4' }}>{next}</span>
          </>
        )}
      </div>
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>{children}</div>
    </div>
  );
}
