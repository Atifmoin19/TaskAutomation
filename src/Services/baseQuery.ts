import { BaseQueryFn } from "@reduxjs/toolkit/dist/query";
import axios, { type AxiosRequestConfig } from "axios";
import { BASE_URL } from "../Utils/constants";

export const getDefaultHeaders = ({
  token,
  // baseUrl,
}: {
  token: string;
  baseUrl?: string;
}) => {
  const tempHeaders: any = {
    "Content-Type": "application/json",
    Source: "Web",
    Lang: "EN",
  };
  if (token) {
    tempHeaders["Authorization"] = `Token ${token}`;
    return tempHeaders;
  }
  return tempHeaders;
};

export const getFileHeaders = (token: string, onlyToken?: boolean) => {
  const tempHeaders = {
    "Content-Type": "multipart/form-data",
    Source: "Web",
    Lang: "EN",
  };
  if (token) {
    return {
      ...tempHeaders,
      Authorization: onlyToken ? token : `Token ${token}`,
    };
  }
  return tempHeaders;
};

export const axiosBaseQuery =
  ({
    baseUrl,
  }: {
    baseUrl: string;
  }): BaseQueryFn<
    {
      url: string;
      method: AxiosRequestConfig["method"];
      body?: AxiosRequestConfig["data"];
      params?: AxiosRequestConfig["params"];
      headers?: AxiosRequestConfig["headers"];
      responseType?: AxiosRequestConfig["responseType"];
      rawResponse?: boolean;
    },
    unknown,
    unknown
  > =>
    async ({ url, method, body, params = {}, headers, responseType }) => {
      const { store } = await import("../app/store");
      const token = store.getState().scheduler.token;

      let requestHeaders: any = headers;
      if (!requestHeaders) {
        requestHeaders = getDefaultHeaders({
          baseUrl,
          token: token ?? "",
        });
        // If body is FormData, let browser/axios set Content-Type to multipart/form-data with boundary
        if (body instanceof FormData) {
          delete requestHeaders["Content-Type"];
        }
      }

      try {
        const result = await axios({
          url: baseUrl + url,
          method,
          data: body,
          params: params,
          headers: requestHeaders,
          responseType,
        });
        return { data: result?.data?.data };
      } catch (error) {

        if (axios.isAxiosError(error)) {
          const err = error as any;

          // if (decryptPayloadUrls?.includes(url)) {
          //   const res = decryptString({
          //     str: err.response?.data?.response,
          //     key: `${PASSWORD_ENCRYPT_KEY}${getDynamicPass(d)}`,
          //   });
          //   if (res) {
          //     return {
          //       error: res,
          //     };
          //   }
          //   return {
          //     error: {
          //       status: "400",
          //       message: "Otp Verification Failed",
          //     },
          //   };
          // }

          return {
            error: {
              status: err.response?.status,
              message: err.message,
              data: err.response?.data || err.message,
            },
          };
        } else {
          const err = error as any;
          console.log(err, "================error================");
          return {
            error: {
              status: err.status,
              data: err.data?.error_text
                ? err.data
                : {
                  error_text: err?.message
                    ? err.message
                    : "Something went wrong!",
                },
              message: err.message ?? "Something went wrong!",
            },
          };
        }
      }
    };

const baseUrlQuery = axiosBaseQuery({
  baseUrl: BASE_URL,
});

export { baseUrlQuery };
