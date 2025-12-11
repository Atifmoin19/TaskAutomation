import { AnimatePresence } from "framer-motion";

import Dashboard from "Pages/dashboard";
import React from "react";
import { motion } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";

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

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<Login />} />

        {/* Basic authenticated routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/task-list" element={<TaskListPage />} />
        </Route>

        {/* Super Admin routes */}
        <Route
          element={<RoleProtectedRoute allowedRoles={SUPER_ADMIN_ROLES} />}
        >
          <Route path="/dashboard/home" element={<SuperAdminDashboard />} />
          <Route path="/dashboard/create-task" element={<CreateTaskPage />} />
          <Route path="/dashboard/create-user" element={<CreateUserPage />} />
          <Route
            path="/dashboard/update-user"
            element={<UserManagementPage />}
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export function PageWrapper({ children, idx }: { children: any; idx: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 1, y: "-100%" }}
      transition={{ duration: 0.2, delay: (0.1 * idx) / 2 }}
    >
      {children}
    </motion.div>
  );
}
export const AppRouter: React.FC = () => {
  return <AnimatedRoutes />;
};
