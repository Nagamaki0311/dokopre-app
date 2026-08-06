import { useEffect, useMemo, useRef, useState } from 'react';
import type { Deck } from '../types';
import { createDeck } from '../deckFactory';
import { deleteDeck, exportDeckJson, importDeckJson, listDecks, saveDeck } from '../storage/deckRepo';
import { genId } from '../layout/id';
import { layoutSlide } from '../layout/layout';
import { createCanvasMeasurer } from '../layout/measure';
import { exportDeckAsPdf } from '../export/exportPdf';
import { downloadBlob } from '../export/exportPng';
import { SlideView } from '../render/SlideView';
import { useLongPress } from '../ui/gestures';
import type { ScreenState } from '../hooks/useScreen';

type Props = {
  navigate: (next: ScreenState) => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function DeckThumb({ deck }: { deck: Deck }) {
  const slide = deck.slides[0];
  if (!slide) return <div className="deck-card__thumb" />;
  const result = layoutSlide(slide, createCanvasMeasurer());
  return (
    <div className="deck-card__thumb">
      <SlideView result={result} assets={[]} blocks={slide.blocks} width={96} />
    </div>
  );
}

function DeckCard({ deck, onOpen, onLongPress }: { deck: Deck; onOpen: () => void; onLongPress: () => void }) {
  const longPress = useLongPress(onLongPress);
  return (
    <div className="deck-card" onClick={onOpen} {...longPress}>
      <DeckThumb deck={deck} />
      <div className="deck-card__body">
        <p className="deck-card__title">{deck.title || '無題のデッキ'}</p>
        <p className="deck-card__meta">更新: {formatDate(deck.updatedAt)}</p>
      </div>
    </div>
  );
}

export function HomeScreen({ navigate }: Props) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [sheetDeck, setSheetDeck] = useState<Deck | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const measurer = useMemo(() => createCanvasMeasurer(), []);

  const refresh = () => {
    listDecks().then(setDecks);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async () => {
    const deck = createDeck();
    await saveDeck(deck);
    navigate({ name: 'editor', deckId: deck.id });
  };

  const handleDuplicate = async (deck: Deck) => {
    const now = new Date().toISOString();
    const copy: Deck = {
      ...deck,
      id: genId('deck'),
      title: `${deck.title} のコピー`,
      createdAt: now,
      updatedAt: now,
    };
    await saveDeck(copy);
    setSheetDeck(null);
    refresh();
  };

  const handleDelete = async (deck: Deck) => {
    await deleteDeck(deck.id);
    setSheetDeck(null);
    refresh();
  };

  const handleExport = async (deck: Deck) => {
    const json = await exportDeckJson(deck);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.title || 'deck'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSheetDeck(null);
  };

  const handleExportPdf = async (deck: Deck) => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const blob = await exportDeckAsPdf(deck, measurer);
      await downloadBlob(blob, `${deck.title || 'deck'}.pdf`);
      setSheetDeck(null);
    } catch (err) {
      console.error('PDFの書き出しに失敗しました', err);
      alert('PDFの書き出しに失敗しました。もう一度お試しください。');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      await importDeckJson(text);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : '読み込みに失敗しました。');
    }
  };

  return (
    <div className="home">
      <div className="home__header">
        <h1 className="home__title">どこでもプレゼン</h1>
        <button className="home__import" onClick={() => fileInputRef.current?.click()}>
          JSON読み込み
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </div>

      <div className="home__list">
        {decks.length === 0 && <p className="home__empty">デッキがありません。右下の＋から作成してください。</p>}
        {decks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            onOpen={() => navigate({ name: 'editor', deckId: deck.id })}
            onLongPress={() => setSheetDeck(deck)}
          />
        ))}
      </div>

      <button className="fab" onClick={handleCreate} aria-label="新規作成">
        ＋
      </button>

      {sheetDeck && (
        <div className="sheet-backdrop" onClick={() => !exportingPdf && setSheetDeck(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <button className="sheet__item" onClick={() => handleDuplicate(sheetDeck)}>
              複製
            </button>
            <button className="sheet__item" onClick={() => handleExport(sheetDeck)}>
              JSON書き出し
            </button>
            <button className="sheet__item" disabled={exportingPdf} onClick={() => handleExportPdf(sheetDeck)}>
              {exportingPdf ? 'PDF書き出し中…' : 'PDF書き出し'}
            </button>
            <button className="sheet__item sheet__item--danger" onClick={() => handleDelete(sheetDeck)}>
              削除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
