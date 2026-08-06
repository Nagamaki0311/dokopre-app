# 作業履歴

作業内容、実施結果、次回開始位置を記録する。新しいエントリは先頭に追加する（新しい順）。

## 記録フォーマット

```
## YYYY-MM-DD タスクID/概要

### 実施内容
- 何を行ったか

### 結果
- 動作確認結果、テスト結果など

### 次回開始位置
- 次に着手すべき場所（ファイル/関数/タスクID）
```

---

## 2026-08-06 T-003: Phase 1 (MVP) 実装

### 実施内容
- プロジェクト一式を初期化した（`package.json`/`vite.config.ts`/`tsconfig.json`/`index.html`/`.gitignore`）。Node.js 22系（`/opt/node22`）で `npm install` を実施。React + TypeScript + Vite + Vitest + `@fontsource/noto-sans-jp`のみを依存に追加し、状態管理ライブラリ・ルーターは追加していない。
- 自動レイアウトエンジンをD-002の設計どおり`src/layout/`にDOM非依存の純粋関数として実装した: `parse.ts`（`parseText`/`blocksToText`/`blocksToTextWithRanges`/`mergeBlocks`）、`analyze.ts`（キーワード辞書・行の短さ・数値単位による`priority`/`autoEmphasis`付与）、`templates.ts`（`selectTemplate`/`frames`、5テンプレート）、`measure.ts`（`createApproxMeasurer`/`createCanvasMeasurer`/`wrapText`、簡易禁則処理）、`layout.ts`（`layoutSlide`、フォントサイズ二分探索、警告生成）。
- `src/layout/layout.test.ts`にVitestで仕様の(a)〜(e)相当のテスト5件を実装し全て通過を確認した。
- `src/types.ts`にDeck/Slide/Block/Asset/LayoutResult等を仕様どおり定義した。
- `src/render/SlideView.tsx`（DOMレンダラ、絶対配置+scale、マーカーはgradient表現）。仕様のprops`{result, assets, width}`に加え、画像ブロックの`assetId`解決に`blocks`を追加した（LayoutBoxにはblock.idしか持たせない設計のため、呼び出し側から現在のブロック列を渡す必要があった。最小限の逸脱として記録）。
- `src/storage/`にIndexedDBの薄いラッパ（`db.ts`）と`deckRepo.ts`（listDecks/loadDeck/saveDeck/deleteDeck/putAsset/getAsset/exportDeckJson/importDeckJson/scheduleAutosave 800msデバウンス）を実装。デッキ本体にはアセットのメタデータのみを保存し、base64データは別ストアに保持、`exportDeckJson`でのみインライン化する。`importDeckJson`は`schemaVersion`不一致・必須項目欠落を明示的にエラーとして投げる。
- `src/hooks/useScreen.ts`（history.pushStateベースの画面遷移）、`src/hooks/useFontsReady.ts`（`document.fonts.ready`待機）、`src/ui/gestures.ts`（Pointer Eventsによる`useSwipe`/`useLongPress`/`useDoubleTap`）を実装。
- 3画面（`HomeScreen`/`EditorScreen`/`PresentScreen`）を実装。Homeはデッキ一覧+FAB+長押しボトムシート（複製/JSON書き出し/削除）+JSON読み込み。Editorはライブプレビュー(45%)+複数行テキスト入力(45%)+アイコンバー+フィルムストリップ（長押しドラッグ並べ替え、上スワイプ削除、＋追加）。テキスト編集は`mergeBlocks`で再パース後もマーカー/強調をtype+text一致で引き継ぐ近似実装とした。マーカー/強調はtextareaの選択範囲をブロック範囲(`blocksToTextWithRanges`)と突き合わせ、対象ブロック単位で適用する（Block.markerがブロック単位のデータ構造のため、文字単位ではなくブロック単位での適用とした）。PresentScreenは`screen.orientation.lock('landscape')`をtry/catchし、失敗時はCSSの`aspect-ratio`+`100vw`/`100vh`切り替えで16:9フィットする。
- `src/styles.css`にCSS変数トークン（`--bg`/`--fg`/`--muted`/`--accent`/`--sp-1..6`等）を定義し、`prefers-reduced-motion`に対応。`@fontsource/noto-sans-jp`をCDNなしでimportした。

