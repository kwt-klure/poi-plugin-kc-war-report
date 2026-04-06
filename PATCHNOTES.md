# Patch Notes

## 0.4.12

This workspace adds a second aviation-facing truth-event line:

- anti-air credit is still its own feature
- carrier-loss-implied embarked aircraft loss is now tracked separately

The point is not to simulate the whole air battle.
The point is to let old-style reports do the obvious old-style thing:
if enemy carriers are ruined, the documents should also know how to talk about the aircraft that went down with them.

この workspace では、航空戦関連の truth-event をもう一段追加しました。

- 防空戦果は従来どおり独立機能
- 敵空母損失に伴う艦載機喪失 line を新たに別管理

狙いは航空戦 simulator 化ではありません。
敵空母が重創以上となったなら、老派 generator もまた艦載機喪失を順当に書けるようにすることです。

### Changed

- `truth capture`
  - enemy carrier heavy-loss heuristic から `CarrierAirLossSummary` を拾う
  - enemy carrier aircraft total base is wired from ship master `api_maxeq`
- `硬派詳報`
  - 第五節に carrier-air-loss line を自然追加
  - 数字は truth-first、語尾は保守寄り
- `標準公報`
  - 艦載機喪失を独立の公報句として追加
  - 数字は fixed propaganda bands で浮報
- `短報`
  - 第三 bullet は carrier-air-loss を優先
  - `防空戦果` bullet より headline 性の高い艦載機喪失 line を採用
- `README`
  - `敵艦載機喪失` の出力イメージを追加
  - 既存の `防空戦果` 例も `機` 付き表記へ同期

### Validation

Checked with:

```bash
npm test -- --runInBand src/__tests__/runtime.spec.ts src/__tests__/report.spec.ts
npm run typeCheck
npm test -- --runInBand
git diff --check
```

All checks passed in this workspace.

## 0.4.11

This release adds a small anti-air truth-event layer and routes it back into all three live report voices.

It is intentionally narrow:

- no deck binding changes
- no admiral identity / rank detection changes
- no preferences changes
- no model-layer rewrite
- no sandbox feature expansion

Instead, it teaches the reports how to remember defensive anti-air work and how to let the public layer lie about it like a proper headquarters bulletin.

この release は、小さな防空戦闘 truth-event を追加し、それを live 三文書へ戻す patch です。

範囲は意図的に狭く保っています。

- deck binding 変更なし
- 提督 identity / rank 検出変更なし
- preferences 変更なし
- model 層の大改修なし
- sandbox 機能拡張なし

今回やったのは、防空の功績を三文書が思い出せるようにし、その上で public layer には大本営らしく数を吹かせることです。

### Changed

- `truth capture`
  - battle node に最小 `AntiAirSummary` を追加
  - `api_air_fire` と航空 phase の敵機損失から、防空功績の truth event を拾う
- `硬派詳報`
  - node ごとに `防空戦果` を出せるようになった
  - 敵機撃墜数は truth-first の数値または保守表現を使う
  - `対空CI` などの玩家機制語は出さない
- `標準公報`
  - 防空戦闘を根拠に、具体的な敵機撃滅数を大本営口調で浮報できるようになった
- `短報`
  - 防空戦果を headline 級 bullet に持ち上げられるようになった
  - `標準公報` より強い数値で吹く
- `README`
  - public layer が具体的な浮報数を使える方針へ同期
  - 防空戦果の出力イメージを追加

### Validation

Checked with:

```bash
npm test -- --runInBand src/__tests__/runtime.spec.ts src/__tests__/report.spec.ts
npm run typeCheck
npm test -- --runInBand
git diff --check
```

All checks passed in this workspace.

## 0.4.10

This release is a render-layer corpus polish pass.

It keeps the truth-capture core stable:

- no runtime changes
- no model changes
- no preferences changes
- no deck binding changes
- no admiral identity / rank detection changes
- no deterministic schema changes

Instead, it tightens document register separation across both live reports and sandbox documents.

この release は render-layer の corpus polish pass です。

truth-capture の core には触れていません。

- runtime 変更なし
- model 変更なし
- preferences 変更なし
- deck binding 変更なし
- 提督 identity / rank 検出変更なし
- deterministic schema 変更なし

今回触れたのは live report と sandbox document の文種分離と register 調整です。

### Changed

- `硬派詳報`
  - cleaner `交戦概要` inventories with less same-beat repetition inside one report
  - more stable conservative node-level damage phrasing
  - fixed long-term formal label usage around `敵情総括 / 行動総括`
  - keeps `殊勲` concentrated in the final summary instead of node-by-node narration
- `標準公報`
  - clearer semantic progression between initiative, result claim, and closing
  - calmer official register with less same-meaning restatement
  - retains an orderly public-announcement voice distinct from `短報`
- `短報`
  - keeps the three-bullet dispatch identity
  - uses more bulletin-like record/closing lines
  - avoids directly reusing standard-bulletin core wording
- `sandbox`
  - `参考詳報` and `作戦準備覚書` now read more like staff/reference documents and less like reshaped live battle reports
- `README`
  - updated anonymized examples to better reflect the current render-layer register split

### Validation

Checked with:

```bash
git diff --check
```

Also validated by:

