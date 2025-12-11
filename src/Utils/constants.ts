export const APP_ENV = import.meta.env.VITE_APP_ENV ?? "";
export const BASE_URL = import.meta.env.VITE_APP_BASE_URL ?? "";

export const HEADER_HEIGHT = "3.6rem";

export const DESIGNATIONS = [
    "ASE",
    "SE1",
    "SE2",
    "SSE",
    "TL",
    "L1",
    "L2",
    "EM",
    "CTO",
    "PRODUCT",
];

export const ROLE_RANK: Record<string, number> = {
    "ASE": 1, "ase": 1,
    "SE1": 1, "se1": 1,
    "SE2": 1, "se2": 1,
    "SSE": 1, "sse": 1,
    "TL": 1, "tl": 1,
    "L1": 2, "l1": 2,
    "L2": 3, "l2": 3,
    "EM": 4, "em": 4,
    "CTO": 5, "cto": 5,
    "PRODUCT": 5, "product": 5,
    "OWNER": 5, "owner": 5,
    "SUPERADMIN": 5, "superadmin": 5,
    "admin": 2, // L1 equivalent
    "developer": 1,
};

// L1 has access to members under them (ASE, SE1, SE2, SSE)
export const ADMIN_ROLES = ["L1"];

// L2, EM, CTO have access to all data
export const SUPER_ADMIN_ROLES = ["L2", "EM", "CTO", "PRODUCT"];
