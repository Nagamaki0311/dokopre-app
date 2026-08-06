# 運用・拡張ガイド

## 新しいスライドテンプレートを追加する

レイアウト判断は`src/layout/`に一元化されている（D-002）。テンプレートを1つ追加する場合、変更が必要なのは基本的に以下2ファイルのみで、レンダラ側（`SlideView.tsx`/`canvasRenderer.ts`）の変更は不要（`LayoutResult`が変わらない限り）。

1. `src/types.ts`の`TemplateId`に新しいIDを追加する。
2. `src/layout/templates.ts`
   - `frames(template)`に新テンプレートの配置枠（`Rect`: x/y/w/h/align、1280×720の仮想座標）を追加する。
   - `selectTemplate(analyzed, hint)`の自動選択ロジックに、新テンプレートを選ぶ条件（画像有無・ブロック数・文字量など）を追加する（既存テンプレートの判定順序を壊さないよう、条件の優先順位に注意する）。
3. `src/layout/layout.ts`の`assign()`に、新テンプレート名の`case`を追加し、`frames()`で定義した各枠にどのブロック（見出し/画像/本文候補）を割り当てるかを実装する。
4. `src/screens/EditorScreen.tsx`の`TEMPLATE_CHOICES`に候補を追加すると、レイアウト切替ボトムシートのカルーセルに表示される（`layoutSlide`を強制テンプレートで呼ぶだけで実プレビューが自動生成されるため、UI側の追加実装は不要）。
5. `src/layout/layout.test.ts`にレイアウト結果の期待値テストを追加する。

## AI補助ロジックを拡張する

AI補助（`src/layout/assist.ts`）は外部LLM APIを呼ばず、キーワード辞書・数値単位正規表現・文字数統計によるルールベース処理のみで完結している（D-002、オフラインファースト要件）。

- **重要度判定・自動強調のキーワードを増やす**: `src/layout/analyze.ts`の`KEYWORDS`配列、`NUMERIC_UNIT_RE`正規表現を編集する。この判定は要約（`assist.ts`の`summarize`）のスコアリングとも共通利用されているため、変更の影響が両方に及ぶ点に注意する。
- **要約アルゴリズムを改善する**: `assist.ts`の`summarize(text, maxChars)`は文分割→スコアリング→上位文を出現順に連結、という抽出型要約。生成的な言い換えを行わない設計方針（元テキストの部分集合であることをテストで担保、`assist.test.ts`）を維持したまま、スコアリング要素（文の位置・キーワード・数値単位・長さ）を追加/調整する形で拡張する。
- **読みやすさ評価の指標を増やす**: `readability(slide)`に新しい統計量（例: 主語の重複検出等）を追加する場合も、`hints`配列に日本語の改善提案文字列を追加する既存パターンに合わせる。
- 将来的に外部LLM APIへ差し替える場合は、D-002の設計判断（オフラインファースト優先、インタフェースの先回り設計はしない=YAGNI）を踏まえ、必要になった時点で`assist.ts`の関数シグネチャ（`summarize`/`readability`）はそのままに実装を差し替えるか、新規モジュールとして追加し呼び出し側（`EditorScreen.tsx`）の分岐で切り替える設計を検討する。

## 既知の制約・バックログ

`docs/tasks.md`のバックログ節に記載の項目（Reviewerの指摘に基づく）。

- **画像アセット欠落時の描画非対称性**（T-004 Reviewer指摘、Low/CONFIRMED）: 画像データが見つからない場合、`SlideView.tsx`はプレースホルダー枠を描画するが、`canvasRenderer.ts`は何も描画せず白紙になる。PNG/PDF出力にも同様のプレースホルダー描画を追加すると解消できる。
- **PDFのアクセシビリティ**（T-004 Reviewer指摘、Low/PLAUSIBLE）: `exportDeckAsPdf`が生成するPDFはラスター画像（PNG）のみで構成され、テキストレイヤー・画像altの代替テキストを含まないため、スクリーンリーダーでは内容を読み上げられない。テキストレイヤーの埋め込みは設計上のトレードオフ（レイアウトエンジンがDOM/Canvas共有前提のため、PDFに独自のテキスト配置を追加すると二重実装になりやすい）。
- **警告シートの要約対象が先頭ブロックのみ**（T-005 Reviewer指摘、Low/PLAUSIBLE）: 複数ブロックで同時に文字量警告が出た場合、「要約して縮める」は`layout.warnings[0].blockId`のみを対象とする。全警告ブロックへの対応が必要な場合は`EditorScreen.tsx`の`handleSummarizeBlock`呼び出し部分をループ化する。
- **フィルムストリップのタッチドラッグ**（T-003実装時の既知の制約）: 並べ替えは`pointerenter`ベースの簡易実装で、マウスでは動作確認済みだがタッチデバイスでのpointer capture挙動は実機未検証（Phase 4でもAndroid実機がないため未検証のまま）。実機入手後に優先的に確認する。
- **テキスト編集時のマーカー/強調引き継ぎ**（T-003実装時の既知の制約）: `mergeBlocks`（`src/layout/parse.ts`）はtype+text完全一致による近似的な引き継ぎのため、同一テキストの行が複数ある場合など稀にマーカーが意図しないブロックに移る可能性がある。
- **Android実機・エミュレータでの動作未検証**（T-006、本タスク）: debug APKのビルドまでは本コンテナで成功したが、実機/エミュレータでの起動・画面回転ロック・共有/保存の動作確認はUser環境で行う必要がある。詳細は[build-android.md](./build-android.md)を参照。

## テスト・ビルドコマンド

```bash
export PATH=/opt/node22/bin:$PATH
npm test          # Vitest（レイアウトエンジン・AI補助・データ検証のユニットテスト）
npm run build      # tsc --noEmit相当の型チェック + vite build
npm run preview    # ビルド成果物のプレビュー（Playwright等での実機能確認に利用）
```

Android関連のコマンドは[build-android.md](./build-android.md)を参照。
