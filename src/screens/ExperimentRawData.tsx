import { useState, useMemo } from 'react';
import { HF } from '../tokens';
import { AppShell } from '../components/kit';
import { Icon } from '../components/Icon';
import { ExperimentHeader } from './ExperimentKanban';
import { useStore } from '../store';
import type { AtomicItem, StoredParticipant } from '../data';

interface ExperimentRawDataProps {
  experimentId: string;
  onNavigate: (screen: string, expId?: string) => void;
  sidebarOpen: boolean;
  onSidebarToggle: (open: boolean) => void;
}

export function ExperimentRawData({ experimentId, onNavigate, sidebarOpen, onSidebarToggle }: ExperimentRawDataProps) {
  const { state } = useStore();
  const [view, setView] = useState<'kanban' | 'outline' | 'raw'>('raw');

  const experiment = useMemo(() => state.experiments.find(e => e.id === experimentId), [state.experiments, experimentId]);
  const facts = useMemo(
    () => state.items.filter(i => i.experimentId === experimentId && i.type === 'fact'),
    [state.items, experimentId],
  );

  const participants = experiment?.participants ?? [];

  const factsByParticipant = useMemo(() => {
    const map = new Map<string, AtomicItem[]>();
    for (const f of facts) {
      if (!f.participantId) continue;
      const bucket = map.get(f.participantId) ?? [];
      bucket.push(f);
      map.set(f.participantId, bucket);
    }
    return map;
  }, [facts]);

  // Facts added from Kanban (no participant link)
  const unlinkedFacts = useMemo(() => facts.filter(f => !f.participantId), [facts]);

  return (
    <AppShell
      active="projects"
      breadcrumb={['Projects', experiment?.name ?? 'Experiment']}
      onNavigate={onNavigate}
      sidebarOpen={sidebarOpen}
      onSidebarToggle={onSidebarToggle}
    >
      <ExperimentHeader
        view={view}
        onSetView={(v) => {
          setView(v);
          if (v === 'kanban') onNavigate('experiment-kanban', experimentId);
          else if (v === 'outline') onNavigate('experiment-outline', experimentId);
        }}
        onNavigate={(s) => onNavigate(s, experimentId)}
        experiment={experiment}
      />

      <div style={{ padding: '24px 32px 48px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {participants.length === 0 && unlinkedFacts.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: HF.ink3, fontSize: 14 }}>
            No raw sessions recorded.
          </div>
        ) : (
          <>
            {participants.map(p => (
              <ParticipantNoteCard
                key={p.id}
                participant={p}
                facts={factsByParticipant.get(p.id) ?? []}
              />
            ))}

            {unlinkedFacts.length > 0 && (
              <UnlinkedFactsCard facts={unlinkedFacts} />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

// ─── Participant note card ────────────────────────────────────────────────────

function ParticipantNoteCard({ participant, facts }: { participant: StoredParticipant; facts: AtomicItem[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{
      background: HF.card,
      border: `1px solid ${open ? HF.borderStrong : HF.border}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', cursor: 'pointer',
          borderBottom: open ? `1px solid ${HF.border}` : 'none',
        }}
      >
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} stroke={HF.ink3} />
        <span style={{ flex: 1, fontWeight: 500, fontSize: 14, color: HF.ink }}>{participant.label}</span>
        {facts.length > 0 && (
          <span style={{
            fontSize: 11.5, fontWeight: 600,
            color: HF.fact.ink, background: HF.fact.bg,
            borderRadius: 5, padding: '2px 8px',
          }}>
            {facts.length} fact{facts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {open && (
        <>
          {/* Raw notes — innerHTML is rendered directly; highlight spans are already baked in */}
          {participant.notes ? (
            <div
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: participant.notes }}
              style={{
                padding: '14px 16px',
                font: 'inherit', fontSize: 13.5,
                color: HF.ink, lineHeight: 1.65,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}
            />
          ) : (
            <div style={{ padding: '24px 16px', color: HF.ink4, fontSize: 13, fontStyle: 'italic' }}>
              No notes recorded for this participant.
            </div>
          )}

          {/* Facts extracted from this participant's notes */}
          {facts.length > 0 && (
            <div style={{
              borderTop: `1px solid ${HF.border}`,
              padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 8,
              background: HF.bgSubtle,
            }}>
              <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: HF.ink3, fontWeight: 600 }}>
                Facts extracted
              </div>
              {facts.map(f => <FactRow key={f.id} fact={f} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Unlinked facts (added via Kanban, no participant) ────────────────────────

function UnlinkedFactsCard({ facts }: { facts: AtomicItem[] }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{
      background: HF.card,
      border: `1px solid ${open ? HF.borderStrong : HF.border}`,
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', cursor: 'pointer',
          borderBottom: open ? `1px solid ${HF.border}` : 'none',
        }}
      >
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} stroke={HF.ink3} />
        <span style={{ flex: 1, fontWeight: 500, fontSize: 14, color: HF.ink }}>Standalone facts</span>
        <span style={{
          fontSize: 11.5, fontWeight: 600,
          color: HF.fact.ink, background: HF.fact.bg,
          borderRadius: 5, padding: '2px 8px',
        }}>
          {facts.length} fact{facts.length !== 1 ? 's' : ''}
        </span>
      </div>
      {open && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {facts.map(f => <FactRow key={f.id} fact={f} />)}
        </div>
      )}
    </div>
  );
}

// ─── Fact row ─────────────────────────────────────────────────────────────────

function FactRow({ fact }: { fact: AtomicItem }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: HF.fact.dot, flexShrink: 0, marginTop: 4,
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: HF.fact.ink, lineHeight: 1.4 }}>
          {fact.text}
        </span>
        {fact.highlightedText && (
          <span style={{ fontSize: 11.5, color: HF.ink3, fontStyle: 'italic', lineHeight: 1.4 }}>
            "{fact.highlightedText.length > 100 ? fact.highlightedText.slice(0, 100) + '…' : fact.highlightedText}"
          </span>
        )}
        {fact.blurb && (
          <span style={{ fontSize: 12, color: HF.ink2, lineHeight: 1.45 }}>
            {fact.blurb}
          </span>
        )}
      </div>
    </div>
  );
}
