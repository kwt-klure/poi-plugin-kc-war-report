# KC War Report

Standalone Poi plugin that turns KanColle sortie sessions and practices into a full Japanese war bulletin in a `大本営海軍報道部発表` style.

## Scope

- Reads sortie sessions from departure to return, plus single practice battles
- Generates a short `海軍省提供` bulletin and a longer report body
- Supports copying the generated report and exporting it as a `.txt` file
- Does not use LLMs or external APIs
- Persists recent reports locally across Poi restarts

## Limits

- The report is template-based and intentionally conservative
- Damage wording is derived from the latest available fleet HP snapshot and may fall back to broad phrasing
- Sorties are summarized as one overall report rather than a per-node narrative

## Validation

```bash
npm install
npm run typeCheck
npm test -- --runInBand
```
