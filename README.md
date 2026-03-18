# KC War Report

Poi plugin for turning KanColle sortie results into IJN-flavored documents, bulletins, and local pseudo reports.

Poi 用の、艦これ sortie 結果を IJN 風の文書・公報・擬制報告へ変換する plugin です。

![KC War Report GUI](assets/gui-overview.png)

## What This Project Is

This project is a **for-fun local writing / intelligence / propaganda sandbox built on top of KanColle**.

It is not trying to become:

- a full battle analyzer
- a replay viewer
- a historical simulator

Instead, it takes the facts the plugin actually knows and rewrites them into different wartime document voices.

この project は、**艦これを土台にした for-fun のローカル文体 / 情報 / 宣伝 sandbox** です。

目指しているのは、

- 完全な battle analyzer
- replay viewer
- 史実再現 simulator

ではありません。

plugin が実際に取得できた事実を、別の戦時文書人格へ書き換えることを目的にしています。

## Core Principle

Because this plugin is **for fun**, user-facing wording should feel closer to something an IJN-style document might plausibly say than to raw KanColle UI text.

That means:

- keep game data internally when useful for logic
- prefer IJN-flavored wording in user-facing text
- avoid leaking raw `S / A / B` UI wording into `硬派詳報`
- write `未詳` / `細目未詳` instead of inventing missing detail
- allow `標準公報` and `短報` to exaggerate, but do not invent precise numbers the repo does not know

この plugin は **for fun** だからこそ、user-facing text は「艦これ UI の言い換え」よりも「IJN 文書がそれらしく書きそうな字面」に寄せることを優先します。

つまり、

- 論理判断に必要な game data は内部で保持してよい
- ただし user-facing text は IJN 風の言い回しを優先する
- `硬派詳報` に raw な `S / A / B` UI 文言を漏らさない
- 書けない detail は捏造せず `未詳` / `細目未詳` と書く
- `標準公報` と `短報` は誇張してよいが、repo が知らない精密な数字は作らない

## Truth Policy Split

The plugin has two different truth policies.

### `硬派詳報`

- internal report
- written as if a front-line commander is reporting upward
- truth-first

### `標準公報` / `短報`

- public propaganda layer
- written as if headquarters is announcing results to the public
- allowed to exaggerate, soften losses, and distort tone

この plugin には二つの truth policy があります。

### `硬派詳報`

- internal report
- 前線艦隊司令が上級へ報告する文書
- truth-first

### `標準公報` / `短報`

- public propaganda layer
- 大本営が対外発表する公告文
- 誇張、損害の矮小化、 tone の歪曲を許容

## What It Does Now

### 1. Live sortie documents

From a real captured sortie or practice, the plugin can render three document styles:

- `標準公報`
  - a formal headquarters-style bulletin
  - public propaganda voice
  - rewrites the real result into a polished public statement
- `短報`
  - a short dispatch / bulletin style report
  - more compressed and more shameless than `標準公報`
  - not just a shorter paragraph, but a bulletin-like structure
- `硬派詳報`
  - a truth-first internal report
  - chaptered structure with encounter sections
  - says `未詳` when detail is missing

実際に capture された sortie / 演習一件から、現在は三種類の文書を生成できます。

- `標準公報`
  - 大本営正式公告風
  - public propaganda の声
  - 真実を対外向けの官様文へ加工する
- `短報`
  - 逐号速報 / dispatch 風
  - `標準公報` より短く、尖っており、より露骨に吹く
  - 単なる短縮 prose ではなく bulletin 形式
- `硬派詳報`
  - truth-first の内部報告
  - 章立てと交戦点小節を持つ
  - detail が足りない所は `未詳` と書く

### 2. Local sandbox documents

The main page also includes a `Sandbox / 文書遊戯` panel that can generate:

- `擬制標準公報`
- `擬制短報`
- `戦闘参考詳報`
- `作戦準備覚書`

This panel:

- does not write into live battle history
- does not require a real sortie
- exists to treat KanColle as a writing / intelligence / propaganda toybox

主画面には `Sandbox / 文書遊戯` panel もあり、以下を生成できます。

- `擬制標準公報`
- `擬制短報`
- `戦闘参考詳報`
- `作戦準備覚書`

この panel は、

- live battle history に書き込まない
- 実 sortie を必要としない
- 艦これ世界を文体 / 情報 / 宣伝の遊び場として扱う

## Captured Facts

The live line currently captures a conservative, safe fact set:

- one sortie session from departure to return
- one practice result
- fleet composition, flagship, MVP
- broad result category and damage state
- broad enemy classification
- node trail
- some safe battle-context signals
- admiral identity from Poi API when available

It is **not**:

- a full battle replay
- a per-action combat analyzer
- a shell-count / torpedo-count tracker

live line が現在取得するのは、保守的で安全な fact set です。

- 出撃から帰投までの sortie session 一件
- 演習結果一件
- 編成、旗艦、MVP
- おおまかな戦果分類と損害状態
- 大分類としての敵情
- node trail
- 安全に使える範囲の battle context
- Poi API から取得可能な提督 identity

これは、

- full battle replay
- per-action combat analyzer
- 砲弾数 / 魚雷数 tracker

ではありません。

## What It Intentionally Does Not Do

- It does not store full raw API packets in history
- It does not try to become a complete battle viewer
- It does not output exact shell / torpedo / shot-down counts that it cannot verify
- It does not merge `硬派詳報` with propaganda logic
- It does not fabricate technical detail just for flavor

- full raw API packet を history に保存しない
- 完全な battle viewer を目指さない
- 確認不能な砲弾数 / 魚雷数 / 撃墜数を出さない
- `硬派詳報` と propaganda logic を混ぜない
- 史味だけのために技術 detail を捏造しない

