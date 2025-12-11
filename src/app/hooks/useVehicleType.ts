import { is } from 'immer/dist/internal'
import { useParams } from 'react-router-dom'
import { useAppSelector } from '.'

export type TVehicleTypeParam =
  | 'is_fourwheeler'
  | 'is_twowheeler'
  | 'is_gcv'
  | 'is_pcv'
  | 'is_miscvehicle'
  | ''

interface IVehicleType {
  name: 'Car' | 'Bike' | 'Gcv' | 'Pcv' | 'Miscellaneous' | ''
  type: 4 | 2 | 5 | 6 | 7 | 0
  param:
    | 'is_fourwheeler'
    | 'is_newvehicles_4W'
    | 'is_twowheeler'
    | 'is_newvehicles_2W'
    | 'is_gcv'
    | 'is_newvehicles_gcv'
    | 'is_pcv'
    | 'is_newvehicles_pcv'
    | 'is_miscvehicle'
    | 'is_newvehicles_misc'
    | ''
  vehicleTypeText:
    | 'Private Car'
    | 'Two Wheeler'
    | 'Goods Carrying Vehicle'
    | 'Public Carrying Vehicle'
    | 'Miscellaneous Vehicle'
    | ''
}

interface IVehicleTypeAddons {
  name: 'Car' | 'Bike' | 'Gcv' | 'Pcv' | 'Miscellaneous' | ''
  type: 4 | 2 | 5 | 6 | 7 | 0
  param: 'is_fourwheeler' | 'is_twowheeler' | 'is_gcv' | 'is_pcv' | 'is_miscvehicle' | ''
  vehicleTypeText:
    | 'Private Car'
    | 'Two Wheeler'
    | 'Goods Carrying Vehicle'
    | 'Public Carrying Vehicle'
    | 'Miscellaneous Vehicle'
    | ''
}

export const useVehicleType = (): IVehicleType => {
  const params = useParams()
  const homePageSlice = useAppSelector((state) => state.homePage)
  const isNewVehicle = homePageSlice.isNewVehicle

  switch (params.type?.toLowerCase()) {
    case 'car':
      return {
        name: 'Car',
        type: 4,
        param: !isNewVehicle ? 'is_fourwheeler' : 'is_newvehicles_4W',
        vehicleTypeText: 'Private Car',
      }
    case 'bike':
      return {
        name: 'Bike',
        type: 2,
        param: !isNewVehicle ? 'is_twowheeler' : 'is_newvehicles_2W',
        vehicleTypeText: 'Two Wheeler',
      }
    case 'gcv':
      return {
        name: 'Gcv',
        type: 5,
        param: !isNewVehicle ? 'is_gcv' : 'is_newvehicles_gcv',
        vehicleTypeText: 'Goods Carrying Vehicle',
      }
    case 'pcv':
      return {
        name: 'Pcv',
        type: 6,
        param: !isNewVehicle ? 'is_pcv' : 'is_newvehicles_pcv',
        vehicleTypeText: 'Public Carrying Vehicle',
      }
    case 'miscellaneous':
      return {
        name: 'Miscellaneous',
        type: 7,
        param: !isNewVehicle ? 'is_miscvehicle' : 'is_newvehicles_misc',
        vehicleTypeText: 'Miscellaneous Vehicle',
      }
    default:
      return { name: '', type: 0, param: '', vehicleTypeText: '' }
  }
}

export const useVehicleTypeAddons = (): IVehicleTypeAddons => {
  const params = useParams()

  switch (params.type?.toLowerCase()) {
    case 'car':
      return {
        name: 'Car',
        type: 4,
        param: 'is_fourwheeler',
        vehicleTypeText: 'Private Car',
      }
    case 'bike':
      return {
        name: 'Bike',
        type: 2,
        param: 'is_twowheeler',
        vehicleTypeText: 'Two Wheeler',
      }
    case 'gcv':
      return {
        name: 'Gcv',
        type: 5,
        param: 'is_gcv',
        vehicleTypeText: 'Goods Carrying Vehicle',
      }
    case 'pcv':
      return {
        name: 'Pcv',
        type: 6,
        param: 'is_pcv',
        vehicleTypeText: 'Public Carrying Vehicle',
      }
    case 'miscellaneous':
      return {
        name: 'Miscellaneous',
        type: 7,
        param: 'is_miscvehicle',
        vehicleTypeText: 'Miscellaneous Vehicle',
      }
    default:
      return { name: '', type: 0, param: '', vehicleTypeText: '' }
  }
}
