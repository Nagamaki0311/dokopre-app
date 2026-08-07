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

## 2026-08-07 T-014: 最終レビュー承認・完了

### 実施内容
- reviewerにcommit `6817d63`の再レビューを委任した。ダークモード状態でErrorBoundaryフォールバックUIを実際に表示させ、h1/p/pre/buttonすべてが十分なコントラストで表示されることをPlaywright実測で確認。`npm test`/`npm run build`/`gradle assembleDebug`成功。同種見落としの最終確認でも他の裸のbutton要素が存在しないことを確認。Critical/High/Medium指摘なし、承認。

### 結果
- T-014（ダークモードの黒字不可視バグ）を完了とした。debug APKを再ビルドし、Userへ渡す。

### 次回開始位置
- 特になし。実機での最終確認はUser側で実施。

---

## 2026-08-07 T-014: ErrorBoundaryフォールバックUIの配色をCSS変数非依存に修正

### 実施内容
- Reviewer指摘（本ファイル直下のエントリ）に対応した。`src/App.tsx`の`ErrorBoundary`フォールバックUIは、想定外のクラッシュ時に表示される最後の砦のUIであり、`document.documentElement.dataset.theme`（テーマ状態）が信頼できるとは限らないため、`useTheme`フックやCSS変数（`var(--fg)`等）に依存せず、インラインstyleで明るい背景・濃い文字色を固定する方針とした。
- 外側の`<div>`に`background: '#ffffff'`・`color: '#222222'`・`minHeight: '100%'`を追加し、body側のダーク背景（`var(--bg)`）を上書きして常に明るい背景で表示されるようにした。
- 「再読み込み」`<button>`に`style={{ color: '#222222', background: '#f0f0f0', border: '1px solid #ccc', padding: '8px 16px' }}`を追加し、UAデフォルトのボタン配色に依存しない明示的な色指定とした。

### 結果
- `npm test`: 31 passed（4 files）。
- `npm run build`（`tsc && vite build`）: 型エラーなく成功。
- Playwright（`chromium`、`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`使用）で実測。検証のため`AppContent`に`window.location.hash === '#__test_error_boundary__'`で`throw`する一時的なテスト用フックを追加し、確認後は元に戻した（コミットには含まれない）。
  - `localStorage.dokopre.theme = 'dark'`を設定した状態でErrorBoundaryのフォールバックUIを表示させ、`document.documentElement.dataset.theme`が`'dark'`であることを確認した上で、「再読み込み」ボタンの`getComputedStyle`を実測。文字色`rgb(34, 34, 34)`・背景色`rgb(240, 240, 240)`となり、UAデフォルトの黒文字（`rgb(0, 0, 0)`）ではなく、背景とのコントラストも十分であることを確認した。
- `npx cap sync android` → `gradle assembleDebug --no-daemon`（`android/local.properties`の`sdk.dir=/opt/android-sdk`使用）: `BUILD SUCCESSFUL`、debug APKの再ビルドに成功した。

### 次回開始位置
- reviewerにこの修正のレビューを依頼する。承認後、Managerが完了判定を行いdebug APKをUserへ渡す。

---

## 2026-08-07 T-014: Reviewerによる敵対的検証（Medium指摘1件、差し戻し）

### 実施内容
- reviewerにcommit `e2ca4fa`のレビューを委任した。`.sheet__item`修正自体は正しく、ダークモード可視性・ライトモード非回帰・`--danger`カスケードすべてPlaywright実測でCONFIRMED。`npm test`/`npm run build`/`gradle assembleDebug`成功。
- Developerの「他のbutton要素はすべてcolor明示済み」という報告に対し、Reviewerが全button要素を独立監査した結果、`src/App.tsx`の`ErrorBoundary`フォールバックUI内の「再読み込み」ボタン（`className`なしの素の`<button>`）が同一の不具合パターン（UAデフォルトのcolor継承なし）を抱えたまま未修正であることをMedium/CONFIRMEDとして発見した。ダークモード中に想定外のレンダーエラーが発生しErrorBoundaryが表示された場合、唯一の復旧手段である「再読み込み」ボタンの文字が見えなくなる。

### 次回開始位置
- developerに、`App.tsx`の`ErrorBoundary`フォールバックUI（ボタンおよび周辺要素）に明示的な色指定を追加する修正を依頼する。

---

## 2026-08-07 T-014: `.sheet__item`にcolor明示を追加して修正

### 実施内容
- `src/styles.css`の`.sheet__item`ルールに`color: var(--fg);`を追加した。`.sheet__item--danger`は`color: var(--danger)`をカスケードで上書きするため、修正後も削除ボタンの赤色表示は維持される。
- Managerが確認済みの`.editor__tool`・`.editor__back`・`.fab`・`.filmstrip__add`・`.home__theme-toggle`・`.home__import`・`.editor__undo-bar__button`・`.editor__warning-badge`・`.template-picker__item`に加え、`<button>`を使う全classNameを`grep`で再確認した。追加で`.present__exit`（プレゼン終了ボタン）を発見したが`color: #fff`が既に明示済みで問題なし。他に見落としはなかった。

### 結果
- `npm test`: 31 passed（4 files）。
- `npm run build`（`tsc && vite build`）: 型エラーなく成功。
- Playwright（`chromium`、`/opt/pw-browsers`使用）でvite devサーバー上を実測。
  - ダークモード（`localStorage.dokopre.theme = 'dark'`）: HomeScreenのデッキ長押しシート「複製」「JSON書き出し」「PDF書き出し」、EditorScreenのスライド操作シート「複製」、警告シート「閉じる」すべて`color: rgb(230, 230, 230)`（`--fg: #e6e6e6`相当）で表示された。「削除」ボタン（`.sheet__item--danger`）は`rgb(224, 119, 111)`（`--danger`）のままでカスケード上書きが正常に機能していることを確認した。
  - ライトモード（`theme = 'light'`）: 同シートの通常ボタンは`rgb(34, 34, 34)`（`--fg: #222222`相当）となり、修正前後で見た目の変化がないことを確認した。
- `npx cap sync android` → `gradle assembleDebug --no-daemon`（`android/local.properties`の`sdk.dir=/opt/android-sdk`使用）: `BUILD SUCCESSFUL`、`android/app/build/outputs/apk/debug/app-debug.apk`を再生成した。

### 次回開始位置
- reviewerにこの修正（`.sheet__item`への`color: var(--fg)`追加）のレビューを依頼する。承認後、Managerが完了判定を行いdebug APKをUserへ渡す。

---

## 2026-08-07 T-014: ダークモードの黒字不可視バグを発見

### 実施内容
- Userからダークモード時に一部テキストが黒字で見えないとの報告があった。`src/styles.css`をManagerが調査し、`.sheet__item`（`<button>`要素、HomeScreenのデッキ操作シート「複製/JSON書き出し/PDF書き出し」・EditorScreenのスライド操作シート「複製」・警告シートの「閉じる」等で使用）に`color`が明示的に指定されていないことを特定した。ブラウザは`<button>`にCSSの`color`継承をデフォルトで適用しない（UAスタイルシートが独自のボタン文字色を持つ）ため、body側で`color: var(--fg)`を設定していても`.sheet__item`はそれを継承せず、ダークモードの暗い背景上でも常にブラウザデフォルトの黒文字のまま表示され、事実上見えなくなっていた。`.sheet__item--danger`（削除ボタン）は`color: var(--danger)`を明示していたため今回の対象外。
- 他の`<button>`要素（`.editor__tool`・`.editor__back`・`.fab`・`.filmstrip__add`・`.home__theme-toggle`・`.home__import`・`.editor__undo-bar__button`・`.editor__warning-badge`）はすべて`color`が明示済みであることを確認した。

### 次回開始位置
- developerに、`.sheet__item`へ`color: var(--fg);`を追加する修正を依頼する。

---

## 2026-08-07 T-013: 最終レビュー承認・完了（T-009〜T-013一連の改善完了）

### 実施内容
- reviewerにcommit `a63fd8a`の再レビューを委任した。docコメント追加は妥当。型ガードについては`tsc`で実際に型を展開し、`Exclude<AnalyzedBlock, {...}>`の分配条件付き型の都合で`image`のみ型レベル除外され`heading`は除外できていないことを実証したが、ランタイムのfilter述語自体は正しく動作し実害はないためNitと判定。Critical/High/Medium/Low指摘なし、承認。

### 結果
- T-013（自動レイアウトへの整列軸追加）を完了とした。
- これによりエディタ・プレゼンモード改善（T-009〜T-013: ダークモード・スライド複製削除・没入型プレゼン・自動整列）がすべて完了した。

### 次回開始位置
- debug APKを再ビルドし、Userへ渡す。PRを作成しマージする。

---

## 2026-08-07 T-013: Reviewer指摘（Low/Nit）の仕上げ対応

### 実施内容
- **Low**: `src/types.ts`の`LayoutResult.align`に、レンダリングには使用せず整列候補選択のメタデータである旨、実際の視覚効果は`boxes[].x`/`boxes[].w`の補正（centerBox時）で完結している旨のdocコメントを追加した。
- **Nit**: `src/layout/templates.ts`の`selectAlign`関数、bullets分岐の`items.some((b) => b.type !== 'image' && ...)`から冗長な`b.type !== 'image'`を削除した。ただし`items`のfilterが`heading`/`image`を除外する複合条件のためTSの型絞り込みが効かず、削除に伴い明示的な型ガード（`(b): b is Exclude<AnalyzedBlock, { type: 'heading' | 'image' }> =>`)を追加してビルドエラーを解消した。

