import { buildPlainTextReport } from '../export'
import { buildSandboxReport, SANDBOX_SCENARIO_PRESETS } from '../report/sandbox'

describe('sandbox document generator', () => {
  const scenarioId = SANDBOX_SCENARIO_PRESETS[0]?.id ?? 'southwest-air'

  it('renders pseudo standard bulletins through the public bulletin pipeline', () => {
    const report = buildSandboxReport({
      documentKind: 'pseudo_standard_bulletin',
      scenarioId,
      enemyCategory: 'air_power',
      outcomePreset: 'clean_sweep',
      variantSeed: 1,
      generatedAt: Date.UTC(2026, 2, 18, 9, 0, 0),
    })

    expect(report.bulletin).toContain('大本営海軍部発表')
    expect(report.bulletin).toContain('南西諸島近海')
    expect(report.body).toContain('帝国海軍出撃部隊ハ')
    expect(report.body).not.toContain('撃墜')
  })

  it('renders pseudo short bulletins as numbered dispatches', () => {
    const report = buildSandboxReport({
      documentKind: 'pseudo_short_bulletin',
      scenarioId,
      enemyCategory: 'submarine_force',
      outcomePreset: 'battered_glory',
      variantSeed: 2,
      generatedAt: Date.UTC(2026, 2, 18, 9, 5, 0),
    })

    expect(report.bulletin).toContain('大本営海軍部発表')
    expect(report.body).toContain('一、')
    expect(report.body).toContain('二、')
    expect(buildPlainTextReport(report)).toMatch(/粉砕|圧倒|赫々|壊滅的|殲滅的/)
  })

  it('renders reference reports as non-live supporting documents', () => {
    const report = buildSandboxReport({
      documentKind: 'reference_report',
      scenarioId,
      enemyCategory: 'air_power',
      outcomePreset: 'measured_success',
      generatedAt: Date.UTC(2026, 2, 18, 9, 10, 0),
    })

    expect(report.bulletin).toContain('戦闘参考詳報')
    expect(report.body).toContain('実況詳報ニ非ズ')
    expect(report.body).toContain('敵情判断')
  })

  it('renders planning memos as preparatory documents instead of war reports', () => {
    const report = buildSandboxReport({
      documentKind: 'planning_memo',
      scenarioId,
      enemyCategory: 'main_force',
      outcomePreset: 'propaganda_recovery',
      generatedAt: Date.UTC(2026, 2, 18, 9, 15, 0),
    })

    expect(report.bulletin).toContain('作戦準備覚書')
    expect(report.body).toContain('広報想定')
    expect(report.body).toContain('実況戦闘記録ニ非ズ')
  })
})
