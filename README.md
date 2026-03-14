# KC War Report

Standalone Poi plugin that turns KanColle sortie sessions and practices into a full Japanese war bulletin in a `大本営海軍報道部発表` style.

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
