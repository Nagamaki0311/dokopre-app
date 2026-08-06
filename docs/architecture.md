# アーキテクチャ設計

## 技術スタック

React 18 + TypeScript + Vite（Vitest含む）を素のCSSで構築し、Phase 4でCapacitor 8によりAndroidネイティブシェルを追加している（D-001）。状態管理ライブラリ・ルーターは導入せず、`useReducer`相当は使わず単純な`useState`＋`history.pushState`で完結させている。

## ディレクトリ構成（`src/`）

```
src/
  App.tsx            画面切り替え(useScreen)＋ErrorBoundary
  main.tsx           Reactエントリポイント
  deckFactory.ts      新規Deck/Slideの初期値生成
  types.ts           Deck/Slide/Block/Asset/LayoutResult等の型定義（データスキーマの正）
  layout/            自動レイアウトエンジン（DOM非依存の純粋関数群）
    parse.ts          テキスト→Block[]の解析、Block[]→テキストの逆変換、編集後のマーカー引き継ぎ(mergeBlocks)
    analyze.ts         キーワード辞書等によるpriority/autoEmphasis付与
    templates.ts       テンプレート選択(selectTemplate)と配置枠(frames)定義
    measure.ts         文字計測(TextMeasurer)・折り返し(wrapText)、Canvas計測器の実装
    layout.ts          layoutSlide(): 上記を統合し LayoutResult を返す中心関数
    assist.ts          AI補助（summarize/readability、ルールベース）
    id.ts              ID採番
  render/
    SlideView.tsx       LayoutResultをDOM絶対配置で描画するReactコンポーネント
    canvasRenderer.ts    LayoutResultをCanvas 2Dに描画する関数(drawLayout)
  export/
    exportPng.ts         Canvasでスライド1枚をPNG Blob化、downloadBlob()で保存/共有
    exportPdf.ts          全スライドをexportSlideAsPng経由でPNG化しpdf-libで1つのPDFに結合
  storage/
    db.ts               IndexedDBの薄いラッパー(dbGet/dbPut/dbDelete/dbGetAll)
    deckRepo.ts           デッキ/アセットのCRUD、JSON export/import（検証付き）、自動保存
  hooks/
    useScreen.ts          history.pushStateベースの画面遷移
    useFontsReady.ts       document.fonts.ready待機
  ui/
    gestures.ts           Pointer EventsベースのuseSwipe/useLongPress/useDoubleTap
  screens/
    HomeScreen.tsx / EditorScreen.tsx / PresentScreen.tsx
  styles.css            デザイントークン＋全コンポーネントのCSS
```

## レイアウトエンジンとレンダラの分離（D-002）

`layoutSlide(slide, measurer): LayoutResult`が唯一のレイアウト判断ロジックであり、入力テキストの解析→重要度付与→テンプレート選択→文字計測・配置（フォントサイズの二分探索、`fitFont`）を行い、1280×720の仮想座標系における絶対配置ボックス列（`LayoutBox[]`）と警告(`LayoutWarning[]`)を返す純粋関数として`src/layout/`に実装されている。

この結果を消費するのはレンダラ側のみで、レイアウト判断の再実装は一切行わない。
- `SlideView.tsx`（DOM、`transform: scale()`で任意サイズに縮小し、Editor/Home/Present/フィルムストリップ/レイアウト候補カルーセルで共通利用）
- `canvasRenderer.ts`の`drawLayout`（PNG/PDF出力用のCanvas描画）

そのため、編集中のライブプレビューと発表画面、書き出したPNG/PDFの見た目は構造的に一致する。

## 二重レンダラ構成

| 用途 | レンダラ | 入力 |
|------|---------|------|
| ライブプレビュー／発表画面／フィルムストリップ／レイアウト候補 | DOM（`SlideView.tsx`） | `LayoutResult` |
| PNG/PDF書き出し | Canvas 2D（`canvasRenderer.ts` `drawLayout`） | `LayoutResult`（同一） |

文字計測は`TextMeasurer`インタフェースで注入されており、DOM計測（近似）とCanvas計測（`createCanvasMeasurer`、実際の描画に使うものと同一のCanvas APIで計測）の両方を同じ`layoutSlide`に渡せる。これによりレイアウトエンジン自体をDOMなしでユニットテストできる（`layout.test.ts`）。

## データ永続化（IndexedDB）

`src/storage/db.ts`がIndexedDBの薄いラッパーで、`decks`/`assets`の2オブジェクトストアを持つ。`deckRepo.ts`が業務ロジックを提供する。

- デッキ本体（`Deck`）は`assets`配列にメタデータのみを保持し、画像本体（base64）は別ストア(`STORE_ASSETS`)に保存する（`stripAssetData`）。これによりデッキ保存時のペイロードを小さく保つ。
- 編集操作は`scheduleAutosave`により800msデバウンスで自動保存される。
- `exportDeckJson`/`importDeckJson`でJSONバックアップ・共有ができ、インポート時は`schemaVersion`・`Slide.blocks`・`Block`の`type`ごとの必須フィールド・`Asset`の必須フィールドを検証してから取り込む（信頼境界での入力検証）。既存デッキとID衝突時は新しいIDを採番する。

## 画面遷移

ルーターライブラリは使わず、`useScreen`フック（`src/hooks/useScreen.ts`）が`window.history.pushState`/`popstate`を直接扱う。画面状態は`{ name: 'home' } | { name: 'editor'; deckId } | { name: 'present'; deckId; index }`の判別共用体で、`App.tsx`がこれを見て3つの画面コンポーネントを排他的に描画する。予期しないレンダーエラーはトップレベルの`ErrorBoundary`（`App.tsx`）でフォールバックUIに置き換える。

## Capacitor / Androidシェル（Phase 4）

- `capacitor.config.ts`（appId: `com.dokopre.app`, appName: どこでもプレゼン, webDir: `dist`）でWebビルド成果物をそのままAndroid WebViewの読み込み対象にする。`vite.config.ts`の`base: './'`により相対パス参照になっており、`file://`起点のWebView読み込みと整合する。
- `android/`はCapacitor CLIが生成したネイティブGradleプロジェクトで、Web版のビルド成果物（`dist/`）を`npx cap sync android`で`android/app/src/main/assets/public`にコピーして使う。
- ネイティブ機能は3プラグインのみ導入: `@capacitor/screen-orientation`（発表画面の横向き固定、`PresentScreen.tsx`）、`@capacitor/filesystem`・`@capacitor/share`（PNG/PDFの保存・共有、`export/exportPng.ts`の`downloadBlob`）。いずれも`Capacitor.isNativePlatform()`で分岐し、Web版では従来の`<a download>`+Blob URL、画面回転はブラウザのScreen Orientation APIへ委譲する（同プラグインが内部でこれを行う）ため、Web版の挙動は変えていない。
- ビルド手順・この開発コンテナでの実施結果は[build-android.md](./build-android.md)を参照。