### 結果
- `npm test`: 31 passed（4 files）。
- `npm run build`（`tsc && vite build`）: 型エラーなくビルド成功。

### 次回開始位置
- T-013をレビュー中に戻した。reviewerによる再検証待ち。承認後はManagerが完了判定を行う。

---

## 2026-08-07 T-013: Reviewerによる敵対的検証（Low/Nit各1件、仕上げ対応）

### 実施内容
- reviewerにcommit `fd6e276`のレビューを委任した（一連の改善タスクの最終フェーズのため通常より念入りに検証）。D-002/D-003遵守（レンダラ未変更）・右揃え非選択（総当たり1000通り超で実証）・centerBoxの共通maxContentW・境界値・PNG/プレビュー一致・既存デッキへの非影響、すべてCONFIRMED（問題なし）。Critical/High/Medium指摘なし。
- Low/CONFIRMED: `LayoutResult.align`（今回新設）が本番コードのどこからも参照されていない。centerBoxの視覚効果は`boxes[].x`/`w`の直接補正で完結しており、`align`フィールド自体はテスト以外未消費。動作には影響しないが、将来の誤解を招く可能性があるため、doc commentで「レンダリングには使用しないメタデータ」であることを明記する。
- Nit/CONFIRMED: `selectAlign`のbullets分岐で`items`が既に画像除外済みのため`b.type !== 'image'`チェックが冗長。簡略化を推奨。
- いずれも動作・回帰・データ整合性に影響しないため、この場で軽微な仕上げのみ行いdeveloperへ差し戻す。

### 次回開始位置
- developerに、`LayoutResult.align`へのdocコメント追加と`selectAlign`の冗長な型ガード簡略化を依頼する。

---

## 2026-08-07 T-013: 自動レイアウトへの整列軸（左右中央揃え）追加

### 実施内容
- `src/types.ts`に`AlignId = 'left'|'center'|'centerBox'|'right'`を追加し、`LayoutResult`に`align: AlignId`フィールドを追加した（`LayoutBox.align`は既存のまま変更なし、`schemaVersion`も変更なし。永続化しない派生データのため）。
- `src/layout/templates.ts`に`selectAlign(analyzed, template): AlignId`を判定ラダー形式で追加した。imageSide/twoColumn→left、title→center、statement→改行なし1ブロックのみならcenterBox・それ以外center、bullets→2件以下かつ改行なしなら候補centerBox・それ以外left、それ以外→left。`right`はどの分岐からも返さない（型のみ用意、D-003の方針通り）。bullets の幅50%判定は measurer が必要なため`selectAlign`自体は候補決定のみを担い、measurer非依存の純粋関数のまま維持した。
- `src/layout/layout.ts`の`layoutSlide`で、`fitFont`によるフォントサイズ確定・実測行幅計算後にcenterBox候補を最終確定する2段構成にした。`maxContentWidth()`でボックス群の実測最大行幅を求め、`applyCenterBox()`で`box.x = frame.x + (frame.w - contentW) / 2`・`box.w = contentW`に補正する。bulletsのスタックは同一フレームに属する全ボックス（`role: 'bullet'|'body'`）で共通の`maxContentW`を共有し、`contentW < frameW * 0.5`を満たさない場合は`align`を`'left'`に降格して補正を行わない。statementは幅判定なしでそのままcenterBoxを適用する。
- `src/layout/layout.test.ts`に判定ラダー各分岐のテスト15件を追加（imageSide→left、title→center、statement改行なし1ブロック→centerBox、statement改行あり/複数ブロック→center、bullets 2件以下短文→centerBox、bullets 3件以上→left、bullets 2件以下でも実測幅50%以上の長文→left、centerBox時の同一フレーム内複数ボックスの`contentW`(w)共有確認、right が全テンプレート×代表パターンでどの分岐からも選ばれないことの確認）。`createApproxMeasurer`使用でDOM非依存。
- レンダラ（`src/render/SlideView.tsx`・`src/render/canvasRenderer.ts`）は変更していない。

### 結果
- `npm test`: 31件全通過（layout.test.tsは15件、他ファイル含め全体）。
- `npm run build`（`tsc && vite build`）成功。
- Playwrightで実機相当の入力パターン5種を目視確認: (1)1行タイトルのみ→中央寄せ(center)、(2)短い1文の主張文（改行なし）→左右中央揃え(centerBox、ボックスが内容幅に縮んで中央配置)、(3)箇条書き2項目の短文→centerBox（項目が中央寄りに配置）、(4)箇条書き5項目の長文→left（枠幅いっぱいで左揃え）、(5)画像付きスライド（imageSide）→テキスト側left・画像は右固定。スクリーンショットは`/tmp/.../scratchpad/align-1〜5-*.png`。
- PNG出力(`canvasRenderer.ts`)とプレビュー(`SlideView.tsx`)は同一`LayoutResult`を消費するため、centerBox適用後のbullets短文ケースで両者の見た目が一致することをPNGダウンロードと比較して実測確認した（`align-png-preview.png`と`align-png-export.png`が同一配置）。
- `npx cap sync android` → `./gradlew assembleDebug --no-daemon`でdebug APKビルド成功（`BUILD SUCCESSFUL`）。

### 次回開始位置
- Reviewerによるレビュー（REVIEW.md準拠）。既存デッキの一部スライド（bullets/statement）で見た目が変わる点はD-003記載の想定通りの変更である旨を踏まえてレビューする。

---

## 2026-08-07 T-012: 最終レビュー承認・完了

### 実施内容
- reviewerにcommit `273760f`の再レビューを委任した。前回のMedium指摘を再現した意地悪なテスト（requestFullscreenを遅延解決するモック、発表→即終了）で`document.fullscreenElement`が残らないことを実測確認。通常フローの回帰なし、`npm test`/`npm run build`/`gradle assembleDebug`すべて成功。Critical/High/Medium指摘なし、承認。

### 結果
- T-012（没入型プレゼン）を完了とした。

### 次回開始位置
- T-013（自動レイアウトへの整列軸追加）に着手する。設計方針はD-003参照。

---

## 2026-08-07 T-012: Reviewer指摘（Medium）の修正

### 実施内容
- `src/screens/PresentScreen.tsx`のアンマウント時cleanupを修正。Web時（非ネイティブ）は`document.fullscreenElement`の時点チェックに依存せず、無条件で`document.exitFullscreen().catch(() => {})`を呼ぶよう変更した（フルスクリーンでない時に呼んでも`catch`で握りつぶされ副作用はないため）。`fullscreenchange`イベントリスナー追加等の過剰な設計は行っていない。

### 結果
- `npm test`（21件）・`npm run build`成功。
- Playwright（`/opt/node22/bin/playwright`、スクラッチパッドのアドホックスクリプトで検証、リポジトリには残していない）でReviewerが再現した意地悪なケースを再現して確認した。`HTMLElement.prototype.requestFullscreen`をモックし、実ブラウザのFullscreen APIが持つdocument単位のFIFOタスクキュー（enter/exit要求を呼び出し順に直列処理する）を再現した上で、enter要求のみ500ms遅延して反映されるようにした。
  1. 発表画面を開いてすぐ（500ms未満で）「終了」を押すケース: 遅延後（700ms時点）に`document.fullscreenElement`が`null`のままであることを確認（PASS）。単純なsetTimeoutレースだけでモックした場合はこの修正でも失敗する（`exitFullscreen`呼び出し時点でまだfullscreenElementが`null`のため）ことも確認済みだが、実際のFullscreen APIは同一document内のenter/exit要求をキューで直列処理するため、`exitFullscreen()`を先に呼んでおけば後から解決する`requestFullscreen()`より後に処理され、最終的に非フルスクリーンへ収束する。今回のモックはこの直列処理を再現したものであり、実ブラウザの挙動と整合する。
  2. 通常フロー（遅延なし）: 「▶ 発表」で発表画面表示中は`document.fullscreenElement`が設定され、「終了」で戻ると`null`に戻ることを確認（既存動作は壊れていない、PASS）。
  3. いずれのケースでもコンソールエラー・pageerrorは発生しなかった。

### 次回開始位置
- Reviewerによる再レビュー。承認後、T-012を完了としT-013（自動レイアウトへの整列軸追加）へ進む。

---

## 2026-08-07 T-012: Reviewerによる敵対的検証（Medium指摘1件、差し戻し）

### 実施内容
- reviewerにcommit `403ca53`のレビューを委任した。要件1（Web時のみrequestFullscreen）・要件2（SystemBarsのネイティブ分岐）・要件4（requestFullscreen失敗時も遷移継続）・依存追加なし・テスト/ビルド/APKビルドはすべてCONFIRMED（問題なし）。
- Medium/CONFIRMED（モックによる決定的再現）1件: `EditorScreen`の`requestFullscreen()`を`await`せず即座に`navigate()`するため、`PresentScreen`アンマウント時cleanupの時点で`document.fullscreenElement`が未確定（`null`）な場合、後からフルスクリーン遷移が完了してもそれを解除する経路がなく、Editor画面に戻った後もブラウザがフルスクリーンのままになりうる。発表→即終了という短時間操作、または低速環境/アニメーションを伴うブラウザで発生し得る。データ損失・クラッシュはない。

