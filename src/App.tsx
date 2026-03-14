import {
  Button,
  ButtonGroup,
  Callout,
  H3,
  H5,
  Intent,
  OverlaysProvider,
  Tag,
  Text,
} from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import React, { StrictMode, useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'

import {
  deleteWarReportHistoryEntry,
  selectWarReportHistoryEntry,
  useWarReportHistory,
} from './battle/history'
import type { DamageSeverity, WarReportHistoryEntry, WarReportStyle } from './battle/types'
import { buildPlainTextReport, copyReportToClipboard, exportReportToFile } from './export'
import { IN_POI } from './poi/env'
import { usePluginTranslation } from './poi/hooks'
import { tips } from './poi/utils'
import { buildWarReportFromRecord } from './report/render'
import { setWarReportStyle, useWarReportStyle } from './report/style'

const Page = styled.div`
  min-height: 100%;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(220, 204, 137, 0.12), transparent 40%),
    linear-gradient(180deg, #0d1724 0%, #101e2f 42%, #13263b 100%);
  color: #eef2f6;
`

const Shell = styled.div`
  display: grid;
  gap: 18px;
  width: min(1180px, 100%);
  margin: 0 auto;
`

const Hero = styled.div`
  display: grid;
  gap: 10px;
  padding: 22px 24px;
  border: 1px solid rgba(223, 204, 148, 0.2);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(13, 30, 46, 0.96), rgba(17, 35, 54, 0.9)),
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent);
  box-shadow: 0 22px 54px rgba(0, 0, 0, 0.28);
`

const HeroLine = styled(Text)`
  color: rgba(233, 238, 244, 0.78);
`

const SummaryGrid = styled.div`
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 340px);

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`

const MainColumn = styled.div`
  display: grid;
  gap: 18px;
`

const Sidebar = styled.div`
  display: grid;
  gap: 18px;
`

const FactsCard = styled.div`
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(127, 155, 183, 0.22);
  border-radius: 16px;
  background: rgba(11, 20, 32, 0.72);
`

const FactList = styled.div`
  display: grid;
  gap: 12px;
`

const FactRow = styled.div`
  display: grid;
  gap: 4px;
`

const FactLabel = styled(Text)`
  font-size: 12px;
  letter-spacing: 0.04em;
  color: rgba(171, 189, 208, 0.82);
  text-transform: uppercase;
`

const FactValue = styled(Text)`
  white-space: pre-wrap;
  color: #f2f5f8;
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

const StyleToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
`

const ReportCard = styled.div`
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(223, 204, 148, 0.14);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(24, 38, 54, 0.96), rgba(18, 29, 44, 0.96)),
    radial-gradient(circle at top, rgba(212, 191, 125, 0.07), transparent 45%);
`

const ReportBody = styled.pre`
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

const EmptyState = styled(Callout)`
  background: rgba(18, 29, 44, 0.82);
`

const HistoryCard = styled.div`
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid rgba(127, 155, 183, 0.22);
  border-radius: 16px;
  background: rgba(11, 20, 32, 0.72);
`

const HistoryList = styled.div`
  display: grid;
  gap: 10px;
  max-height: 520px;
  overflow-y: auto;
`

const HistoryItem = styled.button<{ $selected: boolean }>`
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid
    ${({ $selected }) =>
      $selected ? 'rgba(214, 193, 132, 0.42)' : 'rgba(127, 155, 183, 0.18)'};
  background: ${({ $selected }) =>
    $selected ? 'rgba(47, 63, 80, 0.8)' : 'rgba(13, 24, 37, 0.76)'};
  text-align: left;
  color: inherit;
  cursor: pointer;
`

const HistoryMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
`

const HistoryInfo = styled.div`
  display: grid;
  gap: 4px;
`

const HistoryOperation = styled(Text)`
  color: #f2f5f8;
`

const HistorySubline = styled(Text)`
  font-size: 12px;
  color: rgba(171, 189, 208, 0.82);
`

const HistoryItemActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
`

const damageIntentMap: Record<DamageSeverity, Intent> = {
  none: 'success',
  light: 'primary',
  moderate: 'warning',
  heavy: 'danger',
  unknown: 'none',
}

const formatHistoryTimestamp = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

const AppMain: React.FC = () => {
  const { t } = usePluginTranslation()
  const history = useWarReportHistory()
  const selectedStyle = useWarReportStyle()
  const [actionState, setActionState] = useState<{
    intent: Intent | null
    message: string
  }>({
    intent: null,
    message: '',
  })

  const selectedEntry = history.selectedEntry
  const latestEntry = history.latestEntry
  const generatedReport = useMemo(
    () =>
      selectedEntry ? buildWarReportFromRecord(selectedEntry.record, selectedStyle) : null,
    [selectedEntry, selectedStyle],
  )
  const combinedText = useMemo(
    () => (generatedReport ? buildPlainTextReport(generatedReport) : ''),
    [generatedReport],
  )

  const styleOptions: Array<{ value: WarReportStyle; label: string }> = useMemo(
    () => [
      { value: 'standard_bulletin', label: t('Style standard bulletin') },
      { value: 'formal_after_action', label: t('Style formal after action') },
      { value: 'short_bulletin', label: t('Style short bulletin') },
    ],
    [t],
  )

  const handleCopy = useCallback(async () => {
    if (!selectedEntry) {
      return
    }
    try {
      await copyReportToClipboard(combinedText)
      setActionState({ intent: 'success', message: t('War report copied') })
      tips.success(t('War report copied'))
    } catch (error) {
      console.error(error)
      setActionState({
        intent: 'danger',
        message:
          error instanceof Error
            ? `${t('Copy failed')}\n${error.message}`
            : t('Copy failed'),
      })
      tips.error(t('Copy failed'))
    }
  }, [combinedText, selectedEntry, t])

  const handleExport = useCallback(async () => {
    if (!selectedEntry) {
      return
    }
    try {
      const saved = await exportReportToFile(combinedText, selectedEntry.capturedAt)
      if (!saved) {
        setActionState({ intent: 'warning', message: t('Export canceled') })
        return
      }
      setActionState({ intent: 'success', message: t('Export success') })
      tips.success(t('Export success'))
    } catch (error) {
      console.error(error)
      setActionState({
        intent: 'danger',
        message:
          error instanceof Error
            ? `${t('Export failed')}\n${error.message}`
            : t('Export failed'),
      })
      tips.error(t('Export failed'))
    }
  }, [combinedText, selectedEntry, t])

  const handleSelectEntry = useCallback((entry: WarReportHistoryEntry) => {
    selectWarReportHistoryEntry(entry.id)
  }, [])

  const handleDeleteEntry = useCallback(
    (event: React.MouseEvent<HTMLElement>, entry: WarReportHistoryEntry) => {
      event.stopPropagation()
      deleteWarReportHistoryEntry(entry.id)
      setActionState({ intent: 'success', message: t('History entry deleted') })
      tips.success(t('History entry deleted'))
    },
    [t],
  )

  const handleSelectStyle = useCallback((style: WarReportStyle) => {
    setWarReportStyle(style)
  }, [])

  return (
    <Page>
      <Shell>
        <Hero>
          <H3>{t('KC War Report')}</H3>
          <HeroLine>{t('War report hero description')}</HeroLine>
          <Callout intent={IN_POI ? 'primary' : 'warning'} icon={IconNames.INFO_SIGN}>
            {IN_POI ? t('War report ready hint') : t('Poi environment required')}
          </Callout>
        </Hero>

        {!selectedEntry ? (
          <EmptyState intent="none" icon={IconNames.HISTORY}>
            <H5>{t('No recent battle')}</H5>
            <Text>{t('No recent battle hint')}</Text>
          </EmptyState>
        ) : (
          <SummaryGrid>
            <MainColumn>
              <ReportCard>
                <TagRow>
                  {latestEntry && selectedEntry.id === latestEntry.id ? (
                    <Tag minimal intent="success">
                      {t('Latest')}
                    </Tag>
                  ) : null}
                  <Tag minimal intent="primary">
                    {formatHistoryTimestamp(selectedEntry.capturedAt)}
                  </Tag>
                  <Tag minimal intent="warning">
                    {styleOptions.find((option) => option.value === selectedStyle)?.label ??
                      t('Style standard bulletin')}
                  </Tag>
                </TagRow>
                <H5>{t('Generated report')}</H5>
                <StyleToolbar>
                  <ButtonGroup>
                    {styleOptions.map((option) => (
                      <Button
                        key={option.value}
                        active={selectedStyle === option.value}
                        onClick={() => handleSelectStyle(option.value)}
                        text={option.label}
                      />
                    ))}
                  </ButtonGroup>
                  <Actions>
                    <Button
                      intent="primary"
                      icon={IconNames.DUPLICATE}
                      text={t('Copy report')}
                      onClick={handleCopy}
                    />
                    <Button
                      icon={IconNames.EXPORT}
                      text={t('Export txt')}
                      onClick={handleExport}
                    />
                  </Actions>
                </StyleToolbar>
                {actionState.message ? (
                  <Callout
                    intent={actionState.intent ?? 'none'}
                    icon={
                      actionState.intent === 'success'
                        ? IconNames.TICK
                        : actionState.intent === 'warning'
                          ? IconNames.WARNING_SIGN
                          : actionState.intent === 'danger'
                            ? IconNames.ERROR
                            : IconNames.INFO_SIGN
                    }
                  >
                    <Text style={{ whiteSpace: 'pre-wrap' }}>{actionState.message}</Text>
                  </Callout>
                ) : null}
                <ReportBody>{combinedText}</ReportBody>
              </ReportCard>
            </MainColumn>

            <Sidebar>
              <FactsCard>
                <H5>{t('Selected battle facts')}</H5>
                <TagRow>
                  <Tag minimal intent="primary">
                    {selectedEntry.record.winRank
                      ? `${t('Rank')} ${selectedEntry.record.winRank}`
                      : t('Rank unknown')}
                  </Tag>
                  <Tag minimal intent={damageIntentMap[selectedEntry.record.damageSummary.severity]}>
                    {selectedEntry.record.damageSummary.label}
                  </Tag>
                  <Tag
                    minimal
                    intent={selectedEntry.record.kind === 'practice' ? 'warning' : 'success'}
                  >
                    {selectedEntry.record.kind === 'practice' ? t('Practice') : t('Sortie')}
                  </Tag>
                  <Tag minimal intent={selectedEntry.status === 'failed' ? 'danger' : 'success'}>
                    {selectedEntry.status === 'failed' ? t('Failed') : t('Completed')}
                  </Tag>
                </TagRow>

                <FactList>
                  <FactRow>
                    <FactLabel>{t('Operation')}</FactLabel>
                    <FactValue>{selectedEntry.record.operationLabel}</FactValue>
                  </FactRow>
                  <FactRow>
                    <FactLabel>{t('Friendly Fleet')}</FactLabel>
                    <FactValue>{selectedEntry.record.friendlySummary}</FactValue>
                  </FactRow>
                  <FactRow>
                    <FactLabel>{t('Enemy')}</FactLabel>
                    <FactValue>{selectedEntry.record.enemyDisplay}</FactValue>
                  </FactRow>
                  <FactRow>
                    <FactLabel>{t('Damage')}</FactLabel>
                    <FactValue>{selectedEntry.record.damageSummary.detail}</FactValue>
                  </FactRow>
                </FactList>
              </FactsCard>

              <HistoryCard>
                <TagRow>
                  <H5 style={{ margin: 0 }}>{t('Battle history')}</H5>
                  <Tag minimal intent="primary">
                    {t('Stored reports', { count: history.entries.length })}
                  </Tag>
                </TagRow>

                <HistoryList>
                  {history.entries.map((entry) => (
                    <HistoryItem
                      key={entry.id}
                      type="button"
                      $selected={entry.id === selectedEntry.id}
                      onClick={() => handleSelectEntry(entry)}
                    >
                      <HistoryMeta>
                        <Tag minimal intent="primary">
                          {formatHistoryTimestamp(entry.capturedAt)}
                        </Tag>
                        <Tag minimal intent={entry.record.kind === 'practice' ? 'warning' : 'success'}>
                          {entry.record.kind === 'practice' ? t('Practice') : t('Sortie')}
                        </Tag>
                        <Tag minimal intent={entry.status === 'failed' ? 'danger' : 'success'}>
                          {entry.status === 'failed' ? t('Failed') : t('Completed')}
                        </Tag>
                      </HistoryMeta>
                      <HistoryInfo>
                        <HistoryOperation>{entry.record.operationLabel}</HistoryOperation>
                        <HistorySubline>
                          {entry.record.enemyDisplay} / {t('Rank')}{' '}
                          {entry.record.winRank ?? '?'} / {entry.record.damageSummary.label}
                        </HistorySubline>
                      </HistoryInfo>
                      <HistoryItemActions>
                        <Button
                          minimal
                          small
                          icon={IconNames.TRASH}
                          text={t('Delete')}
                          onClick={(event) => handleDeleteEntry(event, entry)}
                        />
                      </HistoryItemActions>
                    </HistoryItem>
                  ))}
                </HistoryList>
              </HistoryCard>
            </Sidebar>
          </SummaryGrid>
        )}
      </Shell>
    </Page>
  )
}

export const App = () => (
  <StrictMode>
    <OverlaysProvider>
      <AppMain />
    </OverlaysProvider>
  </StrictMode>
)
