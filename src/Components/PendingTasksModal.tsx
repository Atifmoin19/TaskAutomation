import React, { useMemo } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Text,
  Button,
  Badge,
  Flex,
  Box,
  useToast,
  Icon,
} from "@chakra-ui/react";
import {
  FaClock,
  FaCalendarAlt,
  FaCheck,
  FaExclamationCircle,
} from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { Task } from "types";
import { useUpdateTaskMutation } from "Services/user.api";
import { updateTask } from "app/slices/scheduler.slice";
import { formatDuration } from "Utils/common";

interface PendingTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PendingTasksModal: React.FC<PendingTasksModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { tasks, currentUser, config } = useAppSelector(
    (state) => state.scheduler,
  );
  const dispatch = useAppDispatch();
  const [updateTaskApi] = useUpdateTaskMutation();
  const toast = useToast();

  const pendingTasks = useMemo(() => {
    if (!currentUser) return [];

    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;

    // Condition: If working hours are over, pending tasks are deferred to next day.
    // User requested: "while my working hours is completed i should get this option on next working day start time"
    if (currentHour >= config.endHour) {
      return [];
    }

    // Filter tasks for current user that are backlog or todo
    const userTasks = tasks.filter(
      (t) =>
        t.task_assigned_to === currentUser.emp_id &&
        (t.task_status === "backlog" ||
          t.task_status === "todo" ||
          t.task_status === "on-hold"),
    );

    // Helper to get effective start date
    const getEffectiveStartDate = (t: Task) => {
      // 1. Explicit Assigned Date
      if (t.task_assigned_date) {
        return new Date(t.task_assigned_date);
      }
      // 2. Created At (Fallback)
      const created = t.task_created_at
        ? new Date(t.task_created_at)
        : new Date();

      /** Use Scheduler Config */
      const END_HOUR = config.endHour;
      const START_HOUR = config.startHour;

      const h = created.getHours() + created.getMinutes() / 60;
      if (h >= END_HOUR) {
        const nextDay = new Date(created);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(START_HOUR, 0, 0, 0);
        return nextDay;
      }
      return created;
    };

    return userTasks
      .filter((t) => {
        const effectiveStart = getEffectiveStartDate(t);

        const todayMidnight = new Date();
        todayMidnight.setHours(0, 0, 0, 0);

        // Condition 1: Must be actionable TODAY or in PAST (Exception)
        // We filter out strictly FUTURE DAYS (Tomorrow onwards)
        const tomorrowMidnight = new Date(todayMidnight);
        tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);

        if (effectiveStart >= tomorrowMidnight) return false;

        // Condition 2: Must not be from strict past (before today 00:00)
        // EXCEPTION: "on-hold" tasks persist as pending actions regardless of start date
        if (t.task_status !== "on-hold") {
          if (effectiveStart < todayMidnight) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // ... (sort logic remains)
        const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
        const pA = priorityOrder[a.task_priority as string] ?? 2;
        const pB = priorityOrder[b.task_priority as string] ?? 2;

        if (pA !== pB) return pA - pB;

        const tA = getEffectiveStartDate(a).getTime();
        const tB = getEffectiveStartDate(b).getTime();
        return tA - tB;
      });
  }, [tasks, currentUser, config]);

  const handlePickTask = async (task: Task) => {
    try {
      const updatedTask = {
        ...task,
        task_status: "in-progress",
        task_updated_at: new Date().toISOString(),
        task_assigned_date: new Date().toISOString(), // Reset start time for simulation
      };

      const resp = await updateTaskApi(updatedTask).unwrap();
      dispatch(updateTask(resp || updatedTask));

      toast({
        title: "Task Picked",
        description: `${task.task_name} has been added to your timeline.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      if (pendingTasks.length <= 1) {
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pick task.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay backdropFilter="blur(5px)" bg="blackAlpha.300" />
      <ModalContent
        bg="white"
        borderRadius="xl"
        boxShadow="0 8px 32px 0 rgba(31, 38, 135, 0.37)"
      >
        <ModalHeader borderBottom="1px solid" borderColor="gray.100" pb={4}>
          <Flex align="center" gap={3}>
            <Icon as={FaExclamationCircle} color="orange.500" boxSize={6} />
            <Box>
              <Text fontSize="lg" fontWeight="bold">
                Pending Tasks
              </Text>
              <Text fontSize="sm" fontWeight="normal" color="gray.500">
                {pendingTasks.length > 0
                  ? `You have ${pendingTasks.length} unpicked tasks. Please prioritize them.`
                  : "No tasks waiting for your attention."}
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={6} bg="gray.50">
          {pendingTasks.length === 0 ? (
            <Flex direction="column" align="center" justify="center" p={8}>
              <Icon as={FaCheck} color="green.400" boxSize={10} mb={3} />
              <Text color="gray.600" fontWeight="medium">
                You're all caught up! No pending tasks.
              </Text>
            </Flex>
          ) : (
            <VStack spacing={4} align="stretch">
              {(() => {
                const hasActiveTask = tasks.some(
                  (t) =>
                    currentUser &&
                    t.task_assigned_to === currentUser.emp_id &&
                    t.task_status === "in-progress",
                );

                return pendingTasks.map((task, index) => {
                  const isFirst = index === 0;
                  // Allow picking ANY task if free. Disable ALL if busy.
                  const isDisabled = hasActiveTask;

                  const priorityColor =
                    task.task_priority === "P0"
                      ? "red"
                      : task.task_priority === "P1"
                        ? "orange"
                        : "blue";

                  return (
                    <Box
                      key={task.id}
                      p={4}
                      bg={isDisabled ? "gray.100" : "white"}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={
                        isFirst ? `${priorityColor}.200` : "gray.200"
                      }
                      boxShadow={isFirst ? "md" : "none"}
                      opacity={isDisabled ? 0.7 : 1}
                      transition="all 0.2s"
                      _hover={
                        !isDisabled
                          ? { transform: "translateY(-2px)", boxShadow: "lg" }
                          : {}
                      }
                    >
                      <Flex justify="space-between" align="start">
                        <VStack align="start" spacing={1} flex={1}>
                          <Flex align="center" gap={2}>
                            <Text
                              fontWeight="bold"
                              color={isDisabled ? "gray.600" : "black"}
                            >
                              {task.task_name}
                            </Text>
                            {task.task_priority && (
                              <Badge colorScheme={priorityColor} fontSize="xs">
                                {task.task_priority}
                              </Badge>
                            )}
                          </Flex>
                          {task.task_description && (
                            <Text fontSize="sm" color="gray.500" noOfLines={2}>
                              {task.task_description}
                            </Text>
                          )}
                          <Flex gap={4} mt={2}>
                            <Flex
                              align="center"
                              gap={1}
                              color="gray.500"
                              fontSize="xs"
                            >
                              <Icon as={FaClock} />
                              <Text>
                                {formatDuration(task.task_duration || 1)} est.
                              </Text>
                            </Flex>
                            {task.task_due_date && (
                              <Flex
                                align="center"
                                gap={1}
                                color="gray.500"
                                fontSize="xs"
                              >
                                <Icon as={FaCalendarAlt} />
                                <Text>
                                  {new Date(
                                    task.task_due_date,
                                  ).toLocaleDateString()}
                                </Text>
                              </Flex>
                            )}
                          </Flex>
                        </VStack>
                        <Button
                          size="sm"
                          colorScheme={priorityColor}
                          isDisabled={isDisabled}
                          onClick={() => handlePickTask(task)}
                          leftIcon={<FaCheck />}
                          ml={4}
                        >
                          Pick
                        </Button>
                      </Flex>
                    </Box>
                  );
                });
              })()}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PendingTasksModal;
