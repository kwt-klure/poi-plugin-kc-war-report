# KC War Report

Standalone Poi plugin that turns KanColle sortie sessions and practices into a full Japanese war bulletin in a `大本営海軍報道部発表` style.

艦これの出撃や演習を、`大本営海軍報道部発表` 風の戦報へ変換する Poi plugin です。

Poi plugin that turns a finished sortie into a shameless `大本営` bulletin, a cold internal `戦闘詳報抄`, or a short official notice.

![KC War Report GUI](assets/gui-overview.png)

## What it does / これは何か

- `標準公報`
  - A shameless public bulletin in a Daihonei tone.
  - 大本営の対外発表らしく、堂々と大げさに書くモードです。
- `硬派詳報`
  - A cold internal after-action document.
  - 冷たく硬い内部文書として書くモードです。
- `短報`
  - A short, complete official notice that is easy to share.
  - 短くても公告らしい形を保った、共有しやすいモードです。

## Example output / 出力例

One sortie, three document identities:

同じ sortie を、三種類の文書として書き分けます。

### `標準公報`

```text
海軍省提供

令和八年三月十四日

出撃部隊、ブルネイ泊地沖ニ於テ敵潜水兵力ヲ制圧

我方損害ナク所定任務ヲ完遂

【大本営海軍報道部発表】

帝国海軍出撃部隊ノ一部ハ、令和八年三月十四日、ブルネイ泊地沖ニ於ケル行動中、敵潜水兵力ト遭遇シ、之ニ対シ攻撃ヲ実施、所定任務ヲ完遂セリ。

当時我部隊兵力ハ、駆逐艦四隻、軽巡洋艦一隻ヲ基幹トスル兵力ニシテ、旗艦「ジョンストン」ノ指揮ノ下、沈着機敏ニ行動セリ。
```

### `硬派詳報`

```text
戦闘詳報抄
令和八年三月十四日
於 ブルネイ泊地沖

発：出撃部隊指揮官
宛：上級司令部

件名：ブルネイ泊地沖ニ於ケル敵潜水兵力遭遇戦闘ノ件

一、我出撃部隊ハ、令和八年三月十四日、ブルネイ泊地沖ニ於ケル行動中、敵潜水兵力ト遭遇セリ。
二、当時我兵力ハ、駆逐艦四隻、軽巡洋艦一隻ヲ以テ編成、旗艦「ジョンストン」之ヲ率ヰタリ。
三、各艦直ニ戦闘配置ニ移行、敵ニ対シ攻撃ヲ実施セリ。

七、所見。
　対潜戦闘処置、任務達成ニ資ス。
　「ヴェールヌイ」ノ行動、寄与スル所アリ。
```

### `短報`

```text
海軍省提供

令和八年三月十四日

ブルネイ泊地沖ニ於テ敵潜水兵力ヲ制圧
出撃部隊、小損害アリト雖モ任務完遂

【大本営発表】
帝国海軍出撃部隊ノ一部ハ、ブルネイ泊地沖ニ於テ敵潜水兵力ト交戦シ、之ヲ制圧セリ。
我方小損害アリ。
所定任務ヲ完遂セリ。
殊ニ「ヴェールヌイ」奮戦顕著ナリ。
```

## Quick install / クイックインストール

For macOS + Poi, the fastest install path is:

macOS + Poi なら、いちばん簡単な導入方法はこれです。

```bash
npm install 'git+https://github.com/kwt-klure/poi-plugin-kc-war-report.git' --prefix "$HOME/Library/Application Support/poi/plugins"
```

Then:

その後:

1. Restart Poi, or reload the plugin list.
   Poi を再起動するか、plugin list を再読込します。
2. Open the plugin panel and enable `KC War Report`.
   plugin panel で `KC War Report` を有効化します。
3. Run a sortie or practice battle, then open the plugin tab.
   出撃または演習を一度行い、plugin tab を開きます。

## Update / 更新

Run the same command again to pull the latest version:

最新版へ更新する時も、同じコマンドをもう一度実行すれば大丈夫です。

```bash
npm install 'git+https://github.com/kwt-klure/poi-plugin-kc-war-report.git' --prefix "$HOME/Library/Application Support/poi/plugins"
```

## Install from source / ソースから導入

If you want to build from a local checkout instead:

手元で clone してから build したい場合はこちらです。

```bash
git clone https://github.com/kwt-klure/poi-plugin-kc-war-report.git
cd poi-plugin-kc-war-report
npm install
npm pack --pack-destination dist
npm install "./dist/poi-plugin-kc-war-report-0.4.6.tgz" --prefix "$HOME/Library/Application Support/poi/plugins"
```

## Scope / できること

- Reads sortie sessions from departure to return, plus single practice battles
- 出港から帰投までの sortie と、単発の演習を読み取ります
- Generates a short `海軍省提供` bulletin and a longer report body
- `海軍省提供` の短報と、より長い本文を生成します
- Includes three render modes: `標準公報`, `硬派詳報`, and `短報`
- `標準公報`、`硬派詳報`、`短報` の三つの mode を切り替えられます
- Supports copying the generated report and exporting it as a `.txt` file
- 生成した戦報をコピーしたり `.txt` として出力できます
- Does not use LLMs or external APIs
- LLM や外部 API は使いません
- Persists recent reports locally across Poi restarts
- 最近の戦報履歴をローカルに保持します

## Limits / 制限

- The report is template-based and intentionally conservative
- 戦報はテンプレート生成で、意図的に保守的な作りです
- Damage wording is derived from the latest available fleet HP snapshot and may fall back to broad phrasing
- 損害表現は取得できた最新 HP を基準にしており、場合によっては広めの表現になります
- Sorties are summarized as one overall report rather than a per-node narrative
- sortie は node ごとの実況ではなく、一篇の要約戦報としてまとめます
- macOS + Poi is the primary tested install path right now
- 現時点では macOS + Poi を主な動作確認環境としています

## Validation / 検証

```bash
npm install
npm run typeCheck
npm test -- --runInBand
```
