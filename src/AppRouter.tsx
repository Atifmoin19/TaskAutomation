import React from "react";
import { Box } from "@chakra-ui/react";
import { Route, Routes, useLocation } from "react-router-dom";

import Dashboard from "Pages/dashboard";
import Login from "Pages/login";
import TaskListPage from "Pages/taskList";
import { useAppSelector } from "app/hooks";
import { Navigate, Outlet } from "react-router-dom";
import SuperAdminDashboard from "Pages/SuperAdmin/SuperAdminDashboard";
import CreateTaskPage from "Pages/SuperAdmin/CreateTaskPage";
import CreateUserPage from "Pages/SuperAdmin/CreateUserPage";
import UserManagementPage from "Pages/SuperAdmin/UserManagementPage";
import { SUPER_ADMIN_ROLES } from "Utils/constants";

const ProtectedRoute = () => {
  const { currentUser } = useAppSelector((state) => state.scheduler);
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
};

const RoleProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { currentUser } = useAppSelector((state) => state.scheduler);
  if (!currentUser) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(currentUser.emp_designation)) {
    return <Navigate to="/" replace />; // Redirect to basic dashboard if not authorized
  }

  return <Outlet />;
};

function StandardRoutes() {
  const location = useLocation();

  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/login" element={<Login />} />

      {/* Basic authenticated routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/task-list" element={<TaskListPage />} />
      </Route>

      {/* Super Admin routes */}
      <Route element={<RoleProtectedRoute allowedRoles={SUPER_ADMIN_ROLES} />}>
        <Route path="/dashboard/home" element={<SuperAdminDashboard />} />
        <Route path="/dashboard/create-task" element={<CreateTaskPage />} />
        <Route path="/dashboard/create-user" element={<CreateUserPage />} />
        <Route path="/dashboard/update-user" element={<UserManagementPage />} />
      </Route>
    </Routes>
  );
}

export function PageWrapper({
  children,
  idx,
}: {
  children: React.ReactNode;
  idx: number;
}) {
  return (
    <Box
      animation={`pageTransition 0.2s ease-out ${(0.1 * idx) / 2}s backwards`}
    >
      {children}
    </Box>
  );
}

export const AppRouter: React.FC = () => {
  return <StandardRoutes />;
};
