export const APP_ENV = import.meta.env.VITE_APP_ENV ?? "";
export const BASE_URL = import.meta.env.VITE_APP_BASE_URL ?? "";

export const HEADER_HEIGHT = "3.6rem";

export const ADMIN_ROLES = ["admin", "product"];
export const SUPER_ADMIN_ROLES = ["superadmin", "owner"];

export const DUMMY_USERS = [
    {
        id: 1,
        emp_id: "admin",
        emp_name: "Super Admin",
        emp_designation: "admin",
        emp_email: "admin@example.com",
        emp_department: "Management",
        emp_hierarchy: "Admin"
    },
    {
        id: 2,
        emp_id: "d1",
        emp_name: "Alice",
        emp_designation: "developer",
        emp_email: "alice@example.com",
        emp_department: "Frontend",
        emp_hierarchy: "Senior"
    },
    {
        id: 3,
        emp_id: "d2",
        emp_name: "Bob",
        emp_designation: "developer",
        emp_email: "bob@example.com",
        emp_department: "Backend",
        emp_hierarchy: "Mid"
    },
    {
        id: 4,
        emp_id: "d3",
        emp_name: "Charlie",
        emp_designation: "developer",
        emp_email: "charlie@example.com",
        emp_department: "DevOps",
        emp_hierarchy: "Junior"
    },
];
