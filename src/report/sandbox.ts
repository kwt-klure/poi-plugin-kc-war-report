import {
  buildDamageAssessment,
  buildFleetCompositionText,
  normalizeFriendlyReportName,
  toSimpleKanji,
  normalizeSortieSession,
} from '../battle/model'
import type {
  BattleNodeCapture,
  EnemyCategory,
  FleetShipSnapshot,
  GeneratedWarReport,
  NormalizedWarReportRecord,
  SortieSessionCapture,
} from '../battle/types'

import { buildWarReportFromRecord } from './render'

export type SandboxDocumentKind =
  | 'pseudo_standard_bulletin'
  | 'pseudo_short_bulletin'
  | 'reference_report'
  | 'planning_memo'

export type SandboxOutcomePreset =
  | 'clean_sweep'
  | 'measured_success'
  | 'propaganda_recovery'
  | 'battered_glory'

export type SandboxScenarioPreset = {
  id: string
  label: string
  operationLabelRaw: string
  operationPhraseRaw: string
  mapLabel: string | null
  nodeTrail: string[]
  fleet: Array<{
    nameJa: string
    typeNameJa: string
    typeId: number
    maxHp: number
  }>
  flagshipNameRaw: string
  mvpNameRaw: string
  defaultEnemyCategory: EnemyCategory
  defaultEnemyDeckNameRaw: string
  referenceSubject: string
  referencePurpose: string
  referenceHighlights: string[]
  planningHighlights: string[]
  publicHooks: string[]
}

export type SandboxInput = {
  documentKind: SandboxDocumentKind
  scenarioId: string
  enemyCategory: EnemyCategory
  outcomePreset: SandboxOutcomePreset
  variantSeed?: number
  generatedAt?: number
}

const dateToJapanese = (timestamp: number) => {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()

  if (year >= 2019) {
    return `令和${toSimpleKanji(year - 2018)}年${toSimpleKanji(month)}月${toSimpleKanji(day)}日`
  }

  return `${year}年${month}月${day}日`
}

