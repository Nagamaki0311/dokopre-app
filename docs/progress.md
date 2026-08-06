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

