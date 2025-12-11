import { INestedQuestionSet } from 'Models/BOB/ResponseModels'
import cloneDeep from 'lodash/cloneDeep'
import {
  useGetChoicesNoCacheMutation,
  // useLazyGetChoicesQuery,
} from 'Services/API/Life/master.api'
import { sortObjectBasedOnKeys } from 'Services/general'
// import axios from 'axios'
// import { API_ENDPOINTS, BOB_MASTER_URL } from 'Constants'
// import { getDefaultHeaders } from 'Services/baseQuery'
// import { store } from 'app/store'

const updateDropDownInTree = (
  form_fields: INestedQuestionSet[],
  code: string,
  newDropDown: {
    [key: string]: string | number
  },
) => {
  for (let i = 0; i < form_fields.length; i++) {
    const item = form_fields[i]
    if (item.code === code) {
      item.dropdown = newDropDown
      // break
    } else {
      Object.values(item.values).forEach((child) => {
        return updateDropDownInTree(child, code, newDropDown)
      })
    }
  }

  return form_fields
}

const transformInFormOfDropdown = (
  data: {
    code: string
    name: string
  }[],
  isSorted: boolean,
) => {
  const newData: Record<string, string> = {}
  for (let i = 0; i < data.length; i++) {
    newData[data[i].name] = data[i].code
  }
  if (isSorted) {
    return sortObjectBasedOnKeys(newData)
  }
  return newData
}

const usePrepareChoicesData = () => {
  // const [getChoices] = useLazyGetChoicesQuery({
  //   refetchOnFocus: true,
  //   refetchOnReconnect: true,
  // })

  const [getChoices] = useGetChoicesNoCacheMutation()

  const getData = async ({
    form_fields,
    code,
    param,
    response_key,
    isSorted = false,
  }: {
    form_fields: INestedQuestionSet[]
    code: string
    param: Record<string, string>
    response_key: string
    isSorted?: boolean
  }) => {
    const listingResponse = await getChoices(param).unwrap()

    // const listingResp = await axios({
    //   url: BOB_MASTER_URL + API_ENDPOINTS.BOB.GET_CHOICES,
    //   method: 'GET',
    //   params: param,
    //   headers: getDefaultHeaders({
    //     baseUrl: BOB_MASTER_URL,
    //     token: store.getState().user.authenticatedUser.authtoken ?? '',
    //   }),
    // })

    // const listingResponse = listingResp.data.data
    const deepClonedData = cloneDeep(form_fields)
    const updatedData = updateDropDownInTree(
      deepClonedData,
      code,
      transformInFormOfDropdown(
        listingResponse && listingResponse[response_key] ? listingResponse[response_key] : [],
        isSorted,
      ),
    )
    return updatedData
  }

  return [getData]
}

export { usePrepareChoicesData }
