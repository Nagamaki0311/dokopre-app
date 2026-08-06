# どこでもプレゼン (dokopre-app)

「思いついたら30秒でプレゼン資料を作れる」を実現する、スマートフォン特化のプレゼンテーションアプリ。PowerPointやGoogleスライドの縮小版ではなく、入力内容から情報構造を解析して視認性の高いレイアウトを自動生成する「自動レイアウト」を最大の特徴とする。開発は[project001](https://github.com/)由来のAI開発フロー（AGENTS.md）に従う。

## セットアップ

1. `git clone`等でこのリポジトリを取得する。
2. （任意）`bash .claude/bootstrap.sh`を実行し、Optional Dependency（Agent-Reach/Code Review Graph/Context7/GitHub CLI等）の導入状況を確認する。インストールは行わず案内のみを表示するため、実行しなくても本リポジトリは完全に動作する。
3. AGENTS.mdの開発フロー（User → Manager → Planner → Developer → Reviewer → Manager → Complete）に従って進める。

## 構成

- AGENTS.md
  - 開発方針・設計原則・ワークフロー（全AIエージェント共通、最優先で読む）

- REVIEW.md
  - レビュー方針（敵対的検証 / Adversarial Review）。reviewer Agentが従う

- CLAUDE.md
  - Claude Code固有の設定・運用ルール（AGENTS.mdをimportする）

- .claude/agents
  - planner / researcher / developer / reviewer

- .claude/settings.json
  - SessionStart / PreCompact Hook（セッション継続性の補助）、subagentStatusLine（サブエージェント進捗の可視化）。詳細はdocs/agents.md

- .claude/bootstrap.sh
  - Optional Dependency（Capability Layer）の導入状況を案内のみで表示する検出スクリプト。インストールは行わない

- docs
  - tasks.md: タスクと状態管理
  - progress.md: 作業履歴
  - decisions.md: 設計判断の記録
  - agents.md: Agent構成・モデル構成・Hook/Status Line構成の詳細
  - agent-reach.md: [Agent-Reach](https://github.com/Panniantong/Agent-Reach) 対応（Optional Dependency、検出・フォールバック方針）
  - code-review-graph.md: [Code Review Graph](https://github.com/tirth8205/code-review-graph) 対応（Optional Dependency、影響範囲解析）
  - context7.md: [Context7](https://github.com/upstash/context7) 対応（Optional Dependency、ライブラリドキュメント確認）
  - capability-layer.md: 外部ツール検出の共通規約（Capability Layer）
  - research-workflow.md: 外部調査ワークフロー
  - status-line.md: サブエージェント進捗の可視化（Status Line）の仕様
  - requirements.md: 「どこでもプレゼン」の要件定義
  - screens.md: 画面遷移図・ワイヤーフレーム概要
  - design.md: UIデザイン仕様（デザイントークン等）
  - architecture.md: アーキテクチャ設計（レイアウトエンジン・二重レンダラ・永続化・Capacitor構成）
  - data-schema.md: データ構造（Deck/Slide/Block/Asset/LayoutResult）
  - build-android.md: APKビルド手順（この開発コンテナでの実施結果を含む）
  - operations.md: 運用・拡張ガイド（テンプレート追加・AI補助拡張・既知の制約）

## 開発フロー

User → Manager → Planner → Developer → Reviewer → Manager → Complete
（外部調査が必要な場合のみResearcherが加わる）

詳細は AGENTS.md・REVIEW.md・docs/agents.md を参照。
