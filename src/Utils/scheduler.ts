import { Task, Employee, CompanyConfig, TaskBlock } from "types";

export const getLocalDateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Event-based Simulation Scheduler to handle splitting and preemption
export const calculateSchedule = (
    tasks: Task[],
    developers: Employee[],
    config: CompanyConfig,
    startDate: Date = new Date()
): Record<string, TaskBlock[]> => {
    const schedule: Record<string, TaskBlock[]> = {};

    developers.forEach(dev => {
        schedule[dev.emp_id] = [];

        const myTasks = tasks.filter(t => t.task_assigned_to === dev.emp_id);
        if (myTasks.length === 0) return;

        // 1. Setup Simulation State
        const remainingDuration: Record<string, number> = {};
        myTasks.forEach(t => {
            let duration = (t.task_status === "done" && t.time_spent) ? Number(t.time_spent) : Number(t.task_duration || 1);

            // Filter out completed tasks that finished before the simulation window
            if (t.task_status === "done") {
                // Fallback: If completed_at is missing, try updated_at, then created_at
                const doneDateStr = t.completed_at || t.task_updated_at || t.task_created_at;

                if (doneDateStr) {
                    const doneTime = new Date(doneDateStr).getTime();
                    // If the task was "done" strictly before the start of the simulation period,
                    // we consider it historical and do not schedule it independently.
                    if (doneTime < startDate.getTime()) {
                        duration = 0;
                    }
                }
            }

            remainingDuration[t.id] = duration > 0 ? Math.max(0.1, duration) : 0;
        });

        // 2. Multi-Day Simulation Loop
        let currentSimDate = new Date(startDate);
        let dayCount = 0;
        const MAX_DAYS = 60; // Prevent infinite loops
        const EPSILON = 0.001; // Tolerance for float comparison

        // Determine if there is any work initially
        let hasRemainingWork = true;

        while (hasRemainingWork && dayCount < MAX_DAYS) {
            const processingDateStr = getLocalDateKey(currentSimDate);

            // Define Simulation Timeline for this Day
            let t = config.startHour;
            const endT = config.endHour;

            // Current simulated block for this day
            let currentTaskId: string | null = null;
            let currentBlockStart = t;

            // Helper to commit a block to the specific date
            const commitBlock = (endTime: number) => {
                if (currentTaskId && endTime > currentBlockStart + EPSILON) {
                    const existing = schedule[dev.emp_id];
                    const last = existing[existing.length - 1];

                    // Merge if same task, same date, and contiguous
                    if (
                        last &&
                        last.taskId === currentTaskId &&
                        last.date === processingDateStr &&
                        Math.abs(last.endTime - currentBlockStart) < EPSILON
                    ) {
                        last.endTime = endTime;
                    } else {
                        schedule[dev.emp_id].push({
                            taskId: currentTaskId,
                            startTime: currentBlockStart,
                            endTime: endTime,
                            date: processingDateStr
                        });
                    }
                }
            };

            // 3. Day Simulation Loop
            while (t < endT - EPSILON) {
                // Identify Candidate Tasks available at time t
                const candidates = myTasks.filter(task => {
                    if (remainingDuration[task.id] < EPSILON) return false;

                    const created = task.task_created_at ? new Date(task.task_created_at) : new Date(startDate);
                    const createdKey = getLocalDateKey(created);

                    let availableFrom = config.startHour;

                    if (createdKey === processingDateStr) {
                        availableFrom = created.getHours() + created.getMinutes() / 60;
                    } else if (createdKey > processingDateStr) {
                        // Future task
                        return false;
                    }

                    if (availableFrom < config.startHour) availableFrom = config.startHour;

                    return availableFrom <= t + EPSILON; // Allow if available "now"
                });

                if (candidates.length === 0) {
                    // No tasks available. Jump to next event.
                    let nextEvent = endT;

                    myTasks.forEach(task => {
                        const created = task.task_created_at ? new Date(task.task_created_at) : new Date(startDate);
                        const createdKey = getLocalDateKey(created);
                        if (createdKey === processingDateStr) {
                            const h = created.getHours() + created.getMinutes() / 60;
                            if (h > t + EPSILON && h < nextEvent) nextEvent = h;
                        }
                    });

                    commitBlock(t); // Commit whatever finished
                    currentTaskId = null;
                    currentBlockStart = nextEvent;
                    t = nextEvent;
                    continue;
                }

                // Pick Best Task
                candidates.sort((a, b) => {
                    const priorityOrder: Record<string, number> = { "P0": 0, "P1": 1, "P2": 2 };
                    const pA = priorityOrder[a.task_priority as string] ?? 2;
                    const pB = priorityOrder[b.task_priority as string] ?? 2;
                    if (pA !== pB) return pA - pB;

                    const tA = a.task_created_at ? new Date(a.task_created_at).getTime() : 0;
                    const tB = b.task_created_at ? new Date(b.task_created_at).getTime() : 0;
                    return tA - tB;
                });

                const bestTask = candidates[0];

                // Context Switch?
                if (currentTaskId !== bestTask.id) {
                    commitBlock(t);
                    currentTaskId = bestTask.id;
                    currentBlockStart = t;
                }

                // Calculate Step
                const timeToFinish = remainingDuration[bestTask.id];
                let distToInterrupt = endT - t;

                // Check Preemption
                const bestPrioVal = { "P0": 0, "P1": 1, "P2": 2 }[bestTask.task_priority as string] ?? 2;

                myTasks.forEach(other => {
                    if (other.id === bestTask.id) return;
                    if (remainingDuration[other.id] < EPSILON) return;

                    const otherPrioVal = { "P0": 0, "P1": 1, "P2": 2 }[other.task_priority as string] ?? 2;

                    if (otherPrioVal < bestPrioVal) {
                        const created = other.task_created_at ? new Date(other.task_created_at) : new Date(startDate);
                        const createdKey = getLocalDateKey(created);
                        if (createdKey === processingDateStr) {
                            const h = created.getHours() + created.getMinutes() / 60;
                            if (h > t + EPSILON && h < (t + distToInterrupt)) {
                                distToInterrupt = h - t;
                            }
                        }
                    }
                });

                const step = Math.min(timeToFinish, distToInterrupt);

                t += step;
                remainingDuration[bestTask.id] -= step;
                if (remainingDuration[bestTask.id] < EPSILON) remainingDuration[bestTask.id] = 0;
            }

            // Commit any running block at End of Day
            commitBlock(t);

            // Cleanup: If any task has a tiny remainder (e.g. float error or < 1 min), snap to 0 to prevent ghost spillover
            Object.keys(remainingDuration).forEach(key => {
                if (remainingDuration[key] > 0 && remainingDuration[key] < 0.02) {
                    remainingDuration[key] = 0;
                }
            });

            // Advance Day
            currentSimDate.setDate(currentSimDate.getDate() + 1);
            dayCount++;
            // Check if we need to continue
            hasRemainingWork = Object.values(remainingDuration).some(d => d > EPSILON);
        }
    });

    return schedule;
};

