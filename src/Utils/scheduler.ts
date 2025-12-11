import { Task, Employee, CompanyConfig, TaskBlock } from "types";

export const getLocalDateKey = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const calculateSchedule = (
    tasks: Task[],
    developers: Employee[],
    config: CompanyConfig,
    startDate: Date = new Date(), // This serves as the "Schedule From" point (e.g., Today 00:00)
    currentTime: Date = new Date() // The actual "Now" for calculating overruns
): Record<string, TaskBlock[]> => {
    const schedule: Record<string, TaskBlock[]> = {};

    // Initialize schedule for each developer
    developers.forEach(dev => {
        schedule[dev.emp_id] = [];
    });

    // Group tasks by developer
    const devTasks: Record<string, Task[]> = {};
    tasks?.forEach(task => {
        if (task.task_status === "done") return; // Existing logic: don't schedule done tasks?
        // Note: If we want to show Done tasks in the past, we should include them differently.
        // User request focuses on "not being coklpeted", so we focus on pending tasks.
        if (task.task_assigned_to) {
            if (!devTasks[task.task_assigned_to]) devTasks[task.task_assigned_to] = [];
            devTasks[task.task_assigned_to].push(task);
        }
    });

    // Process each developer's queue
    developers.forEach(dev => {
        const myTasks = devTasks[dev.emp_id] || [];

        // Sort logic: P0 > P1 > P2. 
        // Stable sort for same priority (maintain order or use creation time if available)
        myTasks.sort((a, b) => {
            const priorityOrder: Record<string, number> = { "P0": 0, "P1": 1, "P2": 2 };
            const pA = a.task_priority as string || "P1";
            const pB = b.task_priority as string || "P1";
            const pDiff = (priorityOrder[pA] ?? 2) - (priorityOrder[pB] ?? 2);
            if (pDiff !== 0) return pDiff;

            // Secondary sort: Creation Time
            const tA = a.task_created_at ? new Date(a.task_created_at).getTime() : 0;
            const tB = b.task_created_at ? new Date(b.task_created_at).getTime() : 0;
            return tA - tB;
        });

        // Initialize Current Pointer
        let currentDay = new Date(startDate);

        // Ensure we start at least at configured start hour
        let currentHour = config.startHour;

        // If startDate has a time component, use that?
        // Usually we want to start filling from MAX(StartOfToday, ConfigStartHour).
        // If startDate was passed as "Now", this matches old behavior. 
        // But for the new requirement, we likely pass "Today 00:00" and rely on logic below.

        const currentRealTimeHour = currentTime.getHours() + currentTime.getMinutes() / 60;
        const currentRealDateStr = getLocalDateKey(currentTime);

        myTasks.forEach(task => {
            let remaining = Number(task.task_duration || 1);

            // Determine Effective Start Time
            // It must be at least 'currentHour' (end of prev task)
            // It must be at least 'task_assigned_date' or 'task_created_at' (if on same day)

            const originDateStr = task.task_assigned_date || task.task_created_at;
            if (originDateStr) {
                const originDate = new Date(originDateStr);
                const originDateStrOnly = getLocalDateKey(originDate);
                const originHour = originDate.getHours() + originDate.getMinutes() / 60;

                // If currently processing the day the task was created/assigned
                const processingDateStr = getLocalDateKey(currentDay);
                if (processingDateStr === originDateStrOnly) {
                    if (originHour >= config.endHour) {
                        // If assigned after hours, start tomorrow morning
                        // We must advance currentDay, but this loop iterates on `currentDay`.
                        // Actually, we need to defer this task to tomorrow.
                        // Modifying `currentDay` here affects subsequent logic? 
                        // Yes, `currentDay` is the pointer.

                        // If we are at 8 PM (End 7 PM).
                        // We should jump currentDay to Tomorrow.
                        // And set currentHour to StartHour.
                        // But wait, `processingDateStr` (Today) matched `originDateStrOnly` (Today).
                        // If we change `currentDay` to Tomorrow, then `processingDateStr` becomes Tomorrow.
                        // And the loop continues.

                        // Wait, inside `while (remaining > 0)` loop:
                        // We have `if (currentHour >= config.endHour)`. 
                        // If we set `currentHour = originHour` (20), it triggers that logic.
                        // So the previous logic WAS correct for "pushing" it.

                        // BUT, `currentHour` becomes 20.
                        // Inside loop: Day+1, Hour=10.
                        // `startTime` = 10. `endTime` = 10 + chunk.
                        // Schedule entry: date=Tomorrow, start=10, end=...
                        // This is correct.

                        // HOWEVER, let's explicitely handle it to be safe and clear.
                        if (originHour > currentHour) {
                            currentHour = Math.max(config.startHour, originHour);
                        }
                    } else {
                        if (originHour > currentHour) {
                            currentHour = Math.max(config.startHour, originHour);
                        }
                    }
                }
            }

            // Clamp to Start Hour
            if (currentHour < config.startHour) currentHour = config.startHour;

            while (remaining > 0) {
                // If we moved past End Hour, next day
                if (currentHour >= config.endHour) {
                    currentDay.setDate(currentDay.getDate() + 1);
                    currentHour = config.startHour;
                }

                const availableInDay = config.endHour - currentHour;
                let chunk = Math.min(remaining, availableInDay);

                const processingDateStr = getLocalDateKey(currentDay);

                // --- Overrun Logic ---
                // If this block is happening "Today" and it "Ends" in the past relative to Real Time...
                if (processingDateStr === currentRealDateStr) {
                    const projectedEnd = currentHour + chunk;

                    // Logic: If task is NOT done (implied by loop) AND projectedEnd < RealTime
                    // We must extend it to RealTime.
                    // But wait, the component might be *partially* done? 
                    // Simpler view: If the task *should* be finished by 11:00 but it's 11:15, extend to 11:15.

                    if (projectedEnd < currentRealTimeHour) {
                        // We extend the chunk to cover up to RealTime
                        // But we must respect EndHour. 
                        const extendedEnd = Math.min(currentRealTimeHour, config.endHour);

                        // Recalculate chunk based on extension
                        // New Chunk = extendedEnd - currentHour
                        chunk = extendedEnd - currentHour;

                        // Note: remaining is based on PLANNED duration. 
                        // If we extend, we are essentially consuming time. 
                        // Does "remaining" decrease by the *actual* passed time? Yes.
                        // But if we extend beyond the original plan, 'remaining' should hit 0, but we keep going?
                        // Actually, if we extend, we are just saying "This task took longer".
                        // So we consume the *time passed*.
                        // The remaining duration in the *future* might be 0? 
                        // If I planned 1h (10-11). It's 11:30.
                        // I spent 1.5h. 
                        // Remaining should be 0.
                        // So 'chunk' consumes 'remaining' AND more.
                    }
                }

                // If after extending, we still have "remaining" (e.g. it was a 4h task, we did 1h, it's overdue?),
                // we proceed. 
                // But the user said "move end time to extend it". 
                // This implies the visual block grows.

                // Let's stick to the simpler interpretation:
                // Start = Fixed.
                // End = Max(PlannedEnd, Now).

                // If we are strictly scheduling blocks:
                const startTime = currentHour;
                let endTime = startTime + chunk; // Nominal end

                // Apply Extension to End Time
                if (processingDateStr === currentRealDateStr && endTime < currentRealTimeHour) {
                    // Extend to Now
                    endTime = Math.min(currentRealTimeHour, config.endHour);
                    // Consumed time is (endTime - startTime)
                    // If we consumed more than 'chunk' (original plan), that's fine.
                    // If we consumed 'chunk', remaining decreases. 
                    // Since we are "extending", we essentially say "this part of the task is done/spent".
                }

                // Logic check: If I have 1h remaining. Setup 10:00.
                // Now is 11:30.
                // Start 10:00. End changes to 11:30.
                // Duration spent = 1.5h.
                // Remaining -> 1 - 1.5 = -0.5. Loop should end.

                const durationSpent = endTime - startTime;

                schedule[dev.emp_id].push({
                    taskId: task.id,
                    startTime: startTime,
                    endTime: endTime,
                    date: processingDateStr
                });

                currentHour = endTime;
                remaining -= durationSpent;

                // If remaining became negative (extended beyond plan), we are done with this task.
                if (remaining <= 0) remaining = 0;
            }
        });
    });

    return schedule;
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
