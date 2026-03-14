export type PoiEquipment = {
  api_id?: number
  api_slotitem_id?: number
  api_level?: number
  api_alv?: number
}

export type PoiEquipmentMaster = {
  api_name?: string
  api_type?: number[]
  api_saku?: number
  api_houm?: number
}

export type PoiShipStat = number | [number, number]

export type PoiShip = {
  api_id?: number
  api_ship_id?: number
  api_deck_id?: number
  api_sally_area?: number
  api_soku?: number
  api_lv?: number
  api_cond?: number
  api_karyoku?: PoiShipStat
  api_raisou?: PoiShipStat
  api_taiku?: PoiShipStat
  api_soukou?: PoiShipStat
  api_lucky?: PoiShipStat
  api_kyouka?: number[]
  api_kaihi?: PoiShipStat
  api_taisen?: PoiShipStat
  api_sakuteki?: PoiShipStat
  api_slot?: number[]
  api_slot_ex?: number
  api_locked?: number | boolean
  api_nowhp?: number
  api_maxhp?: number
  api_ndock_time?: number
}

export type PoiShipMaster = {
  api_name?: string
  api_yomi?: string
  api_stype?: number
  api_aftershipid?: string | number
  api_houg?: PoiShipStat
  api_raig?: PoiShipStat
  api_tyku?: PoiShipStat
  api_souk?: PoiShipStat
  api_luck?: PoiShipStat
}

export type PoiShipTypeMaster = {
  api_name?: string
}

export type PoiFleet = {
  api_id?: number
  api_ship?: number[]
}

export type PoiState = {
  ui: {
    activeMainTab: string
    activeFleetId?: number
    activePluginName?: string
  }
  info?: {
    ships?: Record<string, PoiShip>
    equips?: Record<string, PoiEquipment>
    fleets?: Record<string, PoiFleet> | PoiFleet[]
    decks?: Record<string, PoiFleet> | PoiFleet[]
  }
  const?: {
    $ships?: Record<string, PoiShipMaster> | PoiShipMaster[]
    $equips?: Record<string, PoiEquipmentMaster>
    $shipTypes?: Record<string, PoiShipTypeMaster> | PoiShipTypeMaster[]
  }
  plugins: { id: string; enabled: boolean; [x: string]: unknown }[]
  [x: string]: unknown
}

export type Store<S> = {
  getState: () => S
  subscribe: (listener: () => void) => () => void
}

export type StorePath = Array<string | number>
