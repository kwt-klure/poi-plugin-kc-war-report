import { useTranslation } from 'react-i18next'
import { PACKAGE_NAME } from './env'

export const usePluginTranslation = () => {
  // @ts-expect-error we declared a incorrect types in i18n/index.ts
  return useTranslation(PACKAGE_NAME)
}
