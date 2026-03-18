# Patch Notes

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