// Helper to calculate business hours between two dates
export const calculateBusinessDuration = (
    start: Date,
    end: Date,
    config: CompanyConfig
): number => {
    let totalHours = 0;
    const current = new Date(start);

    // Limit infinite loops
    let safeGuard = 0;
    while (current < end && safeGuard < 1000) {
        safeGuard++;

        const dayStart = new Date(current);
        dayStart.setHours(config.startHour, 0, 0, 0);

        const dayEnd = new Date(current);
        dayEnd.setHours(config.endHour, 0, 0, 0);

        // Determine overlap of [current, end] with [dayStart, dayEnd]
        const spanStart = current.getTime() < dayStart.getTime() ? dayStart : current;

        let spanEnd = end;
        if (spanEnd.getTime() > dayEnd.getTime()) {
            spanEnd = dayEnd;
        }

        if (spanStart < spanEnd) {
            const diff = (spanEnd.getTime() - spanStart.getTime()) / (1000 * 60 * 60);
            totalHours += diff;
        }

        // Advance to next day start
        const nextDay = new Date(current);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(config.startHour, 0, 0, 0);

        // If we are already past 'end', break
        if (nextDay.getTime() > end.getTime() && end.getTime() < dayEnd.getTime()) {
            break;
        }

        current.setTime(nextDay.getTime());
    }

    return Math.max(0.1, Math.round(totalHours * 10000) / 10000);
};

// Helper to get color by priority
export const getPriorityColor = (priority: string) => {
    switch (priority) {
        case "P0": return "red.500";
        case "P1": return "orange.400";
        case "P2": return "blue.400";
        default: return "gray.500";
    }
};
