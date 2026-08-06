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
| T-007 | Android実機でのシステムバー（時刻表示・戻る/ホームボタン）とUIの重なりを解消 | 高 | 実装中 | developer | User実機確認（スクリーンショット添付）で発覚。edge-to-edge表示に対しセーフエリア余白が未適用 |

## バックログ（未着手・優先度未確定）

- 画像アセット欠落時、Canvas/PNG/PDF出力にもSlideView相当のプレースホルダー枠を描画する（T-004 Reviewer指摘、Low/CONFIRMED）
- PDF出力にテキストレイヤー・画像altの代替テキスト埋め込みを検討する（T-004 Reviewer指摘、Low/PLAUSIBLE、アクセシビリティ改善）
- 警告シートの「要約して縮める」を全警告ブロックに対応させる（T-005 Reviewer指摘、Low/PLAUSIBLE、現状は先頭ブロックのみ）

## メモ

- 新しいタスクを追加したら、必ず優先度と状態を設定すること。
- タスクの状態が変わったら都度このファイルを更新する（作業完了後にまとめて更新しない）。
- 詳細な作業内容や経緯は [progress.md](./progress.md) を参照。
- 設計上の判断が必要になった場合は [decisions.md](./decisions.md) に記録する。
- **状態列の値は必ず「状態の定義」にある6値を完全一致（前後の空白のみ許容）で使うこと**。SessionStart Hookの完了タスクフィルタ（`.claude/settings.json`）が状態列の完全一致で判定しているため、`完了(要再確認)`のような接尾辞付きの値は「未完了」として扱われる（安全側だが、フィルタが効かなくなる）。
- **タスク名・備考欄に未エスケープの`|`を含めないこと**。SessionStart Hookは`docs/tasks.md`を`awk -F'|'`で列分割しており、セル内に`|`があると以降の列がずれる。Markdownテーブルとしても不正な記法になるため、通常の運用では発生しない想定。
