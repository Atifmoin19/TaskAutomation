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
import { calculateSchedule, getLocalDateKey } from "Utils/scheduler";
import { Task } from "types";
import { ADMIN_ROLES } from "Utils/constants";
import { updateTask } from "app/slices/scheduler.slice";
import { useUpdateTaskMutation } from "Services/user.api";

interface TimelineViewProps {
  onEditTask: (task: Task) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ onEditTask }) => {
  const {
    config,
    developers: allDevelopers,
    tasks,
    currentUser,
  } = useAppSelector((state) => state.scheduler);
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [updateTaskApi] = useUpdateTaskMutation();

  const developers = useMemo(() => {
    if (!currentUser || ADMIN_ROLES.includes(currentUser.emp_designation))
      return allDevelopers;
    return allDevelopers.filter((d) => d.emp_id === currentUser.emp_id);
  }, [allDevelopers, currentUser]);

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
    // Start Date: Start of today (00:00) so we can schedule from morning
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Current Time: Now (for overrun calculation)
    const now = new Date();

    return calculateSchedule(tasks, developers, config, startOfToday, now);
  }, [tasks, developers, config, tick]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = config.startHour; i <= config.endHour; i++) {
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
      const updatedTask = { ...task, task_status: "done" };
      await updateTaskApi(updatedTask).unwrap();
      dispatch(updateTask(updatedTask));
      toast({
        title: "Task Completed",
        description: `${task.task_name} marked as done. Schedule updated.`,
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
      bg={useColorModeValue("white", "gray.800")}
      borderRadius="xl"
      boxShadow="xl"
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

      <Box position="relative" overflowX="auto">
        {/* Header (Time Slots) */}
        <Flex ml="150px" borderBottom="1px solid" borderColor="gray.200" pb={2}>
          {timeSlots.map((hour) => (
            <Box key={hour} flex={1} textAlign="start">
              <Text fontSize="sm" color="gray.500">
                {hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}
              </Text>
            </Box>
          ))}
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
              <Box w="150px" pr={4} display="flex" alignItems="center" gap={2}>
                <Avatar size="sm" name={dev.emp_name} src={dev.avatar} />
                <Text fontSize="sm" fontWeight="bold" isTruncated>
                  {dev.emp_name}
                </Text>
              </Box>
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

                    const width =
                      (block.endTime - block.startTime) *
                      (100 / (config.endHour - config.startHour));
                    const left =
                      (block.startTime - config.startHour) *
                      (100 / (config.endHour - config.startHour));

                    if (left + width < 0 || left > 100) return null; // out of view

                    const getTaskColors = (priority?: string) => {
                      switch (priority) {
                        case "P0":
                          return {
                            bg: "red.100",
                            border: "red.500",
                            hover: "red.200",
                          };
                        case "P1":
                          return {
                            bg: "orange.100",
                            border: "orange.500",
                            hover: "orange.200",
                          };
                        case "P2":
                          return {
                            bg: "green.100",
                            border: "green.500",
                            hover: "green.200",
                          };
                        default:
                          return {
                            bg: "blue.100",
                            border: "blue.500",
                            hover: "blue.200",
                          };
                      }
                    };

                    const colors = getTaskColors(task.task_priority as string);

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
                            top="10%"
                            bg={colors.bg}
                            borderLeft="4px solid"
                            borderColor={colors.border}
                            borderRadius="sm"
                            cursor="pointer"
                            _hover={{ bg: colors.hover }}
                            px={2}
                            py={1}
                            // onClick={() => onEditTask(task)} // Removed direct click
                          >
                            <Text fontSize="xs" fontWeight="bold" noOfLines={1}>
                              {task.task_name}
                            </Text>
                            <Text fontSize="xs" noOfLines={1} color="gray.600">
                              {task.task_duration}hr
                            </Text>
                          </Box>
                        </PopoverTrigger>
                        <Portal>
                          <PopoverContent
                            width="320px"
                            boxShadow="2xl"
                            borderRadius="xl"
                            borderColor={useColorModeValue(
                              "gray.100",
                              "gray.700"
                            )}
                            bg={useColorModeValue("white", "gray.800")}
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
                                    <Flex align="center" gap={1.5}>
                                      <Box as={FaClock} color="gray.400" />
                                      <Text fontSize="xs" color="gray.600">
                                        {task.task_duration
                                          ? `${task.task_duration} hrs`
                                          : "N/A"}
                                      </Text>
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
                                    {task.task_tags.split(",").map((tag, i) => (
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
                                <HStack spacing={2} pt={2}>
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
                                  <Button
                                    leftIcon={<FaCheck />}
                                    size="sm"
                                    colorScheme="green"
                                    w="50%"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCompleteTask(task);
                                    }}
                                  >
                                    Complete
                                  </Button>
                                </HStack>
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
  );
};

export default TimelineView;
