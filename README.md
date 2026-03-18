# KC War Report

Poi plugin that turns KanColle sortie sessions and practices into three different Japanese document personas:

- a shameless `大本営海軍報道部発表` style public bulletin
- a truth-first `戦闘詳報` style internal report
- a short official-looking notice

艦これの sortie / 演習結果を、三種類の日本語文書へ変換する Poi plugin です。

- 恥知らずなくらい大本営っぽい `標準公報`
- なるべく事実だけを書く `硬派詳報`
- 共有しやすい `短報`

This project is **for fun**.
It is not trying to become a full battle analyzer, a replay viewer, or a historical simulator.
It is a local writing engine that takes the facts the plugin actually knows and reframes them into different wartime document voices.

この project は **for fun** です。
完全な battle analyzer や replay viewer、史実再現 simulator を目指しているわけではありません。
plugin が実際に取れた事実を、別の戦時文書人格で書き換えるローカル文体 engine です。

## Core Principle / 大原則

Because this plugin is **for fun**, the writing should feel closer to something IJN documents might plausibly say than to raw KanColle UI wording.

That means:

- keep game data internally when it is useful for logic
- but prefer IJN-flavored phrasing in the user-facing text whenever possible
- avoid leaking game UI labels like raw `S / A / B` rank wording into `硬派詳報`
- when the plugin does not know enough to write something in a historically flavored way, say `未詳` / `細目未詳` instead of inventing detail

この plugin は **for fun** だからこそ、出力文は「艦これの UI をそのまま言い換えたもの」よりも、「IJN の文書がそれっぽく書きそうな字面」に寄せるのを優先します。

つまり、

- 内部では game data を保持してよい
- ただし user-facing text はできるだけ IJN 風の言い回しを優先する
- `硬派詳報` に `S / A / B` のような game UI ラベルをそのまま漏らさない
- 史実風に安全に書けない detail は、作らずに `未詳` / `細目未詳` と書く

This is the tie-break rule for future changes.
If a choice must be made between "gamey but explicit" and "more IJN-like and still honest," prefer the latter.

今後の変更で迷った時は、この原則を優先します。
「ゲームっぽいけれど露骨」か「もう少し IJN っぽく、かつ嘘をつかない」かで迷ったら、後者を取ります。

![KC War Report GUI](assets/gui-overview.png)

## What It Really Does / 本当は何をする plugin か

The plugin captures:

- one full sortie session from departure to return
- one practice battle result
- fleet composition, flagship / MVP, battle rank, broad enemy classification, damage state, node trail, and a few other safe signals

Then it renders the same captured result in three voices:

- `標準公報`
  - propaganda-first public bulletin
  - can exaggerate victory tone and minimize losses
  - intentionally does **not** print fake precise numbers such as shot-down aircraft counts
- `硬派詳報`
  - truth-first internal report
  - sender stands on the player admiral side
  - uses chaptered report structure and node sections
  - writes `未詳` / `細目未詳` when detail is not available instead of inventing it
- `短報`
  - shorter propaganda-facing official notice
  - easier to copy and share

この plugin が取るのは、

- 出港から帰投までの sortie 一件
- 単発の演習一件
- 編成、旗艦 / MVP、戦果、ざっくりした敵情、損害、node trail などの「安全に言える範囲」の事実

です。

その上で同じ capture を、

- `標準公報`
  - 宣伝優先の対外公報
  - 勝利の言い方は盛る
  - ただし撃墜数のような精密な fake 数字は出さない
- `硬派詳報`
  - 事実優先の内部文書
  - 発信者はプレイヤー提督側
  - 章立て + node ごとの節で書く
  - detail が無い所は `未詳` と書いてごまかさない
- `短報`
  - 短く切った公報
  - 共有向け

に書き分けます。

## Current Phase / 現在の実装段階

Current status is the roadmap's **Phase 1**:

- public styles now use a deterministic rhetoric engine with phrase banks
- formal report now has separate sender / recipient handling
- history keeps stable rendered text per style instead of regenerating everything differently each time
- settings now include minimal formal-report addressing controls

今は roadmap の **Phase 1** です。

- 公報系は deterministic な phrase bank を使う
- 硬派詳報は発受文の扱いを分離した
- 履歴は style ごとの描画結果を保持し、毎回別文になるのを避ける
- 設定画面に硬派詳報の最小限の発受設定を追加した

## What Is Implemented Now / 今できること

