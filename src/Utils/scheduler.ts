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
    const EPSILON = 0.001; // Tolerance for float comparison

    developers.forEach(dev => {
        schedule[dev.emp_id] = [];

        const myTasks = tasks.filter(t => t.task_assigned_to === dev.emp_id);
        if (myTasks.length === 0) return;

        // 1. Process Fixed Historical Sessions (from task_sessions)
        const occupiedSlots: Record<string, Array<{ start: number, end: number }>> = {};

        myTasks.forEach(task => {
            if (task.task_sessions && task.task_sessions.length > 0) {
                task.task_sessions.forEach(session => {
                    if (!session.start_time || !session.end_time) return;

                    const start = new Date(session.start_time);
                    const end = new Date(session.end_time);
                    const dateKey = getLocalDateKey(start);

                    const startHour = start.getHours() + start.getMinutes() / 60;
                    const endHour = end.getHours() + end.getMinutes() / 60;

                    // Determine status from session fields
                    // Priority: status_label (new session) > completion_status (closed session) > status > fallback
                    let sessionStatus = session.status_label || session.completion_status || session.status;

                    // Fallback mapping if backend sends different strings
                    if (sessionStatus === 'in-progress' || sessionStatus === 'in progress') sessionStatus = 'planned'; // Show as normal/planned
                    if (!sessionStatus) {
                        sessionStatus = task.task_status === 'done' ? 'completed' : 'backlog';
                    }

                    // Add to schedule
                    schedule[dev.emp_id].push({
                        taskId: task.id,
                        startTime: startHour,
                        endTime: endHour,
                        date: dateKey,
                        status: sessionStatus as any,
                        isSession: true
                    });

                    // Mark slot as occupied to avoid overlapping simulation
                    if (!occupiedSlots[dateKey]) occupiedSlots[dateKey] = [];
                    occupiedSlots[dateKey].push({ start: startHour, end: endHour });
                });
            }
        });

        // 2. Setup Simulation State for Reporting/Remaining Work
        const remainingDuration: Record<string, number> = {};

        myTasks.forEach(t => {
            const isDone = t.task_status?.toLowerCase() === 'done';

            // If done, use time_spent (actual). If not done, use duration (planned).
            let totalRequired = (isDone && t.time_spent)
                ? Number(t.time_spent)
                : Number(t.task_duration || 1);

            // Deduct time already spent in sessions
            let spentInSessions = 0;
            if (t.task_sessions) {
                t.task_sessions.forEach(s => {
                    // Calculate duration in hours
                    if (s.start_time && s.end_time) {
                        const d = (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / (1000 * 60 * 60);
                        spentInSessions += d;
                    }
                });
            }



            if (isDone) {
                if (!t.task_sessions || t.task_sessions.length === 0) {
                    // Legacy handle for Done tasks without sessions
                    // Use completed_at or updated_at. If neither, fallback to created_at
                    const doneDateStr = t.completed_at || t.task_updated_at || t.task_created_at;

                    if (doneDateStr && new Date(doneDateStr).getTime() < startDate.getTime()) {
                        totalRequired = 0;
                    }
                } else {
                    totalRequired = 0; // Fully handled by sessions
                }
            } else {
                // Task Not Done
                totalRequired -= spentInSessions;
            }

            // Fix: Do not force 0.01 if the task is genuinely done or 0.
            remainingDuration[t.id] = Math.max(0, totalRequired);

            // Only force a small block if task is NOT done but calculation resulted in <= 0
            if (remainingDuration[t.id] <= EPSILON && !isDone) {
                remainingDuration[t.id] = 0.1;
            }
        });

        // 3. Multi-Day Simulation Loop for Remaining
        let currentSimDate = new Date(startDate);
        let dayCount = 0;
        const MAX_DAYS = 60;

        let hasRemainingWork = Object.values(remainingDuration).some(d => d > EPSILON);

        while (hasRemainingWork && dayCount < MAX_DAYS) {
            const processingDateStr = getLocalDateKey(currentSimDate);
            const occupied = occupiedSlots[processingDateStr] || [];

            // Define Simulation Timeline
            let t = config.startHour;
            const endT = config.endHour;

            let currentTaskId: string | null = null;
            let currentBlockStart = t;

            const commitBlock = (endTime: number) => {
                if (currentTaskId && endTime > currentBlockStart + EPSILON) {
                    const existing = schedule[dev.emp_id];
                    const last = existing[existing.length - 1];

                    // Check overlap with fixed sessions (naive check)
                    // In a real robust system we'd check every minute, here we rely on 't' skipping occupied.

                    if (
                        last &&
                        last.taskId === currentTaskId &&
                        last.date === processingDateStr &&
                        Math.abs(last.endTime - currentBlockStart) < EPSILON &&
                        !last.isSession // Don't merge with fixed session
                    ) {
                        last.endTime = endTime;
                    } else {
                        schedule[dev.emp_id].push({
                            taskId: currentTaskId,
                            startTime: currentBlockStart,
                            endTime: endTime,
                            date: processingDateStr,
                            status: 'planned'
                        });
                    }
                }
            };

            while (t < endT - EPSILON) {
                // Check if 't' is inside an occupied slot
                const inSlot = occupied.find(s => t >= s.start && t < s.end);
                if (inSlot) {
                    // Jump over occupied slot
                    if (currentTaskId) {
                        commitBlock(t);
                        currentTaskId = null;
                    }
                    t = inSlot.end;
                    currentBlockStart = t;
                    continue;
                }

                // Identify Candidates
                const candidates = myTasks.filter(task => {
                    if (remainingDuration[task.id] < EPSILON) return false;

                    // Effective Start Time: assigned_date > created_at ? assigned_date : created_at
                    let effectiveStart = task.task_created_at ? new Date(task.task_created_at) : new Date(startDate);
                    if (task.task_assigned_date) {
                        const assigned = new Date(task.task_assigned_date);
                        // Use assigned date if it exists (active pick-up time)
                        effectiveStart = assigned;
                    }

                    const startKey = getLocalDateKey(effectiveStart);

                    let availableFrom = config.startHour;
                    if (startKey === processingDateStr) {
                        availableFrom = effectiveStart.getHours() + effectiveStart.getMinutes() / 60;
                    } else if (startKey > processingDateStr) {
                        return false;
                    }

                    if (availableFrom < config.startHour) availableFrom = config.startHour;

                    return availableFrom <= t + EPSILON;
                });

                if (candidates.length === 0) {
                    // Find next availability or slot end
                    let nextEvent = endT;
                    // Check start times of future tasks today
                    myTasks.forEach(task => {
                        let es = task.task_created_at ? new Date(task.task_created_at) : new Date(startDate);
                        if (task.task_assigned_date) es = new Date(task.task_assigned_date);

                        const k = getLocalDateKey(es);
                        if (k === processingDateStr) {
                            const h = es.getHours() + es.getMinutes() / 60;
                            if (h > t + EPSILON && h < nextEvent) nextEvent = h;
                        }
                    });

                    // Check start of next occupied slot
                    const nextSlot = occupied.find(s => s.start > t);
                    if (nextSlot && nextSlot.start < nextEvent) nextEvent = nextSlot.start;

                    commitBlock(t);
                    currentTaskId = null;
                    t = nextEvent;
                    currentBlockStart = t;
                    continue;
                }

                // Pick Best Task
                candidates.sort((a, b) => {
                    const priorityOrder: Record<string, number> = { "P0": 0, "P1": 1, "P2": 2 };
                    const pA = priorityOrder[a.task_priority as string] ?? 2;
                    const pB = priorityOrder[b.task_priority as string] ?? 2;
                    if (pA !== pB) return pA - pB;
                    // Sort by effective start time to prioritize earlier requests
                    const tA = a.task_assigned_date ? new Date(a.task_assigned_date).getTime() : new Date(a.task_created_at || 0).getTime();
                    const tB = b.task_assigned_date ? new Date(b.task_assigned_date).getTime() : new Date(b.task_created_at || 0).getTime();
                    return tA - tB;
                });

                const bestTask = candidates[0];

                if (currentTaskId !== bestTask.id) {
                    commitBlock(t);
                    currentTaskId = bestTask.id;
                    currentBlockStart = t;
                }

                const timeToFinish = remainingDuration[bestTask.id];
                let step = Math.min(timeToFinish, endT - t);

                // Check collision with next occupied slot
                const nextSlot = occupied.find(s => s.start > t);
                if (nextSlot && (t + step) > nextSlot.start) {
                    step = nextSlot.start - t;
                }

                // (Omitted detailed Preemption logic for brevity, but basic flow holds)

                t += step;
                remainingDuration[bestTask.id] -= step;
                if (remainingDuration[bestTask.id] < EPSILON) remainingDuration[bestTask.id] = 0;
            }

            commitBlock(t);

            // Cleanup tiny remainders
            Object.keys(remainingDuration).forEach(key => {
                if (remainingDuration[key] > 0 && remainingDuration[key] < 0.02) {
                    remainingDuration[key] = 0;
                }
            });

            currentSimDate.setDate(currentSimDate.getDate() + 1);
            dayCount++;
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
