import React, { useState, useMemo, useLayoutEffect, useEffect, useRef } from 'react';
import { HF } from '../tokens';
import type { AtomicLevel } from '../tokens';
import { AppShell, Btn, Chip, Level } from '../components/kit';
import { Icon } from '../components/Icon';
import { KanbanAddFactDialog } from '../components/AddFactDialog';
import { KanbanAddInsightDialog } from '../components/AddInsightDialog';
import { KanbanAddRecDialog } from '../components/AddRecDialog';
import { useStore } from '../store';
import type { AtomicItem } from '../data';
import type { Experiment } from '../data';

interface ExperimentKanbanProps {
  experimentId: string;
  onNavigate: (screen: string, expId?: string) => void;
  sidebarOpen: boolean;
  onSidebarToggle: (open: boolean) => void;
}

interface LineData {
  key: string;
  d: string;
  color: string;
}

interface Selection {
  type: AtomicLevel;
  id: string;
}

function makeBezier(key: string, x1: number, y1: number, x2: number, y2: number, color: string): LineData {
  const cx = (x1 + x2) / 2;
  return { key, d: `M ${x1} ${y1} C ${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`, color };
}

function cardRect(id: string) {
  return document.querySelector(`[data-card-id="${id}"]`)?.getBoundingClientRect() ?? null;
}

