import { useState, useMemo } from 'react';
import { HF } from '../tokens';
import { AppShell, Level } from '../components/kit';
import { ExperimentHeader } from './ExperimentKanban';
import { useStore } from '../store';

interface ExperimentOutlineProps {
  experimentId: string;
  onNavigate: (screen: string, expId?: string) => void;
  sidebarOpen: boolean;
  onSidebarToggle: (open: boolean) => void;
}

export function ExperimentOutline({ experimentId, onNavigate, sidebarOpen, onSidebarToggle }: ExperimentOutlineProps) {
  const { state } = useStore();
  const [view, setView] = useState<'kanban' | 'outline' | 'raw'>('outline');

  const experiment = state.experiments.find(e => e.id === experimentId);
  const expItems   = useMemo(() => state.items.filter(i => i.experimentId === experimentId), [state.items, experimentId]);
  const expFacts   = useMemo(() => expItems.filter(i => i.type === 'fact'),    [expItems]);
  const expInsights = useMemo(() => expItems.filter(i => i.type === 'insight'), [expItems]);
  const expRecs    = useMemo(() => expItems.filter(i => i.type === 'rec'),     [expItems]);

  const findings = useMemo(() => expInsights.map(insight => ({
    insight: insight.text,
    blurb: insight.blurb ?? '',
    facts: insight.supportedBy
      .map(fid => expFacts.find(f => f.id === fid)?.text)
      .filter(Boolean) as string[],
  })), [expInsights, expFacts]);

  const recs = useMemo(() => expRecs.map(rec => ({
    t: rec.text,
    blurb: rec.blurb ?? '',
    supportingInsights: rec.supportedBy
      .map(iid => expInsights.find(i => i.id === iid)?.text)
      .filter(Boolean) as string[],
  })), [expRecs, expInsights]);

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
          else if (v === 'raw') onNavigate('experiment-raw', experimentId);
        }}
        onNavigate={(s) => onNavigate(s, experimentId)}
        experiment={experiment}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 32, padding: '24px 32px 36px' }}>

        {/* RQ block */}
        {experiment?.researchQuestion && (
          <div style={{
            background: HF.card, border: `1px solid ${HF.border}`, borderRadius: 12,
            padding: 16, display: 'flex', gap: 20, alignItems: 'flex-start',
          }}>
            <div style={{ width: 6, alignSelf: 'stretch', background: HF.ink, borderRadius: 3, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3, fontWeight: 600 }}>
                Research question
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>
                {experiment.researchQuestion}
              </div>
            </div>
          </div>
        )}

        {/* Findings */}
        {findings.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: HF.ink3, fontSize: 14 }}>
            No insights yet. Add insights in the Kanban view.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3, fontWeight: 600 }}>
              Findings · {findings.length} insight{findings.length !== 1 ? 's' : ''}, {findings.reduce((s, f) => s + f.facts.length, 0)} facts
            </div>
            {findings.map((f) => (
              <FindingBlock key={f.insight} insight={f.insight} blurb={f.blurb} facts={f.facts} />
            ))}
          </div>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3, fontWeight: 600 }}>
              Recommendations
            </div>
            {recs.map((r) => (
              <RecBlock key={r.t} {...r} />
            ))}
          </div>
        )}

      </div>
    </AppShell>
  );
}

function FindingBlock({ insight, blurb, facts }: {
  insight: string;
  blurb: string;
  facts: string[];
}) {
  return (
    <div style={{ background: HF.card, border: `1px solid ${HF.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{
        background: HF.insight.bg,
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 7,
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Level level="insight" />
          <span style={{ fontSize: 11.5, color: HF.ink3 }}>based on {facts.length} fact{facts.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35 }}>{insight}</div>
        {blurb && <div style={{ fontSize: 13.5, color: HF.ink2, lineHeight: 1.55 }}>{blurb}</div>}
      </div>

      {facts.length > 0 && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3, fontWeight: 600 }}>
            Supporting facts
          </div>
          {facts.map((f, i) => (
            <div key={f}>
              {i > 0 && <div style={{ borderTop: `1px solid ${HF.border}`, marginBottom: 8 }} />}
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <Level level="fact" size="sm" />
                <span style={{ flex: 1, fontSize: 13, color: HF.ink2, lineHeight: 1.45 }}>{f}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface RecBlockData {
  t: string;
  blurb: string;
  supportingInsights: string[];
}

function RecBlock({ t, blurb, supportingInsights }: RecBlockData) {
  return (
    <div style={{ background: HF.card, border: `1px solid ${HF.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <div style={{
        background: HF.rec.bg,
        padding: '16px 20px',
        display: 'flex', flexDirection: 'column', gap: 7,
      }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Level level="rec" />
          <span style={{ fontSize: 11.5, color: HF.ink3 }}>· based on insights</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35 }}>{t}</div>
        {blurb && <div style={{ fontSize: 13.5, color: HF.ink2, lineHeight: 1.55 }}>{blurb}</div>}
      </div>

      {supportingInsights.length > 0 && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3, fontWeight: 600 }}>
            Supporting insights
          </div>
          {supportingInsights.map((ins, i) => (
            <div key={ins}>
              {i > 0 && <div style={{ borderTop: `1px solid ${HF.border}`, marginBottom: 8 }} />}
              <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
                <Level level="insight" size="sm" />
                <span style={{ flex: 1, fontSize: 13, color: HF.ink2, lineHeight: 1.45 }}>{ins}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
