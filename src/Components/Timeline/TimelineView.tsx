import React, { useMemo, useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Avatar,
  IconButton,
  useColorModeValue,
  VStack,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Badge,
  HStack,
  Divider,
  Portal,
  Button,
  useToast,
} from "@chakra-ui/react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaCalendarAlt,
  FaCheck,
  FaEdit,
  FaTrash,
  FaSearchPlus,
  FaTimes,
  FaPause,
} from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "app/hooks";
import {
  calculateSchedule,
  getLocalDateKey,
  calculateBusinessDuration,
} from "Utils/scheduler";
import { formatDuration } from "Utils/common";
import { Task } from "types";
import { ADMIN_ROLES, SUPER_ADMIN_ROLES, ROLE_RANK } from "Utils/constants";
import {
  updateTask,
  deleteTask as deleteTaskAction,
} from "app/slices/scheduler.slice";
import {
  useUpdateTaskMutation,
  useDeleteTaskMutation,
} from "Services/user.api";
import { UserHierarchyPopover } from "Components/UserHierarchyPopover";

interface TimelineViewProps {
  onEditTask: (task: Task) => void;
  filteredManagerId?: string;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  onEditTask,
  filteredManagerId,
}) => {
  const {
    config,
    developers: allDevelopers,
    tasks,
    currentUser,
  } = useAppSelector((state) => state.scheduler);
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [updateTaskApi] = useUpdateTaskMutation();
  const [deleteTaskApi] = useDeleteTaskMutation();
  const popoverBorderColor = useColorModeValue("gray.100", "gray.700");
  const popoverBg = useColorModeValue("white", "gray.800");

  const developers = useMemo(() => {
    if (!currentUser) return [];

    const designation = currentUser.emp_designation;
    const isSuperAdmin = SUPER_ADMIN_ROLES.includes(designation);
    const isAdmin = ADMIN_ROLES.includes(designation);

    // Filter out Rank 4 (EM) and Rank 5 (CTO/SuperAdmin/Owner/Product) from timeline
    // They cannot be assigned tasks.
    const assignableDevs = allDevelopers.filter(
      (d) => (ROLE_RANK[d.emp_designation] || 0) < 4,
    );

    // If filter is active, show only reportees of that manager
    if (filteredManagerId) {
      return assignableDevs.filter((d) => d.manager_id === filteredManagerId);
    }

    if (isSuperAdmin) return assignableDevs;

    if (isAdmin) {
      // Show direct reports only (since self is likely Rank >> 4, self is filtered out)
      return assignableDevs.filter(
        (d) =>
          d.manager_id === currentUser.emp_id ||
          d.emp_id === currentUser.emp_id,
      );
    }

    // Regular user
    return assignableDevs.filter((d) => d.emp_id === currentUser.emp_id);
  }, [allDevelopers, currentUser, filteredManagerId]);

  // Default date logic: If now > EndHour, show Tomorrow.
  // Default date logic: If now > EndHour, show Tomorrow.
  const [currentDate, setCurrentDate] = useState(() => {
    // Check localStorage first
    const savedDate = localStorage.getItem("timeline_view_date");
    if (savedDate) {
      const d = new Date(savedDate);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }

    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    if (currentHour >= config.endHour) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    return now;
  });

  // Persist date on change
  useEffect(() => {
    localStorage.setItem("timeline_view_date", currentDate.toISOString());
  }, [currentDate]);

  const [tick, setTick] = useState(0);
  const [expandedHour, setExpandedHour] = useState<number | null>(null);

  // Update tick every minute to refresh schedule (extend overdue tasks)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Memoize schedule calculation
  const schedule = useMemo(() => {
    // Start Date:
    // If viewing the past, start simulation from that date to show history/schedule.
    // If viewing the future, start from Today to correctly project the current backlog.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const viewDate = new Date(currentDate);
    viewDate.setHours(0, 0, 0, 0);

    // Use the earlier of the two
    const simStartDate = viewDate < startOfToday ? viewDate : startOfToday;

    // Filter tasks for Timeline: Only show "in-progress" and "done"
    // The user requirement: "now in timeline only in progress or done task wil be listed notign else"
    const timelineTasks = tasks.filter(
      (t) =>
        t.task_status === "in-progress" ||
        t.task_status === "done" ||
        t.task_status === "todo" ||
        t.task_status === "on-hold",
    );

    return calculateSchedule(timelineTasks, developers, config, simStartDate);
  }, [tasks, developers, config, tick, currentDate]);

  const timeSlots = useMemo(() => {
    if (expandedHour !== null) {
      // Zoomed View: Return 10-minute intervals
      return [0, 10, 20, 30, 40, 50];
    }
    const slots = [];
    for (let i = config.startHour; i < config.endHour; i++) {
      slots.push(i);
    }
    return slots;
  }, [config, expandedHour]);

  // Framer Motion Components
  // const MotionBox = motion(Box); remove unused var

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    setCurrentDate(prev);
  };

  const handlePickFromTimeline = async (task: Task) => {
    try {
      // 1. Pause currently active task if exists (Preemption)
      const activeTask = tasks.find(
        (t) =>
          t.task_assigned_to === task.task_assigned_to &&
          t.task_status === "in-progress" &&
          t.id !== task.id,
      );

      if (activeTask) {
        const pausedTask = {
          ...activeTask,
          task_status: "todo",
        };
        const activeResp = await updateTaskApi(pausedTask).unwrap();
        dispatch(updateTask(activeResp || pausedTask));

        toast({
          title: "Previous Task Paused",
          description: `Paused '${activeTask.task_name}' to start high priority task.`,
          status: "info",
          duration: 2000,
          isClosable: true,
        });
      }

      // 2. Start new task
      const updatedTask = {
        ...task,
        task_status: "in-progress",
        task_updated_at: new Date().toISOString(),
        task_assigned_date: new Date().toISOString(),
      };
      const resp = await updateTaskApi(updatedTask).unwrap();
      // Use the response from backend which contains the new sessions
      dispatch(updateTask(resp || updatedTask));
      toast({
        title: "Task Picked",
        description: `${task.task_name} resumed.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Task update failed", error);
      toast({ title: "Error updating task", status: "error" });
    }
  };

  const handleCompleteTask = async (task: Task) => {
    // Enforce Sequential Completion
    // Modification: Allow P0 tasks or currently Active (in-progress) tasks to bypass this check.
    const isPriorityOrActive =
      task.task_priority === "P0" || task.task_status === "in-progress";

    const assigneeId = task.task_assigned_to;
    if (assigneeId && !isPriorityOrActive) {
      const userSchedule = schedule[assigneeId] || [];
      // Find the first pending block (active or planned)
      // We rely on the fact that 'schedule' is generated in chronological order (mostly)
      // OR we sort it to be safe.
      const sortedBlocks = [...userSchedule].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime - b.startTime;
      });

      const firstPendingBlock = sortedBlocks.find((b) => {
        // Find corresponding task
        const t = tasks.find((x) => x.id === b.taskId);
        return t && t.task_status !== "done" && t.task_status !== "completed";
      });

      if (firstPendingBlock && firstPendingBlock.taskId !== task.id) {
        const blockingTask = tasks.find(
          (t) => t.id === firstPendingBlock.taskId,
        );
        toast({
          title: "Cannot Complete Task",
          description: `Please complete '${blockingTask?.task_name}' first, or increase this task's priority.`,
          status: "warning",
          duration: 4000,
          isClosable: true,
        });
        return;
      }
    }

    try {
      const now = new Date();
      // Calculate actual duration based on business hours since CREATION vs NOW
      // This handles multi-day tasks correctly (ignoring nights)
      const startTime = task.task_created_at
        ? new Date(task.task_created_at)
        : now;
      let newDuration = calculateBusinessDuration(startTime, now, config);

      const updatedTask = {
        ...task,
        task_status: "done",
        // task_duration is kept as original "Planned" duration
        time_spent: newDuration,
        completed_at: now.toISOString(),
      };

      await updateTaskApi(updatedTask).unwrap();
      dispatch(updateTask(updatedTask));
      toast({
        title: "Task Completed",
        description: `${task.task_name} marked as done. Duration updated to ${newDuration}hrs.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error Completing Task",
        description: "Failed to update task status on server.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleHoldTask = async (task: Task) => {
    try {
      const updatedTask = {
        ...task,
        task_status: "on-hold",
        task_updated_at: new Date().toISOString(),
      };
      await updateTaskApi(updatedTask).unwrap();
      dispatch(updateTask(updatedTask));
      toast({
        title: "Task On Hold",
        description: "Task paused and moved to pending list.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update task status.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteTask = async (task: Task) => {
    if (window.confirm(`Delete task "${task.task_name}"?`)) {
      try {
        await deleteTaskApi(task.id).unwrap();
        dispatch(deleteTaskAction(task.id));
        toast({ title: "Task deleted", status: "success" });
      } catch (err) {
        toast({ title: "Failed to delete task", status: "error" });
      }
    }
  };

  const todayStr = getLocalDateKey(currentDate);

  return (
    <Box
      p={6}
      bg="rgba(255, 255, 255, 0.70)" // Increased opacity for better contrast
      backdropFilter="blur(20px)"
      border="1px solid rgba(255, 255, 255, 0.4)"
      borderRadius="2xl" // Softer corners
      boxShadow="0 8px 32px 0 rgba(31, 38, 135, 0.15)"
      overflow="hidden"
    >
      <Flex justify="space-between" align="center" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">
          Developer Timeline
        </Text>
        <Flex align="center" gap={4}>
          <IconButton
            aria-label="Previous Day"
            icon={<FaChevronLeft />}
            onClick={handlePrevDay}
            variant="ghost"
          />
          <Text fontSize="lg" fontWeight="medium">
            {currentDate.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </Text>
          <IconButton
            aria-label="Next Day"
            icon={<FaChevronRight />}
            onClick={handleNextDay}
            isDisabled={(() => {
              const now = new Date();
              const viewDate = new Date(currentDate);
              // Disable if View Date is Today (cannot go to Tomorrow yet)
              // Check if Today is same as View Date
              const isToday = viewDate.toDateString() === now.toDateString();
              // Or if View Date is already in future (shouldn't happen with this logic but safe guard)
              if (viewDate > now) return true;

              return isToday;
            })()}
            variant="ghost"
          />
        </Flex>
      </Flex>

      <Box
        position="relative"
        overflowX="auto"
        mt={4}
        borderRadius="xl"
        border="1px solid rgba(255,255,255,0.2)"
      >
        <Box minW="1400px" pr={8}>
          {/* Header (Time Slots) */}
          <Flex
            ml="150px"
            borderBottom="1px solid"
            borderColor="gray.200"
            pb={0}
            position="sticky"
            top={0}
            zIndex={20}
            bg="rgba(255, 255, 255, 0.95)"
            backdropFilter="blur(10px)"
            direction="column"
          >
            {/* Top Row: AM/PM Bars */}
            <Flex width="100%">
              {/* Logic to group AM and PM */}
              {(() => {
                // We know slots range from config.startHour to config.endHour.
                // We need to find breakdown.
                const start = config.startHour;
                const end = config.endHour;
                // Assuming standard day 24h checks.
                // Find 12pm split.

                const amStart = start;
                const amEnd = Math.min(end, 12);
                const pmStart = Math.max(start, 12);
                const pmEnd = end;

                const amSpan = Math.max(0, amEnd - amStart);
                const pmSpan = Math.max(0, pmEnd - pmStart);

                return (
                  <>
                    {amSpan > 0 && (
                      <Box
                        flex={amSpan}
                        bg="blue.50"
                        borderRight="1px solid white"
                        textAlign="center"
                        py={1}
                      >
                        <Text fontSize="xs" fontWeight="bold" color="blue.600">
                          AM
                        </Text>
                      </Box>
                    )}
                    {pmSpan > 0 && (
                      <Box
                        flex={pmSpan}
                        bg="orange.50"
                        textAlign="center"
                        py={1}
                      >
                        <Text
                          fontSize="xs"
                          fontWeight="bold"
                          color="orange.600"
                        >
                          PM
                        </Text>
                      </Box>
                    )}
                  </>
                );
              })()}
            </Flex>

            {/* Bottom Row: Numbers */}
            <Flex width="100%" position="relative">
              {timeSlots.map((hour) => (
                <Box
                  key={hour}
                  flex={1}
                  textAlign="start"
                  borderLeft="1px dashed"
                  borderColor="gray.100"
                  pl={2}
                  py={2}
                  position="relative"
                  role="group"
                  _hover={{ bg: "gray.50" }}
                >
                  <Text fontSize="sm" color="gray.500" fontWeight="medium">
                    {hour > 12 ? hour - 12 : hour}
                  </Text>

                  {expandedHour === null && (
                    <IconButton
                      aria-label="Zoom In"
                      icon={<FaSearchPlus />}
                      size="xs"
                      variant="ghost"
                      color="gray.400"
                      position="absolute"
                      top="50%"
                      left="50%"
                      transform="translate(-50%, -50%) scale(0.8)"
                      opacity={0}
                      _groupHover={{
                        opacity: 1,
                        transform: "translate(-50%, -50%) scale(1)",
                      }}
                      transition="all 0.2s"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedHour(hour);
                      }}
                    />
                  )}
                </Box>
              ))}
              {/* End Hour Label */}
              <Box
                position="absolute"
                right="0"
                top={0}
                height="100%"
                borderLeft="1px dashed"
                borderColor="gray.100"
                zIndex={1}
              >
                <Text
                  position="absolute"
                  top={2}
                  right={1} // "Before" the bar
                  transform="translateX(0%)" // Aligned to right edge of space before bar
                  fontSize="sm"
                  color="gray.500"
                  fontWeight="medium"
                  whiteSpace="nowrap"
                >
                  {config.endHour > 12 ? config.endHour - 12 : config.endHour}
                </Text>
              </Box>
            </Flex>

            {/* Zoomed Header Overwrite if active */}
            {expandedHour !== null && (
              <Flex
                width="100%"
                position="absolute"
                top={0}
                left={0}
                bottom={0}
                bg="white"
                zIndex={2}
              >
                <Flex
                  align="center"
                  px={4}
                  borderRight="1px solid"
                  borderColor="gray.200"
                  bg="blue.50"
                >
                  <Text fontWeight="bold" fontSize="lg" color="blue.700">
                    {expandedHour > 12 ? expandedHour - 12 : expandedHour}:00
                  </Text>
                  <IconButton
                    aria-label="Close Zoom"
                    icon={<FaTimes />}
                    size="xs"
                    ml={2}
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => setExpandedHour(null)}
                  />
                </Flex>
                <Flex flex={1}>
                  {timeSlots.map((min) => (
                    <Box
                      key={min}
                      flex={1}
                      borderLeft="1px dashed"
                      borderColor="gray.100"
                      pl={2}
                      py={2}
                    >
                      <Text fontSize="sm" color="gray.500">
                        {min.toString().padStart(2, "0")}
                      </Text>
                    </Box>
                  ))}
                </Flex>
              </Flex>
            )}
          </Flex>

          {/* Rows */}
          <VStack align="start" spacing={3}>
            {developers.map((dev) => (
              <Box
                key={dev.id}
                w="100%"
                h="60px"
                display="flex"
                alignItems="center"
              >
                <UserHierarchyPopover user={dev}>
                  <Box
                    w="150px"
                    pr={4}
                    display="flex"
                    alignItems="center"
                    gap={2}
                    cursor="pointer"
                  >
                    <Avatar size="sm" name={dev.emp_name} src={dev.avatar} />
                    <Text fontSize="sm" fontWeight="bold" isTruncated>
                      {dev.emp_name}
                    </Text>
                  </Box>
                </UserHierarchyPopover>
                <Box
                  flex={1}
                  position="relative"
                  h="100%"
                  bg="gray.50"
                  borderRadius="md"
                >
                  {/* Grid Lines Background */}
                  <Flex
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    zIndex={0}
                    pointerEvents="none"
                  >
                    {timeSlots.map((_, i) => (
                      <Box
                        key={i}
                        flex={1}
                        borderLeft="1px dashed"
                        borderColor="blackAlpha.200"
                        h="100%"
                      />
                    ))}
                    {/* End Line */}
                    <Box
                      borderLeft="1px dashed"
                      borderColor="blackAlpha.200"
                      h="100%"
                      position="absolute"
                      right={0}
                      top={0}
                    />
                  </Flex>

                  {/* Render schedule blocks */}
                  {schedule[dev.emp_id]
                    ?.filter((block) => block.date === todayStr)
                    .map((block, idx) => {
                      const task = tasks.find((t) => t.id === block.taskId);
                      if (!task) return null;

                      // Visual range
                      let width, left;

                      if (expandedHour !== null) {
                        // ZOOMED VIEW CALCULATION
                        // Viewport is 1 Hour (60 mins). Start is expandedHour.
                        // Block times are in decimal hours (e.g. 13.5)

                        // Check if block overlaps
                        const start = Math.max(block.startTime, expandedHour);
                        const end = Math.min(block.endTime, expandedHour + 1);

                        if (start >= end) return null; // No overlap or out of view

                        const duration = end - start; // 0.16 = 10 mins
                        const offset = start - expandedHour;

                        // 1 Hour = 100%
                        width = duration * 100;
                        left = offset * 100;
                      } else {
                        // NORMAL VIEW
                        const totalVisualHours =
                          config.endHour - config.startHour;
                        width =
                          (block.endTime - block.startTime) *
                          (100 / totalVisualHours);
                        left =
                          (block.startTime - config.startHour) *
                          (100 / totalVisualHours);
                      }

                      if (left + width < 0 || left > 100) return null; // out of view

                      if (left + width < 0 || left > 100) return null; // out of view

                      const isOnHold = task.task_status === "on-hold";
                      const isCompleted = task.task_status === "done";

                      const getTaskColors = (
                        priority?: string,
                        status?: string,
                      ) => {
                        if (status === "backlog") {
                          return {
                            bg: "red.50",
                            border: "red.500",
                            hover: "red.100",
                            gradient: "linear(to-r, red.50, red.100)",
                          };
                        }
                        if (status === "on-hold") {
                          return {
                            bg: "yellow.50",
                            border: "yellow.500",
                            hover: "yellow.100",
                            gradient: "linear(to-r, yellow.50, yellow.100)",
                          };
                        }
                        if (isCompleted) {
                          return {
                            bg: "gray.300",
                            border: "gray.500",
                            hover: "gray.400",
                            gradient: "linear(to-r, gray.300, gray.400)",
                          };
                        }
                        switch (priority) {
                          case "P0":
                            return {
                              bg: "red.100",
                              border: "red.500",
                              hover: "red.200",
                              gradient: "linear(to-r, red.100, red.200)",
                            };
                          case "P1":
                            return {
                              bg: "orange.100",
                              border: "orange.500",
                              hover: "orange.200",
                              gradient: "linear(to-r, orange.100, orange.200)",
                            };
                          case "P2":
                            return {
                              bg: "green.100",
                              border: "green.500",
                              hover: "green.200",
                              gradient: "linear(to-r, green.100, green.200)",
                            };
                          default:
                            return {
                              bg: "blue.100",
                              border: "blue.500",
                              hover: "blue.200",
                              gradient: "linear(to-r, blue.100, blue.200)",
                            };
                        }
                      };

                      const colors = getTaskColors(
                        task.task_priority as string,
                        block.status,
                      );

                      return (
                        <Popover
                          key={`${block.taskId}-${idx}`}
                          trigger="hover"
                          placement="top"
                          openDelay={300}
                          closeDelay={500}
                          isLazy
                        >
                          <PopoverTrigger>
                            <Box
                              position="absolute"
                              left={`${Math.max(0, left)}%`}
                              width={`${Math.min(
                                100 - Math.max(0, left),
                                width,
                              )}%`}
                              height="80%"
                              top="15%"
                              h="70%"
                              bgGradient={
                                colors.gradient ||
                                `linear(to-r, ${colors.bg}, ${colors.hover})`
                              }
                              border="1px solid"
                              borderColor={colors.border}
                              boxShadow="md"
                              borderRadius="lg"
                              cursor={isCompleted ? "default" : "pointer"}
                              opacity={isCompleted ? 0.8 : 1}
                              transition="all 0.2s"
                              _hover={{
                                transform: isCompleted ? "none" : "scale(1.05)",
                                zIndex: 10,
                                boxShadow: "xl",
                                bgGradient: colors.gradient
                                  ? undefined
                                  : `linear(to-r, ${colors.hover}, ${colors.bg})`,
                                // For frozen tasks, we might just want to show details, not animate heavily
                              }}
                              px={3}
                              py={1}
                              display="flex"
                              alignItems="center"
                              gap={2}
                            >
                              {isCompleted && (
                                <Box
                                  as={FaCheck}
                                  color="gray.600"
                                  size="10px"
                                />
                              )}
                              <Text
                                fontSize="xs"
                                fontWeight="bold"
                                noOfLines={1}
                                color={isCompleted ? "gray.600" : "black"}
                              >
                                {task.task_name}
                              </Text>
                              {task.task_duration && (
                                <Text
                                  fontSize="xs"
                                  noOfLines={1}
                                  color="gray.600"
                                >
                                  {formatDuration(task.task_duration)}
                                </Text>
                              )}
                            </Box>
                          </PopoverTrigger>
                          <Portal>
                            <PopoverContent
                              width="320px"
                              boxShadow="2xl"
                              borderRadius="xl"
                              borderColor={popoverBorderColor}
                              bg={popoverBg}
                              overflow="hidden"
                              _focus={{ outline: "none" }}
                            >
                              <PopoverArrow />
                              <PopoverBody p={0}>
                                {/* Header Stripe */}
                                <Box h="4px" bg="blue.500" width="100%" />

                                <VStack align="stretch" spacing={3} p={4}>
                                  {/* Title & Priority */}
                                  <Flex justify="space-between" align="start">
                                    <Text
                                      fontWeight="bold"
                                      fontSize="md"
                                      lineHeight="shorter"
                                    >
                                      {task.task_name}
                                    </Text>
                                    {task.task_priority && (
                                      <Badge
                                        colorScheme={
                                          task.task_priority === "P0"
                                            ? "red"
                                            : task.task_priority === "P1"
                                              ? "orange"
                                              : "green"
                                        }
                                        variant="subtle"
                                        borderRadius="full"
                                        px={2}
                                      >
                                        {task.task_priority}
                                      </Badge>
                                    )}
                                  </Flex>

                                  {/* Description */}
                                  {task.task_description && (
                                    <Text
                                      fontSize="sm"
                                      color="gray.500"
                                      noOfLines={2}
                                    >
                                      {task.task_description}
                                    </Text>
                                  )}

                                  <Divider />

                                  {/* Meta Details */}
                                  <VStack align="stretch" spacing={2}>
                                    {/* Assignee */}
                                    <Flex align="center" gap={2}>
                                      <Avatar
                                        size="xs"
                                        name={dev.emp_name}
                                        src={dev.avatar}
                                      />
                                      <Text
                                        fontSize="sm"
                                        fontWeight="medium"
                                        color="gray.700"
                                      >
                                        {dev.emp_name}
                                      </Text>
                                    </Flex>

                                    {/* Duration & Deadline */}
                                    <HStack spacing={4}>
                                      <Flex
                                        align="start"
                                        direction="column"
                                        gap={0}
                                      >
                                        <Flex align="center" gap={1.5}>
                                          <Box as={FaClock} color="gray.400" />
                                          <Text
                                            fontSize="xs"
                                            color="gray.600"
                                            fontWeight="bold"
                                          >
                                            Planned:{" "}
                                            {formatDuration(task.task_duration)}
                                          </Text>
                                        </Flex>
                                        <Flex align="center" gap={1.5} ml={5}>
                                          <Text
                                            fontSize="xs"
                                            color={
                                              isCompleted
                                                ? "green.600"
                                                : "gray.500"
                                            }
                                          >
                                            Actual:{" "}
                                            {task.time_spent
                                              ? formatDuration(task.time_spent)
                                              : "-"}
                                          </Text>
                                        </Flex>
                                      </Flex>
                                      {task.task_due_date && (
                                        <Flex align="center" gap={1.5}>
                                          <Box
                                            as={FaCalendarAlt}
                                            color="gray.400"
                                          />
                                          <Text fontSize="xs" color="gray.600">
                                            {new Date(
                                              task.task_due_date,
                                            ).toLocaleDateString()}
                                          </Text>
                                        </Flex>
                                      )}
                                    </HStack>
                                  </VStack>

                                  {/* Tags */}
                                  {task.task_tags && (
                                    <Flex wrap="wrap" gap={2} mt={1}>
                                      {task.task_tags
                                        .split(",")
                                        .map((tag, i) => (
                                          <Badge
                                            key={i}
                                            variant="outline"
                                            colorScheme="purple"
                                            fontSize="xx-small"
                                            px={1.5}
                                            py={0.5}
                                            borderRadius="md"
                                          >
                                            {tag.trim()}
                                          </Badge>
                                        ))}
                                    </Flex>
                                  )}

                                  <Divider />

                                  {/* Actions */}
                                  <Box width="100%">
                                    {block.status === "backlog" ? (
                                      <>
                                        <Button
                                          leftIcon={<FaCheck />}
                                          size="sm"
                                          colorScheme="red"
                                          w="100%"
                                          mt={2}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePickFromTimeline(task);
                                          }}
                                        >
                                          Pick Task
                                        </Button>
                                        <IconButton
                                          aria-label="Delete"
                                          icon={<FaTrash />}
                                          size="sm"
                                          colorScheme="red"
                                          variant="ghost"
                                          width="100%"
                                          mt={1}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTask(task);
                                          }}
                                        />
                                      </>
                                    ) : (
                                      !isCompleted &&
                                      !isOnHold && (
                                        <HStack spacing={2} pt={2}>
                                          <Button
                                            leftIcon={<FaEdit />}
                                            size="sm"
                                            variant="outline"
                                            flex={1}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onEditTask(task);
                                            }}
                                          >
                                            Edit
                                          </Button>

                                          {/* Hold Button */}
                                          <Button
                                            leftIcon={<FaPause />}
                                            size="sm"
                                            colorScheme="red"
                                            flex={1}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleHoldTask(task);
                                            }}
                                          >
                                            Hold
                                          </Button>

                                          <Button
                                            leftIcon={<FaCheck />}
                                            size="sm"
                                            colorScheme="green"
                                            flex={1}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCompleteTask(task);
                                            }}
                                          >
                                            Done
                                          </Button>
                                          <IconButton
                                            aria-label="Delete"
                                            icon={<FaTrash />}
                                            size="sm"
                                            colorScheme="red"
                                            variant="ghost"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteTask(task);
                                            }}
                                          />
                                        </HStack>
                                      )
                                    )}

                                    {/* Read-Only State for On-Hold (Optional: Allow Delete?) */}
                                    {isOnHold && (
                                      <Text
                                        fontSize="xs"
                                        color="red.500"
                                        textAlign="center"
                                        mt={2}
                                        fontStyle="italic"
                                      >
                                        Task is on hold. Resume from Pending
                                        Tasks.
                                      </Text>
                                    )}

                                    {isCompleted && (
                                      <Button
                                        leftIcon={<FaTrash />}
                                        size="sm"
                                        colorScheme="red"
                                        variant="ghost"
                                        width="100%"
                                        mt={2}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTask(task);
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    )}
                                  </Box>
                                </VStack>
                              </PopoverBody>
                            </PopoverContent>
                          </Portal>
                        </Popover>
                      );
                    })}
                </Box>
              </Box>
            ))}
          </VStack>
        </Box>
      </Box>
    </Box>
  );
};

export default TimelineView;