const hashString = (input: string) => {
  let value = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

const enemyDisplayByCategory: Record<EnemyCategory, string> = {
  submarine_force: '敵潜航兵力',
  patrol_force: '敵前衛部隊',
  main_force: '敵主力部隊',
  air_power: '敵航空兵力',
  transport_group: '敵輸送船団',
  land_force: '敵離島拠点',
  generic_force: '敵部隊',
}

const enemyFixtureByCategory: Record<
  EnemyCategory,
  { deck: string; ships: string[]; sawAirAttack: boolean; antiAirScreen: boolean }
> = {
  submarine_force: {
    deck: '敵深海潜水艦隊',
    ships: ['潜水ヨ級', '潜水ソ級', '潜水カ級'],
    sawAirAttack: false,
    antiAirScreen: false,
  },
  patrol_force: {
    deck: '敵前衛部隊',
    ships: ['軽巡ホ級', '駆逐イ級', '駆逐ロ級'],
    sawAirAttack: false,
    antiAirScreen: false,
  },
  main_force: {
    deck: '敵主力部隊',
    ships: ['戦艦ル級', '空母ヲ級', '重巡ネ級', '軽巡ツ級'],
    sawAirAttack: true,
    antiAirScreen: true,
  },
  air_power: {
    deck: '敵航空兵力',
    ships: ['空母ヲ級', '軽母ヌ級', '軽巡ツ級'],
    sawAirAttack: true,
    antiAirScreen: true,
  },
  transport_group: {
    deck: '敵輸送船団',
    ships: ['輸送ワ級', '駆逐イ級', '軽巡ホ級'],
    sawAirAttack: false,
    antiAirScreen: false,
  },
  land_force: {
    deck: '敵離島拠点',
    ships: ['飛行場姫', '砲台小鬼', '集積地棲姫'],
    sawAirAttack: true,
    antiAirScreen: false,
  },
  generic_force: {
    deck: '敵部隊',
    ships: ['重巡リ級', '軽巡ホ級', '駆逐イ級'],
    sawAirAttack: false,
    antiAirScreen: false,
  },
}

export const SANDBOX_SCENARIO_PRESETS: SandboxScenarioPreset[] = [
  {
    id: 'southwest-air',
    label: '南西諸島近海航空戦',
    operationLabelRaw: '南西諸島近海',
    operationPhraseRaw: '南西諸島近海',
    mapLabel: null,
    nodeTrail: ['Node 3', 'Node 4', 'Node 8'],
    fleet: [
      { nameJa: '伊401', typeNameJa: '潜水空母', typeId: 14, maxHp: 20 },
      { nameJa: '伊400', typeNameJa: '潜水空母', typeId: 14, maxHp: 19 },
      { nameJa: '伊13', typeNameJa: '潜水空母', typeId: 14, maxHp: 18 },
      { nameJa: '伊14', typeNameJa: '潜水空母', typeId: 14, maxHp: 18 },
      { nameJa: '伊19', typeNameJa: '潜水艦', typeId: 13, maxHp: 14 },
      { nameJa: '伊8', typeNameJa: '潜水艦', typeId: 13, maxHp: 15 },
    ],
    flagshipNameRaw: '伊401',
    mvpNameRaw: '伊19',
    defaultEnemyCategory: 'air_power',
    defaultEnemyDeckNameRaw: '敵航空兵力',
    referenceSubject: '敵航空兵力邀撃参考',
    referencePurpose: '同方面ニ於ケル敵航空攻撃頻度並出現兵力傾向ヲ整理シ、次回邀撃要領ノ参考ニ供ス。',
    referenceHighlights: [
      '敵航空兵力ハ多点出現ノ傾向ヲ示シ、前衛・護衛・主力各部隊ニ航空戦力を附随セシム。',
      '終末交戦点ニ於テハ空母ヲ級等ヲ含ム主力編成出現ノ公算高シ。',
      '潜水艦隊運用時ニ於テモ交戦回数増加ニ伴フ被発見危険ノ上昇ヲ警戒スベシ。',
    ],
    planningHighlights: [
      '索敵・回避優先ニシテ、長丁場ノ連続交戦ヲ前提トス。',
      '攻勢公報ヲ前提トスル場合、敵航空企図挫折ノ口径ヲ主軸トスルコト。',
      '実戦詳報起稿時ハ各交戦点ノ被害推移ヲ明記シ、公報系文言ト混同セザルコト。',
    ],
    publicHooks: ['敵航空攻勢ヲ挫折', '敵航空企図ヲ粉砕', '敵航空兵力ニ大戦果'],
  },
  {
    id: 'route-74',
    label: '昭南本土航路護衛',
    operationLabelRaw: '昭南本土航路',
    operationPhraseRaw: '昭南本土航路',
    mapLabel: '7-4',
    nodeTrail: ['Node B', 'Node G', 'Node J'],
    fleet: [
      { nameJa: '瑞鳳', typeNameJa: '軽空母', typeId: 7, maxHp: 45 },
      { nameJa: '山汐丸', typeNameJa: '強襲揚陸艦', typeId: 17, maxHp: 44 },
      { nameJa: '夕張', typeNameJa: '軽巡洋艦', typeId: 3, maxHp: 39 },
      { nameJa: '海防艦一号', typeNameJa: '海防艦', typeId: 1, maxHp: 18 },
      { nameJa: '海防艦二号', typeNameJa: '海防艦', typeId: 1, maxHp: 18 },
      { nameJa: '時雨', typeNameJa: '駆逐艦', typeId: 2, maxHp: 31 },
    ],
    flagshipNameRaw: '瑞鳳',
    mvpNameRaw: '海防艦一号',
    defaultEnemyCategory: 'submarine_force',
    defaultEnemyDeckNameRaw: '敵深海潜水艦隊',
    referenceSubject: '海上護衛参考',
    referencePurpose: '同航路ニ於ケル護衛戦要領及潜航敵出現傾向ヲ整理シ、次回船団護衛ノ基礎資料ト為ス。',
    referenceHighlights: [
      '同航路ニ於テハ潜航敵出現頻度高ク、対潜先制可能艦ノ配置効果大ナリ。',
      '終末交戦点ニ於テ護送船団邀撃部隊ノ随伴水上兵力混入例アリ。',
      '長距離護衛ニ於テハ護衛空母ノ航空支援有無ニヨリ安定度顕著ニ変動ス。',
    ],
    planningHighlights: [
      '対潜要員ノ枚数確保ヲ第一トシ、火力過重編成ヲ避ク。',
      '短報起稿時ハ護衛成功・航路確保ヲ主語トシ、個艦被害ハ原則省略ス。',
      '敵主力接触時ノ撤収判断ハ別紙艦隊保全基準ニ従フコト。',
    ],
    publicHooks: ['敵潜航企図ヲ挫折', '航路護衛成ル', '敵潜航兵力ニ大打撃'],
  },
  {
    id: 'peacock-64',
    label: 'ピーコック島沖上陸支援',
    operationLabelRaw: '中部北海域ピーコック島沖',
    operationPhraseRaw: '中部北海域ピーコック島沖',
    mapLabel: '6-4',
    nodeTrail: ['Node M', 'Node N', 'Node Boss'],
    fleet: [
      { nameJa: '神州丸', typeNameJa: '揚陸艦', typeId: 17, maxHp: 39 },
      { nameJa: '最上', typeNameJa: '航空巡洋艦', typeId: 5, maxHp: 50 },
      { nameJa: '霞', typeNameJa: '駆逐艦', typeId: 2, maxHp: 31 },
      { nameJa: '朝潮', typeNameJa: '駆逐艦', typeId: 2, maxHp: 31 },
      { nameJa: '秋津洲', typeNameJa: '水上機母艦', typeId: 16, maxHp: 36 },
      { nameJa: '由良', typeNameJa: '軽巡洋艦', typeId: 3, maxHp: 43 },
    ],
    flagshipNameRaw: '神州丸',
    mvpNameRaw: '最上',
    defaultEnemyCategory: 'land_force',
    defaultEnemyDeckNameRaw: '敵離島拠点',
    referenceSubject: '離島再攻略参考',
    referencePurpose: '敵離島拠点攻撃ノ要領並上陸支援編成ノ勘所ヲ整理シ、再攻略準備ノ参考ニ供ス。',
    referenceHighlights: [
      '陸上目標出現海域ニシテ、通常対艦火力偏重ノ編成ハ効率劣ル。',
      '輸送・対地支援兵装ノ搭載有無ニヨリ最終効果大キク変動ス。',
      '護衛駆逐ノ生残性確保ガ上陸支援持続ニ直結ス。',
    ],
    planningHighlights: [
      '対地兵装搭載優先、夜戦火力偏重編成ヲ避ク。',
      '公報起稿時ハ敵離島拠点猛撃・敵守備企図挫折ノ口径ヲ主トス。',
      '参考詳報ニ於テハ陸上攻撃準備ノ有無ヲ明瞭ニ記スコト。',
    ],
    publicHooks: ['敵離島拠点ヲ猛撃', '敵守備企図ヲ挫折', '上陸支援成ル'],
  },
  {
    id: 'ceylon-45',
    label: 'リランカ島沖迎撃',
    operationLabelRaw: 'カレー洋リランカ島沖',
    operationPhraseRaw: 'カレー洋リランカ島沖',
    mapLabel: '4-5',
    nodeTrail: ['Node D', 'Node H', 'Node Boss'],
    fleet: [
      { nameJa: '長門', typeNameJa: '戦艦', typeId: 8, maxHp: 90 },
      { nameJa: '陸奥', typeNameJa: '戦艦', typeId: 8, maxHp: 89 },
      { nameJa: '加賀', typeNameJa: '正規空母', typeId: 11, maxHp: 79 },
      { nameJa: '翔鶴', typeNameJa: '正規空母', typeId: 11, maxHp: 78 },
      { nameJa: '熊野', typeNameJa: '航空巡洋艦', typeId: 5, maxHp: 50 },
      { nameJa: '矢矧', typeNameJa: '軽巡洋艦', typeId: 3, maxHp: 47 },
    ],
    flagshipNameRaw: '長門',
    mvpNameRaw: '加賀',
    defaultEnemyCategory: 'main_force',
    defaultEnemyDeckNameRaw: '敵主力部隊',
    referenceSubject: '敵東洋艦隊再集結状況参考',
    referencePurpose: '同方面ニ於ケル敵主力再集結傾向及迎撃態勢ノ要点ヲ整理シ、交戦想定資料ト為ス。',
    referenceHighlights: [
      '敵主力編成ハ戦艦・空母混成ノ場合多ク、前進経路次第ニ被害傾向急変ス。',
      '高速機動編成ノ採否ニヨリ前衛戦回避可否変化スル旨各種資料ニ見ユ。',
      '迎撃側ハ航空・水上打撃双方ノ均衡ヲ保ツ要アリ。',
    ],
    planningHighlights: [
      '高速・重量打撃ノ両案ヲ比較準備シ、索敵値不足ヲ避ク。',
      '短報起稿時ハ敵主力迎撃成功・制海権保持ヲ前面ニ押シ出スコト。',
      '参考文書ニ於テハ分岐条件由来ノ不確実性ヲ明記スベシ。',
    ],
    publicHooks: ['敵主力ニ大打撃', '敵企図ヲ挫折', '制海権ヲ確保'],
  },
]

const outcomeLabels: Record<SandboxOutcomePreset, string> = {
  clean_sweep: '大捷想定',
  measured_success: '戦果確保',
  propaganda_recovery: '王前勧退でも公報勝利',
  battered_glory: '損害甚大でも大本営発表',
}

export const SANDBOX_OUTCOME_OPTIONS = (
  Object.entries(outcomeLabels) as Array<[SandboxOutcomePreset, string]>
).map(([value, label]) => ({ value, label }))

const documentKindLabels: Record<SandboxDocumentKind, string> = {
  pseudo_standard_bulletin: '擬制標準公報',
  pseudo_short_bulletin: '擬制短報',
  reference_report: '戦闘参考詳報',
  planning_memo: '作戦準備覚書',
}

export const SANDBOX_DOCUMENT_OPTIONS = (
  Object.entries(documentKindLabels) as Array<[SandboxDocumentKind, string]>
).map(([value, label]) => ({ value, label }))

export const SANDBOX_ENEMY_OPTIONS = (
  Object.entries(enemyDisplayByCategory) as Array<[EnemyCategory, string]>
).map(([value, label]) => ({ value, label }))

const getScenarioPreset = (scenarioId: string) =>
  SANDBOX_SCENARIO_PRESETS.find((preset) => preset.id === scenarioId) ?? SANDBOX_SCENARIO_PRESETS[0]!

const buildFleetFromPreset = (
  preset: SandboxScenarioPreset,
  outcomePreset: SandboxOutcomePreset,
): FleetShipSnapshot[] =>
  preset.fleet.map((ship, index) => {
    const startHp = ship.maxHp
    let endHp = ship.maxHp

    if (outcomePreset === 'measured_success' && index === 0) {
      endHp = Math.max(1, Math.floor(ship.maxHp * 0.72))
    }

    if (outcomePreset === 'propaganda_recovery') {
      if (index === 0) {
        endHp = Math.max(1, Math.floor(ship.maxHp * 0.22))
      } else if (index === 1) {
        endHp = Math.max(1, Math.floor(ship.maxHp * 0.46))
      }
    }

    if (outcomePreset === 'battered_glory') {
      if (index === 0 || index === 1) {
        endHp = Math.max(1, Math.floor(ship.maxHp * 0.22))
      } else if (index === 2) {
        endHp = Math.max(1, Math.floor(ship.maxHp * 0.44))
      }
    }

    return {
      instanceId: index + 1,
      shipId: 9000 + index,
      nameJa: ship.nameJa,
      typeId: ship.typeId,
      typeNameJa: ship.typeNameJa,
      level: 99 - index,
      startHp,
      endHp,
      maxHp: ship.maxHp,
    }
  })

const buildPseudoBattles = (
  preset: SandboxScenarioPreset,
  enemyCategory: EnemyCategory,
  fleet: FleetShipSnapshot[],
  startedAt: number,
  outcomePreset: SandboxOutcomePreset,
): BattleNodeCapture[] => {
  const fixture = enemyFixtureByCategory[enemyCategory]
  const damageSummary = buildDamageAssessment(fleet)
  const winRank =
    outcomePreset === 'clean_sweep'
      ? 'S'
      : outcomePreset === 'measured_success'
        ? 'A'
        : 'A'

  return preset.nodeTrail.map((nodeLabel, index) => ({
    occurredAt: startedAt + index * 180000,
    mode: index === preset.nodeTrail.length - 1 ? 'boss' : 'normal',
    nodeLabel,
    operationLabelRaw: preset.operationLabelRaw,
    operationPhraseRaw: preset.operationPhraseRaw,
    friendlyFleet: fleet,
    enemyDeckNameRaw: fixture.deck,
    enemyShipNamesRaw: fixture.ships,
    winRank,
    damageSummary,
    sawAirAttack: fixture.sawAirAttack,
    antiAirScreen: fixture.antiAirScreen,
    flagshipNameRaw: preset.flagshipNameRaw,
    mvpNameRaw: index === preset.nodeTrail.length - 1 ? preset.mvpNameRaw : null,
  }))
}

const buildPseudoSortieSession = (
  preset: SandboxScenarioPreset,
  enemyCategory: EnemyCategory,
  outcomePreset: SandboxOutcomePreset,
  generatedAt: number,
): SortieSessionCapture => {
  const fleet = buildFleetFromPreset(preset, outcomePreset)
  const startedAt = generatedAt

  return {
    id: `sandbox:${preset.id}:${enemyCategory}:${outcomePreset}:${generatedAt}`,
    startedAt,
    updatedAt: startedAt + preset.nodeTrail.length * 180000,
    mapLabel: preset.mapLabel,
    operationLabelRaw: preset.operationLabelRaw,
    operationPhraseRaw: preset.operationPhraseRaw,
    friendlyFleetInitial: fleet.map((ship) => ({ ...ship, endHp: ship.startHp })),
    friendlyFleetLatest: fleet,
    nodeTrail: preset.nodeTrail,
    battles: buildPseudoBattles(preset, enemyCategory, fleet, startedAt, outcomePreset),
  }
}

const buildPseudoRecord = (
  preset: SandboxScenarioPreset,
  enemyCategory: EnemyCategory,
  outcomePreset: SandboxOutcomePreset,
  generatedAt: number,
): { record: NormalizedWarReportRecord; sortie: SortieSessionCapture } => {
  const sortie = buildPseudoSortieSession(preset, enemyCategory, outcomePreset, generatedAt)
  const status =
    outcomePreset === 'propaganda_recovery' || outcomePreset === 'battered_glory'
      ? 'failed'
      : 'completed'

  return {
    record: normalizeSortieSession(sortie, status),
    sortie,
  }
}

const buildReferenceReport = (
  preset: SandboxScenarioPreset,
  record: NormalizedWarReportRecord,
  generatedAt: number,
): GeneratedWarReport => ({
  bulletin: ['戦闘参考詳報', dateToJapanese(generatedAt), `於 ${preset.operationPhraseRaw}`].join('\n'),
  body: [
    `件名：${preset.operationPhraseRaw}ニ於ケル${preset.referenceSubject}`,
    '',
    '一、目的。',
    `　${preset.referencePurpose}`,
    '二、我方兵力概況。',
    `　${buildFleetCompositionText(record.friendlyFleet)}。旗艦「${record.flagshipName ?? normalizeFriendlyReportName(preset.flagshipNameRaw)}」。`,
    '三、敵情判断。',
    `　総括判断　${enemyDisplayByCategory[record.enemyCategory]}ヲ擁スル敵部隊。`,
    ...preset.referenceHighlights.map((line) => `　${line}`),
    '四、交戦想定。',
    `　交戦点想定数　${toSimpleKanji(Math.max(record.nodeCount, 1))}。`,
    `　主作戦口径　${preset.publicHooks.join('／')}。`,
    '五、附記。',
    '　本資料ハ海域既知情報ヲ基礎トスル参考資料ニシテ、実況詳報ニ非ズ。',
    '',
    '以上',
  ].join('\n'),
})

const buildPlanningMemo = (
  preset: SandboxScenarioPreset,
  record: NormalizedWarReportRecord,
  generatedAt: number,
): GeneratedWarReport => ({
  bulletin: ['作戦準備覚書', dateToJapanese(generatedAt), `於 ${preset.operationPhraseRaw}`].join('\n'),
  body: [
    `件名：${preset.operationPhraseRaw}方面行動準備要点`,
    '',
    '一、想定目的。',
    `　${preset.referencePurpose}`,
    '二、敵情要約。',
    `　${enemyDisplayByCategory[record.enemyCategory]}ヲ主眼トス。`,
    '三、準備事項。',
    ...preset.planningHighlights.map((line) => `　${line}`),
    '四、広報想定。',
    `　公表用口径ハ「${preset.publicHooks[0]}」系統ヲ主トシ、被害細目ハ原則省略ス。`,
    '五、附記。',
    '　本覚書ハ海域資料整理用ノ私案ニシテ、実況戦闘記録ニ非ズ。',
    '',
    '以上',
  ].join('\n'),
})

export const buildSandboxReport = (input: SandboxInput): GeneratedWarReport => {
  const preset = getScenarioPreset(input.scenarioId)
  const generatedAt = input.generatedAt ?? Date.now()
  const variantSeed =
    input.variantSeed ??
    hashString(
      JSON.stringify({
        documentKind: input.documentKind,
        scenarioId: input.scenarioId,
        enemyCategory: input.enemyCategory,
        outcomePreset: input.outcomePreset,
        generatedAt,
      }),
    )
  const { record, sortie } = buildPseudoRecord(
    preset,
    input.enemyCategory,
    input.outcomePreset,
    generatedAt,
  )

  switch (input.documentKind) {
    case 'pseudo_standard_bulletin':
      return buildWarReportFromRecord(record, 'standard_bulletin', { variantSeed })
    case 'pseudo_short_bulletin':
      return buildWarReportFromRecord(record, 'short_bulletin', { variantSeed })
    case 'reference_report':
      return buildReferenceReport(preset, record, generatedAt)
    case 'planning_memo':
    default:
      return buildPlanningMemo(preset, record, generatedAt)
  }
}

export const getSandboxScenarioPreset = getScenarioPreset