export function ExperimentKanban({ experimentId, onNavigate, sidebarOpen, onSidebarToggle }: ExperimentKanbanProps) {
  const { state, dispatch } = useStore();
  const [view, setView] = useState<'kanban' | 'outline' | 'raw'>('kanban');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [lines, setLines] = useState<LineData[]>([]);
  const [showAddFact,    setShowAddFact]    = useState(false);
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [showAddRec,     setShowAddRec]     = useState(false);
  const [editTarget, setEditTarget] = useState<{ lvl: AtomicLevel; id: string } | null>(null);

  const experiment = state.experiments.find(e => e.id === experimentId);
  const expItems = useMemo(() => state.items.filter(i => i.experimentId === experimentId), [state.items, experimentId]);
  const facts    = useMemo(() => expItems.filter(i => i.type === 'fact'),    [expItems]);
  const insights = useMemo(() => expItems.filter(i => i.type === 'insight'), [expItems]);
  const recs     = useMemo(() => expItems.filter(i => i.type === 'rec'),     [expItems]);

  const reverseMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const item of expItems) {
      for (const depId of item.supportedBy) {
        m[depId] = (m[depId] ?? 0) + 1;
      }
    }
    return m;
  }, [expItems]);

  useLayoutEffect(() => {
    if (!selection) { setLines([]); return; }
    const newLines: LineData[] = [];

    if (selection.type === 'insight') {
      const insight = insights.find(i => i.id === selection.id);
      if (!insight) return;
      const ir = cardRect(selection.id);
      if (!ir) return;
      for (const factId of insight.supportedBy) {
        const r = cardRect(factId);
        if (!r) continue;
        newLines.push(makeBezier(`f-${factId}`, r.right, r.top + r.height / 2, ir.left, ir.top + ir.height / 2, HF.insight.dot));
      }
      for (const rec of recs.filter(r => r.supportedBy.includes(selection.id))) {
        const r = cardRect(rec.id);
        if (!r) continue;
        newLines.push(makeBezier(`r-${rec.id}`, ir.right, ir.top + ir.height / 2, r.left, r.top + r.height / 2, HF.insight.dot));
      }
    }

    if (selection.type === 'fact') {
      const fr = cardRect(selection.id);
      if (!fr) return;
      for (const insight of insights.filter(i => i.supportedBy.includes(selection.id))) {
        const r = cardRect(insight.id);
        if (!r) continue;
        newLines.push(makeBezier(`i-${insight.id}`, fr.right, fr.top + fr.height / 2, r.left, r.top + r.height / 2, HF.fact.dot));
      }
    }

    if (selection.type === 'rec') {
      const rr = cardRect(selection.id);
      if (!rr) return;
      const rec = recs.find(r => r.id === selection.id);
      for (const insightId of rec?.supportedBy ?? []) {
        const r = cardRect(insightId);
        if (!r) continue;
        newLines.push(makeBezier(`i-${insightId}`, r.right, r.top + r.height / 2, rr.left, rr.top + rr.height / 2, HF.rec.dot));
      }
    }

    setLines(newLines);
  }, [selection, insights, recs, facts]);

  const getConnectedIds = (): Set<string> | null => {
    if (!selection) return null;
    const ids = new Set<string>([selection.id]);
    if (selection.type === 'insight') {
      const insight = insights.find(i => i.id === selection.id);
      insight?.supportedBy.forEach(id => ids.add(id));
      recs.filter(r => r.supportedBy.includes(selection.id)).forEach(r => ids.add(r.id));
    }
    if (selection.type === 'fact') {
      insights.filter(i => i.supportedBy.includes(selection.id)).forEach(i => ids.add(i.id));
    }
    if (selection.type === 'rec') {
      recs.find(r => r.id === selection.id)?.supportedBy.forEach(id => ids.add(id));
    }
    return ids;
  };

  const handleAddFact = (text: string, desc: string, _tags: string[], _expId: string, _insightIds: string[]) => {
    dispatch({ type: 'ADD_ITEM', payload: {
      id: crypto.randomUUID(), type: 'fact',
      text, blurb: desc || undefined, experimentId, supportedBy: [],
    }});
    setShowAddFact(false);
  };

  const handleAddInsight = (text: string, desc: string, _tags: string[], _expId: string, factIds: string[], _recIds: string[]) => {
    dispatch({ type: 'ADD_ITEM', payload: {
      id: crypto.randomUUID(), type: 'insight',
      text, blurb: desc || undefined, experimentId, supportedBy: factIds,
    }});
    setShowAddInsight(false);
  };

  const handleAddRec = (text: string, desc: string, _tags: string[], _expId: string, insightIds: string[]) => {
    dispatch({ type: 'ADD_ITEM', payload: {
      id: crypto.randomUUID(), type: 'rec',
      text, blurb: desc || undefined, experimentId, supportedBy: insightIds,
    }});
    setShowAddRec(false);
  };

  const handleCardClick = (type: AtomicLevel, id: string) =>
    setSelection(prev => prev?.type === type && prev?.id === id ? null : { type, id });

  const findEditItem = (id: string): AtomicItem | undefined =>
    state.items.find(i => i.id === id);

  const handleEditFact = (text: string, desc: string, _tags: string[], _expId: string, _insightIds: string[]) => {
    if (!editTarget) return;
    const base = findEditItem(editTarget.id);
    if (!base) return;
    dispatch({ type: 'UPDATE_ITEM', payload: { ...base, text, blurb: desc || undefined } });
    setEditTarget(null);
  };

  const handleEditInsight = (text: string, desc: string, _tags: string[], _expId: string, factIds: string[], _recIds: string[]) => {
    if (!editTarget) return;
    const base = findEditItem(editTarget.id);
    if (!base) return;
    dispatch({ type: 'UPDATE_ITEM', payload: { ...base, text, blurb: desc || undefined, supportedBy: factIds } });
    setEditTarget(null);
  };

  const handleEditRec = (text: string, desc: string, _tags: string[], _expId: string, insightIds: string[]) => {
    if (!editTarget) return;
    const base = findEditItem(editTarget.id);
    if (!base) return;
    dispatch({ type: 'UPDATE_ITEM', payload: { ...base, text, blurb: desc || undefined, supportedBy: insightIds } });
    setEditTarget(null);
  };

  const colDefs = [
    { lvl: 'fact'    as AtomicLevel, items: facts },
    { lvl: 'insight' as AtomicLevel, items: insights },
    { lvl: 'rec'     as AtomicLevel, items: recs },
  ];

  const editItem = editTarget ? findEditItem(editTarget.id) : null;

  return (
    <AppShell
      active="projects"
      breadcrumb={['Projects', experiment?.name ?? 'Experiment']}
      onNavigate={onNavigate}
      sidebarOpen={sidebarOpen}
      onSidebarToggle={onSidebarToggle}
    >
      {showAddFact && (
        <KanbanAddFactDialog experimentId={experimentId} onDone={handleAddFact} onCancel={() => setShowAddFact(false)} />
      )}
      {showAddInsight && (
        <KanbanAddInsightDialog experimentId={experimentId} onDone={handleAddInsight} onCancel={() => setShowAddInsight(false)} />
      )}
      {showAddRec && (
        <KanbanAddRecDialog experimentId={experimentId} onDone={handleAddRec} onCancel={() => setShowAddRec(false)} />
      )}
      {editTarget?.lvl === 'fact' && editItem && (
        <KanbanAddFactDialog
          experimentId={experimentId}
          initialValues={{ text: editItem.text, description: editItem.blurb ?? '' }}
          onDone={handleEditFact}
          onCancel={() => setEditTarget(null)}
        />
      )}
      {editTarget?.lvl === 'insight' && editItem && (
        <KanbanAddInsightDialog
          experimentId={experimentId}
          initialValues={{ text: editItem.text, description: editItem.blurb ?? '', factIds: editItem.supportedBy }}
          onDone={handleEditInsight}
          onCancel={() => setEditTarget(null)}
        />
      )}
      {editTarget?.lvl === 'rec' && editItem && (
        <KanbanAddRecDialog
          experimentId={experimentId}
          initialValues={{ text: editItem.text, description: editItem.blurb ?? '' }}
          onDone={handleEditRec}
          onCancel={() => setEditTarget(null)}
        />
      )}
      {lines.length > 0 && (
        <svg style={{
          position: 'fixed', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none', zIndex: 20,
          overflow: 'visible',
        }}>
          {lines.map(({ key, d, color }) => (
            <path key={key} d={d} stroke={color} strokeWidth={1.5} fill="none" strokeOpacity={0.7} />
          ))}
        </svg>
      )}
      <ExperimentHeader
        view={view}
        onSetView={setView}
        onNavigate={(s) => onNavigate(s, experimentId)}
        experiment={experiment}
      />
      <div style={{ display: 'flex', gap: 14, padding: '16px 32px 32px' }}>
        {colDefs.map(({ lvl, items }) => (
          <KanbanColumn
            key={lvl}
            lvl={lvl}
            items={items}
            reverseMap={reverseMap}
            selection={selection}
            connectedIds={getConnectedIds()}
            onCardClick={handleCardClick}
            onCardEdit={(id) => setEditTarget({ lvl, id })}
            onAdd={
              lvl === 'fact' ? () => setShowAddFact(true) :
              lvl === 'insight' ? () => setShowAddInsight(true) :
              () => setShowAddRec(true)
            }
          />
        ))}
      </div>
    </AppShell>
  );
}

