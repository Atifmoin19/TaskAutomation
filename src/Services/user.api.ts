import { createApi } from "@reduxjs/toolkit/query/react";
import { baseUrlQuery } from "Services/baseQuery";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: baseUrlQuery,
  tagTypes: ["Task", "User"],
  endpoints: (builder) => ({
    userList: builder.query<any, any>({
      query: (param) => ({
        url: "/user",
        method: "GET",
        params: param,
      }),
      providesTags: ["User"],
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
    deleteTask: builder.mutation<any, string>({
      query: (id) => ({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Task"],
    }),
    login: builder.mutation<{ token: string, userData: any }, { emp_id: string, password?: string }>({
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
      invalidatesTags: ["User"],
    }),
    updateUser: builder.mutation<any, any>({
      query: (body) => ({
        url: `/user/${body.emp_id}`,
        method: "PUT",
        body: body,
      }),
      invalidatesTags: ["User"],
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
      invalidatesTags: ["User"],
    }),
    register: builder.mutation<{ token: string, userData: any }, { emp_id: string, password?: string, emp_email?: string }>({
      query: (body) => ({
        url: "/register",
        method: "POST",
        body: body,
      }),
    }),
    deleteUser: builder.mutation<any, string>({
      query: (emp_id) => ({
        url: `/user/${emp_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["User"],
    }),
    bulkDeleteUsers: builder.mutation<any, { emp_ids: string[] }>({
      query: (body) => ({
        url: "/users/bulk-delete",
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["User"],
    }),


  }),
});

export const { useUserListQuery, useLazyUserListQuery, useLazyTaskListQuery, useTaskListQuery, useCreateTaskMutation, useUpdateTaskMutation, useDeleteTaskMutation, useLazyGetUserQuery, useLoginMutation, useLogoutMutation, useCreateUserMutation, useUploadTasksMutation, useUploadUsersMutation, useUpdateUserMutation, useRegisterMutation, useDeleteUserMutation, useBulkDeleteUsersMutation } = userApi;