- targeted report/sandbox wording assertions in the existing test suite
- render-layer smoke inspection after the corpus polish changes

`jest` / `tsc` CLI still showed local environment hang behavior in this workspace, so CLI completion was not used as the sole success signal for this release.

## 0.4.9

This release is a small voice-tuning patch.

It does **not** change the truth-capture core:

- no runtime capture changes
- no deck binding changes
- no admiral identity / rank detection changes
- no changes to the player-facing sender / recipient data path

Instead, it tightens the writing layer only.

この release は小さな文風調整 patch です。

truth-capture の core には触れていません。

- runtime capture 変更なし
- deck binding 変更なし
- 提督 identity / rank 検出変更なし
- sender / recipient data path 変更なし

今回触れたのは writing layer のみです。

### Changed

- `標準公報`
  - slightly more bureaucratic and orderly public phrasing
  - calmer official closing lines
  - a little less modern-summary wording
- `短報`
  - a harder bulletin / posted-notice feel
  - sharper dispatch-like closings
- `硬派詳報`
  - slightly cleaner cold-register findings
  - more consistent `戦闘後判定` phrasing
- `README`
  - clarified why the three document voices exist
  - clarified why the short bulletin is intentionally funny

### Validation

Checked with:

```bash
git diff --check
```

Also smoke-tested the public and formal generators directly with local fixture data to confirm:

- report generation still succeeds
- the patch only affects wording layers
- no core admiral / fleet capture paths were modified in this release

## 0.4.8

This release fixes a truth-layer bug that could mix fleets when the sortie was launched from a non-first deck.

If a sortie started from deck 4 or another non-default fleet, some parts of the report could still fall back to deck 1 data. That made outputs look confused rather than playful:

- composition and flagship could reflect the real sortie fleet
- while MVP / distinguished ship / damage summary could leak from the first fleet
- and some public reports could over-promote the battle into an air-engagement headline

This release fixes that source-of-truth split.

この release では、第一艦隊以外から出撃した際に艦隊情報が混線する truth-layer bug を修正しました。

第四艦隊などから出撃した場合でも、一部の欄位だけ第一艦隊へ fallback してしまい、

- 編成や旗艦は実際の sortie fleet
- しかし MVP / 殊勲 / 被害摘要は第一艦隊
- さらに public report が航空邀撃ふうに膨らむ

という「for fun ではなく単におかしい」出力になり得ました。

今回の修正はこの source-of-truth split を塞ぐものです。

### Fixed

- Locked sortie deck identity at sortie start and kept it through node, result, and return-to-port processing
- Stopped battle-level report fields from silently falling back to deck 1 when `api_deck_id` was missing
- Kept composition, flagship, MVP / distinguished ship, and damage summary on the same fleet source
- Tightened `air_power` inference so `sawAirAttack` alone no longer turns a surface encounter into an air battle headline
- Added regression coverage for non-first-fleet sorties and false air-power promotion

### Validation

Validated with:

```bash
npm run typeCheck
npm test -- --runInBand
```

## Current Working Update

This update is the roadmap's **Phase 1**.
The goal was not to turn the plugin into a complete battle parser yet.
The goal was to make the three report identities feel clearly different, while keeping the formal report more truthful.

この更新は roadmap の **Phase 1** です。
目標は plugin をいきなり完全な battle parser にすることではなく、
三つの文書人格をきちんと分けつつ、硬派詳報をより truth-first に寄せることでした。

### Added

- Deterministic phrase-bank rendering for `標準公報` and `短報`
- Stable per-entry rendered reports in history
- Formal report addressing preferences
- Admiral identity detection from Poi API responses
- Truth-oriented `硬派詳報` structure with chapter sections and node sections

### Changed

- `標準公報` / `短報`
  - now behave more clearly like propaganda-facing outputs
  - can exaggerate tone and soften losses
  - do not print fabricated precise counts such as aircraft shot-down numbers
- `硬派詳報`
  - no longer shares the same rhetorical attitude as the public bulletin styles
  - sender now stands on the player admiral side
  - recipient is configurable
  - missing detail is written as `未詳` / `細目未詳` instead of being invented

### Important Design Boundary

The plugin still does **not**:

- persist full raw API packets
- output exact shell counts or torpedo counts
- act as a full replay / battle analysis viewer
- fully parse every special battle shape in the game

plugin はまだ以下をしません。

- full raw API packet の永続保存
- 砲弾数 / 魚雷数の exact output
- replay viewer / full battle analyzer 化
- game 内の全特殊 battle shape の完全 parse

### Not Finished Yet

These are intentionally left for later phases:

- Minimal battle action ledger for `硬派詳報`
  - attacker / defender
  - damage
  - phase
  - used equipment ids
  - attack round occurrence
- Wider support for more battle packet shapes
- Richer truth-side detail for the formal report
- More phrase banks and more sample-driven style tuning

未完了の部分は意図的に後段へ回しています。

- `硬派詳報` 用の最小 battle action ledger
  - attacker / defender
  - damage
  - phase
  - used equipment ids
  - attack round occurrence
- battle packet shape の対応拡張
- truth-side の detail 強化
- phrase bank と作例ベース調整の増量

### Validation

Validated with:

```bash
npm run typeCheck
npm test -- --runInBand
```
