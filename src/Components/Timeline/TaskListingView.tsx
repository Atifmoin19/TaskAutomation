import React from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Box,
  useColorModeValue,
  Text,
  Avatar,
} from "@chakra-ui/react";
import { useAppSelector } from "app/hooks";
import { Task } from "types";
import { ADMIN_ROLES } from "Utils/constants";

interface TaskListingViewProps {
  onEditTask: (task: Task) => void;
}

const TaskListingView: React.FC<TaskListingViewProps> = ({ onEditTask }) => {
  const {
    tasks: allTasks,
    developers,
    currentUser,
  } = useAppSelector((state) => state.scheduler);

  const tasks = React.useMemo(() => {
    if (!currentUser || ADMIN_ROLES.includes(currentUser.emp_designation))
      return allTasks;
    return allTasks?.filter((t) => t.task_assigned_to === currentUser.emp_id);
  }, [allTasks, currentUser]);
  const bg = useColorModeValue("white", "gray.800");
  const getAssignee = (id?: string) => developers.find((d) => d.emp_id === id);

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "P0":
        return "red";
      case "P1":
        return "orange";
      case "P2":
        return "green";
      default:
        return "gray";
    }
  };

  return (
    <Box bg={bg} borderRadius="xl" boxShadow="sm" overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Task</Th>
            <Th>Priority</Th>
            <Th>Assignee</Th>
            <Th>Duration</Th>
            <Th>Status</Th>
            <Th>Created At</Th>
          </Tr>
        </Thead>
        <Tbody>
          {tasks?.map((task) => {
            const assignee = getAssignee(task.task_assigned_to);
            return (
              <Tr
                key={task.id}
                _hover={{ bg: "gray.50", cursor: "pointer" }}
                onClick={() => onEditTask(task)}
              >
                <Td fontWeight="bold">{task.task_name}</Td>
                <Td>
                  <Badge
                    colorScheme={getPriorityColor(task.task_priority as string)}
                  >
                    {task.task_priority}
                  </Badge>
                </Td>
                <Td>
                  {assignee ? (
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        size="xs"
                        name={assignee.emp_name}
                        src={assignee.avatar}
                      />
                      <Text fontSize="sm">{assignee.emp_name}</Text>
                    </Box>
                  ) : (
                    <Text fontSize="sm" color="gray.400">
                      Unassigned
                    </Text>
                  )}
                </Td>
                <Td>{task.task_duration} hrs</Td>
                <Td>
                  <Badge variant="outline">{task.task_status}</Badge>
                </Td>
                <Td fontSize="sm" color="gray.500">
                  {task.task_created_at
                    ? new Date(task.task_created_at).toLocaleDateString()
                    : "N/A"}
                </Td>
              </Tr>
            );
          })}
          {tasks.length === 0 && (
            <Tr>
              <Td colSpan={6} textAlign="center" py={8} color="gray.500">
                No tasks found. Create one to get started.
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>
    </Box>
  );
};

export default TaskListingView;