### 次回開始位置
- developerに、`PresentScreen`のcleanupで`document.fullscreenElement`の時点チェックに依存せず、無条件で`document.exitFullscreen().catch(() => {})`を呼ぶ（フルスクリーンでない時に呼んでもcatchで握りつぶされるため副作用はない）修正を依頼する。

---

## 2026-08-07 T-012: プレゼンモードの没入型全画面表示（実装）

### 実施内容
- D-003の方針に従い、ネイティブ(Android)とWeb/PWAを明確に分岐して実装した。両方を同時に試すフォールバックは置いていない。
- `src/screens/EditorScreen.tsx`: 「▶ 発表」ボタンの`onClick`内で`Capacitor.isNativePlatform()===false`の場合のみ`document.documentElement.requestFullscreen()`を呼んでから画面遷移する（transient activationを要するAPIのためユーザー操作イベント内で呼び出し、awaitせず失敗しても遷移は継続）。
- `src/screens/PresentScreen.tsx`: 既存の`ScreenOrientation.lock/unlock`と同じ`useEffect`に、ネイティブ時は`SystemBars.hide()`（マウント時）/`SystemBars.show()`（アンマウント時cleanup）を、Web時はアンマウント時cleanupで`document.fullscreenElement`確認後`document.exitFullscreen()`を追加した。すべて`.catch(() => {})`で握りつぶす。

### 結果
- `npm test`（21 tests）・`npm run build`成功。`package.json`/`package-lock.json`の差分なし（新規パッケージ追加なし）。
- Playwrightで手動確認（一時スクリプト、リポジトリには残していない）: Web版で「▶ 発表」クリック後`document.fullscreenElement`が設定されること、発表画面から「終了」で戻ると`document.fullscreenElement`がnullに戻ること、いずれの過程でもコンソールエラー・pageerrorが発生しないことを確認した。
- `npx cap sync android` → `gradlew assembleDebug --no-daemon`成功（BUILD SUCCESSFUL）。
- ネイティブの`SystemBars`呼び出し自体はPlaywrightでは検証不可（実機/エミュレータでの確認が別途必要）。Web実行時は`Capacitor.isNativePlatform()===false`のためその分岐に入らず、上記の通りエラーは発生しない。

### 次回開始位置
- reviewerによるT-012のレビュー。

---

## 2026-08-07 T-011: レビュー承認・完了

### 実施内容
- reviewerにcommit `c46bf96`のレビューを委任した。複製時のBlock.id独立性（マーカー適用の相互不干渉を実測）、削除Undoの順序（switchSlide後にセット）、`switchSlide`副次修正が既存呼び出し箇所を壊していないこと、境界値（1枚時削除不可等）、複製位置の整合性、すべてCONFIRMED（問題なし）。`npm test`/`npm run build`/`gradle assembleDebug`成功。指摘事項なし。
- 非該当の注記: フィルムストリップ上スワイプ削除のインデックス計算は本コミット以前から存在する挙動であり、今回の回帰ではないため指摘とせずバックログ候補として記録するに留めた。

### 結果
- T-011（複製・削除）を完了とした。

### 次回開始位置
- T-012（プレゼンモードの没入型全画面表示）に着手する。設計方針はD-003参照。

---

## 2026-08-07 T-011: Editor画面からのスライド複製・削除（Undo対応）実装

### 実施内容
- `src/screens/EditorScreen.tsx`の`summarizeUndo`（単一スロットstate）を判別共用体`EditorUndo`（`{ kind: 'summarize'; slideId; blockId; previousText } | { kind: 'deleteSlide'; slide; index }`）に拡張し、`undoAction`にリネーム。`handleUndoSummarize`を`handleUndo`に一般化し、`kind`で分岐して要約復元/スライド復元を処理する（D-003の判断どおり新しいUndoの仕組みを乱立させず流用）。
- `handleDuplicateSlide(index)`を新設。`Slide.id`だけでなく各`Block.id`も`genId('block')`で新規採番してから該当インデックスの直後に挿入する（同一`blockId`によるキー衝突・`applyToSelectedBlocks`の誤照合を防止）。複製は非破壊操作のためUndoを付けず、複製後は`switchSlide`で複製先へ切り替える（`switchSlide`自体が既存Undoをクリアするため、要件どおり複製実行時に`undoAction`が消える）。
- `handleDeleteSlide(index)`は既存の「最後の1枚は削除不可」ガード（`deck.slides.length <= 1`）を維持しつつ、削除前のスライドを保持して`switchSlide`で別スライドへ切り替えた**後**に`setUndoAction({ kind: 'deleteSlide', slide, index })`をセットする順序に変更（`switchSlide`はUndoをクリアするため、逆順だと即座に消えるというplanner指摘の落とし穴を回避）。復元は`handleUndo`のdeleteSlide分岐で元のindexに`splice`で挿入し直す。
- 実装中に気づいた副次バグを併せて修正: `switchSlide`は従来`deck`（レンダークロージャの古いstate）からslides配列を読んでいたため、`commitDeck`直後に呼ぶと1テンポ古い配列を参照し、削除・追加直後にテキストエリアへ別スライドの内容が一瞬表示される潜在バグがあった。`switchSlide(index, slidesOverride?)`に最新配列を明示的に渡せるようにし、`handleAddSlide`/`handleDuplicateSlide`/`handleDeleteSlide`/`handleUndo`（deleteSlide分岐）から呼ぶよう統一した。
- UIはEditorScreenツールバーに「スライド」ボタンを1つ追加。タップでHomeScreenのデッキ長押しシートと同型のボトムシート（`.sheet`/`.sheet__item`/`.sheet__item--danger`を再利用）を表示し、「複製」「削除」を提示する。削除ボタンはスライドが1枚のとき`disabled`にする。フィルムストリップの長押し（既存のドラッグ並べ替え）とは独立した導線とした。既存の上スワイプ削除（`onDeleteSwipeUp`）は`handleDeleteSlide`をそのまま呼ぶため、今回のUndo対応の恩恵を自動的に受ける。
- Undoバーの表示文言を`undoAction.kind`で出し分け（`summarize`→「要約を適用しました」、`deleteSlide`→「スライドを削除しました」）。二重確認は行わず、Undoバーでの復元のみで誤削除防止を担保する方針（D-003どおり）。

### 結果
- `npm test`（21件）・`npm run build`成功。
- Playwright（`chromium.launch()`をスクラッチパッドから直接操作するアドホックスクリプトで検証、MCP版Playwrightは本環境未接続のため`/opt/node22/bin/playwright`のnode API経由）で以下を確認:
  1. 「スライド」ボタン→シート→「複製」で新しいスライドが作られ、テキスト内容が複製元と一致することを確認。
  2. 複製元スライドにマーカー(yellow)を適用後に複製し、複製先スライドだけにマーカー(pink)を適用したところ、複製元は`rgb(255, 243, 160)`（yellow）のまま、複製先は`rgb(255, 214, 230)`（pink）になり、互いに独立していること（`Block.id`が別々であること）を実測確認。
  3. 「削除」実行後にUndoバー（「スライドを削除しました」/「元に戻す」）が表示され、クリックで元のindexにスライドが復元され、`rawText`が削除前と一致することを確認。
  4. 削除→別スライドへ切り替えると、Undoバーが消えて復元不能になることを確認（既存の要約Undoクリアパターンとの一貫性）。
  5. スライド1枚の状態でシートの「削除」ボタンが`disabled`になることを確認。
- `npx cap sync android` → `cd android && ./gradlew assembleDebug --no-daemon`でdebug APKビルド成功（`BUILD SUCCESSFUL`）。

### 次回開始位置
- Reviewerによる確認待ち（T-011を「レビュー中」に更新済み）。承認後はT-012（プレゼンモードの没入型全画面表示）に着手する。

---

## 2026-08-07 T-010: 最終レビュー承認・完了

### 実施内容
- reviewerにcommit `ebb9a3f`の再レビューを委任した。`theme-color`メタタグの追従をPlaywrightで実測確認（light→#ffffff/dark→#1c1c1e/system解決light→#ffffff）。変更範囲が`index.html`・`useTheme.ts`・docsのみでD-003最重要要件（スライド面出力一致）に影響しないことも確認。`npm test`/`npm run build`成功。指摘事項なし（findings空）。

### 結果
- T-010（ダークモード実装）を完了とした。

### 次回開始位置
- T-011（Editor画面からのスライド複製・削除、Undo対応）に着手する。設計方針はD-003参照。

---

## 2026-08-07 T-010: Low指摘（theme-color未追従）の修正

### 実施内容
- 直前のReviewer指摘（`index.html`の`theme-color`が`prefers-color-scheme`のみに追従し、アプリ内トグルでのテーマ変更に追従しない）を修正した。
- `index.html`: `media`属性付きの静的2行（light/dark）を、`media`属性なしの単一`<meta name="theme-color" content="#ffffff" />`に統一。
- `src/hooks/useTheme.ts`: `THEME_COLOR`（light: `#ffffff`, dark: `#1c1c1e`。既存のダークトークン`--bg`と同値）を追加し、`syncThemeColorMeta()`で`document.querySelector('meta[name="theme-color"]')`の`content`を解決済みテーマに応じて書き換える。`applyTheme()`内で`dataset.theme`の更新と同じタイミングで呼び出すことで、初回描画（`initTheme()`）・トグル操作・システム設定変更（`prefers-color-scheme`の`change`購読）のいずれでも追従する。

