import { useEffect, useMemo, useRef, useState } from 'react';
import type { Asset, Block, Deck, MarkerColor, Slide, TemplateId } from '../types';
import { loadDeck, getAsset, putAsset, scheduleAutosave } from '../storage/deckRepo';
import { createSlide } from '../deckFactory';
import { genId } from '../layout/id';
import { parseText, blocksToText, blocksToTextWithRanges, mergeBlocks } from '../layout/parse';
import { layoutSlide } from '../layout/layout';
import { createCanvasMeasurer } from '../layout/measure';
import { summarize, readability } from '../layout/assist';
import { exportSlideAsPng, downloadBlob } from '../export/exportPng';
import { useFontsReady } from '../hooks/useFontsReady';
import { SlideView } from '../render/SlideView';
import { useSwipe, useLongPress } from '../ui/gestures';
import type { ScreenState } from '../hooks/useScreen';

type Props = {
  deckId: string;
  navigate: (next: ScreenState) => void;
  back: () => void;
};

const TEMPLATE_CHOICES: { id: TemplateId | 'auto'; label: string }[] = [
  { id: 'auto', label: '自動' },
  { id: 'title', label: 'タイトル' },
  { id: 'statement', label: '主張' },
  { id: 'bullets', label: '箇条書き' },
  { id: 'twoColumn', label: '2カラム' },
  { id: 'imageSide', label: '画像＋文章' },
];
const MARKER_CYCLE: MarkerColor[] = ['yellow', 'pink', 'blue'];
const SUMMARIZE_RATIO = 0.6;
const SUMMARIZE_MIN_CHARS = 20;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function EditorScreen({ deckId, navigate, back }: Props) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [rawText, setRawText] = useState('');
  const [assetsCache, setAssetsCache] = useState<Record<string, Asset>>({});
  const [notesOpen, setNotesOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [exportingPng, setExportingPng] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [warningSheetOpen, setWarningSheetOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fontsReady = useFontsReady();
  const measurer = useMemo(() => createCanvasMeasurer(), []);

  useEffect(() => {
    let cancelled = false;
    loadDeck(deckId).then(async (loaded) => {
      if (cancelled) return;
      if (!loaded) {
        back();
        return;
      }
      setDeck(loaded);
      setSlideIndex(0);
      setRawText(blocksToText(loaded.slides[0]?.blocks ?? []));

      const cache: Record<string, Asset> = {};
      for (const meta of loaded.assets) {
        const full = await getAsset(meta.id);
        if (full) cache[full.id] = full;
      }
      if (!cancelled) setAssetsCache(cache);
    });
    return () => {
      cancelled = true;
    };
  }, [deckId, back]);

  const currentSlide: Slide | undefined = deck?.slides[slideIndex];

  const layout = useMemo(() => {
    if (!currentSlide || !fontsReady) return null;
    return layoutSlide(currentSlide, measurer);
  }, [currentSlide, fontsReady, measurer]);

  const readabilityResult = useMemo(() => {
    if (!currentSlide) return null;
    return readability(currentSlide);
  }, [currentSlide]);

  function commitDeck(next: Deck) {
    const updated = { ...next, updatedAt: new Date().toISOString() };
    setDeck(updated);
    scheduleAutosave(updated);
  }

  function updateSlideBlocks(index: number, blocks: Block[]) {
    if (!deck) return;
    const slides = deck.slides.map((s, i) => (i === index ? { ...s, blocks } : s));
    commitDeck({ ...deck, slides });
  }

  function switchSlide(index: number) {
    if (!deck) return;
    const clamped = Math.max(0, Math.min(deck.slides.length - 1, index));
    setSlideIndex(clamped);
    setRawText(blocksToText(deck.slides[clamped]?.blocks ?? []));
  }

  const previewSwipe = useSwipe({
    onSwipeLeft: () => switchSlide(slideIndex + 1),
    onSwipeRight: () => switchSlide(slideIndex - 1),
  });

  function handleTextChange(value: string) {
    if (!deck || !currentSlide) return;
    setRawText(value);
    const parsed = parseText(value);
    const merged = mergeBlocks(currentSlide.blocks, parsed);
    updateSlideBlocks(slideIndex, merged);
  }

  function applyToSelectedBlocks(fn: (b: Block) => Block) {
    if (!currentSlide || !textareaRef.current) return;
    const { ranges } = blocksToTextWithRanges(currentSlide.blocks);
    const selStart = textareaRef.current.selectionStart;
    const selEnd = textareaRef.current.selectionEnd;
    const targetIds = new Set(
      ranges
        .filter((r) => (selStart === selEnd ? selStart >= r.start && selStart <= r.end : r.start < selEnd && r.end > selStart))
        .map((r) => r.blockId),
    );
    if (targetIds.size === 0) return;
    const blocks = currentSlide.blocks.map((b) => (targetIds.has(b.id) ? fn(b) : b));
    updateSlideBlocks(slideIndex, blocks);
  }

  function handleMarker(color: MarkerColor) {
    applyToSelectedBlocks((b) => {
      if (b.type === 'image') return b;
      return { ...b, marker: b.marker === color ? null : color };
    });
  }

  function handleEmphasis() {
    applyToSelectedBlocks((b) => {
      if (b.type === 'image') return b;
      return { ...b, emphasis: !b.emphasis };
    });
  }

  function handleSelectTemplate(next: TemplateId | 'auto') {
    if (!deck || !currentSlide) return;
    const slides = deck.slides.map((s, i) => (i === slideIndex ? { ...s, layoutHint: next } : s));
    commitDeck({ ...deck, slides });
    setTemplatePickerOpen(false);
  }

  function handleSummarizeBlock(blockId: string) {
    if (!deck || !currentSlide) return;
    const block = currentSlide.blocks.find((b) => b.id === blockId);
    if (!block || block.type === 'image') return;
    const maxChars = Math.max(SUMMARIZE_MIN_CHARS, Math.floor(block.text.length * SUMMARIZE_RATIO));
    const summarized = summarize(block.text, maxChars);
    if (!summarized || summarized === block.text) {
      window.alert('これ以上要約できませんでした。');
      return;
    }
    const confirmed = window.confirm(
      `本文を要約して短くします（元に戻せません）。\n\n【要約後】\n${summarized}`,
    );
    if (!confirmed) return;
    const blocks = currentSlide.blocks.map((b) => (b.id === blockId ? { ...b, text: summarized } : b));
    updateSlideBlocks(slideIndex, blocks);
    setRawText(blocksToText(blocks));
    setWarningSheetOpen(false);
  }

  async function handleAddImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !deck || !currentSlide) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const { width, height } = await readImageSize(dataUrl);
      const asset: Asset = { id: genId('asset'), mime: file.type, width, height, data: dataUrl };
      await putAsset(asset);
      setAssetsCache((prev) => ({ ...prev, [asset.id]: asset }));

      const withoutOldImage = currentSlide.blocks.filter((b) => b.type !== 'image');
      const defaultAlt = file.name.replace(/\.[^./\\]+$/, '');
      const imageBlock: Block = { id: genId('block'), type: 'image', assetId: asset.id, alt: defaultAlt };
      const blocks = [...withoutOldImage, imageBlock];
      const assetsMeta = [...deck.assets.filter((a) => a.id !== asset.id), { id: asset.id, mime: asset.mime, width: asset.width, height: asset.height }];
      const slides = deck.slides.map((s, i) => (i === slideIndex ? { ...s, blocks } : s));
      commitDeck({ ...deck, slides, assets: assetsMeta });
    } catch (err) {
      console.error('画像の追加に失敗しました', err);
      window.alert('画像を追加できませんでした。画像ファイルを選択してください。');
    }
  }

  function handleEditImageAlt() {
    if (!currentSlide) return;
    const imageBlock = currentSlide.blocks.find((b): b is Extract<Block, { type: 'image' }> => b.type === 'image');
    if (!imageBlock) return;
    const next = window.prompt('画像の代替テキスト（読み上げ用の説明）を入力してください', imageBlock.alt);
    if (next === null) return;
    const blocks = currentSlide.blocks.map((b) => (b.id === imageBlock.id ? { ...b, alt: next } : b));
    updateSlideBlocks(slideIndex, blocks);
  }

  async function handleExportPng() {
    if (!currentSlide || exportingPng) return;
    setExportingPng(true);
    try {
      const blob = await exportSlideAsPng(currentSlide, Object.values(assetsCache), measurer);
      downloadBlob(blob, `${deck?.title || 'slide'}-${slideIndex + 1}.png`);
    } catch (err) {
      console.error('PNGの保存に失敗しました', err);
      window.alert('PNGの保存に失敗しました。もう一度お試しください。');
    } finally {
      setExportingPng(false);
    }
  }

  function handleNotesChange(value: string) {
    if (!deck || !currentSlide) return;
    const slides = deck.slides.map((s, i) => (i === slideIndex ? { ...s, notes: value } : s));
    commitDeck({ ...deck, slides });
  }

  function handleTitleChange(value: string) {
    if (!deck) return;
    commitDeck({ ...deck, title: value });
  }

  function handleAddSlide() {
    if (!deck) return;
    const slide = createSlide();
    const slides = [...deck.slides, slide];
    commitDeck({ ...deck, slides });
    switchSlide(slides.length - 1);
  }

  function handleDeleteSlide(index: number) {
    if (!deck || deck.slides.length <= 1) return;
    const slides = deck.slides.filter((_, i) => i !== index);
    commitDeck({ ...deck, slides });
    switchSlide(Math.min(index, slides.length - 1));
  }

  function handleReorder(from: number, to: number) {
    if (!deck || from === to) return;
    const slides = deck.slides.slice();
    const [moved] = slides.splice(from, 1);
    slides.splice(to, 0, moved);
    commitDeck({ ...deck, slides });
    setSlideIndex(to);
  }

  if (!deck || !currentSlide) {
    return <div className="editor" />;
  }

  return (
    <div className="editor">
      <div className="editor__header">
        <button className="editor__back" onClick={back} aria-label="戻る">
          ←
        </button>
        <input
          className="editor__title-input"
          value={deck.title}
          onChange={(e) => handleTitleChange(e.target.value)}
        />
      </div>

      <div className="editor__preview" {...previewSwipe}>
        {layout && (
          <>
            <SlideView result={layout} assets={Object.values(assetsCache)} blocks={currentSlide.blocks} width={Math.min(560, window.innerWidth - 32)} />
            {layout.warnings.length > 0 && (
              <button className="editor__warning-badge" onClick={() => setWarningSheetOpen(true)}>
                ⚠ {layout.warnings[0].message}
              </button>
            )}
          </>
        )}
      </div>

      <textarea
        ref={textareaRef}
        className="editor__text"
        value={rawText}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={'1行目がタイトルになります\n・箇条書きは記号(・-*)で\n空行で段落を区切ります'}
      />

      {notesOpen && (
        <textarea
          className="editor__text"
          style={{ flex: '0 0 20%' }}
          value={currentSlide.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="発表メモ"
        />
      )}

      <div className="editor__toolbar">
        <button className="editor__tool" onClick={() => imageInputRef.current?.click()}>
          画像
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAddImage} />
        {currentSlide.blocks.some((b) => b.type === 'image') && (
          <button className="editor__tool" onClick={handleEditImageAlt}>
            画像の説明
          </button>
        )}
        {MARKER_CYCLE.map((color) => (
          <button key={color} className="editor__tool" onClick={() => handleMarker(color)}>
            マーカー({color})
          </button>
        ))}
        <button className="editor__tool" onClick={handleEmphasis}>
          強調
        </button>
        <button className="editor__tool" onClick={() => setTemplatePickerOpen(true)}>
          レイアウト: {TEMPLATE_CHOICES.find((t) => t.id === currentSlide.layoutHint)?.label ?? currentSlide.layoutHint}
        </button>
        <button className={`editor__tool${notesOpen ? ' editor__tool--active' : ''}`} onClick={() => setNotesOpen((v) => !v)}>
          メモ
        </button>
        <button className="editor__tool" onClick={() => navigate({ name: 'present', deckId: deck.id, index: slideIndex })}>
          ▶ 発表
        </button>
        <button className="editor__tool" disabled={exportingPng} onClick={handleExportPng}>
          {exportingPng ? 'PNG保存中…' : 'PNG保存'}
        </button>
      </div>

      <div className="editor__filmstrip">
        {deck.slides.map((s, i) => (
          <FilmstripItem
            key={s.id}
            slide={s}
            active={i === slideIndex}
            measurer={measurer}
            dragging={dragIndex === i}
            onSelect={() => switchSlide(i)}
            onDragStart={() => setDragIndex(i)}
            onDragEnter={() => {
              if (dragIndex !== null && dragIndex !== i) {
                handleReorder(dragIndex, i);
                setDragIndex(i);
              }
            }}
            onDragEnd={() => setDragIndex(null)}
            onDeleteSwipeUp={() => handleDeleteSlide(i)}
          />
        ))}
        <button className="filmstrip__add" onClick={handleAddSlide} aria-label="スライド追加">
          ＋
        </button>
      </div>

      {templatePickerOpen && (
        <div className="sheet-backdrop" onClick={() => setTemplatePickerOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="sheet__heading">レイアウト候補</p>
            <div className="template-picker">
              {TEMPLATE_CHOICES.map((choice) => (
                <TemplateCandidate
                  key={choice.id}
                  label={choice.label}
                  slide={currentSlide}
                  templateId={choice.id}
                  active={currentSlide.layoutHint === choice.id}
                  measurer={measurer}
                  onSelect={() => handleSelectTemplate(choice.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {warningSheetOpen && layout && layout.warnings.length > 0 && (
        <div className="sheet-backdrop" onClick={() => setWarningSheetOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="sheet__heading">改善の提案</p>
            {layout.warnings.map((w, i) => (
              <p key={i} className="sheet__note">
                ⚠ {w.message}
              </p>
            ))}
            {readabilityResult && (
              <>
                <p className="sheet__note">読みやすさスコア: {readabilityResult.score} / 100</p>
                {readabilityResult.hints.map((hint, i) => (
                  <p key={i} className="sheet__note">
                    ・{hint}
                  </p>
                ))}
              </>
            )}
            {layout.warnings[0].blockId && (
              <button
                className="sheet__item"
                onClick={() => handleSummarizeBlock(layout.warnings[0].blockId as string)}
              >
                要約して縮める
              </button>
            )}
            <button className="sheet__item" onClick={() => setWarningSheetOpen(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateCandidate({
  label,
  slide,
  templateId,
  active,
  measurer,
  onSelect,
}: {
  label: string;
  slide: Slide;
  templateId: TemplateId | 'auto';
  active: boolean;
  measurer: ReturnType<typeof createCanvasMeasurer>;
  onSelect: () => void;
}) {
  const previewSlide = useMemo(() => ({ ...slide, layoutHint: templateId }), [slide, templateId]);
  const layout = useMemo(() => layoutSlide(previewSlide, measurer), [previewSlide, measurer]);

  return (
    <button className={`template-picker__item${active ? ' template-picker__item--active' : ''}`} onClick={onSelect}>
      <SlideView result={layout} assets={[]} blocks={slide.blocks} width={120} />
      <span className="template-picker__label">{label}</span>
    </button>
  );
}

function FilmstripItem({
  slide,
  active,
  measurer,
  dragging,
  onSelect,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDeleteSwipeUp,
}: {
  slide: Slide;
  active: boolean;
  measurer: ReturnType<typeof createCanvasMeasurer>;
  dragging: boolean;
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
  onDeleteSwipeUp: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const longPress = useLongPress(onDragStart);
  const swipe = useSwipe({ onSwipeUp: onDeleteSwipeUp });
  const layout = useMemo(() => layoutSlide(slide, measurer), [slide, measurer]);

  return (
    <div
      ref={ref}
      className={`filmstrip__item${active ? ' filmstrip__item--active' : ''}`}
      style={{ opacity: dragging ? 0.5 : 1 }}
      onClick={onSelect}
      onPointerDown={(e) => {
        longPress.onPointerDown(e);
        swipe.onPointerDown(e);
      }}
      onPointerUp={(e) => {
        longPress.onPointerUp(e);
        swipe.onPointerUp(e);
        onDragEnd();
      }}
      onPointerLeave={longPress.onPointerLeave}
      onPointerEnter={onDragEnter}
    >
      <SlideView result={layout} assets={[]} blocks={slide.blocks} width={80} />
    </div>
  );
}
