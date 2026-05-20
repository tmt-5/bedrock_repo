import React, { useState, useRef, useEffect } from 'react';
import { HF } from '../tokens';
import { Btn, Level } from './kit';
import { Icon } from './Icon';
import { useStore } from '../store';

type TagDef = { bg: string; ink: string };
type TagMap  = Record<string, TagDef>;

const DEFAULT_TAGS: TagMap = {
  auth:         { bg: '#f2ebfd', ink: '#7c3aed' },
  checkout:     { bg: '#e6f4f8', ink: '#0991b5' },
  verification: { bg: '#fbf1e6', ink: '#da7706' },
  mobile:       { bg: 'rgba(9,151,105,0.1)', ink: '#099769' },
};

const NEW_TAG_PALETTE: TagDef[] = [
  { bg: '#dbeafe', ink: '#1e40af' },
  { bg: '#fce7f3', ink: '#be185d' },
  { bg: '#d1fae5', ink: '#065f46' },
  { bg: '#fef9c3', ink: '#854d0e' },
  { bg: '#ffe4e6', ink: '#9f1239' },
];

export interface KanbanAddInsightDialogProps {
  experimentId?: string;
  initialValues?: { text: string; description: string; factIds?: string[]; recIds?: string[] };
  onDone: (
    text: string,
    description: string,
    tags: string[],
    experimentId: string,
    factIds: string[],
    recIds: string[],
    attachment?: string,
  ) => void;
  onCancel: () => void;
}