- Capture one sortie as one history entry, and one practice as one history entry
- Render three distinct styles from the same captured result
- Copy the generated text or export it as `.txt`
- Keep recent history across Poi restarts
- Keep public-style phrasing deterministic per saved entry
- Detect admiral identity from Poi API responses when available
- Use detected admiral identity as the formal report sender, or fall back to a manual sender line
- Set the formal report recipient in settings
- Keep `硬派詳報` fact-oriented and separate from public propaganda styles

## What It Does Not Do Yet / まだやっていないこと

This is important:

- It does **not** store full raw API packets in history
- It does **not** yet build a full per-action battle ledger
- It does **not** yet report exact shell counts / torpedo counts
- It does **not** try to support every strange event battle shape in Phase 1
- `硬派詳報` is more truthful now, but still summary-level in many places

ここは大事です。

- 履歴に full raw API packet は保存しません
- まだ逐次 battle action ledger は作っていません
- 砲弾何発 / 魚雷何本のような exact count はまだ出しません
- Phase 1 の段階では特殊 battle shape 全対応を目指していません
- `硬派詳報` は truth-first になったものの、まだ多くの箇所は summary-level です

## Why The Styles Behave Differently / なぜ文体ごとに態度が違うのか

The split is intentional:

- `標準公報` and `短報` are allowed to behave like wartime propaganda.
  - They can inflate tone.
  - They can soften losses.
  - They can present tactical withdrawal as a dignified transfer / regrouping style narrative.
- `硬派詳報` is not allowed to do that.
  - It should stay on the "reporting upward" side.
  - If the plugin does not know a detail, it should say so.

この分離は意図的です。

- `標準公報` と `短報` は戦時 propaganda として振る舞ってよい
  - 言い方は盛る
  - 損害は和らげる
  - 撤退も「転進」っぽく見せる
- `硬派詳報` はそれをしない
  - 上申文書の側に立つ
  - 分からない detail は分からないと書く

## Example Direction / 出力の方向性

The exact phrasing is no longer a single fixed template.
Saved entries keep stable wording, but different entries can choose different lines.

今は一枚テンプレではなく、saved entry ごとに wording を固定する方式です。
同じ履歴は安定して同じ文章になりますが、別 entry では別句を選ぶことがあります。

Representative direction:

### `標準公報`

```text
海軍省提供

令和八年三月十四日

ブルネイ泊地沖方面、敵潜水兵力ノ企図ヲ粉砕

敵潜水兵力ニ対シ主導権ヲ掌握シ作戦目的ヲ貫徹
```

### `硬派詳報`

```text
戦闘詳報
令和八年三月十四日
於 ブルネイ泊地沖

発：少将 夜詠
宛：聯合艦隊司令部

四、戦闘経過。
【第二交戦点】
　交戦時刻　1240
　敵情　敵深海潜水艦隊 II群。確認艦種 潜水ヨ級、潜水カ級。
　交戦結果　敵ニ甚大ナル打撃ヲ与ヘ、我行動概ネ所期ノ通リ。
　交戦概要　航空攻撃ヲ伴フ交戦。砲雷戦細目未詳。
```

### `短報`

```text
海軍省提供

令和八年三月十四日

ブルネイ泊地沖方面
敵企図ヲ粉砕
```

## Quick Install / クイックインストール

For macOS + Poi:

```bash
npm install 'git+https://github.com/kwt-klure/poi-plugin-kc-war-report.git' --prefix "$HOME/Library/Application Support/poi/plugins"
```

Then:

1. Restart Poi or reload the plugin list
2. Enable `KC War Report`
3. Run a sortie or a practice once
4. Open the plugin tab

## Update / 更新

Run the same install command again:

```bash
npm install 'git+https://github.com/kwt-klure/poi-plugin-kc-war-report.git' --prefix "$HOME/Library/Application Support/poi/plugins"
```

## Install From Source / ソースから導入

```bash
git clone https://github.com/kwt-klure/poi-plugin-kc-war-report.git
cd poi-plugin-kc-war-report
npm install
npm pack --pack-destination dist
npm install "./dist/poi-plugin-kc-war-report-0.4.6.tgz" --prefix "$HOME/Library/Application Support/poi/plugins"
```

## Settings / 設定

Current formal report settings:

- whether to use detected admiral identity as the sender
- fallback sender line
- recipient line

現在の硬派詳報設定:

- 検出した提督名を sender に使うか
- sender fallback
- recipient

## Validation / 検証

```bash
npm install
npm run typeCheck
npm test -- --runInBand
```

## Patch Notes / パッチノート

See [PATCHNOTES.md](PATCHNOTES.md).
