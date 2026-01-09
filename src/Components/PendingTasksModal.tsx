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

interface PendingTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PendingTasksModal: React.FC<PendingTasksModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { tasks, currentUser } = useAppSelector((state) => state.scheduler);
  const dispatch = useAppDispatch();
  const [updateTaskApi] = useUpdateTaskMutation();
  const toast = useToast();

  const pendingTasks = useMemo(() => {
    if (!currentUser) return [];

    // Filter tasks for current user that are backlog or todo
    const userTasks = tasks.filter(
      (t) =>
        t.task_assigned_to === currentUser.emp_id &&
        (t.task_status === "backlog" || t.task_status === "todo")
    );

    // Sort by Priority (P0 > P1 > P2) and Assinged Time (created_at)
    return userTasks.sort((a, b) => {
      const priorityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2 };
      const pA = priorityOrder[a.task_priority as string] ?? 2;
      const pB = priorityOrder[b.task_priority as string] ?? 2;

      if (pA !== pB) return pA - pB;

      const tA = a.task_assigned_date
        ? new Date(a.task_assigned_date).getTime()
        : a.task_created_at
        ? new Date(a.task_created_at).getTime()
        : 0;
      const tB = b.task_assigned_date
        ? new Date(b.task_assigned_date).getTime()
        : b.task_created_at
        ? new Date(b.task_created_at).getTime()
        : 0;
      return tA - tB;
    });
  }, [tasks, currentUser]);

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
                You have {pendingTasks.length} unpicked tasks. Please prioritize
                them.
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
              {pendingTasks.map((task, index) => {
                const isFirst = index === 0;
                const isDisabled = !isFirst;

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
                    borderColor={isFirst ? `${priorityColor}.200` : "gray.200"}
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
                            <Text>{task.task_duration || 1}h est.</Text>
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
                                  task.task_due_date
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
              })}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default PendingTasksModal;