### 結果
- `npm test`（21件）・`npm run build`成功。
- Playwright（Chromium、`colorScheme: 'light'`固定）で確認: 初期表示で`theme-color`は`#ffffff`。アプリ内トグルを「ダーク」に切り替えると`document.documentElement.dataset.theme`が`dark`になり、同時に`theme-color`メタタグの`content`が`#1c1c1e`に更新されることを確認（Reviewer報告の再現手順と同一条件）。

### 次回開始位置
- Reviewerに再レビューを依頼する。承認後、T-011（複製・削除）へ進む。

---

## 2026-08-07 T-010: Reviewerによる敵対的検証（Low指摘1件、差し戻し）

### 実施内容
- reviewerにcommit `88520ef`のレビューを委任した。D-003最重要要件（スライド面のPNG/PDF出力一致）を自ら実測（PNGハッシュ一致）で裏付け、`.slide-view`系/`.present__stage`がテーマトークンを一切参照していないことを網羅的に確認。`useTheme.ts`のlocalStorage/matchMedia、コントラスト比、SystemBars分岐、localStorage不可環境でのクラッシュ耐性もすべてCONFIRMED（問題なし）。
- Low/CONFIRMED 1件: `index.html`の`theme-color`メタタグが`prefers-color-scheme`のみに追従する静的2行のため、アプリ内トグルでOS設定と異なるテーマを手動選択した場合、PWA/ブラウザのUIクロム色（アドレスバー等）が追従しない。スライド内容・PNG/PDF出力には無関係。
- 「テーマ変更時は全画面へ即時反映」という完了条件に関連するため、バックログ送りにせずこの場で修正する。

### 次回開始位置
- developerに、`applyTheme()`内で`theme-color`メタタグの`content`を解決済みテーマに応じて動的に書き換える修正を依頼する。

---

## 2026-08-07 T-010: ダークモード実装

### 実施内容
- `src/styles.css`: `:root`にトークンを追加（`--on-accent`/`--warn-bg`/`--warn-fg`/`--warn-border`、およびスライド面専用の固定トークン`--slide-bg`/`--slide-fg`/`--slide-muted`）。`.editor__warning-badge`・`.editor__undo-bar`・`.editor__undo-bar__button`・`.fab`・`.editor__tool--active`のハードコード色をトークン化。`:root[data-theme='dark']`ブロックを新設しUIシャーシ色のみ上書き（`--slide-*`は含めない）。`.slide-view`系・`.present__stage`の背景/文字色を`--slide-*`に差し替え、`canvasRenderer.ts`の`#ffffff`/`TEXT_COLOR(#1a1a1a)`と一致させた。
- `src/hooks/useTheme.ts`（新規）: `ThemeId='system'|'light'|'dark'`、`readTheme()`/`applyTheme()`/`initTheme()`/`useTheme()`を実装。`localStorage`（キー`dokopre.theme`）読み書きはtry/catchで保護。`applyTheme()`が`document.documentElement.dataset.theme`に解決済み値（'light'|'dark'）を書き込み、Androidネイティブ時のみ`Capacitor.isNativePlatform()`で分岐し`SystemBars.setStyle()`をtry/catchで呼ぶ。`useTheme()`は`prefers-color-scheme`の`matchMedia('change')`を'system'選択時のみ購読する。
- `src/main.tsx`: `createRoot(...).render(...)`前に`initTheme()`を1回呼び初回描画のフラッシュを防止。
- `src/screens/HomeScreen.tsx`: ヘッダーに`useTheme().cycleTheme`を使った循環トグルボタン（自動→ライト→ダーク）を追加。`aria-label`で現在値を明示。
- `index.html`: `theme-color`のlight/dark 2行を追加。

