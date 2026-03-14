import { Button, Callout, H5, Tag, Text } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import React, { StrictMode, useCallback } from 'react'
import styled from 'styled-components'

import PKG from '../package.json'
import { clearWarReportHistory, useWarReportHistory } from './battle/history'
import { useWarReportStyle } from './report/style'
import { usePluginTranslation } from './poi/hooks'
import { tips } from './poi/utils'

const Container = styled.div`
  display: grid;
  gap: 12px;
  padding: 14px;
  user-select: text;
`

const List = styled.ul`
  margin: 0;
  padding-left: 18px;
  color: #43505f;
`

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
`

export const SettingsMain = () => {
  const { t } = usePluginTranslation()
  const history = useWarReportHistory()
  const selectedStyle = useWarReportStyle()

  const handleClearHistory = useCallback(() => {
    clearWarReportHistory()
    tips.success(t('History cleared'))
  }, [t])

  return (
    <Container>
      <H5>{t('KC War Report')}</H5>
      <Text>{t('War report settings description')}</Text>
      <Callout intent="primary">{t('War report settings hint')}</Callout>
      <List>
        <li>{t('Settings limitation history-cap')}</li>
        <li>{t('Settings limitation battle-unit')}</li>
        <li>{t('Settings limitation japanese-output')}</li>
        <li>{t('Settings limitation template')}</li>
      </List>
      <Row>
        <Tag minimal intent="primary">
          {t('Stored reports', { count: history.entries.length })}
        </Tag>
        <Tag minimal intent="warning">
          {t('Current style', {
            style:
              selectedStyle === 'formal_after_action'
                ? t('Style formal after action')
                : selectedStyle === 'short_bulletin'
                  ? t('Style short bulletin')
                  : t('Style standard bulletin'),
          })}
        </Tag>
        <Button
          intent="warning"
          icon={IconNames.TRASH}
          text={t('Clear history')}
          onClick={handleClearHistory}
          disabled={history.entries.length === 0}
        />
      </Row>
      <Text>{t('Version', { version: PKG.version })}</Text>
    </Container>
  )
}

export const Settings = () => (
  <StrictMode>
    <SettingsMain />
  </StrictMode>
)
