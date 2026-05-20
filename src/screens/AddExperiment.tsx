import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { HF } from '../tokens';
import { AppShell, Btn } from '../components/kit';
import { Icon } from '../components/Icon';
import { useStore } from '../store';
import type { Experiment, AtomicItem, StoredParticipant } from '../data';

interface AddExperimentProps {
  onNavigate: (screen: string, expId?: string) => void;
  onCancel: () => void;
  experimentToEdit?: Experiment;
}

type TagDef = { bg: string; ink: string };
type TagMap  = Record<string, TagDef>;

interface FactData {
  id: string;
  title: string;
  description: string;
  tags: string[];
  attachment?: string;
  highlightedText: string;
  participantId: string;
}

interface DialogState {
  selectedText: string;
  range: Range;
  participantId: string;
}

interface Participant {
  id: string;
  label: string;
}

const INITIAL_TAGS: TagMap = {
  auth:         { bg: '#f2ebfd', ink: '#7c3aed' },
  checkout:     { bg: '#e6f4f8', ink: '#0991b5' },
  verification: { bg: '#fbf1e6', ink: '#da7706' },
  mobile:       { bg: 'rgba(9,151,105,0.1)', ink: '#099769' },
};

// Palette cycled through when the user creates a new tag
const NEW_TAG_PALETTE: TagDef[] = [
  { bg: '#dbeafe', ink: '#1e40af' },
  { bg: '#fce7f3', ink: '#be185d' },
  { bg: '#d1fae5', ink: '#065f46' },
  { bg: '#fef9c3', ink: '#854d0e' },
  { bg: '#ffe4e6', ink: '#9f1239' },
  { bg: '#f0fdf4', ink: '#166534' },
];

