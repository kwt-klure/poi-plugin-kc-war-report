# Document Observations — 2026-03-29

This note is an observation memo for future corpus / register work.

It is **not**:

- a new patch plan
- an immediate implementation spec
- a request to expand phrase banks right now

It exists so future register passes can return to concrete examples instead of relying on chat history.

## A. `戦闘詳報`

### 1. Conservative node-level damage wording is working

Current wording such as:

- `損傷細目後報`
- `被害アリ。節別判定未詳`

is moving in the right direction because it avoids node lines colliding with section 6 damage summary.

Keep observing:

- whether this conservative style becomes too formulaic over time
- whether 2-3 same-register conservative variants are eventually needed

Do not expand this now.

### 2. `交戦概要` still has some template proximity

Current examples such as:

- `交戦経過概ネ順調、航空関係細目未詳。`
- `航空関係ヲ伴フ交戦。砲雷戦細目未詳。`

are better than before, but still feel like near-neighbors within the same family.

Future observation target:

- a very small inventory for formal `交戦概要`
- still dry, conservative, and official
- less same-beat repetition within one report

### 3. Keeping `殊勲` in the final summary is correct

Live tests suggest:

- node-by-node `殊勲` reads like a game MVP sheet
- concentrating it in `所見` / final summary feels more like a formal staff document

Future observation target:

- whether one ship per formal report should become the stable default
- whether rare two-ship emphasis is acceptable without drifting back into per-node commendation

### 4. Section 5 is now structurally cleaner

The split between:

- `戦果総括`
- `敵情総括`
- `行動総括`

is clearly cleaner than the previous mixed label.

Future observation target:

- whether `敵情所見` or `敵情総括` should become the long-term formal label
- decide later, after more corpus exists

## B. `標準公報`

### 1. Pulling back from `甚大ナル圧力` was the right move

Returning to wording like:

- `有効打撃`
- `打撃ヲ加ヘタリ`
- `敵企図ヲ挫折セシメタリ`

feels more stable for standard public bulletins.

Future observation target:

- which of these becomes the most durable core public wording
- do not lock a larger phrase-bank decision yet

### 2. Standard bulletins can still sometimes double-hit the same meaning

Example pattern:

- `直ニ之ヲ制圧セリ`
- followed by `敵主力ニ打撃ヲ加ヘタリ`

This is not wrong, but it can feel like the same semantic beat is pushed twice.

Future observation target:

- improve semantic progression across headline / lead / closing
- avoid same-beat restatement without turning it into a rewrite project

### 3. The volume gap versus `短報` is now good

Current direction is working:

- `標準公報` = can boast, but stays orderly
- `短報` = harder, shorter, more dispatch-like

Keep this boundary stable.

## C. `短報`

### 1. Three-bullet structure plus `右、発表ス。` works

The short bulletin line now has its own clear identity.

### 2. Hard sentences like `本戦果ヲ録ス。` are promising

That phrasing feels closer to bulletin / record language than to paragraph-style public prose.

Future observation target:

- keep short bulletins from colliding too directly with standard bulletin core lines
- keep the current skeleton unless a stronger corpus-level reason appears

## D. Sandbox / corpus-level observations

### 1. The multi-document chain is now real

The sandbox is already proving out a chain of document types:

- command documents
- implementation rules
- posted notices
- public bulletins
- formal reports
- reference reports

That means this is no longer a one-off joke; it is becoming a usable document corpus.

### 2. The fun is in document-role separation, not just individual phrases

The more important future question is not only phrase choice, but:

- what each document class is supposed to do
- which tone belongs to which bureaucratic layer
- which jokes work because the document function itself makes them funny

### 3. `参考` / memo-like documents have real potential

Reference-style output has shown that:

- battle reports are not the only interesting form
- staff memo / fake-serious reference documents may become one of the strongest sandbox directions

Worth collecting more examples later.

## E. Workflow observations

### 1. Wording discussion expands scope very easily

So wording discussion and engineering patches should stay separate.

### 2. Sandbox should currently stay a corpus tool

Its short-term role is:

- testing register differences
- collecting references
- saving observations

not fully polishing every generator path right now.

### 3. Papa should not be pulled back into manual PM relay work

This round already showed that Mira can:

- scope patches
- hold boundaries
- validate them

So future observation capture should stay lightweight.

## Summary

What matters here is not "which sentence to change next".

What matters is recording:

- which patches have already proven effective
- which document boundaries are already working
- which areas still have refinement potential
- and which items should wait for a later corpus / register pass
