import { INestedQuestionSet } from 'Models/BOB/ResponseModels'
import cloneDeep from 'lodash/cloneDeep'
import { useAppSelector } from '.'

const useAutoFill = () => {
  const { assuredDetails, customerDetails } = useAppSelector((state) => state.cbsData)
  const updateValuesInTree = (
    form_fields: INestedQuestionSet[],
    keyValuePair: {
      questionCode: string
      prefillCode: string
    }[],
    data: any,
  ) => {
    const obj: Record<string, any> = {}
    for (let i = 0; i < form_fields.length; i++) {
      const item = form_fields[i]
      const index = keyValuePair.findIndex(({ questionCode }) => questionCode === item.code)
      if (index >= 0) {
        if (keyValuePair[index].prefillCode.includes('addresses_')) {
          const key = keyValuePair[index].prefillCode.split('addresses_')[1]
          obj[item.code] = data['addresses'][0][key] ?? ''
        } else {
          obj[item.code] = data[keyValuePair[index].prefillCode] ?? ''
        }
      } else {
        Object.values(item.values).forEach((child) => {
          return updateValuesInTree(child, keyValuePair, data)
        })
      }
    }
    return obj
  }
  const updateData = async ({
    form_fields,
    keyValuePair,
    formType,
  }: {
    form_fields: INestedQuestionSet[]
    keyValuePair: { questionCode: string; prefillCode: string }[]
    formType?: 'ASSURED' | 'PAYOR'
  }) => {
    const deepClonedData = cloneDeep(form_fields)
    const prefillData = formType === 'ASSURED' ? assuredDetails : customerDetails
    const updatedData = updateValuesInTree(deepClonedData, keyValuePair, prefillData)

    return updatedData
  }

  return [updateData]
}
export { useAutoFill }