export function AddExperiment({ onNavigate, onCancel, experimentToEdit }: AddExperimentProps) {
  const { state, dispatch } = useStore();
  const isEdit = !!experimentToEdit;

  const initialParticipants: Participant[] = experimentToEdit?.participants?.map(p => ({ id: p.id, label: p.label }))
    ?? [{ id: 'p-1', label: 'Participant 01' }];

  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [nextNum,      setNextNum]      = useState(initialParticipants.length + 1);
  const [openIds,      setOpenIds]      = useState<Set<string>>(new Set(initialParticipants.map(p => p.id)));
  const [facts,        setFacts]        = useState<FactData[]>([]);
  const [dialog,  setDialog]  = useState<DialogState | null>(null);
  const [tagMap,  setTagMap]  = useState<TagMap>(INITIAL_TAGS);
  const [experimentName, setExperimentName] = useState(experimentToEdit?.name ?? '');
  const [team,   setTeam]   = useState(experimentToEdit?.team === '—' ? '' : (experimentToEdit?.team ?? ''));
  const [method, setMethod] = useState(experimentToEdit?.method === '—' ? '' : (experimentToEdit?.method ?? ''));
  const [researchQuestion, setResearchQuestion] = useState(experimentToEdit?.researchQuestion ?? '');

  // Map from participantId → the live contentEditable div, for collecting innerHTML on save
  const participantElRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Existing facts for this experiment (only relevant in edit mode)
  const existingFacts = useMemo(() =>
    isEdit ? state.items.filter(i => i.experimentId === experimentToEdit!.id && i.type === 'fact') : [],
    [isEdit, state.items, experimentToEdit],
  );

  const handleOpenDialog = useCallback((state: DialogState) => setDialog(state), []);

  const handleSave = useCallback((navigateTo: 'all-experiments' | 'experiment-kanban') => {
    const storedParticipants: StoredParticipant[] = participants.map(p => ({
      id: p.id,
      label: p.label,
      notes: participantElRefs.current.get(p.id)?.innerHTML ?? '',
    }));

    const dispatchFacts = (expId: string) => {
      for (const f of facts) {
        dispatch({
          type: 'ADD_ITEM',
          payload: {
            id: crypto.randomUUID(),
            type: 'fact',
            text: f.title,
            blurb: f.description || undefined,
            experimentId: expId,
            supportedBy: [],
            participantId: f.participantId,
            highlightedText: f.highlightedText,
            tags: f.tags,
          },
        });
      }
    };

    if (isEdit && experimentToEdit) {
      dispatch({
        type: 'UPDATE_EXPERIMENT',
        payload: {
          ...experimentToEdit,
          name: experimentName.trim() || 'Untitled experiment',
          team: team.trim() || '—',
          method: method.trim() || '—',
          researchQuestion: researchQuestion.trim() || undefined,
          participants: storedParticipants,
        },
      });
      dispatchFacts(experimentToEdit.id);
      onNavigate('experiment-kanban', experimentToEdit.id);
    } else {
      const expId = crypto.randomUUID();
      dispatch({
        type: 'ADD_EXPERIMENT',
        payload: {
          id: expId,
          name: experimentName.trim() || 'Untitled experiment',
          team: team.trim() || '—',
          method: method.trim() || '—',
          researchQuestion: researchQuestion.trim() || undefined,
          participants: storedParticipants,
          uploadedAt: navigateTo === 'experiment-kanban' ? new Date().toISOString() : undefined,
        },
      });
      dispatchFacts(expId);
      onNavigate(navigateTo, expId);
    }
  }, [dispatch, experimentName, team, method, researchQuestion, facts, participants, onNavigate, isEdit, experimentToEdit]);

  const handleAddParticipant = useCallback(() => {
    const id = `p-${nextNum}`;
    const label = `Participant ${String(nextNum).padStart(2, '0')}`;
    setParticipants(prev => [{ id, label }, ...prev]);
    setOpenIds(prev => new Set([...prev, id]));
    setNextNum(n => n + 1);
  }, [nextNum]);

  const handleToggle = useCallback((id: string) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleCreateTag = useCallback((name: string) => {
    setTagMap(prev => ({
      ...prev,
      [name]: NEW_TAG_PALETTE[Object.keys(prev).length % NEW_TAG_PALETTE.length],
    }));
  }, []);

  const handleFactDone = useCallback((title: string, description: string, tags: string[], attachment?: string) => {
    if (!dialog) return;

    // Wrap the saved range in an amber highlight span
    const span = document.createElement('span');
    span.style.cssText = `background:${HF.fact.bg};color:${HF.fact.ink};border-radius:3px;padding:0 2px 1px;border-bottom:1.5px solid ${HF.fact.dot};cursor:default;`;
    span.title = title;
    try {
      dialog.range.surroundContents(span);
    } catch {
      span.appendChild(dialog.range.extractContents());
      dialog.range.insertNode(span);
    }

    setFacts(prev => [...prev, {
      id: `fact-${Date.now()}`,
      title,
      description,
      tags,
      attachment,
      highlightedText: dialog.selectedText,
      participantId: dialog.participantId,
    }]);
    setDialog(null);
  }, [dialog]);

  const breadcrumb = isEdit
    ? ['Projects', experimentToEdit!.name, 'Edit']
    : ['Projects', 'New experiment'];

  return (
    <AppShell leftRail={false} breadcrumb={breadcrumb} onNavigate={onNavigate}>
      {dialog && (
        <AddFactDialog
          selectedText={dialog.selectedText}
          tagMap={tagMap}
          onCreateTag={handleCreateTag}
          onDone={handleFactDone}
          onCancel={() => setDialog(null)}
        />
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 36px' }}>
        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24 }}>{isEdit ? 'Edit experiment' : 'Add experiment'}</h1>
            <div style={{ fontSize: 13.5, color: HF.ink3, marginTop: 4 }}>
              {isEdit
                ? 'Update experiment details. Add new session notes and facts below.'
                : 'Dump notes and screenshots, one section per participant. Structure later.'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <Btn variant="ghost" size="md" onClick={onCancel}>Cancel</Btn>
            {isEdit ? (
              <Btn variant="accent" size="md" onClick={() => handleSave('experiment-kanban')}>Save changes</Btn>
            ) : (
              <>
                <Btn variant="default" size="md" onClick={() => handleSave('all-experiments')}>Save as draft</Btn>
                <Btn variant="accent" size="md" iconRight="arrowRight" onClick={() => handleSave('experiment-kanban')}>
                  Upload
                </Btn>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 28, marginTop: 28 }}>
          {/* Main column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* EXPERIMENT INFO */}
            <div>
              <SectionLabel>Experiment info</SectionLabel>
              <div style={{ marginTop: 12, background: HF.card, border: `1px solid ${HF.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: `1px solid ${HF.border}` }}>
                  <MetaSelectCell
                    label="Team" value={team} onChange={setTeam}
                    options={['Alfa SP/PW', 'TnT', 'I&A', 'SSI', 'Octo', 'Octo SIA']}
                    borderRight
                  />
                  <MetaSelectCell
                    label="Method" value={method} onChange={setMethod}
                    options={['Usability test', 'Survey', 'Interview', 'Diary study', 'Desk research', 'Other']}
                  />
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <FormField label="Experiment name" required>
                    <input
                      value={experimentName}
                      onChange={e => setExperimentName(e.target.value)}
                      placeholder="Give this experiment a name"
                      style={{
                        background: HF.bgSubtle, border: `1px solid ${HF.border}`,
                        borderRadius: 8, padding: '0 11px', height: 34,
                        font: 'inherit', fontSize: 13.5, color: HF.ink,
                        outline: 'none', width: '100%', boxSizing: 'border-box',
                      }}
                    />
                  </FormField>
                  <FormField label="Research question">
                    <input
                      value={researchQuestion}
                      onChange={e => setResearchQuestion(e.target.value)}
                      placeholder="What are you trying to learn?"
                      style={{
                        background: HF.bgSubtle, border: `1px solid ${HF.border}`,
                        borderRadius: 8, padding: '0 11px', height: 34,
                        font: 'inherit', fontSize: 13.5, color: HF.ink,
                        outline: 'none', width: '100%', boxSizing: 'border-box',
                      }}
                    />
                  </FormField>
                  <FormField label="Description">
                    <Input placeholder="What is this experiment about?" />
                  </FormField>
                </div>
              </div>
            </div>

            {/* PARTICIPANTS */}
            <div>
              <SectionLabel>Sessions · {participants.length} participant{participants.length !== 1 ? 's' : ''}</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <DashedAddBtn label={`+ Add participant ${nextNum}`} onClick={handleAddParticipant} />
                {participants.map(p => (
                  <ParticipantCard
                    key={p.id}
                    label={p.label}
                    participantId={p.id}
                    open={openIds.has(p.id)}
                    onToggle={() => handleToggle(p.id)}
                    onAddFact={handleOpenDialog}
                    initialNotes={experimentToEdit?.participants?.find(sp => sp.id === p.id)?.notes}
                    onEditableRef={(el) => {
                      if (el) participantElRefs.current.set(p.id, el);
                      else participantElRefs.current.delete(p.id);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right rail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'flex-start', position: 'sticky', top: 24 }}>
            {/* FACTS */}
            <RailCard>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <RailCardLabel>Facts {(existingFacts.length + facts.length) > 0 && `· ${existingFacts.length + facts.length}`}</RailCardLabel>
              </div>
              {existingFacts.length === 0 && facts.length === 0 ? (
                <div style={{ fontSize: 13, color: HF.ink4, marginTop: 10, lineHeight: 1.5 }}>
                  Select text in a session note, then click "Add fact".
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {existingFacts.map(f => <StoredFactCard key={f.id} item={f} />)}
                  {facts.map(f => <FactCard key={f.id} fact={f} tagMap={tagMap} />)}
                </div>
              )}
            </RailCard>

          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Participant card ─────────────────────────────────────────────────────────

interface ParticipantCardProps {
  label: string;
  participantId: string;
  open: boolean;
  onToggle: () => void;
  onAddFact: (state: DialogState) => void;
  initialNotes?: string;
  onEditableRef?: (el: HTMLDivElement | null) => void;
}

function ParticipantCard({ label, participantId, open, onToggle, onAddFact, initialNotes, onEditableRef }: ParticipantCardProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [floatingPos, setFloatingPos] = useState<{ top: number; left: number } | null>(null);

  // Callback ref that keeps both the internal ref and the parent's ref in sync
  const setEditableRef = useCallback((el: HTMLDivElement | null) => {
    (editableRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    onEditableRef?.(el);
  }, [onEditableRef]);

  // Restore saved HTML content once on mount (preserves highlight spans)
  useEffect(() => {
    if (editableRef.current && initialNotes) {
      editableRef.current.innerHTML = initialNotes;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectionChange = useCallback(() => {
    if (!open || !editableRef.current) { setFloatingPos(null); return; }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setFloatingPos(null); return; }
    const range = sel.getRangeAt(0);
    if (!editableRef.current.contains(range.commonAncestorContainer)) { setFloatingPos(null); return; }
    if (!sel.toString().trim()) { setFloatingPos(null); return; }
    const rect = range.getBoundingClientRect();
    setFloatingPos({ top: rect.top - 40, left: rect.left + rect.width / 2 });
  }, [open]);

  useEffect(() => {
    if (!open) { setFloatingPos(null); return; }
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [open, handleSelectionChange]);

  const handleFloatingMouseDown = (e: React.MouseEvent) => {
    // preventDefault keeps the selection alive when clicking the button
    e.preventDefault();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !editableRef.current) return;
    const range = sel.getRangeAt(0);
    if (!editableRef.current.contains(range.commonAncestorContainer)) return;
    const text = sel.toString().trim();
    if (!text) return;
    setFloatingPos(null);
    onAddFact({ selectedText: text, range: range.cloneRange(), participantId });
  };

  return (
    <>
      {/* Floating "Add fact" button — rendered at viewport level via fixed positioning */}
      {floatingPos && open && (
        <div
          onMouseDown={handleFloatingMouseDown}
          style={{
            position: 'fixed',
            top: floatingPos.top,
            left: floatingPos.left,
            transform: 'translateX(-50%)',
            zIndex: 90,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: HF.fact.ink,
            color: '#fff',
            fontSize: 12, fontWeight: 600,
            borderRadius: 6, padding: '5px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
            cursor: 'pointer',
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <Icon name="plus" size={11} stroke="#fff" />
          Add fact
        </div>
      )}

      <div style={{
        background: HF.card,
        border: `1px solid ${open ? HF.borderStrong : HF.border}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div
          onClick={onToggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', cursor: 'pointer',
            borderBottom: open ? `1px solid ${HF.border}` : 'none',
          }}
        >
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} stroke={HF.ink3} />
          <span style={{ flex: 1, fontWeight: 500, fontSize: 14, color: HF.ink }}>{label}</span>
          <button
            onClick={e => e.stopPropagation()}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', padding: 4 }}
          >
            <Icon name="more" size={16} stroke={HF.ink3} />
          </button>
        </div>

        {open && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              ref={setEditableRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Type or paste all raw data here…"
              style={{
                width: '100%', minHeight: 311,
                border: 'none', outline: 'none',
                background: 'transparent',
                font: 'inherit', fontSize: 13.5,
                color: HF.ink, lineHeight: 1.65,
                padding: '14px 16px',
                boxSizing: 'border-box',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 14px',
              borderTop: `1px solid ${HF.border}`,
            }}>
              <Btn variant="ghost" size="sm" icon="paperclip">Add attachment</Btn>
              <Btn variant="ghost" size="sm" icon="link">Add link</Btn>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Add fact dialog ──────────────────────────────────────────────────────────

interface AddFactDialogProps {
  selectedText: string;
  tagMap: TagMap;
  onCreateTag: (name: string) => void;
  onDone: (title: string, description: string, tags: string[], attachment?: string) => void;
  onCancel: () => void;
}

function AddFactDialog({ selectedText, tagMap, onCreateTag, onDone, onCancel }: AddFactDialogProps) {
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags]               = useState<string[]>([]);
  const [attachment, setAttachment]   = useState<string | undefined>(undefined);
  const [newTagInput, setNewTagInput] = useState('');
  const [showNewTag, setShowNewTag]   = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const newTagRef = useRef<HTMLInputElement>(null);

  const canSubmit = title.trim().length > 0;

  const toggleTag = (t: string) =>
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const commitNewTag = () => {
    const name = newTagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!name) { setShowNewTag(false); return; }
    if (!tagMap[name]) {
      onCreateTag(name);
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
        background: HF.card, borderRadius: 14, padding: 24, width: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: HF.ink }}>Add fact</h2>
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

        {/* Highlighted text preview */}
        <div style={{
          background: HF.fact.bg, borderRadius: 8, padding: '8px 12px',
          borderLeft: `3px solid ${HF.fact.dot}`,
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: HF.fact.ink, marginBottom: 4 }}>
            Selected text
          </div>
          <div style={{ fontSize: 13, color: HF.fact.ink, lineHeight: 1.5, fontStyle: 'italic' }}>
            "{selectedText}"
          </div>
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: HF.ink2 }}>
            Fact title <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Summarise the fact in one sentence"
            onKeyDown={e => { if (e.key === 'Enter' && canSubmit) onDone(title.trim(), description.trim(), tags, attachment); }}
            style={{
              background: HF.bgSubtle, border: `1px solid ${HF.border}`,
              borderRadius: 8, padding: '0 11px', height: 36,
              font: 'inherit', fontSize: 13.5, color: HF.ink,
              outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: HF.ink2 }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add more detail or context (optional)"
            rows={3}
            style={{
              background: HF.bgSubtle, border: `1px solid ${HF.border}`,
              borderRadius: 8, padding: '8px 11px',
              font: 'inherit', fontSize: 13.5, color: HF.ink,
              outline: 'none', width: '100%', boxSizing: 'border-box',
              resize: 'vertical', lineHeight: 1.55,
            }}
          />
        </div>

        {/* Tags — multi-select + create */}
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

            {/* Inline new-tag creator */}
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

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <Btn variant="ghost" size="md" onClick={onCancel}>Cancel</Btn>
          <Btn
            variant="accent"
            size="md"
            onClick={() => canSubmit && onDone(title.trim(), description.trim(), tags, attachment)}
            style={{ opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? 'pointer' : 'default' }}
          >
            Done
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Stored fact card (right rail, edit mode) ─────────────────────────────────

function StoredFactCard({ item }: { item: AtomicItem }) {
  return (
    <div style={{
      background: HF.fact.bg,
      border: `1px solid ${HF.fact.dot}33`,
      borderRadius: 8, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: HF.fact.dot, flexShrink: 0, marginTop: 5 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: HF.fact.ink, lineHeight: 1.4 }}>{item.text}</span>
      </div>
      {item.highlightedText && (
        <div style={{ fontSize: 11.5, color: HF.ink3, fontStyle: 'italic', paddingLeft: 12, lineHeight: 1.4 }}>
          "{item.highlightedText.length > 80 ? item.highlightedText.slice(0, 80) + '…' : item.highlightedText}"
        </div>
      )}
      {item.blurb && (
        <div style={{ fontSize: 12.5, color: HF.ink2, paddingLeft: 12, lineHeight: 1.45 }}>
          {item.blurb}
        </div>
      )}
    </div>
  );
}

// ─── Fact card (right rail) ───────────────────────────────────────────────────

function FactCard({ fact, tagMap }: { fact: FactData; tagMap: TagMap }) {
  return (
    <div style={{
      background: HF.fact.bg,
      border: `1px solid ${HF.fact.dot}33`,
      borderRadius: 8, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: HF.fact.dot, flexShrink: 0, marginTop: 5 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: HF.fact.ink, lineHeight: 1.4 }}>{fact.title}</span>
      </div>

      <div style={{ fontSize: 11.5, color: HF.ink3, fontStyle: 'italic', paddingLeft: 12, lineHeight: 1.4 }}>
        "{fact.highlightedText.length > 80 ? fact.highlightedText.slice(0, 80) + '…' : fact.highlightedText}"
      </div>

      {fact.description && (
        <div style={{ fontSize: 12.5, color: HF.ink2, paddingLeft: 12, lineHeight: 1.45 }}>
          {fact.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, paddingLeft: 12 }}>
        <span style={{ fontSize: 11, color: HF.ink4 }}>{fact.participantId}</span>
        {fact.tags.map(t => {
          const def = tagMap[t];
          return def ? (
            <span key={t} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 11, fontWeight: 500,
              background: def.bg, color: def.ink,
              borderRadius: 5, padding: '1px 7px',
            }}>
              <span style={{ fontSize: 9 }}>#</span>{t}
            </span>
          ) : null;
        })}
        {fact.attachment && (
          <span style={{ fontSize: 11, color: HF.ink4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Icon name="paperclip" size={10} stroke={HF.ink4} />{fact.attachment}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Small primitives ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3, fontWeight: 600 }}>
      {children}
    </div>
  );
}

function MetaSelectCell({ label, value, onChange, options, borderRight }: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  options?: string[];
  borderRight?: boolean;
}) {
  return (
    <div style={{ padding: '12px 14px', borderRight: borderRight ? `1px solid ${HF.border}` : 'none' }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.07em', color: HF.ink4, fontWeight: 600, marginBottom: 6 }}>
        {label}
      </div>
      {onChange && options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            width: '100%',
            background: HF.bgSubtle, border: `1px solid ${HF.border}`,
            borderRadius: 7, padding: '5px 9px',
            fontSize: 12.5, color: value ? HF.ink : HF.ink3,
            fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            appearance: 'none',
          }}
        >
          <option value="" disabled>Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: HF.bgSubtle, border: `1px solid ${HF.border}`,
          borderRadius: 7, padding: '5px 9px',
          fontSize: 12.5, color: HF.ink,
        }}>
          <span style={{ flex: 1 }}>{value}</span>
          <Icon name="chevronDown" size={12} stroke={HF.ink3} />
        </div>
      )}
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 500, color: HF.ink2 }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, placeholder }: { value?: string; placeholder?: string }) {
  return (
    <input
      defaultValue={value}
      placeholder={placeholder}
      style={{
        background: HF.bgSubtle, border: `1px solid ${HF.border}`,
        borderRadius: 8, padding: '0 11px', height: 34,
        font: 'inherit', fontSize: 13.5, color: HF.ink,
        outline: 'none', width: '100%', boxSizing: 'border-box',
      }}
    />
  );
}

function DashedAddBtn({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '11px 16px', background: 'transparent',
      border: `1.5px dashed ${HF.borderStrong}`, borderRadius: 10,
      color: HF.ink3, fontSize: 13, fontWeight: 500,
      fontFamily: 'inherit', cursor: 'pointer', width: '100%',
    }}>
      {label}
    </button>
  );
}

function RailCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: HF.card, border: `1px solid ${HF.border}`, borderRadius: 12, padding: 16 }}>
      {children}
    </div>
  );
}

function RailCardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: HF.ink3, fontWeight: 600 }}>
      {children}
    </div>
  );
}
