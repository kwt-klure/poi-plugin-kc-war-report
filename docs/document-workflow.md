# Document Workflow

This note defines how Mira should handle the report-writing line for this repo.

## Core rule

- Prefer engineering stability over wording refinement.
- Collect observations and examples first; do not open a new patch just because one sentence could be prettier.
- Unless a request explicitly opens a larger project, wording work defaults to render-layer-only changes.
- When suggestions conflict with implementation reality, Mira's engineering judgment takes priority.

## Default patch boundary

For small document patches, default to touching only:

- `src/report/generate.ts`
- render-time wording selection
- report-level tests

Do not touch by default:

- `runtime`
- `model`
- `preferences`
- capture / truth source wiring
- deterministic schema / selection snapshot behavior

## Working modes

### 1. Observe only

Use when:

- an output is interesting, odd, or worth saving
- the user is tired
- it is not a good time to implement

Output:

- document type
- what works / what feels off
- why
- no patch yet

### 2. Small patch

Use when:

- the issue is local and testable
- wording / render can solve it
- no core data change is needed

Required shape:

- Goal
- Scope
- Do-not-touch
- Acceptance

Execution rule:

- write a mini plan
- patch only the local issue
- validate
- stop

### 3. Corpus pass

Use later, not by default.

This is for:

- phrase inventory
- register comparison
- collision analysis
- broader tone cleanup

Do not start this mode from a small live-test observation.

## Current priority

- Keep one-button bulk report generation stable.
- Keep truth capture correct and deterministic.
- Use sandbox as a low-cost corpus and joke-testing tool, not as a major engineering track.
- Keep document-line ideas in backlog until enough corpus exists to justify a deeper pass.

## Communication rule

- The requester provides direction, scope, boundaries, and acceptance.
- Mira owns patch planning, implementation, validation, and convergence.
- Progress chatter is good when it contains information.
- Do not repeatedly pull the requester back in as a relay PM unless there is a real blocker.

## Scope control reminders

When a patch starts growing, first ask:

> Is this actually just a wording patch?

If the answer is yes, cut scope back down.

Typical warning signs:

- trying to reorganize the whole phrase bank
- trying to rebalance every document voice at once
- trying to update README, patch notes, and version together
- trying to turn corpus gathering into immediate refactor work

## Backlog themes

These are allowed to accumulate without immediate implementation:

- register differences between standard bulletin, short bulletin, formal report, and reference report
- phrase collision and repetition
- node-level versus sortie-level truth mismatches
- what information is safe for formal reports versus public/sandbox play