export function KanbanAddInsightDialog({ experimentId: fixedExpId, initialValues, onDone, onCancel }: KanbanAddInsightDialogProps) {
  const { state } = useStore();
  const isEdit = !!initialValues;
  const [text,        setText]        = useState(initialValues?.text ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [tags,        setTags]        = useState<string[]>([]);
  const [tagMap,      setTagMap]      = useState<TagMap>(DEFAULT_TAGS);
  const [attachment,  setAttachment]  = useState<string | undefined>(undefined);
  const [expId,       setExpId]       = useState(fixedExpId ?? '');
  const [newTagInput, setNewTagInput] = useState('');
  const [showNewTag,  setShowNewTag]  = useState(false);

  const [selectedFactIds, setSelectedFactIds] = useState<string[]>(initialValues?.factIds ?? []);
  const [selectedRecIds,  setSelectedRecIds]  = useState<string[]>(initialValues?.recIds ?? []);
  const [factSearch,      setFactSearch]      = useState('');
  const [factExpFilter,   setFactExpFilter]   = useState('');
  const [factsOpen,       setFactsOpen]       = useState(false);
  const [recsOpen,        setRecsOpen]        = useState(false);

  const fileRef   = useRef<HTMLInputElement>(null);
  const newTagRef = useRef<HTMLInputElement>(null);

  const canSubmit = text.trim().length > 0;

  const allFacts = state.items.filter(i => i.type === 'fact');
  const effectiveExpFilter = fixedExpId ?? factExpFilter;
  const filteredFacts = allFacts.filter(f => {
    if (effectiveExpFilter && f.experimentId !== effectiveExpFilter) return false;
    if (factSearch.trim()) return f.text.toLowerCase().includes(factSearch.toLowerCase());
    return true;
  });

  const allRecs = state.items.filter(i => i.type === 'rec');
  const filteredRecs = fixedExpId ? allRecs.filter(r => r.experimentId === fixedExpId) : allRecs;

  const toggleFact = (id: string) =>
    setSelectedFactIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleRec = (id: string) =>
    setSelectedRecIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleTag = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const commitNewTag = () => {
    const name = newTagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) { setShowNewTag(false); return; }
    if (!tagMap[name]) {
      setTagMap(prev => ({
        ...prev,
        [name]: NEW_TAG_PALETTE[Object.keys(prev).length % NEW_TAG_PALETTE.length],
      }));
    }
    setTags(prev => prev.includes(name) ? prev : [...prev, name]);
    setNewTagInput('');
    setShowNewTag(false);
  };

  useEffect(() => {
    if (showNewTag) newTagRef.current?.focus();
  }, [showNewTag]);

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onDone(text.trim(), description.trim(), tags, fixedExpId ?? expId, selectedFactIds, selectedRecIds, attachment);
  };

  const fixedExp = fixedExpId ? state.experiments.find(e => e.id === fixedExpId) : null;

  return (
    <div
      onMouseDown={handleBackdropMouseDown}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(28,25,23,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div style={{
        background: HF.card, borderRadius: 14, padding: 24, width: 500,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', gap: 18,
        maxHeight: '90vh', overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Level level="insight" />
            <h2 style={{ fontSize: 16, fontWeight: 600, color: HF.ink, margin: 0 }}>{isEdit ? 'Edit insight' : 'Add insight'}</h2>
          </div>
          <button
            onClick={onCancel}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 6,
              background: 'transparent', border: `1px solid ${HF.border}`, cursor: 'pointer',
            }}
          >
            <Icon name="x" size={13} stroke={HF.ink3} />
          </button>
        </div>

        {/* Experiment */}
        {fixedExp ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: HF.bgSubtle, border: `1px solid ${HF.border}`,
            borderRadius: 8, padding: '8px 12px',
          }}>
            <Icon name="project" size={13} stroke={HF.ink3} />
            <span style={{ fontSize: 13, color: HF.ink2 }}>{fixedExp.name}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12.5, fontWeight: 500, color: HF.ink2 }}>
              Experiment
            </label>
            <select
              value={expId}
              onChange={e => setExpId(e.target.value)}
              style={{
                background: HF.bgSubtle,
                border: `1px solid ${HF.border}`,
                borderRadius: 8, padding: '0 11px', height: 36,
                font: 'inherit', fontSize: 13.5,
                color: expId === '' ? HF.ink3 : HF.ink,
                outline: 'none', width: '100%',
                boxSizing: 'border-box' as const,
                cursor: 'pointer',
              }}
            >
              <option value="" disabled>Select an experiment…</option>
              {state.experiments.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Insight text */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: HF.ink2 }}>
            Insight <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Summarise the insight in one sentence"
            onKeyDown={e => { if (e.key === 'Enter' && canSubmit) handleSubmit(); }}
            style={{
              background: HF.bgSubtle, border: `1px solid ${HF.border}`,
              borderRadius: 8, padding: '0 11px', height: 36,
              font: 'inherit', fontSize: 13.5, color: HF.ink,
              outline: 'none', width: '100%', boxSizing: 'border-box' as const,
            }}
          />
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: HF.ink2 }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Explain the pattern or meaning behind the data (optional)"
            rows={3}
            style={{
              background: HF.bgSubtle, border: `1px solid ${HF.border}`,
              borderRadius: 8, padding: '8px 11px',
              font: 'inherit', fontSize: 13.5, color: HF.ink,
              outline: 'none', width: '100%', boxSizing: 'border-box' as const,
              resize: 'vertical', lineHeight: 1.55,
            }}
          />
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: HF.ink2 }}>Tags</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {Object.entries(tagMap).map(([t, { bg, ink }]) => {
              const active = tags.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                    background: active ? bg : 'transparent',
                    color: active ? ink : HF.ink3,
                    border: `1px solid ${active ? 'transparent' : HF.border}`,
                    borderRadius: 6, padding: '3px 9px', cursor: 'pointer',
                    boxShadow: active ? `0 0 0 2px ${ink}33` : 'none',
                  }}
                >
                  {active && <Icon name="check" size={10} stroke={ink} />}
                  <span style={{ fontSize: 10 }}>#</span>{t}
                </button>
              );
            })}
            {showNewTag ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <input
                  ref={newTagRef}
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitNewTag();
                    if (e.key === 'Escape') { setShowNewTag(false); setNewTagInput(''); }
                  }}
                  placeholder="tag-name"
                  style={{
                    border: `1px solid ${HF.borderStrong}`, borderRadius: 6,
                    padding: '2px 8px', height: 26, width: 100,
                    font: 'inherit', fontSize: 12, color: HF.ink,
                    outline: 'none', background: HF.bgSubtle,
                  }}
                />
                <button
                  onClick={commitNewTag}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: 5,
                    background: HF.ink, border: 'none', cursor: 'pointer',
                  }}
                >
                  <Icon name="check" size={11} stroke="#fff" />
                </button>
                <button
                  onClick={() => { setShowNewTag(false); setNewTagInput(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: 5,
                    background: 'transparent', border: `1px solid ${HF.border}`, cursor: 'pointer',
                  }}
                >
                  <Icon name="x" size={11} stroke={HF.ink3} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNewTag(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 12, color: HF.ink3, fontFamily: 'inherit',
                  background: 'transparent',
                  border: `1px dashed ${HF.borderStrong}`,
                  borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                }}
              >
                <Icon name="plus" size={11} stroke={HF.ink3} />
                New tag
              </button>
            )}
          </div>
        </div>

        {/* Attachment */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: HF.ink2 }}>Attachment</label>
          <input
            ref={fileRef}
            type="file"
            style={{ display: 'none' }}
            onChange={e => setAttachment(e.target.files?.[0]?.name)}
          />
          {attachment ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: HF.bgSubtle, border: `1px solid ${HF.border}`,
              borderRadius: 8, padding: '7px 11px',
            }}>
              <Icon name="paperclip" size={13} stroke={HF.ink3} />
              <span style={{ flex: 1, fontSize: 13, color: HF.ink2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachment}
              </span>
              <button
                onClick={() => setAttachment(undefined)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                <Icon name="x" size={12} stroke={HF.ink3} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 13, color: HF.ink3, fontFamily: 'inherit',
                background: 'transparent',
                border: `1px dashed ${HF.borderStrong}`,
                borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
                width: '100%', justifyContent: 'center',
              }}
            >
              <Icon name="upload" size={13} stroke={HF.ink3} />
              Choose file
            </button>
          )}
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${HF.border}`, margin: '0 -4px' }} />

        {/* Connect to supporting facts */}
        <ConnectSection
          title="Supporting facts"
          badge={selectedFactIds.length}
          badgeColor={HF.fact.dot}
          open={factsOpen}
          onToggle={() => setFactsOpen(p => !p)}
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 6,
              background: HF.bgSubtle, border: `1px solid ${HF.border}`,
              borderRadius: 6, padding: '0 8px', height: 30,
            }}>
              <Icon name="search" size={12} stroke={HF.ink3} />
              <input
                value={factSearch}
                onChange={e => setFactSearch(e.target.value)}
                placeholder="Search facts…"
                style={{
                  flex: 1, border: 0, outline: 0,
                  background: 'transparent', font: 'inherit',
                  fontSize: 12.5, color: HF.ink,
                }}
              />
              {factSearch && (
                <button
                  onClick={() => setFactSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <Icon name="x" size={11} stroke={HF.ink3} />
                </button>
              )}
            </div>
            {!fixedExpId && (
              <select
                value={factExpFilter}
                onChange={e => setFactExpFilter(e.target.value)}
                style={{
                  border: `1px solid ${HF.border}`, borderRadius: 6,
                  background: HF.bgSubtle, color: factExpFilter ? HF.ink : HF.ink3,
                  fontSize: 12, padding: '0 8px',
                  fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                  height: 30, maxWidth: 160,
                }}
              >
                <option value="">All experiments</option>
                {state.experiments.map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
            {filteredFacts.length === 0 ? (
              <span style={{ fontSize: 12.5, color: HF.ink4, padding: '6px 0' }}>No facts match.</span>
            ) : filteredFacts.map(fact => {
              const checked = selectedFactIds.includes(fact.id);
              const exp = state.experiments.find(e => e.id === fact.experimentId);
              return (
                <button
                  key={fact.id}
                  onClick={() => toggleFact(fact.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    background: checked ? HF.fact.bg : 'transparent',
                    border: `1px solid ${checked ? HF.fact.dot : HF.border}`,
                    borderRadius: 7, padding: '7px 10px',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    background: checked ? HF.fact.dot : 'transparent',
                    border: `1.5px solid ${checked ? HF.fact.dot : HF.borderStrong}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked && <Icon name="check" size={9} stroke="#fff" />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, color: checked ? HF.fact.ink : HF.ink, margin: 0, lineHeight: 1.4 }}>
                      {fact.text}
                    </p>
                    {!fixedExpId && exp && (
                      <p style={{ fontSize: 11, color: HF.ink4, margin: '2px 0 0', lineHeight: 1.3 }}>
                        {exp.name}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ConnectSection>

        {/* Connect to recommendations */}
        <ConnectSection
          title="Recommendations"
          badge={selectedRecIds.length}
          badgeColor={HF.rec.dot}
          open={recsOpen}
          onToggle={() => setRecsOpen(p => !p)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto' }}>
            {filteredRecs.length === 0 ? (
              <span style={{ fontSize: 12.5, color: HF.ink4, padding: '6px 0' }}>No recommendations yet</span>
            ) : filteredRecs.map(rec => {
              const checked = selectedRecIds.includes(rec.id);
              const exp = state.experiments.find(e => e.id === rec.experimentId);
              return (
                <button
                  key={rec.id}
                  onClick={() => toggleRec(rec.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    background: checked ? HF.rec.bg : 'transparent',
                    border: `1px solid ${checked ? HF.rec.dot : HF.border}`,
                    borderRadius: 7, padding: '7px 10px',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    background: checked ? HF.rec.dot : 'transparent',
                    border: `1.5px solid ${checked ? HF.rec.dot : HF.borderStrong}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked && <Icon name="check" size={9} stroke="#fff" />}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, color: checked ? HF.rec.ink : HF.ink, margin: 0, lineHeight: 1.4 }}>
                      {rec.text}
                    </p>
                    {!fixedExpId && exp && (
                      <p style={{ fontSize: 11, color: HF.ink4, margin: '2px 0 0', lineHeight: 1.3 }}>
                        {exp.name}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ConnectSection>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <Btn variant="ghost" size="md" onClick={onCancel}>Cancel</Btn>
          <Btn
            variant="accent"
            size="md"
            onClick={handleSubmit}
            style={{ opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? 'pointer' : 'default' }}
          >
            {isEdit ? 'Save changes' : 'Done'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Collapsible connection section ──────────────────────────────────────────

function ConnectSection({ title, badge, badgeColor, open, onToggle, children }: {
  title: string;
  badge: number;
  badgeColor: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: open ? 10 : 0 }}>
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none',
          cursor: 'pointer', padding: 0, fontFamily: 'inherit',
        }}
      >
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={13} stroke={HF.ink3} />
        <span style={{ fontSize: 12.5, fontWeight: 500, color: HF.ink2 }}>{title}</span>
        {badge > 0 && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            background: badgeColor + '22',
            color: badgeColor,
            borderRadius: 99, padding: '1px 7px',
            marginLeft: 2,
          }}>
            {badge} selected
          </span>
        )}
      </button>
      {open && children}
    </div>
  );
}
