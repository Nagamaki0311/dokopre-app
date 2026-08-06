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

## 2026-08-06 T-003: Reviewer指摘の修正対応

### 実施内容
- Reviewer指摘（下記「敵対的検証（差し戻し）」エントリ）の1〜5をすべて修正した。
  1. **Critical**: `src/storage/deckRepo.ts`の`importDeckJson`に`validateSlide`/`validateBlock`/`validateAsset`を追加し、各Slideの`blocks`が配列であること、各Blockの`type`が既知の値（`heading`/`text`/`bullet`/`image`）であり`type`に応じた必須フィールド（`image`は`assetId`、それ以外は`text`）を持つことを検証するようにした。不正なら分かりやすい日本語メッセージで例外を投げる。加えて`src/App.tsx`にReact ErrorBoundary（クラスコンポーネント）を追加し、想定外のレンダー失敗時にエラーメッセージ表示+再読み込みボタンのフォールバックUIを出すようにした（白画面での復旧不能を防止）。
  2. **Medium**: `importDeckJson`で、インポートするデッキの`id`が既存デッキと衝突する場合は`genId('deck')`で新しいidを採番してから保存するようにした（`HomeScreen`の複製処理と同様の挙動。既存デッキの暗黙上書きを防止）。
  3. **Medium**: `src/render/SlideView.tsx`の画像`<img>`の`alt=""`固定をやめ、対応するImageBlockの`block.alt`を参照するよう修正した。`src/screens/EditorScreen.tsx`の`handleAddImage`で、画像追加時のデフォルトaltをファイル名（拡張子除去）から生成するようにし、画像ブロックがある場合のみツールバーに「画像の説明」ボタンを表示し`window.prompt`でalt編集できるようにした（最小限のUI）。
  4. **Low**: `handleAddImage`をtry/catchで囲み、非画像ファイル選択等で失敗した場合に`window.alert`で日本語メッセージを表示するようにした（unhandled rejection解消）。
  5. **Low**: `importDeckJson`の`validateAsset`で各assetが非nullオブジェクトかつ`id`/`mime`を持つことを検証するようにした（`assets: [null]`等で生のTypeErrorが出ないようにした）。
- `src/storage/deckRepo.test.ts`を新規作成し、Vitestで`importDeckJson`の検証パス（blocks欠落/非配列、未知のtype、image用assetId欠落、text欠落、assetsのnull要素、asset必須フィールド欠落、schemaVersion不一致、不正なJSON）9件を追加した。いずれもIndexedDBへ到達する前にバリデーションで例外を投げる経路のため、Node環境（jsdom/IndexedDBモック無し）でも実行可能。

### 結果
- `npm test`: 14 passed（既存5件+新規9件）。
- `npx tsc --noEmit`および`npm run build`: 型エラーなく成功。
- Playwright（`/opt/pw-browsers`のChromium）で`npm run preview`起動後、`blocks`欠落デッキのJSON（`{schemaVersion:1, id, slides:[{id,layoutHint,notes}], assets:[]}`、slideに`blocks`なし）をHome画面の「JSON読み込み」から実際にインポートし、以下を確認した。
  - `window.alert`で「スライド1にblocksがありません。」という日本語エラーが表示される。
  - アプリはクラッシュせずHome画面（「どこでもプレゼン」ヘッダー）に留まり続ける。
- 修正しないと合意した項目（`mergeBlocks`のtype+text完全一致の限界、禁則処理が行頭のみ）は変更していない。

### 次回開始位置
- T-003を「レビュー中」に戻した。reviewerに再レビューを依頼する。承認後はT-004（Phase 2: PNG/PDF出力）に着手する。

---

## 2026-08-06 T-003: Reviewerによる敵対的検証（差し戻し）

### 実施内容
- reviewerにcommit `7997d21`のレビューを委任した。`npm test`/`npm run build`を再実行して成功を確認した上で、以下を指摘した。
  1. **Critical/CONFIRMED**: `importDeckJson`（`src/storage/deckRepo.ts`）がトップレベルの`schemaVersion`/`id`/`slides`/`assets`の型のみ検証し、`Slide.blocks`の存在・型を検証していない。`blocks`欠落デッキを読み込むと`layoutSlide`→`analyze`の`blocks.map`が`TypeError`を投げ、ErrorBoundary不在のためホーム画面ごとクラッシュし続ける（復旧手段なし）。
  2. **Medium/PLAUSIBLE**: JSONインポート時、既存デッキと同一`id`が無警告で上書きされる（データ損失）。
  3. **Medium/CONFIRMED**: `ImageBlock.alt`が型定義上あるが、EditorScreenは常に空文字で生成しUIもなく、`SlideView.tsx`のレンダリングも`block.alt`を参照せず`alt=""`固定（アクセシビリティ欠陥）。
  4. **Low/CONFIRMED**: 画像追加時、非画像ファイル選択でPromise rejectがtry/catchされずunhandled rejectionになる。
  5. **Low/CONFIRMED**: `importDeckJson`の`assets`配列要素の型検証不足（null要素で生のTypeError）。
  6. Low/PLAUSIBLE（`mergeBlocks`のマーカー引き継ぎ誤り）とNit（行末禁則未対応）はMVPとして許容し、既知の制約として記録するに留める。
- T-003を「実装中」に差し戻し、1〜5をdeveloperへ修正依頼する。

### 次回開始位置
- developerに1〜5の修正を依頼する。特に1（Critical）は`importDeckJson`でのSlide/Block構造検証の追加、およびApp.tsxへのErrorBoundary追加の両面対応が必要。

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

