export type Priority = "P0" | "P1" | "P2";

export interface Employee {
    id?: number; // DB ID
    emp_id: string; // Unique String ID (s002)
    emp_name: string;
    emp_email: string;
    emp_phone?: string;
    emp_designation: string; // "admin" | "developer"
    emp_department?: string;
    emp_hierarchy?: string;
    avatar?: string; // Optional frontend prop
}

export interface Task {
    id: string; // Frontend ID (might be task_id from backend?)
    task_name: string;
    task_description?: string;
    task_status?: "backlog" | "todo" | "in-progress" | "done" | string;
    task_assigned_to?: string; // emp_id
    task_assigned_by?: string;
    task_assigned_date?: string;
    task_due_date?: string;
    task_priority?: Priority | string;
    task_tags?: string;
    task_notes?: string;
    task_created_at?: string;
    task_updated_at?: string;
    task_duration?: string; // "4" or "4 hours"
}

export interface DaySchedule {
    date: string; // YYYY-MM-DD
    blocks: TaskBlock[];
}

export interface TaskBlock {
    taskId: string;
    startTime: number; // Hour of day (e.g. 9.5 for 9:30 AM)
    endTime: number;
    date: string;
}

export interface ScheduledTask extends Task {
    schedule: TaskBlock[];
}

export interface CompanyConfig {
    startHour: number; // e.g. 9
    endHour: number;   // e.g. 17
}
