# KC War Report

Poi plugin for turning KanColle sortie and practice results into IJN-flavored
reports, headquarters bulletins, and local pseudo documents.

Poi 用の、艦これ sortie / 演習結果を IJN 風の詳報・公報・擬制文書へ変換する
plugin です。

![KC War Report GUI](https://raw.githubusercontent.com/kwt-klure/poi-plugin-kc-war-report/main/assets/gui-overview.png)

## Quick View

KC War Report is a **for-fun local writing / intelligence / propaganda sandbox**
built on top of KanColle.

It is not a battle analyzer, replay viewer, or historical simulator. It takes
the facts the plugin can safely know and rewrites them through wartime document
voices.

KC War Report は、艦これを素材にした **ローカル文体 / 情報 / 宣伝 sandbox**
です。

battle analyzer、replay viewer、史実 simulator ではありません。plugin が安全に
把握できる事実を、戦時文書の声へ書き換えるための玩具です。

The toy comes first. Accuracy supplies the premise; the public voices turn that
premise into an entertaining headquarters announcement without an LLM.

この plugin はまず玩具です。accuracy は材料の根を支え、public voice はその材料を
LLM なしで愉快な大本営発表へ編成します。

## Design Principle

The core rule is simple:

- keep game data internally when it helps logic
- write user-facing text as wartime-style document prose
- say `未詳` / `細目未詳` when detail is not available
- let `標準公報` and `短報` exaggerate when a real event basis exists
- do not make `硬派詳報` lie just because the public voices are allowed to

中心方針は単純です。

- logic に必要な game data は内部で保持する
- user-facing text は戦時文書らしい字面を優先する
- detail が足りない所は `未詳` / `細目未詳` と書く
- event basis がある場合、`標準公報` と `短報` は大きく吹いてよい
- public voice が吹くからといって、`硬派詳報` まで嘘をつかせない

## Document Voices

The three live voices are not three lengths of one report. They are three
different bureaucratic masks for the same sortie.

| Voice | Reader | Truth Policy | Flavor |
| --- | --- | --- | --- |
| `硬派詳報` | command / internal staff | truth-first | dry, chaptered, conservative |
| `標準公報` | public announcement | propaganda | official, orderly, inflated |
| `短報` | clipped dispatch / notice | propaganda | terse, overconfident, shameless |

三つの live voice は、同じ report の長短差ではありません。同じ sortie を三つの
官僚的な仮面で見るためのものです。

| Voice | 読者 | Truth policy | 調子 |
| --- | --- | --- | --- |
| `硬派詳報` | 上級司令部 / 内部幕僚 | truth-first | 乾いた章立て、保守的 |
| `標準公報` | 対外発表 | propaganda | 官様、整然、浮報可 |
| `短報` | 掲示・回覧・引用される速報 | propaganda | 短く、強く、面の皮が厚い |

## What It Does

### Live Reports

From a captured sortie or practice, the plugin can render:

- `標準公報`
- `短報`
- `硬派詳報`

The live line can currently use:

- sortie session from departure to return
- practice result
- fleet composition, flagship, and MVP
- broad result category and damage state
- broad enemy classification and node trail
- safe battle-context signals
- admiral identity from Poi API when available

live capture からは以下を生成できます。

- `標準公報`
- `短報`
- `硬派詳報`

現在利用できる事実は以下です。

- 出撃から帰投までの sortie session
- 演習結果
- 編成、旗艦、MVP
- おおまかな戦果分類と損害状態
- 大分類としての敵情と node trail
- 安全に使える battle-context signal
- Poi API から取得できる場合の提督 identity

### Special Battle Claims

The plugin also preserves a few kinds of useful but easy-to-miss work:

- defensive anti-air events from visible `api_air_fire`
- enemy plane loss from visible air phases
- enemy carrier aircraft-loss estimates when carrier damage and master slot data
  are available
- enemy flagship sinking when aligned enemy HP arrays show the first enemy ship at
  zero HP

These are document-facing truth events. They make the documents more fun without
turning the plugin into a full battle parser.

この plugin は、damage ledger だけでは見落とされやすい働きも少し拾います。

- visible `api_air_fire` からの防空戦闘 event
- visible air phase からの敵機損失
- 敵空母被害と master slot data が揃う場合の艦載機喪失 estimate
- 敵 HP 配列が揃い、敵一番艦 HP がゼロになった場合の敵旗艦撃沈

これらは文書向けの truth event です。完全な battle parser になるためではなく、
文書側が「見えにくい戦功」を忘れないために使います。

### Sandbox Documents

The main page also includes a `Sandbox / 文書遊戯` panel.

It can generate:

- `擬制標準公報`
- `擬制短報`
- `戦闘参考詳報`
- `作戦準備覚書`

The sandbox does not write into live battle history and does not require a real
sortie. It treats KanColle as source material for writing, intelligence, and
propaganda play.

主画面には `Sandbox / 文書遊戯` panel もあります。

生成できるものは以下です。

- `擬制標準公報`
- `擬制短報`
- `戦闘参考詳報`
- `作戦準備覚書`

sandbox は live battle history に書き込まず、実 sortie も必要としません。艦これを
文体・情報・宣伝の遊び場として扱うための場所です。

## Truth Boundaries

### `硬派詳報`

`硬派詳報` is truth-first.

It may record:

- defensive anti-air credit
- exact enemy plane loss when the visible source exists
- conservative carrier-air-loss estimates
- confirmed enemy flagship sinking
- distinguished-ship findings based on a strong named anti-air contribution

It should avoid raw game-mechanic wording such as `対空CI`, `カットイン`, `slot`,
`trigger`, and `proc`.

`硬派詳報` は truth-first です。

記録できるものは以下です。

- 防空戦果
- source が見える場合の敵機損失
- 保守的な敵艦載機喪失 estimate
- 確認済みの敵旗艦撃沈
- 艦名付きの強い防空戦果に基づく殊勲艦認定

ただし `対空CI`、`カットイン`、`slot`、`trigger`、`proc` のような game-mechanic
語は user-facing text に出しません。

### Public Voices

`標準公報` and `短報` are allowed to distort tone and inflate counts when the truth
layer has a concrete event basis.

They should promote the best available claim into visible slots. A strong sortie
should not fall back to generic copy if the plugin already knows about air
defense, carrier-air loss, or enemy flagship sinking.

`標準公報` と `短報` は、truth layer に event basis がある場合、tone を歪めたり数を
浮かせたりできます。

最も吹ける材料は、headline、lead、または numbered bullet の目立つ位置へ上げるべき
です。防空戦果、敵艦載機喪失、敵旗艦撃沈を知っているのに、generic な勝利文へ戻る
べきではありません。

`標準公報` chooses public claims in this order: enemy flagship sinking, enemy
carrier aircraft loss, numeric anti-air success, transport, submarine, air,
main force, then generic copy. Two or more concrete claims become a numbered
`現在迄ニ判明セル戦果` inventory; one remains a single sentence.

Public aircraft counts are deterministic rhetoric, not measurements. One saved
report may say `百四十余機`, `約百四十機`, `百二十乃至百六十機`, or
`百四十機（内不確実三十機）`; the chosen wording is reused wherever that claim
appears in the same report.

`標準公報` は、敵旗艦撃沈、敵母艦艦載機喪失、数値付き防空戦果、輸送、潜水、航空、
主力、generic の順に材料を選びます。具体的戦果が二件以上なら
`現在迄ニ判明セル戦果` の numbered inventory にし、一件だけなら従来どおり単独句に
します。

public aircraft count は測定値ではなく deterministic な公報口径です。一つの保存済み
report は `百四十余機`、`約百四十機`、`百二十乃至百六十機`、または
`百四十機（内不確実三十機）` の一つを選び、同じ report 内では同じ表現を使います。

When a sortie fails, `標準公報` still announces that the prescribed objective was
achieved and the force transferred elsewhere. `短報` remains an unqualified
victory notice, while `硬派詳報` records damage and withdrawal truthfully.

sortie が失敗した場合も、`標準公報` は所定目的の達成と他方面への転進を発表します。
`短報` はなお無条件の大捷を宣し、`硬派詳報` だけが損害と離脱を照実に記録します。

### What It Does Not Do

KC War Report intentionally does not:

- store full raw API packets in history
- become a full battle viewer
- infer shell, torpedo, or shot-by-shot detail
- invent exact counts in the truth-first `硬派詳報`
- treat heavy damage as sinking
- infer enemy flagship sinking from S-rank alone
- assign enemy flagship sinking to a friendly ship without attacker attribution
- merge `硬派詳報` truth policy with propaganda logic

KC War Report は意図的に以下をしません。

- full raw API packet を history に保存しない
- 完全な battle viewer にならない
- 砲撃、雷撃、一手ごとの detail を推論しない
- truth-first の `硬派詳報` で確認不能な exact count を捏造しない
- 大破を撃沈扱いしない
- S 勝だけから敵旗艦撃沈を推論しない
- attacker attribution なしに敵旗艦撃沈を特定の友軍艦へ割り当てない
- `硬派詳報` の truth policy と propaganda logic を混ぜない

## Example Output

The exact text is not a single hard-coded template. Saved entries keep stable
wording, but different entries can choose different phrasing families.

The examples below show direction, not a promise that every sortie uses the same
phrases.

以下は出力方針の例です。実際の文面は固定 template ではなく、entry ごとに安定した
phrasing family を選びます。

### `標準公報`

```text
大本営海軍部発表

令和八年五月二十六日

タウイタウイ泊地沖方面作戦、敵旗艦「戦艦レ級」ヲ撃沈

敵旗艦「戦艦レ級」撃沈ニ依リ敵指揮系統ヲ混乱セシム

帝国海軍出撃部隊ハ、同方面ニ於テ敵主力部隊ト接触シ、直ニ之ヲ邀撃セリ。
敵主力企図ヲ挫折セシメタリ。

現在迄ニ判明セル戦果概ネ左ノ如シ。
一、敵旗艦「戦艦レ級」ヲ撃沈、敵戦列ヲ潰乱セシメタリ。
二、敵母艦群損失ニ伴ヒ、艦載機約二百機喪失セリ。
三、殊ニ「初月」ノ防空戦闘鋭甚ニシテ、敵機約百四十機ヲ撃滅セリ。

「初月」ノ防空奮戦、殊勲ト認ム。

大本営海軍部ハ本行動ノ成果ヲ公表ス。
```

### `短報`

```text
大本営海軍部発表

令和八年三月十四日

ブルネイ泊地沖方面、敵企図ヲ粉砕

一、我軍、直ニ之ヲ邀撃セリ。
二、敵潜航企図ヲ挫折セシメタリ。
三、右、発表ス。
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
二、参加兵力。
　駆逐艦二隻、軽巡洋艦一隻。旗艦「ジョンストン」。
三、敵情。
　敵情総括　敵潜水兵力。
　交戦点数　二。
四、戦闘経過。
【第二交戦点】
　交戦時刻　1240
　敵情　敵深海潜水艦隊。確認艦種 潜水ヨ級、潜水カ級。
　交戦結果　敵ニ有効ナル打撃ヲ加ヘ、所定行動概ネ支障ナシ。
　交戦概要　砲雷戦経過概略把握ニ止マル。
　我方被害　損傷艦ヲ認メズ。
五、戦果。
　戦果総括　敵ニ有効打撃ヲ与ヘ、所定行動ヲ完遂。
　敵情総括　敵潜水兵力。
　行動総括　敵潜水兵力ニ対シ所定ノ戦闘行動ヲ実施。
六、被害。
　我方損害ナシ。各艦航行並戦闘能力ニ著変ナシ。
七、所見。
　対潜警戒処置概ネ適切ナリ。
　戦闘後判定ニ於テ「ジョンストン」殊勲艦ト認定。

以上
```

## Special Claim Examples

### Defensive Anti-Air Credit

```text
　防空戦果　「初月」防空射撃ニ当リ、敵機計五十三機ヲ撃墜。
　戦闘後判定ニ於テ「初月」防空戦果顕著、殊勲艦ト認定。
```

```text
殊ニ「初月」ノ防空戦闘鋭甚ニシテ、敵機百二十乃至百六十機ヲ撃滅セリ。
```

```text
一、我軍、攻撃ヲ開始セリ。
二、「初月」奮戦、敵機百九十余機ヲ掃蕩。
三、右、発表ス。
```

### Enemy Carrier Aircraft Loss

```text
　敵空母損失ニ伴ヒ、搭載敵機計百十八機喪失ト認ム。
```

```text
敵母艦群損失ニ伴ヒ、艦載機二百機（内不確実四十機）喪失セリ。
```

```text
三、敵艦載機三百余機、母艦諸共喪失。
```

### Enemy Flagship Sinking

```text
　特記戦果　敵旗艦「戦艦レ級」撃沈ヲ確認。
```

```text
敵旗艦「戦艦レ級」ヲ撃沈、敵戦列ヲ潰乱セシメタリ。
```

```text
三、敵旗艦撃沈、戦果顕著。
```

Enemy flagship sinking is sortie-level credit unless the plugin later gains
attacker attribution.

敵旗艦撃沈は、将来 attacker attribution が入らない限り、sortie-level の特記戦果
として扱います。

## Why The Contrast Is Funny

The plugin works best when the player can see the truth and the bulletin still
refuses to admit it plainly.

- the GUI shows the human-readable reality
- `硬派詳報` records a truth-first internal version
- `標準公報` and especially `短報` reframe the same sortie into public theater

That gap is the joke.

この plugin は、提督本人が真相を見ているのに、公報だけが平然と別の顔をする時に
一番おもしろくなります。

- GUI は人間に読める現実を示す
- `硬派詳報` は truth-first の内部文書として残す
- `標準公報` と、とりわけ `短報` は同じ sortie を対外発表へ変換する

この落差そのものが笑いどころです。

![README live contrast example](https://raw.githubusercontent.com/kwt-klure/poi-plugin-kc-war-report/main/assets/readme-live-contrast-2026-03-29.png)

## Install

### Quick Install

```bash
npm install poi-plugin-kc-war-report --prefix "$HOME/Library/Application Support/poi/plugins"
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

### Install From Source

```bash
git clone https://github.com/kwt-klure/poi-plugin-kc-war-report.git
cd poi-plugin-kc-war-report
npm install
npm pack --pack-destination dist
npm install "./dist/poi-plugin-kc-war-report-0.4.15.tgz" --prefix "$HOME/Library/Application Support/poi/plugins"
```

### Update

Run the same install command again, or repack from source and reinstall the
newest tarball.

同じ install command を再実行するか、source から再 pack して最新版 tarball を入れ直
してください。

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
