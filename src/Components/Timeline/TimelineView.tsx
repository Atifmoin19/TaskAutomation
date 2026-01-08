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
} from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "app/hooks";
import {
  calculateSchedule,
  getLocalDateKey,
  calculateBusinessDuration,
} from "Utils/scheduler";
import { Task } from "types";
import { ADMIN_ROLES, SUPER_ADMIN_ROLES, ROLE_RANK } from "Utils/constants";
import { updateTask } from "app/slices/scheduler.slice";
import { useUpdateTaskMutation } from "Services/user.api";
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
      (d) => (ROLE_RANK[d.emp_designation] || 0) < 4
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
          d.manager_id === currentUser.emp_id || d.emp_id === currentUser.emp_id
      );
    }

    // Regular user
    return assignableDevs.filter((d) => d.emp_id === currentUser.emp_id);
  }, [allDevelopers, currentUser, filteredManagerId]);

  // Check if user is Rank 1 (Developer)
  const isRank1 = useMemo(() => {
    return currentUser && (ROLE_RANK[currentUser.emp_designation] || 0) === 1;
  }, [currentUser]);

  // Default date logic: If now > EndHour, show Tomorrow.
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    if (currentHour >= config.endHour) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    return now;
  });

  const [tick, setTick] = useState(0);

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
      (t) => t.task_status === "in-progress" || t.task_status === "done"
    );

    return calculateSchedule(timelineTasks, developers, config, simStartDate);
  }, [tasks, developers, config, tick, currentDate]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = config.startHour; i < config.endHour; i++) {
      slots.push(i);
    }
    return slots;
  }, [config]);

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

  const handleCompleteTask = async (task: Task) => {
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
            pb={2}
            position="sticky"
            top={0}
            zIndex={20}
            bg="rgba(255, 255, 255, 0.95)"
            backdropFilter="blur(10px)"
            pt={2}
          >
            {timeSlots.map((hour) => (
              <Box
                key={hour}
                flex={1}
                textAlign="start"
                borderLeft="1px dashed"
                borderColor="gray.100"
                pl={2}
              >
                <Text fontSize="sm" color="gray.500" fontWeight="medium">
                  {hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}
                </Text>
              </Box>
            ))}
            {/* End Hour Label */}
            <Box
              position="absolute"
              right="0"
              top="2"
              transform="translateX(50%)"
            >
              <Text fontSize="sm" color="gray.500" fontWeight="medium">
                {config.endHour > 12 ? config.endHour - 12 : config.endHour}{" "}
                {config.endHour >= 12 ? "PM" : "AM"}
              </Text>
            </Box>
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
                  {/* Render schedule blocks */}
                  {schedule[dev.emp_id]
                    ?.filter((block) => block.date === todayStr)
                    .map((block, idx) => {
                      const task = tasks.find((t) => t.id === block.taskId);
                      if (!task) return null;

                      // Visual range
                      const totalVisualHours =
                        config.endHour - config.startHour;

                      const width =
                        (block.endTime - block.startTime) *
                        (100 / totalVisualHours);
                      const left =
                        (block.startTime - config.startHour) *
                        (100 / totalVisualHours);

                      if (left + width < 0 || left > 100) return null; // out of view

                      const isCompleted = task.task_status === "done";

                      const getTaskColors = (priority?: string) => {
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
                        task.task_priority as string
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
                                width
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
                              <Text
                                fontSize="xs"
                                noOfLines={1}
                                color="gray.600"
                              >
                                {task.task_duration}hr
                              </Text>
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
                                            {task.task_duration || "N/A"} hr
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
                                              ? `${task.time_spent} hr`
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
                                              task.task_due_date
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
                                  {!isCompleted && (
                                    <HStack spacing={2} pt={2}>
                                      {!isRank1 && (
                                        <Button
                                          leftIcon={<FaEdit />}
                                          size="sm"
                                          variant="outline"
                                          w="50%"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onEditTask(task);
                                          }}
                                        >
                                          Edit
                                        </Button>
                                      )}
                                      <Button
                                        leftIcon={<FaCheck />}
                                        size="sm"
                                        colorScheme="green"
                                        w={isRank1 ? "100%" : "50%"}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCompleteTask(task);
                                        }}
                                      >
                                        Complete
                                      </Button>
                                    </HStack>
                                  )}
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
