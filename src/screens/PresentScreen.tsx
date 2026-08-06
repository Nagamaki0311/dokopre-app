import { useEffect, useMemo, useRef, useState } from 'react';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import type { Asset, Deck } from '../types';
import { loadDeck, getAsset } from '../storage/deckRepo';
import { layoutSlide } from '../layout/layout';
import { createCanvasMeasurer } from '../layout/measure';
import { useFontsReady } from '../hooks/useFontsReady';
import { SlideView } from '../render/SlideView';
import { useSwipe, useDoubleTap } from '../ui/gestures';

type Props = {
  deckId: string;
  index: number;
  back: () => void;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function PresentScreen({ deckId, index, back }: Props) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [assetsCache, setAssetsCache] = useState<Record<string, Asset>>({});
  const [slideIndex, setSlideIndex] = useState(index);
  const [uiVisible, setUiVisible] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const fontsReady = useFontsReady();
  const measurer = useMemo(() => createCanvasMeasurer(), []);
  const [viewportW, setViewportW] = useState(window.innerWidth);

  useEffect(() => {
    let cancelled = false;
    loadDeck(deckId).then(async (loaded) => {
      if (cancelled || !loaded) return;
      setDeck(loaded);
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
  }, [deckId]);

  useEffect(() => {
    // ネイティブ(Android)ではCapacitorプラグイン経由、Webでは同プラグインがブラウザのScreen Orientation APIに委譲する。
    // 対応していない/許可されない場合はCSSの16:9フィット（下記widthの計算）に任せる。
    ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
    return () => {
      ScreenOrientation.unlock().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
    return () => clearInterval(timer);
  }, []);

  const slides = deck?.slides ?? [];
  const currentSlide = slides[slideIndex];

  const layout = useMemo(() => {
    if (!currentSlide || !fontsReady) return null;
    return layoutSlide(currentSlide, measurer);
  }, [currentSlide, fontsReady, measurer]);

  function goTo(next: number) {
    setSlideIndex(Math.max(0, Math.min(slides.length - 1, next)));
  }

  const swipe = useSwipe({
    onSwipeLeft: () => goTo(slideIndex + 1),
    onSwipeRight: () => goTo(slideIndex - 1),
  });
  const doubleTap = useDoubleTap(() => setUiVisible((v) => !v));

  const width = Math.min(viewportW, window.innerHeight * (16 / 9));

  return (
    <div
      className="present"
      onPointerDown={(e) => {
        swipe.onPointerDown(e);
        doubleTap.onPointerDown(e);
      }}
      onPointerMove={swipe.onPointerMove}
      onPointerUp={(e) => {
        swipe.onPointerUp(e);
        doubleTap.onPointerUp(e);
      }}
    >
      <div className="present__stage" style={{ width }}>
        {layout && currentSlide && (
          <SlideView result={layout} assets={Object.values(assetsCache)} blocks={currentSlide.blocks} width={width} />
        )}
        {uiVisible && (
          <div className="present__overlay">
            <div className="present__top">
              <span>
                {slideIndex + 1} / {slides.length}
              </span>
              <span>{formatElapsed(elapsed)}</span>
              <button className="present__exit" onClick={back}>
                終了
              </button>
            </div>
            <div className="present__bottom">
              <span>{currentSlide?.notes}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
