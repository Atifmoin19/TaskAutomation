import { createApi } from "@reduxjs/toolkit/query/react";
import { baseUrlQuery } from "Services/baseQuery";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: baseUrlQuery,
  tagTypes: ["Task"],
  endpoints: (builder) => ({
    userList: builder.query<any, any>({
      query: (param) => ({
        url: "/user",
        method: "GET",
        params: param,
      }),
    }),
    getUser: builder.query<any, string>({
      query: (id) => ({
        url: `/user/${id}`,
        method: "GET",
      }),
    }),
    taskList: builder.query<any, any>({
      query: (param) => ({
        url: "/tasks",
        method: "GET",
        params: param,
      }),
      providesTags: ["Task"],
    }),
    createTask: builder.mutation<any, any>({
      query: (body) => ({
        url: "/tasks",
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Task"],
    }),
    updateTask: builder.mutation<any, any>({
      query: (body) => ({
        url: `/tasks/${body.id}`,
        method: "PUT",
        body: body,
      }),
      invalidatesTags: ["Task"],
    }),
    login: builder.mutation<{ token: string, userData: any }, { emp_id: string }>({
      query: (body) => ({
        url: "/login",
        method: "POST",
        body: body,
      }),
    }),
    logout: builder.mutation<any, any>({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
    }),
    createUser: builder.mutation<any, any>({
      query: (body) => ({
        url: "/user",
        method: "POST",
        body: body,
      }),
    }),
    uploadTasks: builder.mutation<any, any>({
      query: (body) => ({
        url: "/tasks/upload",
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Task"],
    }),
    uploadUsers: builder.mutation<any, any>({
      query: (body) => ({
        url: "/users/upload",
        method: "POST",
        body: body,
      }),
    }),


  }),
});

export const { useLazyUserListQuery, useLazyTaskListQuery, useTaskListQuery, useCreateTaskMutation, useUpdateTaskMutation, useLazyGetUserQuery, useLoginMutation, useLogoutMutation, useCreateUserMutation, useUploadTasksMutation, useUploadUsersMutation } = userApi;