// ─── Shared experiment header ────────────────────────────────────────────────

export function ExperimentHeader({
  view,
  onSetView,
  onNavigate,
  experiment,
}: {
  view: 'kanban' | 'outline' | 'raw';
  onSetView: (v: 'kanban' | 'outline' | 'raw') => void;
  onNavigate: (screen: string) => void;
  experiment?: Experiment;
}) {
  return (
    <div style={{ padding: '24px 32px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 32, minWidth: 0, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>{experiment?.name ?? 'Untitled experiment'}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {experiment?.team && <Chip dot>{experiment.team}</Chip>}
            {experiment?.method && <Chip>{experiment.method}</Chip>}
          </div>
        </div>
        <Btn variant="default" size="sm" onClick={() => onNavigate('edit-experiment')}>Edit</Btn>
        <Btn variant="accent" size="sm">Share</Btn>
      </div>

      {experiment?.researchQuestion && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, fontSize: 12, color: HF.ink3, flexWrap: 'wrap' }}>
          <span>
            <b style={{ color: HF.ink2, fontWeight: 600 }}>RQ:</b>{' '}
            {experiment.researchQuestion}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, borderBottom: `1px solid ${HF.border}` }}>
        <TabBtn
          active={view === 'outline'}
          onClick={() => { onSetView('outline'); onNavigate('experiment-outline'); }}
          icon="outline"
        >
          Outline
        </TabBtn>
        <TabBtn active={view === 'kanban'} onClick={() => onSetView('kanban')} icon="kanban">
          Kanban
        </TabBtn>
        <TabBtn
          active={view === 'raw'}
          onClick={() => { onSetView('raw'); onNavigate('experiment-raw'); }}
          icon="hash"
        >
          Raw data
        </TabBtn>
        <div style={{ flex: 1 }} />
        <div style={{ paddingBottom: 6 }}>
          <Btn variant="default" size="sm" icon="filter">Filter</Btn>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active, icon, children, onClick,
}: {
  active?: boolean;
  icon: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 12px',
        background: 'transparent', border: 0,
        borderBottom: `2px solid ${active ? HF.ink : 'transparent'}`,
        color: active ? HF.ink : HF.ink3,
        fontWeight: active ? 600 : 500, fontSize: 13,
        fontFamily: 'inherit', cursor: 'pointer',
        marginBottom: -1,
      }}
    >
      <Icon name={icon} size={14} stroke={active ? HF.ink : HF.ink3} />
      {children}
    </button>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  lvl: AtomicLevel;
  items: AtomicItem[];
  reverseMap: Record<string, number>;
  selection: Selection | null;
  connectedIds: Set<string> | null;
  onCardClick: (type: AtomicLevel, id: string) => void;
  onCardEdit: (id: string) => void;
  onAdd?: () => void;
}

