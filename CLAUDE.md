@AGENTS.md

# Claude Code設定

このファイルはClaude Code固有の設定・運用ルールのみを扱う。開発方針・設計原則・ワークフローは AGENTS.md（上記import）、レビュー方針は REVIEW.md を参照する。すべてのAIエージェント共通のルールをCLAUDE.mdへ書き足さない。

## セッション運用

- セッション開始時: SessionStart Hookで docs/tasks.md・docs/progress.md の要約が自動表示される（環境によっては発火しない場合がある。詳細・確認方法はdocs/agents.md参照）。
- 長時間セッション: 能動的に `/compact` を使い、PreCompact Hookの案内に従って圧縮前にdocsへ記録する。
- タスク完了後: 次のタスクに移る前にコンテキストをリセットする（`/clear` 等）。
- 修正が2回失敗したら: コンテキストをリセットして状況を整理してから再着手する。

## トークン効率化

- 不要なAgentは起動しない。巨大ファイルは全文を読まず、検索（Grep/Glob）で対象を絞る。
- 調査・実装・レビューは各Agentに委任し、メインセッションには要約のみ持ち込む。同じ情報を複数箇所に保存しない。
- CLAUDE.md/AGENTS.md/README.mdは簡潔に保ち、必要な時のみ参照する。

## Skills / Capability Layer

project001は、利用可能な外部ツールを自動検出し、あれば優先利用・なければ既存フローへフォールバックする共通規約（Capability Layer）を持つ。project001自体はいずれのツールにも依存しない（本リポジトリに依存の追記はしない）。現在統合済みのCapabilityは [Agent-Reach](https://github.com/Panniantong/Agent-Reach)（Researcher）、Code Review Graph（Developer/Reviewer）、[Context7](https://github.com/upstash/context7)（Planner/Developer/Reviewer/Researcher）、GitHub CLI `gh`（Researcher）の4つ。検出は`.claude/bootstrap.sh`（案内のみ、インストールは行わない）に集約し、SessionStart Hook経由でManagerへ結果を共有する。検出規約はdocs/capability-layer.mdに、ツール固有の詳細はdocs/agent-reach.md・docs/code-review-graph.md・docs/context7.mdにそれぞれ記載し、他へ複製しない。Claude Codeプラグインはproject scopeで既定有効化しない（詳細はdocs/capability-layer.md参照）。

Skills（`.claude/skills/`配下のSKILL.md）は、再利用可能な具体的ワークフローが確認された時点で追加する。現時点で導入しているSkillはない。

## 進捗の可視化

サブエージェント（Planner/Researcher/Developer/Reviewer）実行中のみ、`subagentStatusLine`（`.claude/settings.json`）により、専門用語を使わない日本語でエージェントパネルに進捗を表示する。通常のチャット中は表示されず、LLM呼び出しも行わない。詳細はdocs/status-line.mdを参照。

## 参照ドキュメント

- REVIEW.md: レビュー方針（敵対的検証）。reviewer Agentが従う
- docs/tasks.md: 現在のタスク、優先順位、状態管理（Managerが管理）
- docs/progress.md: 作業履歴、次回開始位置（Developerが記録）
- docs/decisions.md: 設計判断、採用理由、変更履歴
- docs/agents.md: Agent構成、モデル構成、オーケストレーションルール、Hook構成
- docs/status-line.md: サブエージェント進捗の可視化（Status Line）の仕様
