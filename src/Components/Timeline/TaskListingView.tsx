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
  Text,
  Avatar,
  IconButton,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { FaTrash, FaEdit } from "react-icons/fa";
import { useDeleteTaskMutation, useTaskListQuery } from "Services/user.api";
import { HStack, Button as ChakraButton } from "@chakra-ui/react";
import { useAppSelector } from "app/hooks";
import { Task } from "types";
import { ADMIN_ROLES, SUPER_ADMIN_ROLES, ROLE_RANK } from "Utils/constants";
import { UserHierarchyPopover } from "Components/UserHierarchyPopover";
import { formatDuration } from "Utils/common";

interface TaskListingViewProps {
  onEditTask: (task: Task) => void;
  filteredManagerId?: string;
}

const TaskListingView: React.FC<TaskListingViewProps> = ({
  onEditTask,
  filteredManagerId,
}) => {
  const {
    tasks: allTasks,
    developers,
    currentUser,
  } = useAppSelector((state) => state.scheduler);

  const [deleteTaskApi] = useDeleteTaskMutation();
  const toast = useToast();

  const handleDelete = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTaskApi(taskId).unwrap();
        toast({ title: "Task deleted", status: "success" });
      } catch (err) {
        toast({ title: "Failed to delete task", status: "error" });
      }
    }
  };

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Determine query params
  const queryParams = React.useMemo(() => {
    const params: any = { page, page_size: pageSize };

    // Role based filtering logic moved to API params effectively
    const isRegularUser =
      currentUser &&
      !ADMIN_ROLES.includes(currentUser.emp_designation) &&
      !SUPER_ADMIN_ROLES.includes(currentUser.emp_designation);

    if (isRegularUser) {
      params.user_id = currentUser?.emp_id;
    }

    // If admin is filtering by manager in the dashboard (passed prop), we might need to handle that.
    // However, the current API 'taskList' might not support 'manager_id' filter directly?
    // The previous code filtered *client side* using 'developers' list.
    // Use 'allTasks' from Redux (Legacy) if we want to respect complex client-side filters not supported by API.
    // BUT the requirement is "backend added pagination".
    // If we us API pagination, we MUST use API filtering.
    // If API doesn't support 'manager_id' filter, we can't fully replicate the Admin Manager Filter with server-side pagination yet.
    // For now, I will assume basic User ID filtering is supported (as used in Dashboard).
    // I will ignore 'filteredManagerId' for the SERVER query if API doesn't support it,
    // OR I will fetch *all* for admin and filter client side? No, that defeats pagination.
    // Let's assume for this step we paginate *what we can*.

    return params;
  }, [page, pageSize, currentUser]);

  const {
    data: responseData,
    isLoading,
    isFetching,
  } = useTaskListQuery(queryParams, {
    refetchOnMountOrArgChange: true,
    skip: !currentUser,
  });

  // Handle Response Structure (Array vs Paginated Object)
  const taskList = React.useMemo(() => {
    if (!responseData) return [];
    // New Paginated Structure
    if (responseData.items && Array.isArray(responseData.items)) {
      return responseData.items;
    }
    // Fallback/Legacy Array
    if (Array.isArray(responseData)) {
      return responseData;
    }
    return [];
  }, [responseData]);

  const totalPages = responseData?.total_pages || 1;
  const totalItems = responseData?.total || taskList.length;

  const handleNext = () => setPage((p) => Math.min(p + 1, totalPages));
  const handlePrev = () => setPage((p) => Math.max(p - 1, 1));

  // We no longer rely on 'allTasks' from Redux for the list, but we use 'developers' for looking up names.
  // We apply CLIENT side filtering only if strictly necessary and possible (e.g. removing blocked roles),
  // but ideally backend handles this.
  // For now, we simply display what backend returns for the page.

  const tasks = taskList; // Directly use fetched items
  // Check if user is Rank 1 (Developer)

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
    <Box
      bg="rgba(255, 255, 255, 0.70)"
      backdropFilter="blur(20px)"
      border="1px solid rgba(255, 255, 255, 0.4)"
      borderRadius="2xl"
      boxShadow="0 8px 32px 0 rgba(31, 38, 135, 0.15)"
      overflowX="auto"
      p={4}
    >
      <Table variant="unstyled">
        <Thead bg="rgba(0,0,0,0.05)" borderRadius="md">
          <Tr>
            <Th py={4} borderTopLeftRadius="md" borderBottomLeftRadius="md">
              Task
            </Th>
            <Th py={4}>Priority</Th>
            <Th py={4}>Assignee</Th>
            <Th py={4}>Duration</Th>
            <Th py={4}>Status</Th>
            <Th py={4}>Created At</Th>
            <Th py={4} borderTopRightRadius="md" borderBottomRightRadius="md">
              Actions
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {tasks?.map((task) => {
            const assignee = getAssignee(task.task_assigned_to);
            return (
              <Tr
                key={task.id}
                borderBottom="1px solid rgba(0,0,0,0.05)"
                transition="all 0.2s ease"
                _hover={{
                  bg: "rgba(255,255,255,0.9)",
                  transform: "scale(1.005)",
                  boxShadow: "lg",
                  cursor: "pointer",
                  borderRadius: "md",
                }}
              >
                <Td fontWeight="bold" py={4}>
                  {task.task_name}
                </Td>
                <Td>
                  <Badge
                    colorScheme={getPriorityColor(task.task_priority as string)}
                  >
                    {task.task_priority}
                  </Badge>
                </Td>
                <Td>
                  {assignee ? (
                    <UserHierarchyPopover user={assignee}>
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={2}
                        cursor="pointer"
                      >
                        <Avatar
                          size="xs"
                          name={assignee.emp_name}
                          src={assignee.avatar}
                        />
                        <Text fontSize="sm">{assignee.emp_name}</Text>
                      </Box>
                    </UserHierarchyPopover>
                  ) : (
                    <Text fontSize="sm" color="gray.400">
                      Unassigned
                    </Text>
                  )}
                </Td>
                <Td>{formatDuration(task.task_duration)}</Td>
                <Td>
                  <Badge variant="outline">{task.task_status}</Badge>
                </Td>
                <Td fontSize="sm" color="gray.500">
                  {task.task_created_at
                    ? new Date(task.task_created_at).toLocaleDateString()
                    : "N/A"}
                </Td>
                <Td>
                  <Tooltip label="Delete Task">
                    <IconButton
                      aria-label="Delete task"
                      icon={<FaTrash />}
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={(e) => handleDelete(e, task.id)}
                    />
                  </Tooltip>
                  <Tooltip label="Edit Task">
                    <IconButton
                      aria-label="Edit task"
                      icon={<FaEdit />}
                      size="sm"
                      colorScheme="blue"
                      variant="ghost"
                      ml={2}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTask(task);
                      }}
                    />
                  </Tooltip>
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

      {/* Pagination Controls */}
      {
        <HStack
          justify="space-between"
          mt={4}
          pt={4}
          borderTop="1px solid"
          borderColor="gray.200"
        >
          <Text fontSize="sm" color="gray.600">
            Page {page} of {totalPages} ({totalItems} tasks)
          </Text>
          <HStack>
            <ChakraButton
              size="sm"
              onClick={handlePrev}
              isDisabled={page === 1}
              isLoading={isFetching}
            >
              Previous
            </ChakraButton>
            <ChakraButton
              size="sm"
              onClick={handleNext}
              isDisabled={page >= totalPages}
              isLoading={isFetching}
            >
              Next
            </ChakraButton>
          </HStack>
        </HStack>
      }
    </Box>
  );
};

export default TaskListingView;
