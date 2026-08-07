# タスク管理

現在のタスク、優先順位、状態を管理する。

## 状態の定義

- `未着手`: まだ着手していない
- `計画中`: plannerによる計画作成中/完了
- `調査中`: researcherによる外部情報収集中（外部調査が必要なタスクのみ）
- `実装中`: developerによる実装中
- `レビュー中`: reviewerによる確認中
- `完了`: 完了条件（AGENTS.md参照）を満たした

## タスク一覧

| ID | タスク | 優先度 | 状態 | 担当エージェント | 備考 |
|----|--------|--------|------|------------------|------|
| T-001 | project001テンプレートからdokopre-app用への初期化（docs/tasks・progress・decisionsリセット） | 高 | 完了 | claude | README.mdの初期化手順に従いdocs 3ファイルをリセット。/init-projectコマンドとREADME該当節はテンプレート専用のため削除（本リポジトリはアプリ本体として運用するため） |
| T-002 | 「どこでもプレゼン」要件定義・画面遷移・アーキテクチャ・データ構造の計画作成 | 高 | 完了 | planner | Web(React+TS+Vite)+Capacitor採用、自動レイアウトエンジンをレンダラ非依存の純粋関数として設計（D-001/D-002参照） |
| T-003 | Phase 1 (MVP): プロジェクト初期化・自動レイアウトエンジン・3画面・ローカル保存 | 高 | 完了 | developer/reviewer | Reviewer再検証（意地悪なテストケース含む）で指摘事項の解消を確認、npm test 14件・npm run build成功 |
| T-004 | Phase 2: PNG/PDF出力 | 中 | 完了 | developer/reviewer | Reviewer検証でCritical/High/Medium指摘なし。Low指摘2件（画像アセット欠落時のプレースホルダー未描画、PDFにテキストレイヤー/alt情報なし）は既知の制約として記録し許容 |
| T-005 | Phase 3: AI補助の高度化（要約・読みやすさ評価・レイアウト候補提示UI） | 中 | 完了 | developer/reviewer | 3回の指摘サイクル（改行破壊/Undo欠如/Undoとマーカー競合）を経てCritical/High/Medium指摘なしを確認 |
| T-006 | Phase 4: Capacitor Android化・APKビルド・納品ドキュメント一式 | 高 | 完了 | developer/reviewer | debug APKビルド成功、納品docs一式作成。Reviewer指摘のファイル名サニタイズ修正後、Critical/High/Medium指摘なしで承認。Phase 1〜4すべて完了 |
| T-007 | Android実機でのシステムバー（時刻表示・戻る/ホームボタン）とUIの重なりを解消 | 高 | 完了 | developer/reviewer | `env(safe-area-inset-*)`をヘッダー/ボトムシート/フィルムストリップ/Present上下バーに適用。Reviewer検証で指摘なし。User実機での最終確認待ち |
| T-008 | Editor画面下部ツールバーがAndroid実機で潰れる不具合を解消 | 高 | 完了 | developer/reviewer | header/toolbar/filmstrip/undo-barにflex-shrink:0、preview/textをflex-grow比率(42:38)+min-heightへ変更。Reviewer検証でブロッキング指摘なし承認 |
| T-009 | エディタ・プレゼンモード改善の計画作成（ダークモード/没入型プレゼン/複製削除/整列自動選択） | 高 | 完了 | planner | テーマシステム・全画面API・Undo設計・レイアウト整列拡張の方針を策定（D-003参照）。右揃え自動選択なし・整列語義はUser確認済み |
| T-010 | ダークモード実装 | 高 | 完了 | developer/reviewer | スライド面固定トークンとPNG/PDF出力の一致(D-003最重要要件)を実測確認。Low指摘(theme-color)修正後、Critical/High/Medium/Low指摘なしで承認 |
| T-011 | Editor画面からのスライド複製・削除（Undo対応） | 中 | 完了 | developer/reviewer | Block.id独立性・削除Undo順序・switchSlide副次修正・境界値をReviewerが実測確認、指摘事項なしで承認 |
| T-012 | プレゼンモードの没入型全画面表示 | 中 | 完了 | developer/reviewer | Reviewerが意地悪な再現手順（requestFullscreen遅延解決モック）で修正を実測確認。Critical/High/Medium指摘なしで承認 |
| T-013 | 自動レイアウトへの整列軸（左右中央揃え含む）追加 | 中 | レビュー中 | developer | LayoutResult.alignを新設、selectAlign()の判定ラダーで自動選択。レンダラは変更しない。npm test/build/Playwright/gradle assembleDebugすべて成功 |

## バックログ（未着手・優先度未確定）

- 画像アセット欠落時、Canvas/PNG/PDF出力にもSlideView相当のプレースホルダー枠を描画する（T-004 Reviewer指摘、Low/CONFIRMED）
- PDF出力にテキストレイヤー・画像altの代替テキスト埋め込みを検討する（T-004 Reviewer指摘、Low/PLAUSIBLE、アクセシビリティ改善）
- 警告シートの「要約して縮める」を全警告ブロックに対応させる（T-005 Reviewer指摘、Low/PLAUSIBLE、現状は先頭ブロックのみ）
- Editor画面の`.editor`に明示的な`overflow-y`を設定するか、極端に低いビューポート高さ（landscape回転時等）でmin-heightを縮小する（T-008 Reviewer指摘、Low〜Medium/PLAUSIBLE、旧実装から存在した挙動でブロッキングではないが改善余地あり）

## メモ

- 新しいタスクを追加したら、必ず優先度と状態を設定すること。
- タスクの状態が変わったら都度このファイルを更新する（作業完了後にまとめて更新しない）。
- 詳細な作業内容や経緯は [progress.md](./progress.md) を参照。
- 設計上の判断が必要になった場合は [decisions.md](./decisions.md) に記録する。
- **状態列の値は必ず「状態の定義」にある6値を完全一致（前後の空白のみ許容）で使うこと**。SessionStart Hookの完了タスクフィルタ（`.claude/settings.json`）が状態列の完全一致で判定しているため、`完了(要再確認)`のような接尾辞付きの値は「未完了」として扱われる（安全側だが、フィルタが効かなくなる）。
- **タスク名・備考欄に未エスケープの`|`を含めないこと**。SessionStart Hookは`docs/tasks.md`を`awk -F'|'`で列分割しており、セル内に`|`があると以降の列がずれる。Markdownテーブルとしても不正な記法になるため、通常の運用では発生しない想定。