function KanbanColumn({ lvl, items, reverseMap, selection, connectedIds, onCardClick, onCardEdit, onAdd }: KanbanColumnProps) {
  return (
    <div style={{
      flex: '1 0 0',
      background: HF.bgSubtle,
      borderRadius: 12,
      border: `1px solid ${HF.border}`,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minHeight: 400,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Level level={lvl} />
          <span style={{ fontSize: 14, color: HF.ink4, fontVariantNumeric: 'tabular-nums' }}>
            {items.length}
          </span>
        </div>
        <button
          onClick={onAdd}
          style={{
            width: 24, height: 24, borderRadius: 6,
            background: onAdd ? HF.card : 'transparent',
            border: `1px solid ${onAdd ? HF.border : 'transparent'}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            cursor: onAdd ? 'pointer' : 'default',
            opacity: onAdd ? 1 : 0,
          }}
        >
          <Icon name="plus" size={13} stroke={HF.ink3} />
        </button>
      </div>

      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: HF.ink4, textAlign: 'center', padding: '20px 0' }}>
          No {lvl === 'rec' ? 'recommendations' : lvl + 's'} yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item) => (
            <KanbanItem
              key={item.id}
              item={item}
              lvl={lvl}
              supportsCount={reverseMap[item.id] ?? 0}
              isSelected={selection?.type === lvl && selection?.id === item.id}
              isDimmed={connectedIds !== null && !connectedIds.has(item.id)}
              onClick={() => onCardClick(lvl, item.id)}
              onEdit={() => onCardEdit(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function KanbanItem({ item, lvl, supportsCount, isSelected, isDimmed, onClick, onEdit }: {
  item: AtomicItem;
  lvl: AtomicLevel;
  supportsCount: number;
  isSelected?: boolean;
  isDimmed?: boolean;
  onClick: () => void;
  onEdit: () => void;
}) {
  const [hovered,  setHovered]  = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const supportedByCount = item.supportedBy.length;
  const hasChips = supportedByCount > 0 || supportsCount > 0;
  const showDesc = isSelected && lvl === 'insight' && !!item.blurb;
  const colors = HF[lvl];
  const editLabel = lvl === 'fact' ? 'Edit fact' : lvl === 'insight' ? 'Edit insight' : 'Edit recommendation';

  const supportedByLabel = lvl === 'rec' ? 'insights' : 'facts';
  const supportsLabel    = lvl === 'fact' ? 'insights' : 'recs';

  return (
    <div
      data-card-id={item.id}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: isSelected ? colors.bg : HF.card,
        border: `1px solid ${isSelected ? colors.dot : HF.border}`,
        borderRadius: 8,
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: hasChips || showDesc ? 8 : 0,
        cursor: 'pointer',
        opacity: isDimmed ? 0.3 : 1,
        transition: 'background 0.12s, border-color 0.12s, opacity 0.15s',
      }}
    >
      {(hovered || menuOpen) && (
        <div
          ref={menuRef}
          style={{ position: 'absolute', top: 5, right: 5, zIndex: 10 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(p => !p); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, borderRadius: 5,
              background: menuOpen ? HF.bgSubtle : 'rgba(255,255,255,0.85)',
              border: `1px solid ${HF.border}`,
              cursor: 'pointer',
            }}
          >
            <Icon name="more" size={13} stroke={HF.ink3} />
          </button>
          {menuOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 2,
              background: HF.card,
              border: `1px solid ${HF.border}`,
              borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              padding: 4,
              minWidth: 168,
            }}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(); }}
                onMouseEnter={e => (e.currentTarget.style.background = HF.bgSubtle)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  width: '100%', padding: '7px 10px',
                  background: 'transparent', border: 'none',
                  borderRadius: 5, cursor: 'pointer',
                  fontSize: 13, color: HF.ink, fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <Icon name="type" size={13} stroke={HF.ink3} />
                {editLabel}
              </button>
            </div>
          )}
        </div>
      )}
      <p style={{
        fontSize: 14,
        color: isSelected ? colors.ink : HF.ink,
        lineHeight: 1.4,
        margin: 0,
        fontWeight: isSelected ? 600 : 400,
        paddingRight: hovered || menuOpen ? 20 : 0,
      }}>
        {item.text}
      </p>
      {showDesc && (
        <p style={{ fontSize: 12, color: colors.dot, lineHeight: 1.45, margin: 0 }}>
          {item.blurb}
        </p>
      )}
      {hasChips && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {supportedByCount > 0 && (
            <Chip style={{ fontSize: 10.5 }}>+{supportedByCount} {supportedByLabel}</Chip>
          )}
          {supportsCount > 0 && (
            <Chip style={{ fontSize: 10.5 }}>{supportsCount} {supportsLabel}</Chip>
          )}
        </div>
      )}
    </div>
  );
}