## Example Output Direction

The exact text is no longer a single hard-coded template.
Saved entries keep stable wording, but different entries can choose different phrasing families.

以下の固有名は README 用の去識別化サンプルです。

### `標準公報`

```text
大本営海軍部発表

令和八年三月十四日

ブルネイ泊地沖方面、敵潜航企図ヲ挫折

敵潜航兵力ニ打撃ヲ与ヘ、大ナル戦果ヲ収メタリ

帝国海軍出撃部隊ハ、同方面ニ於テ敵潜航兵力ノ蠢動ヲ察知シ、直ニ之ヲ邀撃セリ。
爾後反復攻撃ヲ加ヘ、敵企図ヲ挫折セシメ、海上交通保全ノ目的ヲ概ネ達成セリ。
```

### `硬派詳報`

```text
戦闘詳報
令和八年三月十四日
於 ブルネイ泊地沖

発：海軍少将 某
宛：聯合艦隊司令部

件名：ブルネイ泊地沖ニ於ケル敵潜航兵力交戦詳報

一、任務概要。
　令和八年三月十四日、ブルネイ泊地沖方面ニ於テ対潜警戒行動ニ従事。
　敵潜航兵力ト接触後、所定海面ノ警戒及掃蕩ヲ継続セリ。
二、参加兵力。
　駆逐艦二隻、軽巡洋艦一隻。旗艦「ジョンストン」。
三、敵情。
　敵情判断　敵潜水兵力。
　交戦点数　二。
四、戦闘経過。
【第一交戦点】
　交戦時刻　1234
　敵情　敵深海潜水艦隊前衛。確認艦種 潜水ソ級、潜水カ級。
　交戦結果　敵ニ打撃ヲ与ヘ、交戦目的ニ照ラシ概ネ良好ナリ。
　交戦概要　対潜警戒下ニ於ケル交戦。砲雷戦細目未詳。
　我方被害　被害認メズ。
　戦闘後判定　「ジョンストン」殊勲艦ト認定。

【第二交戦点】
　交戦時刻　1240
　敵情　敵深海潜水艦隊。確認艦種 潜水ヨ級、潜水カ級。
　交戦結果　敵ニ有効ナル打撃ヲ加ヘ、所定行動概ネ支障ナシ。
　交戦概要　航空攻撃ヲ伴フ交戦。砲雷戦細目未詳。
　我方被害　我方損害ナシ。
　戦闘後判定　「アトランタ」殊勲ト認ム。
五、戦果。
　戦果総括　敵ニ有効打撃ヲ与ヘ、所定行動ヲ完遂。
　敵情総括　敵潜水兵力ニ対シ所定ノ戦闘行動ヲ実施。
六、被害。
　大破艦　ナシ
　中破艦　ナシ
　軽微損傷艦　ナシ
　摘要　被害艦ヲ認メズ。
七、所見。
　対潜警戒処置概ネ適切ナリ。
　交戦経過ヲ通ジ部隊行動概ネ支障ナシ。

以上
```

### `短報`

```text
大本営海軍部発表

令和八年三月十四日

ブルネイ泊地沖方面、敵企図ヲ粉砕

一、我軍、直ニ之ヲ邀撃セリ。
二、敵潜航企図ヲ挫折セシメタリ。
三、戦果顕著ナリ。
```

## Sandbox Direction

The sandbox does not pretend to be a real battle recorder.
It is for:

- pseudo public generation
- reference / planning documents
- turning map impressions and enemy themes into documents

In other words:

- KanColle is the source material
- writing, intelligence, and propaganda are the play space

sandbox は実 battle recorder を装うためのものではありません。
用途は以下です。

- pseudo public generation
- reference / planning documents
- 海域印象や敵情主題の文書化

つまり、

- 艦これは素材
- 文体、情報、宣伝が遊び場

## Install

### Quick install

```bash
npm install 'git+https://github.com/kwt-klure/poi-plugin-kc-war-report.git' --prefix "$HOME/Library/Application Support/poi/plugins"
```

Then:

1. Restart Poi or reload the plugin list
2. Enable `KC War Report`
3. Run one sortie or practice, or open the sandbox panel directly
4. Open the plugin tab

次の手順:

1. Poi を再起動するか plugin list を reload する
2. `KC War Report` を有効化する
3. sortie / 演習を一回走らせるか、sandbox panel を直接開く
4. plugin tab を開く

### Install from source

```bash
git clone https://github.com/kwt-klure/poi-plugin-kc-war-report.git
cd poi-plugin-kc-war-report
npm install
npm pack --pack-destination dist
npm install "./dist/poi-plugin-kc-war-report-0.4.8.tgz" --prefix "$HOME/Library/Application Support/poi/plugins"
```

### Update

Run the same install command again, or repack from source and reinstall the newest tarball.

同じ install command を再実行するか、source から再 pack して最新版 tarball を入れ直してください。

## Settings

Current `硬派詳報` settings:

- whether to use detected admiral identity as sender
- fallback sender line
- recipient line

The admiral name / rank source is the current Poi session:

- `/kcsapi/api_get_member/basic`
- `/kcsapi/api_port/port`

If not available, the plugin falls back to the manual sender line.

現在の `硬派詳報` 設定:

- 検出した提督 identity を sender に使うか
- fallback sender line
- recipient line

提督名 / 軍銜の source は現在の Poi session における:

- `/kcsapi/api_get_member/basic`
- `/kcsapi/api_port/port`

取得できない場合は manual sender line に fallback します。

## Validation

```bash
npm install
npm run typeCheck
npm test -- --runInBand
```

## Patch Notes

See [PATCHNOTES.md](PATCHNOTES.md).