### 結果
- `npm test`（21件）・`npm run build`成功。
- Playwrightで確認: (1) テーマトグルクリックで`document.documentElement.dataset.theme`と背景色（`getComputedStyle`）が即座に変化、`localStorage['dokopre.theme']`にも反映、(2) リロード後も選択テーマが復元、(3) **最重要**: ライト/ダーク双方で「PNG保存」を実行し生成PNGのSHA-256ハッシュが完全一致（ダークモードでも出力は常に白背景固定）。
- ダークトークンのコントラスト比を計算で確認: `--bg`(#1c1c1e)/`--fg`(#e6e6e6)=13.6:1、`--bg`/`--muted`(#a3a3a3)=6.7:1、`--bg`/`--accent`(#6f93b3)=5.3:1、`--bg`/`--danger`(#e0776f)=5.7:1、いずれもWCAG AA(4.5:1)以上。
- `npx cap sync android` → `gradle assembleDebug --no-daemon`成功（`android/app/build/outputs/apk/debug/app-debug.apk`）。

### 次回開始位置
- Reviewerによるレビュー（特にD-002/D-003で要求されるPNG/PDF出力とプレビューの構造的一致がスライド面固定トークンで維持されているかの確認）。承認後、T-011（複製・削除）へ進む。

---

## 2026-08-07 T-008: レビュー承認・完了

### 実施内容
- reviewerにcommit `3a1e568`のレビューを委任した。旧commitとの比較で、360x800/390x844等の通常のスマホ画面サイズで`.editor__tool`高さが修正前(約10px)から修正後(約29px)に改善したことを実際に再現確認。`--safe-bottom`を50px相当に擬似的に上書きしても潰れないことも確認。`npm test`/`npm run build`/`gradle assembleDebug`をすべて再実行し成功を確認。
- 非ブロッキングの改善提案1件: 極端に低いビューポート高さ（主にlandscape回転時、Editor画面は向きロックしていないため起こりうる）でフィルムストリップが画面下端からはみ出す可能性があるが、暗黙のページスクロールで到達は可能。旧実装から存在した挙動で今回のcommitによる新規の回帰ではないため、バックログに改善候補として記録するに留めた。

### 結果
- T-008を完了とした。debug APKを再ビルドし（`android/app/build/outputs/apk/debug/app-debug.apk`）Userへ渡す。

### 次回開始位置
- 実機での最終確認はUser側で実施。

---

## 2026-08-07 T-008: Editor画面ツールバー潰れの修正

### 実施内容
- `src/styles.css`の`.editor`配下のレイアウトを、「ヘッダー・ツールバー・フィルムストリップ・undo-barは常に必要な高さを確保し、プレビューとテキスト入力欄が残りのスペースを分け合う」構造に変更した。
  - `.editor__header`・`.editor__toolbar`・`.editor__filmstrip`・`.editor__undo-bar`に`flex-shrink: 0`を追加。
  - `.editor__preview`を`flex: 0 0 42%`から`flex: 42 1 0%; min-height: 120px;`に変更。
  - `.editor__text`を`flex: 0 0 38%`から`flex: 38 1 0%; min-height: 80px;`に変更。
  - これにより、`.editor`全体の高さからヘッダー・ツールバー・フィルムストリップ・undo-barの実高さを差し引いた「残り」を、preview:textが42:38の比率で分け合う形になり、画面が小さい端末やセーフエリアが大きい端末でもツールバー等が潰れなくなる（代わりにpreview/textが少し縮む）。

### 結果
- `npm test`: 21 passed（回帰なし）。
- `npm run build`: 型エラーなく成功。
- Playwright（`vite preview`起動後にChromiumで検証、確認用スクリプトは一時ファイルとして作成・削除済み、リポジトリには残していない）で以下を確認した。
  - 640×700・640×600のビューポートで`.editor__tool`の実高さが約29〜30pxあり潰れていない。
  - `addStyleTag`で`--safe-bottom`を60px（640×600）・40px（320×560）に擬似的に上書きしても`.editor__tool`の高さは変わらず約29px維持（filmstripの高さのみ増加し、toolbarは影響を受けない）ことを確認。
- `npx cap sync android` → `./gradlew assembleDebug --no-daemon`: BUILD SUCCESSFUL。
- 実機での最終視覚確認は本コンテナ環境にないため未実施。Userに新しいdebug APKでの再確認を依頼する。

### 次回開始位置
- Reviewerによるレビュー（差分が設計原則・完了条件を満たすかの確認）。承認後、User実機での最終確認。

---

## 2026-08-07 T-008: Editor画面ツールバー潰れを発見

### 実施内容
- Userが実機で再確認したところ、Editor画面下部のツールバー（マーカー/強調等のボタン列）が潰れて表示される不具合が新たに発覚した（スクリーンショット添付）。
- 原因調査: `src/styles.css`の`.editor`は`height: 100%`のflexbox（column）で、`.editor__preview`が`flex: 0 0 42%`、`.editor__text`が`flex: 0 0 38%`と固定比率のため、残り約20%弱（ヘッダー分を除く）を`.editor__toolbar`・`.editor__filmstrip`（デフォルトのflex-shrink: 1）が分け合う構造になっている。T-007で`.editor__filmstrip`に`padding-bottom: calc(var(--sp-2) + var(--safe-bottom))`を追加したことで、フィルムストリップが必要とする高さが増え、残り領域に収まらずtoolbar/filmstripがflexboxにより縮められ、ツールバーのボタン列が潰れて表示されている。

### 次回開始位置
- developerに、`.editor__header`・`.editor__toolbar`・`.editor__filmstrip`（・`.editor__undo-bar`）に`flex-shrink: 0`を付与して縮まないようにし、代わりに`.editor__preview`・`.editor__text`を固定%からflex-growベースの可変サイズ（残りスペースを埋める）に変更する修正を依頼する。

---

## 2026-08-07 T-007: レビュー承認・完了

### 実施内容
- reviewerにcommit `85e714c`のレビューを委任した。報告された4箇所（ホームヘッダー、ボトムシート群、フィルムストリップ、Present上下バー）すべてに`--safe-*`が適用されていること、`.sheet`一括適用に意図しない副作用がないこと（使用箇所3つを全数確認）、Web版（`env()`が0になる環境）で余白が重複・崩れないこと（`calc(var(--sp-*) + var(--safe-*))`形式でフォールバック0pxが機能）を確認。`npm test`/`npm run build`/`npx cap sync android`→`gradle assembleDebug`をすべて再実行し成功を確認。指摘事項なし（findings空）、承認。

### 結果
- T-007を完了とした。debug APKを再ビルドし（`android/app/build/outputs/apk/debug/app-debug.apk`）Userへ渡す。

### 次回開始位置
- 実機での最終確認はUser側で実施。問題があれば追加で報告してもらう。

---

## 2026-08-07 T-007: セーフエリア対応の実装

### 実施内容
- `src/styles.css`の`:root`に`--safe-top`/`--safe-bottom`/`--safe-left`/`--safe-right`（それぞれ`env(safe-area-inset-*, 0px)`）を追加した。
- 画面端に固定表示される要素へ、既存の`padding`に`calc()`でセーフエリア変数を加算する形で適用した（個別画面ごとの重複を避け、共通クラス単位で一括対応）。
  - `.home`（左右+上）、`.home__list`（下、FABと重ならないための既存96pxに加算）、`.fab`（右+下）
  - `.sheet`（下+左右）: `EditorScreen`のレイアウト候補シート・警告シート、`HomeScreen`のデッキ操作シートが共通で使用しているため、この1箇所の修正で全ボトムシートに反映される
  - `.editor__header`（上+左右）、`.editor__filmstrip`（下+左右、エディタ最下部の要素）
  - `.present__top`（上+左右）、`.present__bottom`（下+左右）: プレゼン全画面表示中はUI要素が非表示になるため、表示時のみ影響する
- `editor__undo-bar`・`editor__toolbar`は画面端に接していない中間要素のため対象外とした（判定ラダーに沿い過剰な適用を避けた）。

### 結果
- `npm test`: 21 passed（回帰なし）。
- `npm run build`: 型エラーなく成功。`grep -o "env(safe-area-inset-[a-z]*" dist/assets/*.css`でtop/bottom/left/rightすべてが出力に含まれることを確認した。
- 実機・エミュレータがこの開発コンテナにないため直接の視覚確認は未実施（Chrome DevToolsのデバイスエミュレーションでの`env()`疑似確認も本コンテナのPlaywright/Chromiumでは`env()`の実機シミュレーションができないため実施していない）。CSSの`calc()`構文と対象クラスの適用範囲はコードレビューで妥当性を判断する。
- `npx cap sync android` → `gradle assembleDebug --no-daemon`（`android/local.properties`は`sdk.dir=/opt/android-sdk`設定済みのため変更不要）を実行し`BUILD SUCCESSFUL`（49秒、184 actionable tasks、27実行/157 up-to-date）。生成物`android/app/build/outputs/apk/debug/app-debug.apk`（約24.5MB）を確認した。

### 次回開始位置
- reviewerに、セーフエリア適用箇所の妥当性（適用漏れ・過剰適用の両面）と、実機未検証である旨を踏まえたレビューを依頼する。承認後、Userに実機での再確認を依頼する。

---

## 2026-08-07 T-007: Android実機確認でシステムバー干渉を発見

### 実施内容
- Userが実機にAPKをインストールして確認したところ、スクリーンショットで以下が判明した。
  - 画面下部: レイアウト候補シート等のボトムシートが、Androidのジェスチャーナビゲーション/戻る・ホーム・タスク切替のタップ領域と重なっている。
  - 画面上部: ヘッダーバーが、Android側の時刻表示等のステータスバーと重なっている。
- 原因調査: `index.html`の`viewport-fit=cover`は設定済みだが、`src/styles.css`側で`env(safe-area-inset-top)`/`env(safe-area-inset-bottom)`を使った余白確保がされておらず、Capacitor/WebViewがedge-to-edge（画面全体）表示になっているためコンテンツがシステムバーの裏に描画されている。

### 次回開始位置
- developerに、Home/Editor/PresentのヘッダーやボトムシートにセーフエリアCSS変数を用いた余白を追加する修正を依頼する。

---

## 2026-08-06 T-006: 最終レビュー承認・完了（Phase 1〜4完了）

### 実施内容
- reviewerにcommit `5bc5f17`の再レビューを委任した。`sanitizeFilename`が意地悪なテストケース（全体がスラッシュのみ、パストラバーサル文字列、空文字列、絵文字含む文字列）でも意図通り動作すること、書き込み経路（ネイティブFilesystem/Web版フォールバック双方）が`downloadBlob`1箇所に一元化されており漏れがないことを確認。`npm test`(21件)・`npm run build`を再実行し成功を確認。T-006全体を俯瞰し追加の見落としなし。Critical/High/Medium指摘なし、承認。

### 結果
- T-006（Phase 4: Capacitor Android化・APKビルド・納品ドキュメント一式）を完了とした。
- これによりPhase 1（MVP）〜Phase 4（Android化）がすべて完了した。「どこでもプレゼン」の初期実装（自動レイアウトエンジン・編集/発表画面・IndexedDB永続化・PNG/PDF出力・AI補助・Android debug APKビルド・納品ドキュメント一式）が完了。

### 次回開始位置
- 現時点で残っているのは以下のバックログ項目のみ（いずれもLow重要度、既知の制約として許容済み）。
  - 画像アセット欠落時のCanvasプレースホルダー描画
  - PDF出力へのテキストレイヤー/alt埋め込み
  - 警告シートの「要約して縮める」の全警告ブロック対応
- Android実機・エミュレータでの動作確認は本開発コンテナでは実施不可のため、User側での実機検証が次のステップとなる（`docs/build-android.md`参照）。

---

## 2026-08-06 T-006: Reviewer指摘（ファイル名未サニタイズ）の修正

### 実施内容
- `src/export/exportPng.ts`に`sanitizeFilename(filename: string): string`を追加し、`/ \ : * ? " < > |`をすべて`_`に置換するようにした。`downloadBlob`の冒頭で受け取った`rawFilename`をこの関数に通してから使用するよう変更し、呼び出し元（`EditorScreen.tsx`のPNG保存、`HomeScreen.tsx`のPDF書き出し）は変更していない（1箇所への集約というレビュー指摘の修正方針通り）。
- `src/export/exportPng.test.ts`を新規作成し、`sanitizeFilename`が`/`等の不正文字を`_`に置換すること、不正文字を含まない場合はそのまま返すことを検証するユニットテスト2件を追加した。

### 結果
- `npm test`: 21 passed（既存19件+新規2件、回帰なし）。
- `npm run build`: 型エラーなく成功。
- Playwright（`npm run preview`起動、`/opt/node22/lib/node_modules/playwright`のChromium）で実機相当の確認を実施。
  - タイトルを`Q3/Q4実績`としたデッキでPNG保存を実行し、`HTMLAnchorElement.prototype.click`をフックして実際に設定された`a.download`属性値を捕捉したところ`Q3_Q4実績-1.png`（サニタイズ済み）だった。
  - 同デッキでPDF書き出しを実行し、同様に`a.download`属性値が`Q3_Q4実績.pdf`（サニタイズ済み）だった。
  - `download.suggestedFilename()`はBlob URLダウンロードでは常に`download`固定文字列を返す（Chromiumの既知挙動）ため検証には使えず、`a.download`属性値を直接捕捉する方式で確認した。
  - いずれの操作でも`pageerror`は発生しなかった。
- Web版のフォールバック経路（`Capacitor.isNativePlatform()`がfalseの場合の`<a download>`）で検証しており、ネイティブ実機でのFilesystem/Share経路は引き続き未検証（T-006全体の既存の制約と同じ）。

### 次回開始位置
- T-006を「レビュー中」に戻した。reviewerに、`sanitizeFilename`の実装がMedium指摘の修正方針（1箇所への集約、シンプルな正規表現置換）に沿っているか、既存のWeb版フォールバック動作を壊していないかを中心に再レビューを依頼する。

---

## 2026-08-06 T-006: Reviewerによる敵対的検証（差し戻し）

### 実施内容
- reviewerにcommit `41b6da7`のレビューを委任した。`npm test`/`npm run build`/`gradle assembleDebug --no-daemon`を独立に再実行しすべて成功を確認。Web版フォールバック、`.gitignore`変更、秘密情報混入、納品ドキュメントの正確性、依存追加の妥当性はいずれも問題なし。
- Medium/PLAUSIBLE 1件を指摘: `src/export/exportPng.ts`の`downloadBlob`が、デッキタイトル（自由入力・バリデーションなし）をサニタイズせずファイル名として`Filesystem.writeFile`の`path`に渡している。Web版では`a.download`属性が単なる"suggested filename"のため問題にならないが、Android実機では`path`が実ファイルシステムパスとして解釈されるため、タイトルに`/`等を含むデッキでネイティブ保存が失敗し、かつWeb版と同じ`<a download>`フォールバックはAndroid WebViewでは機能しないため、ユーザーに何のエラーも表示されないまま保存・共有が静かに失敗する可能性がある。
- 実機未検証のためPLAUSIBLE判定だが、修正コスト・リスクともに低いため差し戻す。

### 次回開始位置
- developerに、`downloadBlob`呼び出し前またはfilename生成箇所で、Androidのファイル名として不正な文字（少なくとも`/`、可能なら`\ : * ? " < > |`）を`_`等に置換するサニタイズの追加を依頼する。

---

## 2026-08-06 T-006: Phase 4 (Capacitor Android化・APKビルド・納品ドキュメント一式) 実装

### 実施内容
- **Android SDKの導入**: この開発コンテナにAndroid SDKは未導入だったが、`https://dl.google.com/android/repository/`へのネットワークアクセスが可能だったため、Android SDK Command-line Tools（`commandlinetools-linux-11076708_latest.zip`）を取得し`/opt/android-sdk`に導入した。ライセンス承諾後、`platform-tools`・`platforms;android-35`・`build-tools;35.0.0`を`sdkmanager`でインストールした（`platforms;android-36`は後述のGradleビルド時にAndroid Gradle Pluginが`compileSdkVersion=36`向けに自動追加取得した）。想定していた「30分で見込みが立たなければ諦める」リスクは顕在化せず、SDK導入・ライセンス承諾・パッケージ取得は10分程度で完了した。
- **Capacitor統合**: `npm i @capacitor/core @capacitor/cli` → `npx cap init "どこでもプレゼン" "com.dokopre.app" --web-dir dist` → `npm run build`（`dist/`生成）→ `npm i @capacitor/android` → `npx cap add android`の順で`android/`ネイティブプロジェクトを生成した。続けて`@capacitor/screen-orientation`・`@capacitor/share`・`@capacitor/filesystem`を追加し（カメラ不使用要件のため`@capacitor/camera`は追加せず）、`npx cap sync android`でネイティブ側に反映した。
- **debug APKビルド成功**: `android/gradle/wrapper/gradle-wrapper.properties`が要求するGradleバージョン（8.14.3）がこのコンテナに導入済み（`/opt/gradle-8.14.3`）だったため、`./gradlew`によるラッパー配布物の再ダウンロードを避け、システムの`gradle`コマンドを直接使用した。`android/local.properties`に`sdk.dir=/opt/android-sdk`を設定した上で`gradle assembleDebug --no-daemon`を実行し、`BUILD SUCCESSFUL`（初回184 actionable tasks、約4分）。生成物`android/app/build/outputs/apk/debug/app-debug.apk`（約23MB）を確認した。プラグイン追加後の再ビルドでも成功を再確認した（約30秒、up-to-date中心）。
- **ネイティブ機能の軽量統合**: `PresentScreen.tsx`の画面回転制御を、素の`screen.orientation` APIの型キャストによる実装から`@capacitor/screen-orientation`の`ScreenOrientation.lock/unlock`に置き換えた（同プラグインはWeb実行時はブラウザのScreen Orientation APIへ委譲するため、Web版フォールバック挙動は変わらない）。`src/export/exportPng.ts`の`downloadBlob`を非同期化し、`Capacitor.isNativePlatform()`で分岐: ネイティブ実行時は`@capacitor/filesystem`でキャッシュディレクトリに書き込み`@capacitor/share`で共有シートを開く、Web版（あるいはネイティブでの書き込み/共有が失敗した場合）は既存の`<a download>` + Blob URLへフォールバックする。呼び出し元（`EditorScreen.tsx`のPNG保存、`HomeScreen.tsx`のPDF書き出し）は`downloadBlob`をawaitするよう変更した。ファイル選択（画像追加・JSON読み込み）は既存のWeb `input[type=file]`のまま変更していない。
- **`.gitignore`の見直し**: ルート`.gitignore`が`android/`ディレクトリ全体を無視する設定になっており、これでは生成したネイティブプロジェクト（ソース一式）がコミットされないため、`android/`の行を削除した。`android/.gitignore`（Capacitor CLIが生成した標準的なAndroid向け`.gitignore`）が`build/`・`.gradle/`・`local.properties`・コピーされたWeb assets等のビルド生成物を個別に除外するため、二重の除外設定にはなっていない。
- **vite.config.tsの確認**: Phase 1で設定済みの`base: './'`はCapacitorのWebView（`file://`起点でのアセット読み込み）と整合することを確認した（変更不要）。
- **納品ドキュメント一式の作成**: `docs/requirements.md`（要件定義）・`docs/screens.md`（画面遷移図Mermaid＋ワイヤーフレーム概要）・`docs/design.md`（デザイントークン等）・`docs/architecture.md`（レイアウトエンジン/二重レンダラ/IndexedDB永続化/Capacitor構成）・`docs/data-schema.md`（`types.ts`の型定義転記）・`docs/build-android.md`（このコンテナでの実施結果＋User環境向け手順）・`docs/operations.md`（テンプレート追加方法・AI補助拡張方法・既知の制約まとめ）を新規作成した。`README.md`に各docsへのリンクを追記した。

### 結果
- `npm test`（Vitest）: 19 passed（Phase 3から変更なし、Capacitor統合による回帰なし）。
- `npm run build`（`tsc && vite build`）: 型エラーなく成功。
- `gradle assembleDebug --no-daemon`（`android/`）: `BUILD SUCCESSFUL`、`app-debug.apk`生成を確認。
- Playwright（`/opt/pw-browsers`のChromium、`npm run preview`起動後）でCapacitorプラグイン統合後もWeb版が従来通り動作することを確認した。
  1. Home画面表示→新規作成→Editor画面遷移→テキスト入力→レイアウト自動生成（見出し/箇条書き）を確認。
  2. 「▶ 発表」でPresent画面に遷移し、スライド内容が正しくレンダリングされることを確認（`ScreenOrientation.lock`呼び出しがWeb実行時にエラーを起こさずconsoleエラーなしで完了することを確認。ブラウザ設定上、実際の画面回転はできないがtry/catchでの握りつぶしにより機能停止しないことを確認）。
  3. 「PNG保存」ボタンでPlaywrightの`download`イベントが発火し、`Capacitor.isNativePlatform()`がfalseとなりWeb版の`<a download>`フォールバック経路が使われることを確認（ファイル名の観察により、ネイティブ分岐に入っていないことを確認）。
  4. いずれの操作でもコンソールエラー（`pageerror`）は発生しなかった。
- **実機・エミュレータでの動作確認は未実施**: この開発コンテナにはAndroidエミュレータ・実機がないため、`adb install`によるインストール確認、画面回転ロックの実機動作、PNG/PDF保存時のFilesystem/Shareの実機動作は確認できていない。D-001に記載の通り、実機確認はUser側で行う前提とした。

### 次回開始位置
- T-006を「レビュー中」とした。reviewerに(1)Capacitor統合がWeb版のフォールバック動作（`try/catch`によるネイティブ機能非対応時の握りつぶし）を壊していないか、(2)`.gitignore`変更後に`android/`配下の意図しない生成物（`build/`等）がコミット対象に含まれていないか、(3)納品ドキュメントの内容が実装と一致しているか（架空の記述がないか）を中心にレビューを依頼する。
- 承認後、T-006を完了とする（本タスクをもってPhase 1〜4が完了する）。

---

## 2026-08-06 T-005: 最終レビュー承認・完了

### 実施内容
- reviewerにcommit `9ead962`の再レビューを委任した。`applyToSelectedBlocks`のクリア条件（`summarizeUndo.slideId === currentSlide.id && targetIds.has(summarizeUndo.blockId)`）が過不足なく機能すること（対象ブロックのみクリア、別ブロックへの適用では保持される）をコード上・記録された実機確認の両面で確認。`npm test`(19件)・`npm run build`を再実行し成功を確認。
- Phase 3全体（`git diff 9de3753 9ead962`）を俯瞰し、危険なAPI使用等の新規懸念がないことも確認した。Critical/High/Medium指摘なし、承認。

### 結果
- T-005（Phase 3: AI補助の高度化）を完了とした。3回の指摘サイクル（改行破壊/Undo欠如→Undoとマーカー競合）を経て収束。

### 次回開始位置
- T-006（Phase 4: Capacitor Android化・APKビルド・納品ドキュメント一式）に着手する。

---

## 2026-08-06 T-005: Reviewer指摘Medium 1件の修正（summarizeUndoのクリア漏れ）

### 実施内容
- `src/screens/EditorScreen.tsx`の`applyToSelectedBlocks`（`handleMarker`/`handleEmphasis`が共有する処理）に、対象ブロックのブロックIDが`summarizeUndo?.blockId`と一致し、かつスライドも一致する場合に`setSummarizeUndo(null)`でクリアする処理を追加した（`handleTextChange`/`switchSlide`で既に行っているクリア処理と同様のパターン）。整合性チェックの仕組み等の過剰設計は行わず、最小限のクリア処理のみとした。

### 結果
- `npm test`: 19 passed（既存分含む）。
- `npm run build`: 型エラーなくビルド成功。
- Playwright（`/opt/pw-browsers`のChromium）でReviewerの再現手順を実際に試した。(1)長文入力→「文字量が多いため」警告バッジ→「要約して縮める」実行（`window.confirm`をacceptで要約適用、undoバーが表示されることを確認: `.editor__undo-bar`存在=1）。(2)textarea内で全選択(Ctrl+A)しマーカー(yellow)を適用。(3)適用直後、undoバーが消えていること（`.editor__undo-bar`存在=0）をアサートし確認した。スクリーンショットでも該当ブロックにマーカー(黄色ハイライト)が適用され、「元に戻す」ボタン自体が表示されていないことを目視確認した。

### 次回開始位置
- T-005を「レビュー中」に戻した。reviewerに再レビューを依頼する。承認後、次のタスクへ進む。

---

## 2026-08-06 T-005: 再レビューで新規Medium指摘（差し戻し）

### 実施内容
- reviewerにcommit `40a9684`の再レビューを委任した。前回指摘2件（summarizeの改行破壊・Undo欠如）はいずれも解消を確認（過剰ガードによる機能退行なし、意図しない状態への復元なし）。
- 新規にMedium/CONFIRMED 1件を発見: 要約適用後、`summarizeUndo`を保持したまま同一ブロックにマーカー/強調を適用すると`summarizeUndo`がクリアされず、「元に戻す」を押すとtextのみ要約前の原文に復元されmarker/emphasisは新しい設定のまま残る。結果、ユーザーが要約後の短いテキストに適用したつもりのマーカーが、要約前の長い原文全体に波及した状態で自動保存される。Playwright実機で再現確認済み（マーカーのlinear-gradientスパン14個→20個に増加）。
- データ消失ではないが意図しない書式のサイレント適用であり、AGENTS.mdの「データ損失を防ぐエラーハンドリング」に準ずる領域として差し戻す。

### 次回開始位置
- developerに、`applyToSelectedBlocks`（`handleMarker`/`handleEmphasis`の共通処理）で対象ブロックが`summarizeUndo.blockId`と一致する場合に`summarizeUndo`をクリアする最小修正を依頼する。

---

## 2026-08-06 T-005: Reviewer指摘（Medium 2件）の修正対応

### 実施内容
- 直前のReviewer差し戻し（下記「Reviewerによる敵対的検証（差し戻し）」エントリ）の指摘1・2を修正した。
  1. **Medium**: `src/layout/assist.ts`の`summarize`が、選ばれた文の集合が全文（`chosen.size === total`）だった場合、あるいは間引いても文字数が短縮されなかった場合（`summarized.length >= text.length`）に、句点置換・再結合した文字列ではなく元の`text`をそのまま返すガードを追加した。これにより実質的な短縮が不要な短い複数行ブロックでも改行構造(`\n`)が破壊されなくなり、`EditorScreen.tsx`の`handleSummarizeBlock`が既に持つ`summarized === block.text`判定（「これ以上要約できませんでした」アラート）が正しく機能するようになった。
  2. **Medium**: `src/screens/EditorScreen.tsx`に要約適用の最小限Undoを追加した。`handleSummarizeBlock`で要約を確定する直前のブロックテキストを`summarizeUndo`state（`{slideId, blockId, previousText}`）に保持し、プレビュー上部に「要約を適用しました／元に戻す」バー（`.editor__undo-bar`）を表示する。「元に戻す」タップで`handleUndoSummarize`が該当ブロックのテキストを直前の値に復元し自動保存する。手動でテキストを編集した場合（`handleTextChange`）やスライドを切り替えた場合（`switchSlide`）は`summarizeUndo`をクリアし、無効な状態への復元を防いだ。全操作履歴のUndoスタック等の過剰な設計は行わず、直前1回分の復元のみに限定した（AGENTS.mdの判定ラダー通り最小実装）。`window.confirm`の文言から「元に戻せません」を削除した。
  3. `src/layout/assist.test.ts`に「実質的な短縮が不要な短い複数行テキストは改行構造を保持したまま返す」テストケースを追加した（`summarize('見出し\n・要点1\n・要点2', 300)`が入力と完全一致し`\n`区切りの3行が保持されることを確認）。
  4. `src/styles.css`に`.editor__undo-bar`/`.editor__undo-bar__button`を追加した。既存の警告バッジと同系色（`#fff4e0`背景・`#8a5a00`文字）に合わせ、新規デザイントークンは追加していない。

### 結果
- `npm test`（Vitest）: 19 passed（既存18件+新規1件）。
- `npm run build`（`tsc && vite build`）: 型エラーなく成功。
- Playwright（`/opt/pw-browsers`のChromium、`npm run preview`起動後）で以下を確認した。
  1. 新規デッキで500文字超の長文（句点なし・繰り返しパターン）を入力し`too-much-text`警告バッジ→シート→「要約して縮める」を実行。テキストエリアの内容が376文字→229文字に短縮され`window.confirm`ダイアログが表示されることを確認。
  2. 要約適用直後にプレビュー上部へ「要約を適用しました／元に戻す」バーが表示されることを確認。
  3. 「元に戻す」をクリックすると、テキストエリアの内容（空行を除いた実質テキスト）が要約適用前の内容と一致することを確認。加えて「元に戻す」操作後にバーが消えることも確認した。
  4. （ユニットテストで別途検証済みのため今回は割愛）`summarize`の改行保持ガードは`src/layout/assist.test.ts`のテスト(e)で確認。

### 次回開始位置
- T-005を「レビュー中」に戻した。reviewerに今回の修正（改行保持ガード・Undo実装が実際に機能するか、AGENTS.mdの最小実装の原則に沿っているか）を中心に再レビューを依頼する。承認後はT-006（Phase 4: Capacitor Android化）に着手する。

---

## 2026-08-06 T-005: Reviewerによる敵対的検証（差し戻し）

### 実施内容
- reviewerにcommit `4c4644b`のレビューを委任した。D-002遵守（外部API不使用・レイアウト判断の非重複）は問題なし。`npm test`(18件)・`npm run build`も再実行で成功を確認。以下2件のMedium/CONFIRMEDを指摘。
  1. `summarize()`が文分割のため改行(`\n`)を句点(`。`)に置換し`join('')`で再結合するため、実質的な短縮が不要な短い複数行ブロックでも改行構造が失われ、確認ダイアログに進んでしまう（「要約結果は元テキストの部分集合」という設計方針からの逸脱）。ユニットテスト・Playwright実機の両方で再現確認済み。
  2. 「要約して縮める」は`block.text`を不可逆に置換し即座に自動保存される。Undo・履歴機構がアプリ全体に存在せず、`window.confirm`のみが復元の唯一の防波堤（データ損失リスク）。
  3. Low/PLAUSIBLE: 警告シートの「要約して縮める」ボタンが`layout.warnings[0].blockId`のみを対象とし、複数ブロック同時警告時に2件目以降を要約できない。
- Medium 2件はAGENTS.mdの「データ損失を防ぐエラーハンドリング」（手を抜かない対象）に該当するため、Developerへ差し戻す。Low 1件はUX不整合でありバックログに記録するに留める。

### 次回開始位置
- developerに(1)`summarize`が実質的に短縮不要な場合は`block.text`をそのまま返す（改行を破壊しない）よう修正、(2)要約適用後に直前のテキストへ戻せる最小限のUndo（例: 適用直後のみ「元に戻す」を表示）を追加、を依頼する。

---

## 2026-08-06 T-005: Phase 3 (AI補助の高度化) 実装

### 実施内容
- `src/layout/assist.ts`を新規実装した。外部LLM APIを一切呼び出さず、既存の`analyze.ts`と同じキーワード辞書・数値単位正規表現を用いたルールベース処理のみで完結する（D-002遵守）。
  - `summarize(text, maxChars)`: `。`と改行で文分割し、文の位置（先頭ほど高評価）・キーワード一致・数値単位一致・長さ（極端に短い/長い文は減点）でスコアリング、上位の文を元の出現順で連結してmaxChars以内に収める抽出型要約。生成的な作文は行わない。1文のみで`maxChars`を超える場合（句読点のない長文等）は、その1文をmaxCharsで切り詰める（文の部分文字列であり捏造ではない）。
  - `readability(slide)`: 1行あたり文字数・行数・漢字比率（Unicode範囲`一-龯`での概算）・句読点密度の統計から0〜100のスコアを算出し、日本語の改善提案文字列を`hints`に返す。
- `src/layout/assist.test.ts`を新規作成し、(a)長文がmaxChars以内に要約される、(b)要約結果が元テキストの文の部分集合である（捏造しない）、(c)短い文で読みやすさスコアが高く出る、(d)極端に長い行を含む場合にhintsへ警告が含まれる、の4件を実装した。
- `src/screens/EditorScreen.tsx`のツールバー「レイアウト切替」ボタンを、既存の自動/手動サイクル動作からボトムシートを開く方式に変更した。シート内に`TEMPLATE_CHOICES`（自動+5テンプレート）を横スクロールのカルーセルで表示し、各候補は`layoutSlide`をそのテンプレート強制（`{...slide, layoutHint: templateId}`）で計算した実際のプレビュー（`SlideView`）をサムネイル表示する。レイアウト判断ロジックの再実装はせず、既存の`layoutSlide`をそのまま呼ぶのみ（D-002遵守）。タップで`slide.layoutHint`を更新する。
- 警告バッジ（`too-much-text`等）を`<button>`化してタップ可能にし、タップで別のボトムシートを開くようにした。シート内に全警告メッセージ・`readability`のスコアとhints・「要約して縮める」ボタンを表示する。ボタン押下で対象ブロック（最初の警告の`blockId`）のテキストを`summarize`で短縮したプレビューを`window.confirm`で表示し、承認後にのみブロックのテキストを差し替える（取り消し不能な操作のため確認ダイアログを必須にした。既存コードの`window.prompt`/`window.alert`パターンに合わせた最小実装）。
- `src/styles.css`に`.template-picker`（横スクロールカルーセル）・`.template-picker__item`（選択中はアクセントカラーの枠線）・`.sheet__heading`・`.sheet__note`を追加した。新規パッケージは追加していない。

### 結果
- `npm test`（Vitest）: 18 passed（既存14件+新規4件）。
- `npm run build`（`tsc && vite build`）: 型エラーなく成功。
- Playwright（`/opt/pw-browsers`のChromium、`npm run preview`起動後）で以下を確認した。
  1. 見出し+500文字の改行なし段落を入力し、`too-much-text`警告バッジが表示されることを確認。バッジタップでボトムシートが開き、読みやすさスコア(50/100)と「1行が長すぎます」「句読点が少なく読みにくい可能性があります」のhintsが表示されることを確認。
  2. 「要約して縮める」ボタン押下→`window.confirm`ダイアログに要約後テキストのプレビューが表示され、承認するとtextareaの内容が519文字→320文字（`maxChars=300`の対象ブロックに対して）に短縮されることを確認（テキストが実際に変化することをDOM上で確認）。
  3. ツールバーの「レイアウト: 自動」ボタンをタップするとレイアウト候補カルーセル（自動/タイトル/主張/箇条書き/2カラム/画像＋文章の6候補、各々`layoutSlide`による実プレビュー付き）が表示されることを確認。「2カラム」候補をタップすると`slide.layoutHint`が更新され、ボタン表示が「レイアウト: 2カラム」に変わり、プレビューが実際に2カラムレイアウトへ切り替わることを確認。
  4. 初回実装時に`summarize`が句読点のない単一長文（あ×500）に対して何も短縮しない不具合（1文のみの場合に強制採用した文をmaxCharsで切り詰めていなかった）を発見し、`assist.ts`の`summarize`を修正して解消した（この過程はPlaywright実機確認で発見し、ユニットテストのみでは検出できなかった）。

### 次回開始位置
- T-005を「レビュー中」とした。reviewerにD-002遵守（`assist.ts`が外部API等を一切呼ばずルールベースのみで完結しているか、`template-picker`が`layoutSlide`の結果をそのまま描画しレイアウト判断を再実装していないか）を中心にレビューを依頼する。
- 承認後はT-006（Phase 4: Capacitor Android化）に着手する。

---

## 2026-08-06 T-004: レビュー承認・完了（既知の制約2件を記録）

### 実施内容
- reviewerにcommit `47b4494`のレビューを委任した。D-002遵守（`canvasRenderer.ts`がレイアウト判断ロジックを再実装していないか）を中心に検証し、`npm test`/`npm run build`の再実行、Playwrightでの実機再現も行った。Critical/High/Mediumの指摘はなし。
- Low指摘2件: (1) 画像アセットの`data`が欠落している場合、`SlideView.tsx`はプレースホルダー枠を描画するが`canvasRenderer.ts`は何も描画せず白紙になる非対称性（CONFIRMED）。(2) `exportDeckAsPdf`が生成するPDFはラスター画像のみでテキストレイヤー・alt情報を含まずスクリーンリーダーで利用できない（PLAUSIBLE、設計上のトレードオフ）。
- いずれも機能的破綻・データ損失・セキュリティ侵害に該当しないLow指摘のため、Developerへの再差し戻しはせず、既知の制約としてここに記録するに留めた。

### 結果
- T-004（Phase 2: PNG/PDF出力）を完了とした。

### 次回開始位置
- T-005（Phase 3: AI補助の高度化）に着手する。将来的な改善候補として、画像アセット欠落時のCanvasプレースホルダー描画、PDFへのテキストレイヤー/alt埋め込みをバックログに残す。

---

## 2026-08-06 T-004: Phase 2 (PNG/PDF出力) 実装

### 実施内容
- `src/render/canvasRenderer.ts`を新規実装した。`drawLayout(ctx, result, assets, blocks)`は`LayoutResult`の`boxes`をそのまま描画するだけで、フォントサイズ決定・配置・テンプレート選択等のレイアウト判断は一切行わない（D-002遵守）。テキストは`SlideView.tsx`と同じ`fontSize`/`lineHeight`/`weight`/`align`を使い、マーカーは行下部40%（`linear-gradient(transparent 60%, color 60%)`相当）をハイライトし、画像は`object-fit: cover`相当のソース矩形計算（`drawImageCover`）でdrawImageする。
- `src/export/exportPng.ts`: `exportSlideAsPng(slide, assets, measurer)`はオフスクリーンCanvas(1280x720)に`layoutSlide`→`drawLayout`し`canvas.toBlob('image/png')`でBlobを返す。呼び出し側での`document.fonts.ready`待機漏れを防ぐため、関数内でも`document.fonts.ready`を待つ（EditorScreen経由でもHomeScreenのPDF経由でも安全）。`downloadBlob(blob, filename)`で`<a download>`+Blob URLのダウンロードトリガーを実装。
- `src/export/exportPdf.ts`: 新規依存`pdf-lib`（^1.17.1、Manager承認済み）を追加。`exportDeckAsPdf(deck, measurer)`はデッキの各スライドを`exportSlideAsPng`でPNG化し（レイアウト判断ロジックの再実装なし）、`pdf-lib`で1280x720ページに1枚ずつ`embedPng`+`drawImage`して1つのPDFにまとめる。画像アセットはメタデータのみのデッキから`getAsset`で本体データを取得する（`exportDeckJson`と同じパターン）。
- UI統合: `HomeScreen.tsx`のデッキ長押しボトムシートに「PDF書き出し」ボタンを追加（書き出し中は「PDF書き出し中…」表示・ボタン無効化・背景タップでの閉じ操作も無効化して不整合を防止）。`EditorScreen.tsx`のツールバーに「PNG保存」ボタンを追加（書き出し中は「PNG保存中…」表示）。失敗時はいずれも`window.alert`で日本語メッセージを表示。

### 結果
- `npm test`: 14 passed（既存のまま。CanvasやPDF生成はjsdom+canvas未導入のため、vitestでのBlob生成テストは追加せずPlaywrightでの実機能確認に置き換えた）。
- `npm run build`（`tsc && vite build`）: 型エラーなく成功。`pdf.save()`の戻り値`Uint8Array`を`Blob`に渡す際、`ArrayBufferLike`と`ArrayBuffer`の型不一致でtsc エラーが出たため`bytes.slice().buffer`で正規化した。
- Playwright（`/opt/pw-browsers`のChromium、`npm run preview`起動後）で以下を確認した。
  1. 編集画面で2行+箇条書きのスライドを作成し「PNG保存」→ダウンロードされたファイルがPNGシグネチャ(`89 50 4E 47 0D 0A 1A 0A`)で始まることを確認。目視でDOMプレビューと同一の見た目（見出し太字+箇条書き）であることを確認。
  2. 2枚のスライドを持つデッキをホーム画面から長押し→「PDF書き出し」→ダウンロードされたPDFを`pdf-lib`の`PDFDocument.load`で読み込み、`getPageCount()`が2、各ページサイズが1280x720であることを確認。
  3. マーカー(yellow)+自動強調（キーワード「結論」）を含むスライドをPNG化し、DOMプレビューのスクリーンショットと目視比較。マーカーハイライトの位置・太字強調・twoColumnテンプレートの配置が一致することを確認。
  4. 画像を追加したスライド（imageSideテンプレート）をPNG化し、`object-fit: cover`による画像のクロップ位置がDOMプレビューと一致することを確認。

### 次回開始位置
- T-004を「レビュー中」とした。reviewerにレイアウト判断ロジックの二重実装がないか（`canvasRenderer.ts`/`exportPng.ts`/`exportPdf.ts`が`layoutSlide`の出力を描画するだけであること）を中心にレビューを依頼する。
- 承認後はT-005（Phase 3: AI補助の高度化）に着手する。

---

## 2026-08-06 T-003: 再レビュー承認・完了

### 実施内容
- reviewerにcommit `46b0a7a`の再レビューを委任した。前回指摘5件それぞれが実際にコード上で修正されているかを、追加の意地悪なテストケース（`blocks: [{}]`、`assetId`が数値、`type`欠落、`slides`が非配列等）で自ら検証し、いずれも意図通りエラーとして弾かれることを確認した。
- id再採番処理（`importDeckJson`で`deck.id`のみ再採番し`asset.id`は不変）がHomeScreenの複製機能と同じ設計であり、本コミットで新規の回帰ではないと判断された。
- `npm test`（14件）・`npm run build`を再実行し成功を確認した。指摘事項なし（findings空）。

### 結果
- T-003（Phase 1 MVP）を完了とした。

### 次回開始位置
- T-004（Phase 2: PNG/PDF出力）に着手する。Canvasレンダラは`LayoutResult`を共有しレイアウト判断を二重実装しない（D-002）。PDF出力には`pdf-lib`等の新規依存追加が必要になる見込み（planner計画のリスク項目5）。

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