### 結果
- `npm test`（Vitest）: 5 passed。
- `npm run build`（`tsc && vite build`）: 型エラーなくビルド成功。
- Playwright（`/opt/pw-browsers`のChromium、`/opt/node22/lib/node_modules/playwright`を利用）で動作確認:
  1. 新規作成→5行程度のテキスト入力→自動でレイアウトが生成される（見出し+箇条書き、キーワード「結論/理由/課題/まとめ」を含む行が自動強調されボールドになることを確認）。
  2. 画像追加で`imageSide`テンプレートに切り替わり、左カラムにテキスト・右に画像が配置されることを確認。
  3. 発表モードで左右スワイプのページ送り・ダブルタップでのUI表示切替（ページ番号/タイマー/終了ボタンの表示・非表示）を確認。
  4. リロード後もテキスト内容が保持されること、ホーム画面の一覧にデッキが残ること（IndexedDB永続化+800msデバウンス自動保存）を確認。
  5. 長文入力でフォントサイズが最小(24px)まで縮小し`too-much-text`警告バッジが表示されることを確認。
  6. デッキ長押し→ボトムシート→JSON書き出し→書き出したJSONを読み込みでの再インポート（`schemaVersion`検証を含む）が正常に動作することを確認。
- 既知の制約（Phase 2以降で対応想定）: フィルムストリップの並べ替えはPointer Eventsの`pointerenter`ベースの簡易実装で、タッチデバイスでのドラッグ中のpointer captureは未検証（マウスでは動作確認済み）。テキスト編集の`mergeBlocks`はtype+text完全一致での近似的なマーカー/強調引き継ぎのため、同一テキストの行が複数ある場合など稀にマーカーが意図しないブロックに移る可能性がある。

### 次回開始位置
- T-003をレビュー中とした。ReviewerによるレビューでNGが出た場合はEditorScreen/SlideView周りを中心に差し戻し対応する。
- 承認後はT-004（Phase 2: PNG/PDF出力、Canvasレンダラで`LayoutResult`を共有）に着手する。フィルムストリップのタッチドラッグ挙動は実機確認できないため、Phase 4（Capacitor化）後の実機確認時に合わせて再検証する。

---

## 2026-08-06 T-002: 「どこでもプレゼン」実装計画の作成

### 実施内容
- plannerに実装計画作成を委任した。開発コンテナの環境確認（Android SDK/Flutter SDKは未導入、Node.js/JDK21/Gradle 8.14.3は導入済み）を踏まえ、技術スタックをWeb技術（React+TypeScript+Vite）+ Capacitorに決定（D-001）。
- 自動レイアウトエンジンをレンダラ非依存の純粋関数（`layoutSlide(slide, measurer): LayoutResult`）として設計する方針を決定（D-002）。AI補助機能はすべてルールベース/ローカル処理とし、外部LLM APIは使用しない。
- データ構造（Deck/Slide/Block/Asset/LayoutResultのJSONスキーマ）、画面構成（Home/Editor/Present の3画面）、Phase 1〜4の段階的実装計画をplannerが策定した。
- docs/tasks.mdにT-003〜T-006としてPhase 1〜4を追加した。

### 結果
- 計画内容をdocs/decisions.md（D-001, D-002）に記録した。
- 未確定事項（アプリID、マーカー色数、フォント選定はNoto Sans JPを既定採用、2カラム自動提案の強さは「既定自動適用・layoutHintで手動上書き」）はManagerが実装を進めながら妥当な既定値で判断し、大きな仕様変更が必要になった場合のみUserに確認する方針とした。

### 次回開始位置
- T-003（Phase 1 MVP実装）をdeveloperに委任する。docs/decisions.mdのD-001/D-002とplannerが示した詳細な作業手順（プロジェクト初期化→型定義→自動レイアウトエンジン→DOMレンダラ→永続化→3画面→フォント/オフライン対応）に従う。

