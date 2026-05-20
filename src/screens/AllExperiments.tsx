import { useMemo, useState } from 'react';
import { HF } from '../tokens';
import { AppShell, Btn, Chip } from '../components/kit';
import type { ChainCounts } from '../components/kit';
import { useStore } from '../store';

interface AllExperimentsProps {
  onNavigate: (screen: string, expId?: string) => void;
  sidebarOpen: boolean;
  onSidebarToggle: (open: boolean) => void;
}

export function AllExperiments({ onNavigate, sidebarOpen, onSidebarToggle }: AllExperimentsProps) {
  const { state } = useStore();
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const allRows = useMemo(() => state.experiments.map(exp => {
    const expItems = state.items.filter(i => i.experimentId === exp.id);
    const chain: ChainCounts = {
      raw:     expItems.filter(i => i.type === 'raw').length,
      fact:    expItems.filter(i => i.type === 'fact').length,
      insight: expItems.filter(i => i.type === 'insight').length,
      rec:     expItems.filter(i => i.type === 'rec').length,
    };
    return { exp, chain };
  }), [state.experiments, state.items]);

  const teams = useMemo(() => [...new Set(state.experiments.map(e => e.team))].filter(Boolean).sort(), [state.experiments]);
  const methods = useMemo(() => [...new Set(state.experiments.map(e => e.method))].filter(Boolean).sort(), [state.experiments]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows
      .filter(({ exp }) => {
        if (q && !exp.name.toLowerCase().includes(q) && !exp.team.toLowerCase().includes(q) && !exp.method.toLowerCase().includes(q)) return false;
        if (teamFilter && exp.team !== teamFilter) return false;
        if (methodFilter && exp.method !== methodFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (!a.exp.uploadedAt && !b.exp.uploadedAt) return 0;
        if (!a.exp.uploadedAt) return 1;
        if (!b.exp.uploadedAt) return -1;
        const ta = new Date(a.exp.uploadedAt).getTime();
        const tb = new Date(b.exp.uploadedAt).getTime();
        return sortOrder === 'newest' ? tb - ta : ta - tb;
      });
  }, [allRows, search, teamFilter, methodFilter, sortOrder]);

  const teamCount = useMemo(() => new Set(state.experiments.map(e => e.team)).size, [state.experiments]);

  return (
    <AppShell active="projects" breadcrumb={['Projects']} onNavigate={onNavigate} sidebarOpen={sidebarOpen} onSidebarToggle={onSidebarToggle}>
      <div style={{ padding: '24px 32px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600 }}>All experiments</h1>
            <div style={{ fontSize: 12, color: HF.ink3 }}>
              {state.experiments.length} experiment{state.experiments.length !== 1 ? 's' : ''} across {teamCount} team{teamCount !== 1 ? 's' : ''}
            </div>
          </div>
          <Btn variant="accent" size="md" onClick={() => onNavigate('add-experiment')}>
            Add new experiment
          </Btn>
        </div>

        {/* Filter bar */}
        <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: HF.card, border: `1px solid ${HF.border}`,
            borderRadius: 8, padding: '8px 16px', width: 250, flexShrink: 0,
          }}>
            <input
              placeholder="Search experiments …"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 14, color: HF.ink, width: '100%' }}
            />
          </div>
          <FilterSelect
            value={teamFilter}
            onChange={setTeamFilter}
            placeholder="All teams"
            options={teams}
          />
          <FilterSelect
            value={methodFilter}
            onChange={setMethodFilter}
            placeholder="All methods"
            options={methods}
          />
          {(teamFilter || methodFilter || search) && (
            <button
              onClick={() => { setSearch(''); setTeamFilter(''); setMethodFilter(''); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: HF.ink3, padding: '0 4px', fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
          )}
          <div style={{ marginLeft: 'auto' }}>
            <SortSelect value={sortOrder} onChange={setSortOrder} />
          </div>
        </div>

        {/* Table or empty state */}
        {state.experiments.length === 0 ? (
          <div style={{
            marginTop: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            padding: '60px 32px',
            background: HF.card, border: `1px dashed ${HF.borderStrong}`, borderRadius: 12,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: HF.ink }}>No experiments yet</div>
            <div style={{ fontSize: 13, color: HF.ink3, textAlign: 'center', maxWidth: 320 }}>
              Add your first experiment to start capturing facts, insights, and recommendations.
            </div>
            <Btn variant="accent" size="md" onClick={() => onNavigate('add-experiment')}>
              Add new experiment
            </Btn>
          </div>
        ) : rows.length === 0 ? (
          <div style={{
            marginTop: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            padding: '48px 32px',
            background: HF.card, border: `1px dashed ${HF.borderStrong}`, borderRadius: 12,
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: HF.ink }}>No experiments match</div>
            <div style={{ fontSize: 13, color: HF.ink3 }}>Try clearing the filters.</div>
          </div>
        ) : (
          <div style={{ marginTop: 16, border: `1px solid ${HF.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: HF.bgSubtle, borderBottom: `1px solid ${HF.border}` }}>
                  {['Experiment', 'Team', 'Method', 'Atomic chain', 'Created'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '10px 16px',
                      fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: HF.ink3, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ exp, chain }, i) => (
                  <tr
                    key={exp.id}
                    style={{ borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${HF.border}` }}
                  >
                    <td
                      style={{ padding: '20px 16px', fontWeight: 600, fontSize: 13.5, color: HF.ink, cursor: 'pointer' }}
                      onClick={() => onNavigate('experiment-kanban', exp.id)}
                    >
                      <span style={{ borderBottom: `1px solid ${HF.border}` }}>{exp.name}</span>
                    </td>
                    <td style={{ padding: '20px 16px' }}><Chip>{exp.team}</Chip></td>
                    <td style={{ padding: '20px 16px', fontSize: 14, color: HF.ink3 }}>{exp.method}</td>
                    <td style={{ padding: '20px 16px' }}>
                      <TableChain fact={chain.fact} insight={chain.insight} rec={chain.rec} />
                    </td>
                    <td style={{ padding: '20px 16px', fontSize: 13.5, color: HF.ink3, whiteSpace: 'nowrap' }}>
                      {exp.uploadedAt ? formatDate(exp.uploadedAt) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </AppShell>
  );
}

function FilterSelect({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <div style={{
      background: HF.card, border: `1px solid ${value ? HF.ink4 : HF.border}`,
      borderRadius: 8, padding: '0 12px', height: 38, display: 'flex', alignItems: 'center',
      flexShrink: 0,
    }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          border: 0, outline: 0, background: 'transparent', font: 'inherit',
          fontSize: 14, color: value ? HF.ink : HF.ink3, cursor: 'pointer',
          appearance: 'none', WebkitAppearance: 'none', paddingRight: 20,
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ pointerEvents: 'none', marginLeft: -16, color: HF.ink3, fontSize: 10 }}>▾</span>
    </div>
  );
}

function SortSelect({ value, onChange }: {
  value: 'newest' | 'oldest';
  onChange: (v: 'newest' | 'oldest') => void;
}) {
  return (
    <div style={{
      background: HF.card, border: `1px solid ${HF.border}`,
      borderRadius: 8, padding: '0 12px', height: 38, display: 'flex', alignItems: 'center',
      flexShrink: 0,
    }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value as 'newest' | 'oldest')}
        style={{
          border: 0, outline: 0, background: 'transparent', font: 'inherit',
          fontSize: 14, color: HF.ink3, cursor: 'pointer',
          appearance: 'none', WebkitAppearance: 'none', paddingRight: 20,
        }}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
      <span style={{ pointerEvents: 'none', marginLeft: -16, color: HF.ink3, fontSize: 10 }}>▾</span>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function TableChain({ fact, insight, rec }: { fact: number; insight: number; rec: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {([
        { dot: HF.fact.dot,    n: fact },
        { dot: HF.insight.dot, n: insight },
        { dot: HF.rec.dot,     n: rec },
      ] as const).map(({ dot, n }, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: HF.ink, fontVariantNumeric: 'tabular-nums' }}>{n}</span>
        </div>
      ))}
    </div>
  );
}

