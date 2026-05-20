import React, { useState, useMemo, useLayoutEffect, useEffect, useRef } from 'react';
import { HF } from '../tokens';
import type { AtomicLevel } from '../tokens';
import { AppShell, Btn, Level, Chip } from '../components/kit';
import { Icon } from '../components/Icon';
import type { AtomicItem } from '../data';
import { KanbanAddFactDialog } from '../components/AddFactDialog';
import { KanbanAddInsightDialog } from '../components/AddInsightDialog';
import { KanbanAddRecDialog } from '../components/AddRecDialog';
import { useStore } from '../store';

type FilterType = 'all' | AtomicLevel;
type SortType  = 'type' | 'experiment' | 'az';

interface LineData { key: string; d: string; color: string; }

function makeBezier(key: string, x1: number, y1: number, x2: number, y2: number, color: string): LineData {
  const cx = (x1 + x2) / 2;
  return { key, d: `M ${x1} ${y1} C ${cx} ${y1} ${cx} ${y2} ${x2} ${y2}`, color };
}

function cardRect(id: string) {
  return document.querySelector(`[data-card-id="${id}"]`)?.getBoundingClientRect() ?? null;
}

export function AllInsights({ onNavigate, sidebarOpen, onSidebarToggle }: { onNavigate: (s: string, expId?: string) => void; sidebarOpen: boolean; onSidebarToggle: (open: boolean) => void }) {
  const { state, dispatch } = useStore();
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState<FilterType>('all');
  const [sort,      setSort]      = useState<SortType>('type');
  const [selected,  setSelected]  = useState<AtomicItem | null>(null);
  const [view,        setView]        = useState<'list' | 'kanban'>('list');
  const [kanbanSel,   setKanbanSel]   = useState<{ type: AtomicLevel; id: string } | null>(null);
  const [lines,       setLines]       = useState<LineData[]>([]);
  const [showAddFact,    setShowAddFact]    = useState(false);
  const [showAddInsight, setShowAddInsight] = useState(false);
  const [showAddRec,     setShowAddRec]     = useState(false);
  const [showAddMenu,    setShowAddMenu]    = useState(false);
  const [editTarget,     setEditTarget]     = useState<{ type: AtomicLevel; id: string } | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddMenu) return;
    const handler = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddMenu]);

  const ITEM_MAP = useMemo(() => Object.fromEntries(state.items.map(i => [i.id, i])), [state.items]);

  const nonRaw = useMemo(() => state.items.filter(i => i.type !== 'raw'), [state.items]);

  const filtered = useMemo(() => {
    let items = nonRaw;
    if (filter !== 'all') items = items.filter(i => i.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.text.toLowerCase().includes(q) || i.blurb?.toLowerCase().includes(q));
    }
    return items;
  }, [nonRaw, filter, search]);

  const supportsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const item of state.items) {
      for (const dep of item.supportedBy) {
        (map[dep] ??= []).push(item.id);
      }
    }
    return map;
  }, [state.items]);

  const grouped = useMemo(() => {
    if (sort === 'type') {
      return (['fact', 'insight', 'rec'] as AtomicLevel[])
        .map(t => ({ label: `${t === 'rec' ? 'Recommendations' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}`, items: filtered.filter(i => i.type === t) }))
        .filter(g => g.items.length > 0)
        .map(g => ({ ...g, label: `${g.label} · ${g.items.length}` }));
    }
    if (sort === 'experiment') {
      const byExp: Record<string, AtomicItem[]> = {};
      for (const item of filtered) (byExp[item.experimentId] ??= []).push(item);
      return state.experiments
        .filter(e => byExp[e.id]?.length)
        .map(e => ({ label: `${e.name} · ${byExp[e.id].length}`, items: byExp[e.id] }));
    }
    const sorted = [...filtered].sort((a, b) => a.text.localeCompare(b.text));
    return [{ label: `${sorted.length} items`, items: sorted }];
  }, [filtered, sort, state.experiments]);

  const counts = useMemo(() => ({
    fact:    nonRaw.filter(i => i.type === 'fact').length,
    insight: nonRaw.filter(i => i.type === 'insight').length,
    rec:     nonRaw.filter(i => i.type === 'rec').length,
  }), [nonRaw]);

  const toggle = (item: AtomicItem) =>
    setSelected(prev => prev?.id === item.id ? null : item);

  // ── Kanban: connected IDs for dimming unrelated cards ─────────────────────

  const getKanbanConnectedIds = (): Set<string> | null => {
    if (!kanbanSel) return null;
    const ids = new Set<string>([kanbanSel.id]);
    if (kanbanSel.type === 'insight') {
      const insight = ITEM_MAP[kanbanSel.id] as AtomicItem | undefined;
      insight?.supportedBy.forEach(id => ids.add(id));
      nonRaw.filter(i => i.type === 'rec' && i.supportedBy.includes(kanbanSel.id)).forEach(i => ids.add(i.id));
    }
    if (kanbanSel.type === 'fact') {
      nonRaw.filter(i => i.type === 'insight' && i.supportedBy.includes(kanbanSel.id)).forEach(i => ids.add(i.id));
    }
    if (kanbanSel.type === 'rec') {
      const rec = ITEM_MAP[kanbanSel.id] as AtomicItem | undefined;
      rec?.supportedBy.forEach(id => ids.add(id));
    }
    return ids;
  };

  // ── Kanban: bezier lines after each render ─────────────────────────────────

  useLayoutEffect(() => {
    if (!kanbanSel || view !== 'kanban') { setLines([]); return; }
    const newLines: LineData[] = [];
    const sel = ITEM_MAP[kanbanSel.id] as AtomicItem | undefined;
    if (!sel) return;

    if (kanbanSel.type === 'insight') {
      const ir = cardRect(kanbanSel.id);
      if (!ir) return;
      for (const factId of sel.supportedBy) {
        const r = cardRect(factId);
        if (!r) continue;
        newLines.push(makeBezier(`f-${factId}`, r.right, r.top + r.height / 2, ir.left, ir.top + ir.height / 2, HF.insight.dot));
      }
      const connectedRecs = nonRaw.filter(i => i.type === 'rec' && i.supportedBy.includes(kanbanSel.id));
      for (const rec of connectedRecs) {
        const r = cardRect(rec.id);
        if (!r) continue;
        newLines.push(makeBezier(`r-${rec.id}`, ir.right, ir.top + ir.height / 2, r.left, r.top + r.height / 2, HF.insight.dot));
      }
    }

    if (kanbanSel.type === 'fact') {
      const fr = cardRect(kanbanSel.id);
      if (!fr) return;
      const connectedInsights = nonRaw.filter(i => i.type === 'insight' && i.supportedBy.includes(kanbanSel.id));
      for (const insight of connectedInsights) {
        const r = cardRect(insight.id);
        if (!r) continue;
        newLines.push(makeBezier(`i-${insight.id}`, fr.right, fr.top + fr.height / 2, r.left, r.top + r.height / 2, HF.fact.dot));
      }
    }

    if (kanbanSel.type === 'rec') {
      const rr = cardRect(kanbanSel.id);
      if (!rr) return;
      for (const insightId of sel.supportedBy) {
        const r = cardRect(insightId);
        if (!r) continue;
        newLines.push(makeBezier(`i-${insightId}`, r.right, r.top + r.height / 2, rr.left, rr.top + rr.height / 2, HF.rec.dot));
      }
    }

    setLines(newLines);
  }, [kanbanSel, view, nonRaw, ITEM_MAP]);

  const handleKanbanClick = (type: AtomicLevel, id: string) =>
    setKanbanSel(prev => prev?.type === type && prev?.id === id ? null : { type, id });

  const findEditItem = (id: string): AtomicItem | undefined => state.items.find(i => i.id === id);

  const handleEditFact = (text: string, desc: string, _tags: string[], expId: string, _insightIds: string[]) => {
    if (!editTarget) return;
    const base = findEditItem(editTarget.id);
    if (!base) return;
    dispatch({ type: 'UPDATE_ITEM', payload: { ...base, text, blurb: desc || undefined, experimentId: expId } });
    setEditTarget(null);
  };

  const handleEditInsight = (text: string, desc: string, _tags: string[], expId: string, factIds: string[], _recIds: string[]) => {
    if (!editTarget) return;
    const base = findEditItem(editTarget.id);
    if (!base) return;
    dispatch({ type: 'UPDATE_ITEM', payload: { ...base, text, blurb: desc || undefined, supportedBy: factIds, experimentId: expId } });
    setEditTarget(null);
  };

  const handleEditRec = (text: string, desc: string, _tags: string[], expId: string, insightIds: string[]) => {
    if (!editTarget) return;
    const base = findEditItem(editTarget.id);
    if (!base) return;
    dispatch({ type: 'UPDATE_ITEM', payload: { ...base, text, blurb: desc || undefined, supportedBy: insightIds, experimentId: expId } });
    setEditTarget(null);
  };

  const handleAddFact = (text: string, desc: string, _tags: string[], expId: string, _insightIds: string[]) => {
    dispatch({ type: 'ADD_ITEM', payload: {
      id: crypto.randomUUID(), type: 'fact',
      experimentId: expId, supportedBy: [],
      text, blurb: desc || undefined,
    }});
    setShowAddFact(false);
  };

  const handleAddInsight = (text: string, desc: string, _tags: string[], expId: string, factIds: string[], _recIds: string[]) => {
    dispatch({ type: 'ADD_ITEM', payload: {
      id: crypto.randomUUID(), type: 'insight',
      experimentId: expId, supportedBy: factIds,
      text, blurb: desc || undefined,
    }});
    setShowAddInsight(false);
  };

  const handleAddRec = (text: string, desc: string, _tags: string[], expId: string, insightIds: string[]) => {
    dispatch({ type: 'ADD_ITEM', payload: {
      id: crypto.randomUUID(), type: 'rec',
      experimentId: expId, supportedBy: insightIds,
      text, blurb: desc || undefined,
    }});
    setShowAddRec(false);
  };

  const switchView = (v: 'list' | 'kanban') => {
    setView(v);
    setKanbanSel(null);
    setLines([]);
    setSelected(null);
  };

  return (
    <AppShell active="insights" onNavigate={onNavigate} sidebarOpen={sidebarOpen} onSidebarToggle={onSidebarToggle}>
      {showAddFact && (
        <KanbanAddFactDialog
          onDone={handleAddFact}
          onCancel={() => setShowAddFact(false)}
        />
      )}
      {showAddInsight && (
        <KanbanAddInsightDialog
          onDone={handleAddInsight}
          onCancel={() => setShowAddInsight(false)}
        />
      )}
      {showAddRec && (
        <KanbanAddRecDialog
          onDone={handleAddRec}
          onCancel={() => setShowAddRec(false)}
        />
      )}
      {editTarget?.type === 'fact' && (() => {
        const item = findEditItem(editTarget.id);
        return item ? (
          <KanbanAddFactDialog
            experimentId={item.experimentId}
            initialValues={{ text: item.text, description: item.blurb ?? '' }}
            onDone={handleEditFact}
            onCancel={() => setEditTarget(null)}
          />
        ) : null;
      })()}
      {editTarget?.type === 'insight' && (() => {
        const item = findEditItem(editTarget.id);
        return item ? (
          <KanbanAddInsightDialog
            experimentId={item.experimentId}
            initialValues={{ text: item.text, description: item.blurb ?? '', factIds: item.supportedBy }}
            onDone={handleEditInsight}
            onCancel={() => setEditTarget(null)}
          />
        ) : null;
      })()}
      {editTarget?.type === 'rec' && (() => {
        const item = findEditItem(editTarget.id);
        return item ? (
          <KanbanAddRecDialog
            experimentId={item.experimentId}
            initialValues={{ text: item.text, description: item.blurb ?? '' }}
            onDone={handleEditRec}
            onCancel={() => setEditTarget(null)}
          />
        ) : null;
      })()}
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
      <div style={{ padding: '24px 32px', overflow: 'auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 600 }}>All insights</h1>
              <div style={{ fontSize: 12, color: HF.ink3, marginTop: 4 }}>
                {nonRaw.length} items across {state.experiments.length} experiment{state.experiments.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div ref={addMenuRef} style={{ position: 'relative' }}>
              <Btn variant="accent" size="md" icon="plus" onClick={() => setShowAddMenu(m => !m)}>Add new</Btn>
              {showAddMenu && (
                <AddNewMenu
                  onSelect={(type) => {
                    setShowAddMenu(false);
                    if (type === 'fact')    setShowAddFact(true);
                    if (type === 'insight') setShowAddInsight(true);
                    if (type === 'rec')     setShowAddRec(true);
                  }}
                />
              )}
            </div>
          </div>

          {/* View tabs */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 20, borderBottom: `1px solid ${HF.border}` }}>
            <ViewTabBtn active={view === 'list'} icon="outline" onClick={() => switchView('list')}>List</ViewTabBtn>
            <ViewTabBtn active={view === 'kanban'} icon="kanban" onClick={() => switchView('kanban')}>Kanban</ViewTabBtn>
          </div>

          {view === 'list' && (
            <>
              {/* Search + filter + sort */}
              <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <SearchBox value={search} onChange={setSearch} />
                <TypePills filter={filter} onChange={setFilter} counts={counts} />
                <div style={{ flex: 1 }} />
                <SortSelect value={sort} onChange={setSort} />
              </div>

              {/* Card groups */}
              <div style={{ marginTop: 24 }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: HF.ink3, fontSize: 14 }}>
                    No items match your search.
                  </div>
                ) : (
                  grouped.map(group => (
                    <div key={group.label} style={{ marginBottom: 28 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3, marginBottom: 10 }}>
                        {group.label}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 10,
                      }}>
                        {group.items.map(item => (
                          <AtomicCard
                            key={item.id}
                            item={item}
                            supportsCount={(supportsMap[item.id] ?? []).length}
                            isSelected={selected?.id === item.id}
                            onClick={() => toggle(item)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {view === 'kanban' && (
            <div style={{ marginTop: 20, display: 'flex', gap: 14 }}>
              {(['fact', 'insight', 'rec'] as AtomicLevel[]).map(type => {
                const items = nonRaw.filter(i => i.type === type);
                return (
                  <InsightsKanbanColumn
                    key={type}
                    type={type}
                    items={items}
                    totalCount={items.length}
                    kanbanSel={kanbanSel}
                    connectedIds={getKanbanConnectedIds()}
                    onCardClick={handleKanbanClick}
                    onCardEdit={(id) => setEditTarget({ type, id })}
                    onAdd={
                      type === 'fact' ? () => setShowAddFact(true) :
                      type === 'insight' ? () => setShowAddInsight(true) :
                      () => setShowAddRec(true)
                    }
                  />
                );
              })}
            </div>
          )}
      </div>

      {view === 'list' && selected && (
        <DetailPanel
          item={selected}
          supportsMap={supportsMap}
          onClose={() => setSelected(null)}
        />
      )}
    </AppShell>
  );
}

// ─── Add new dropdown menu ────────────────────────────────────────────────────

const ADD_NEW_OPTIONS: { type: 'fact' | 'insight' | 'rec'; label: string }[] = [
  { type: 'fact',    label: 'Add fact' },
  { type: 'insight', label: 'Add insight' },
  { type: 'rec',     label: 'Add recommendation' },
];

function AddNewMenu({ onSelect }: { onSelect: (type: 'fact' | 'insight' | 'rec') => void }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
      background: HF.card,
      border: `1px solid ${HF.border}`,
      borderRadius: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
      padding: 4,
      minWidth: 200,
      zIndex: 50,
    }}>
      {ADD_NEW_OPTIONS.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          onMouseEnter={e => (e.currentTarget.style.background = HF.bgSubtle)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '8px 12px',
            background: 'transparent', border: 'none',
            borderRadius: 7, cursor: 'pointer',
            fontSize: 13.5, color: HF.ink, fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: HF[type].dot, flexShrink: 0,
          }} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── View tab button ──────────────────────────────────────────────────────────

function ViewTabBtn({ active, icon, onClick, children }: {
  active: boolean;
  icon: string;
  onClick: () => void;
  children: React.ReactNode;
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

// ─── Insights kanban column ───────────────────────────────────────────────────

function InsightsKanbanColumn({ type, items, totalCount, kanbanSel, connectedIds, onCardClick, onCardEdit, onAdd }: {
  type: AtomicLevel;
  items: AtomicItem[];
  totalCount: number;
  kanbanSel: { type: AtomicLevel; id: string } | null;
  connectedIds: Set<string> | null;
  onCardClick: (type: AtomicLevel, id: string) => void;
  onCardEdit: (id: string) => void;
  onAdd?: () => void;
}) {
  return (
    <div style={{
      flex: '1 0 0',
      background: HF.bgSubtle,
      borderRadius: 12,
      border: `1px solid ${HF.border}`,
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 16,
      minHeight: 400,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Level level={type} />
          <span style={{ fontSize: 14, color: HF.ink4, fontVariantNumeric: 'tabular-nums' }}>
            {totalCount}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <InsightsKanbanItem
            key={item.id}
            item={item}
            isSelected={kanbanSel?.type === type && kanbanSel?.id === item.id}
            isDimmed={connectedIds !== null && !connectedIds.has(item.id)}
            onClick={() => onCardClick(type, item.id)}
            onEdit={() => onCardEdit(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

function InsightsKanbanItem({ item, isSelected, isDimmed, onClick, onEdit }: {
  item: AtomicItem;
  isSelected: boolean;
  isDimmed?: boolean;
  onClick: () => void;
  onEdit: () => void;
}) {
  const { state } = useStore();
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

  const colors = HF[item.type];
  const exp = state.experiments.find(e => e.id === item.experimentId);
  const editLabel = item.type === 'fact' ? 'Edit fact' : item.type === 'insight' ? 'Edit insight' : 'Edit recommendation';

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
        display: 'flex', flexDirection: 'column', gap: 7,
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
        fontSize: 13.5,
        color: isSelected ? colors.ink : HF.ink,
        lineHeight: 1.4,
        margin: 0,
        fontWeight: isSelected ? 600 : 400,
        paddingRight: hovered || menuOpen ? 20 : 0,
      }}>
        {item.text}
      </p>
      {isSelected && item.blurb && (
        <p style={{ fontSize: 12, color: colors.dot, lineHeight: 1.45, margin: 0 }}>
          {item.blurb}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, color: HF.ink4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {exp?.name}
        </span>
        {item.supportedBy.length > 0 && (
          <Chip style={{ fontSize: 10.5, padding: '1px 7px' }}>
            {item.supportedBy.length} {item.type === 'rec' ? 'insights' : 'facts'}
          </Chip>
        )}
      </div>
    </div>
  );
}

// ─── Search box ───────────────────────────────────────────────────────────────

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: HF.card, border: `1px solid ${HF.border}`,
      borderRadius: 8, padding: '0 11px', height: 34, width: 260, flexShrink: 0,
    }}>
      <Icon name="search" size={14} stroke={HF.ink3} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search facts, insights, recs…"
        style={{ flex: 1, border: 0, outline: 0, background: 'transparent', font: 'inherit', fontSize: 13, color: HF.ink }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          <Icon name="x" size={12} stroke={HF.ink3} />
        </button>
      )}
    </div>
  );
}

// ─── Type filter pills ────────────────────────────────────────────────────────

function TypePills({ filter, onChange, counts }: {
  filter: FilterType;
  onChange: (f: FilterType) => void;
  counts: { fact: number; insight: number; rec: number };
}) {
  const opts: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all',     label: 'All' },
    { key: 'fact',    label: 'Facts',    count: counts.fact },
    { key: 'insight', label: 'Insights', count: counts.insight },
    { key: 'rec',     label: 'Recommendations',     count: counts.rec },
  ];
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {opts.map(o => {
        const active = filter === o.key;
        const lvlColors = o.key !== 'all' ? HF[o.key] : null;
        const bg    = active ? (lvlColors ? lvlColors.bg  : HF.ink)    : HF.card;
        const color = active ? (lvlColors ? lvlColors.ink : '#fff')     : HF.ink2;
        const border= active ? (lvlColors ? lvlColors.dot : HF.ink)     : HF.border;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 12px', borderRadius: 999,
              fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
              background: bg,
              color,
              border: `1px solid ${border}`,
            }}
          >
            {lvlColors && active && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: lvlColors.dot, flexShrink: 0 }} />
            )}
            {o.label}
            {o.count != null && (
              <span style={{ fontSize: 11, opacity: active ? 0.7 : 0.5 }}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Sort select ─────────────────────────────────────────────────────────────

function SortSelect({ value, onChange }: { value: SortType; onChange: (v: SortType) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: HF.ink3 }}>
      <span>Sort by</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as SortType)}
        style={{
          border: `1px solid ${HF.border}`, borderRadius: 6, background: HF.card,
          color: HF.ink, fontSize: 13, padding: '4px 8px',
          fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
        }}
      >
        <option value="type">Type</option>
        <option value="experiment">Experiment</option>
        <option value="az">A–Z</option>
      </select>
    </div>
  );
}

// ─── Atomic card ─────────────────────────────────────────────────────────────

function AtomicCard({ item, supportsCount, isSelected, onClick }: {
  item: AtomicItem;
  supportsCount: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { state } = useStore();
  const exp = state.experiments.find(e => e.id === item.experimentId);
  const t = HF[item.type];

  return (
    <div
      onClick={onClick}
      style={{
        background: HF.card,
        border: `1.5px solid ${isSelected ? t.dot : HF.border}`,
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px ${t.dot}22` : 'none',
      }}
    >
      <Level level={item.type} size="sm" />

      <p style={{
        fontSize: 13.5, color: HF.ink, lineHeight: 1.45, margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      } as React.CSSProperties}>
        {item.text}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
        <span style={{
          fontSize: 11.5, color: HF.ink4, flex: 1,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {exp?.name}
        </span>
        {item.supportedBy.length > 0 && (
          <Chip style={{ fontSize: 10.5, padding: '1px 7px' }}>
            {item.supportedBy.length} {item.type === 'rec' ? 'insights' : 'facts'}
          </Chip>
        )}
        {supportsCount > 0 && (
          <Chip style={{ fontSize: 10.5, padding: '1px 7px' }}>→ {supportsCount}</Chip>
        )}
      </div>
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ item, supportsMap, onClose }: {
  item: AtomicItem;
  supportsMap: Record<string, string[]>;
  onClose: () => void;
}) {
  const { state } = useStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const itemMap = Object.fromEntries(state.items.map(i => [i.id, i]));
  const exp = state.experiments.find(e => e.id === item.experimentId);
  const supportedByItems = item.supportedBy.map(id => itemMap[id]).filter(Boolean) as AtomicItem[];
  const supportsItems = (supportsMap[item.id] ?? []).map(id => itemMap[id]).filter(Boolean) as AtomicItem[];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.18)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Sliding panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 41,
        width: 380,
        background: HF.card,
        borderLeft: `1px solid ${HF.border}`,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.10)',
        display: 'flex', flexDirection: 'column',
        transform: visible ? 'translateX(0)' : 'translateX(380px)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>
        {/* Sticky header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 16px',
          borderBottom: `1px solid ${HF.border}`,
          flexShrink: 0,
          background: HF.card,
        }}>
          <Level level={item.type} />
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: 6,
              background: 'transparent', border: `1px solid ${HF.border}`,
              cursor: 'pointer',
            }}
          >
            <Icon name="x" size={13} stroke={HF.ink3} />
          </button>
        </div>

        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
          <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, color: HF.ink, margin: 0 }}>
            {item.text}
          </p>

          {item.blurb && (
            <p style={{ fontSize: 13.5, color: HF.ink2, lineHeight: 1.6, margin: 0 }}>
              {item.blurb}
            </p>
          )}

          <div style={{
            background: HF.bgSubtle, borderRadius: 8, padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: HF.ink4 }}>
              From experiment
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: HF.ink }}>{exp?.name}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip>{exp?.team}</Chip>
              <Chip>{exp?.method}</Chip>
            </div>
          </div>

          {supportedByItems.length > 0 && (
            <ChainSection
              title={`Supported by · ${supportedByItems.length}`}
              items={supportedByItems}
            />
          )}

          {supportsItems.length > 0 && (
            <ChainSection
              title={`Supports · ${supportsItems.length}`}
              items={supportsItems}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── Chain section (in detail panel) ─────────────────────────────────────────

function ChainSection({ title, items }: { title: string; items: AtomicItem[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: HF.ink3 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map(item => (
          <div
            key={item.id}
            style={{
              background: HF[item.type].bg,
              borderRadius: 8, padding: '8px 11px',
              display: 'flex', flexDirection: 'column', gap: 5,
            }}
          >
            <Level level={item.type} size="sm" />
            <p style={{ fontSize: 12.5, color: HF.ink, lineHeight: 1.45, margin: 0 }}>
              {item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
