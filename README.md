# KC War Report

Standalone Poi plugin that turns KanColle sortie sessions and practices into a full Japanese war bulletin in a `大本営海軍報道部発表` style.

Poi plugin that turns a finished sortie into a shameless `大本営` bulletin, a cold internal `戦闘詳報抄`, or a short official notice.

## Example output

One sortie, three document identities:

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

## Quick install

For macOS + Poi, the fastest install path is:

```bash
npm install 'git+https://github.com/kwt-klure/poi-plugin-kc-war-report.git' --prefix "$HOME/Library/Application Support/poi/plugins"
```

Then:

1. Restart Poi, or reload the plugin list.
2. Open the plugin panel and enable `KC War Report`.
3. Run a sortie or practice battle, then open the plugin tab.

## Update

Run the same command again to pull the latest version:

```bash
npm install 'git+https://github.com/kwt-klure/poi-plugin-kc-war-report.git' --prefix "$HOME/Library/Application Support/poi/plugins"
```

## Install from source

If you want to build from a local checkout instead:

```bash
git clone https://github.com/kwt-klure/poi-plugin-kc-war-report.git
cd poi-plugin-kc-war-report
npm install
npm pack --pack-destination dist
npm install "./dist/poi-plugin-kc-war-report-0.4.6.tgz" --prefix "$HOME/Library/Application Support/poi/plugins"
```

## Scope

- Reads sortie sessions from departure to return, plus single practice battles
- Generates a short `海軍省提供` bulletin and a longer report body
- Includes three render modes: `標準公報`, `硬派詳報`, and `短報`
- Supports copying the generated report and exporting it as a `.txt` file
- Does not use LLMs or external APIs
- Persists recent reports locally across Poi restarts

## Limits

- The report is template-based and intentionally conservative
- Damage wording is derived from the latest available fleet HP snapshot and may fall back to broad phrasing
- Sorties are summarized as one overall report rather than a per-node narrative
- macOS + Poi is the primary tested install path right now

## Validation

```bash
npm install
npm run typeCheck
npm test -- --runInBand
```
