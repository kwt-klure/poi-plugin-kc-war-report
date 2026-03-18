import { Button, Callout, FormGroup, H5, HTMLSelect, Tag, Text } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import React, { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'

import { buildPlainTextReport, copyReportToClipboard, exportReportToFile } from './export'
import { usePluginTranslation } from './poi/hooks'
import { tips } from './poi/utils'
import {
  buildSandboxReport,
  getSandboxScenarioPreset,
  SANDBOX_DOCUMENT_OPTIONS,
  SANDBOX_ENEMY_OPTIONS,
  SANDBOX_OUTCOME_OPTIONS,
  SANDBOX_SCENARIO_PRESETS,
} from './report/sandbox'

const Card = styled.div`
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(127, 155, 183, 0.22);
  border-radius: 16px;
  background: rgba(11, 20, 32, 0.72);
`

const Grid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`

const Controls = styled.div`
  display: grid;
  gap: 12px;
`

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const Preview = styled.pre`
  margin: 0;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid rgba(214, 193, 132, 0.16);
  background: rgba(9, 15, 24, 0.88);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', serif;
  line-height: 1.9;
  color: #f4ead3;
`

const SmallText = styled(Text)`
  color: rgba(171, 189, 208, 0.82);
`

const sanitizeValue = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  (allowed.includes(value as T) ? (value as T) : fallback)

export const SandboxPanel: React.FC = () => {
  const { t } = usePluginTranslation()
  const [documentKind, setDocumentKind] = useState<(typeof SANDBOX_DOCUMENT_OPTIONS)[number]['value']>(
    'pseudo_standard_bulletin',
  )
  const [scenarioId, setScenarioId] = useState(SANDBOX_SCENARIO_PRESETS[0]?.id ?? '')
  const [enemyCategory, setEnemyCategory] = useState(
    SANDBOX_SCENARIO_PRESETS[0]?.defaultEnemyCategory ?? 'air_power',
  )
  const [outcomePreset, setOutcomePreset] = useState<(typeof SANDBOX_OUTCOME_OPTIONS)[number]['value']>(
    'clean_sweep',
  )
  const [variantSeed, setVariantSeed] = useState(0)
  const [actionMessage, setActionMessage] = useState('')

  const scenarioPreset = useMemo(() => getSandboxScenarioPreset(scenarioId), [scenarioId])

  const sandboxReport = useMemo(
    () =>
      buildSandboxReport({
        documentKind,
        scenarioId,
        enemyCategory,
        outcomePreset,
        variantSeed,
      }),
    [documentKind, scenarioId, enemyCategory, outcomePreset, variantSeed],
  )

  const combinedText = useMemo(() => buildPlainTextReport(sandboxReport), [sandboxReport])

  const handleScenarioChange = useCallback((nextScenarioId: string) => {
    const preset = getSandboxScenarioPreset(nextScenarioId)
    setScenarioId(nextScenarioId)
    setEnemyCategory(preset.defaultEnemyCategory)
    setVariantSeed(0)
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await copyReportToClipboard(combinedText)
      setActionMessage(t('War report copied'))
      tips.success(t('War report copied'))
    } catch (error) {
      console.error(error)
      setActionMessage(t('Copy failed'))
      tips.error(t('Copy failed'))
    }
  }, [combinedText, t])

  const handleExport = useCallback(async () => {
    try {
      const saved = await exportReportToFile(combinedText)
      if (!saved) {
        setActionMessage(t('Export canceled'))
        return
      }
      setActionMessage(t('Export success'))
      tips.success(t('Export success'))
    } catch (error) {
      console.error(error)
      setActionMessage(t('Export failed'))
      tips.error(t('Export failed'))
    }
  }, [combinedText, t])

  return (
    <Card>
      <TagRow>
        <H5 style={{ margin: 0 }}>Sandbox / 文書遊戯</H5>
        <Tag minimal intent="primary">
          pseudo public / reference docs
        </Tag>
      </TagRow>
      <SmallText>
        用 preset 海域與敵情做假公報、假短報、戦闘参考詳報與作戦準備覚書。這一區不寫入 battle history，只是本地沙盒。
      </SmallText>
      <Callout intent="primary" icon={IconNames.APPLICATION}>
        live sortie 負責真實戰報；這裡負責把艦娘世界當成文體／情報／宣傳沙盒來玩。
      </Callout>
      <Grid>
        <Controls>
          <FormGroup label="文書種別">
            <HTMLSelect
              fill
              value={documentKind}
              onChange={(event) =>
                setDocumentKind(
                  sanitizeValue(
                    event.currentTarget.value,
                    SANDBOX_DOCUMENT_OPTIONS.map((option) => option.value) as Array<
                      (typeof SANDBOX_DOCUMENT_OPTIONS)[number]['value']
                    >,
                    'pseudo_standard_bulletin',
                  ),
                )
              }
              options={SANDBOX_DOCUMENT_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </FormGroup>
          <FormGroup label="海域 preset">
            <HTMLSelect
              fill
              value={scenarioId}
              onChange={(event) => handleScenarioChange(event.currentTarget.value)}
              options={SANDBOX_SCENARIO_PRESETS.map((preset) => ({
                value: preset.id,
                label: preset.label,
              }))}
            />
          </FormGroup>
          <FormGroup label="敵情主題">
            <HTMLSelect
              fill
              value={enemyCategory}
              onChange={(event) =>
                setEnemyCategory(
                  sanitizeValue(
                    event.currentTarget.value,
                    SANDBOX_ENEMY_OPTIONS.map((option) => option.value) as Array<
                      (typeof SANDBOX_ENEMY_OPTIONS)[number]['value']
                    >,
                    scenarioPreset.defaultEnemyCategory,
                  ),
                )
              }
              options={SANDBOX_ENEMY_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </FormGroup>
          <FormGroup label="戰果口徑">
            <HTMLSelect
              fill
              value={outcomePreset}
              onChange={(event) =>
                setOutcomePreset(
                  sanitizeValue(
                    event.currentTarget.value,
                    SANDBOX_OUTCOME_OPTIONS.map((option) => option.value) as Array<
                      (typeof SANDBOX_OUTCOME_OPTIONS)[number]['value']
                    >,
                    'clean_sweep',
                  ),
                )
              }
              options={SANDBOX_OUTCOME_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </FormGroup>
          <TagRow>
            <Tag minimal intent="success">
              {scenarioPreset.label}
            </Tag>
            <Tag minimal intent="warning">
              {scenarioPreset.referenceSubject}
            </Tag>
          </TagRow>
          <Actions>
            <Button
              icon={IconNames.REFRESH}
              text="別稿生成"
              onClick={() => setVariantSeed((current) => current + 1)}
            />
            <Button
              intent="primary"
              icon={IconNames.DUPLICATE}
              text={t('Copy report')}
              onClick={handleCopy}
            />
            <Button icon={IconNames.EXPORT} text={t('Export txt')} onClick={handleExport} />
          </Actions>
          {actionMessage ? <Callout intent="none">{actionMessage}</Callout> : null}
        </Controls>
        <Preview>{combinedText}</Preview>
      </Grid>
    </Card>
  )
}
