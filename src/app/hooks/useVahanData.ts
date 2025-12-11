import { IVahan } from 'Models/ResponseModels'
import { useEffect, useState } from 'react'

export const useVahanData = () => {
  const [vahanData, setVahanData] = useState<IVahan | null>(null)

  useEffect(() => {
    // TODO: call vahan api and set vahanData
  }, [])

  return { vahanData }
}
