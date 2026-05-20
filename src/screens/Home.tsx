import { useMemo } from 'react';
import { HF } from '../tokens';
import { AppShell, Btn, Chip } from '../components/kit';
import { useStore } from '../store';
import type { Experiment } from '../data';

interface HomeProps {
  onNavigate: (screen: string, expId?: string) => void;
  sidebarOpen: boolean;
  onSidebarToggle: (open: boolean) => void;
}

const SOLUTION_GRADIENT = 'linear-gradient(99.4deg, rgba(217,119,6,0.15) 0%, rgba(124,58,237,0.15) 62.9%, rgba(5,150,105,0.15) 100%)';

export function Home({ onNavigate, sidebarOpen, onSidebarToggle }: HomeProps) {
  const { state } = useStore();

  const recentExperiments = useMemo(() => [...state.experiments].reverse().slice(0, 3), [state.experiments]);
  const teams = useMemo(() => [...new Set(state.experiments.map(e => e.team))].filter(Boolean), [state.experiments]);

  return (
    <AppShell active="home" breadcrumb={['Home']} onNavigate={onNavigate} sidebarOpen={sidebarOpen} onSidebarToggle={onSidebarToggle}>
      <div style={{ padding: '24px 32px' }}>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600 }}>Welcome back</h1>
            <div style={{ fontSize: 12, color: HF.ink3 }}>
              Your atomic research repository. Capture facts, insights, and recommendations.
            </div>
          </div>
          <Btn variant="accent" size="md" onClick={() => onNavigate('add-experiment')}>
            Add new experiment
          </Btn>
        </div>

        {/* State of solution placeholder */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3 }}>
            State of solution
          </div>
          <div style={{
            backgroundImage: SOLUTION_GRADIENT,
            border: `1px solid ${HF.border}`,
            borderRadius: 12,
            padding: '32px 24px',
            textAlign: 'center',
            color: HF.ink3,
            fontSize: 14,
          }}>
            Add experiments and insights to see the state of your solution.
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ marginTop: 50, display: 'flex', gap: 50 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3 }}>
                Last 3 experiments
              </div>
              <span
                onClick={() => onNavigate('all-experiments')}
                style={{ fontSize: 13, color: HF.accent, cursor: 'pointer' }}
              >
                View all →
              </span>
            </div>
            {recentExperiments.length === 0 ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center', color: HF.ink3, fontSize: 13,
                background: HF.card, border: `1px dashed ${HF.border}`, borderRadius: 10,
              }}>
                No experiments yet.{' '}
                <span
                  onClick={() => onNavigate('add-experiment')}
                  style={{ color: HF.accent, cursor: 'pointer' }}
                >
                  Add one →
                </span>
              </div>
            ) : (
              recentExperiments.map((e) => (
                <RecentExperimentRow
                  key={e.id}
                  experiment={e}
                  onClick={() => onNavigate('experiment-kanban', e.id)}
                />
              ))
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3 }}>
              All teams
            </div>
            {teams.length === 0 ? (
              <div style={{
                padding: '32px 16px', textAlign: 'center', color: HF.ink3, fontSize: 13,
                background: HF.card, border: `1px dashed ${HF.border}`, borderRadius: 10,
              }}>
                Teams will appear here once experiments are added.
              </div>
            ) : (
              teams.map((t) => <TeamRow key={t} name={t} />)
            )}
          </div>
        </div>

      </div>
    </AppShell>
  );
}

function RecentExperimentRow({ experiment, onClick }: { experiment: Experiment; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        background: HF.card,
        border: `1px solid ${HF.border}`,
        borderRadius: 10,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: HF.ink }}>{experiment.name}</div>
        {experiment.method && (
          <div style={{ fontSize: 12, color: HF.ink3 }}>{experiment.method}</div>
        )}
      </div>
      {experiment.team && <Chip>{experiment.team}</Chip>}
    </div>
  );
}

function TeamRow({ name }: { name: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: 16,
      background: HF.card,
      border: `1px solid ${HF.border}`,
      borderRadius: 10,
    }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: HF.ink }}>{name}</div>
    </div>
  );
}
