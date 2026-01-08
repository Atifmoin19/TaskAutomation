import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Heading,
  Button,
  Flex,
  useDisclosure,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  VStack,
  HStack,
  Select,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

import TimelineView from "Components/Timeline/TimelineView";
import TaskCreationModal from "Components/Timeline/TaskCreationModal";
import TaskListingView from "Components/Timeline/TaskListingView";
import { FaPlus, FaList } from "react-icons/fa";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { Task } from "types";
import SimpleLayout from "Layouts/simpleLayout";
import { addDeveloper, addTask } from "app/slices/scheduler.slice";
import { useTaskListQuery, useLazyUserListQuery } from "Services/user.api";
import { ADMIN_ROLES, SUPER_ADMIN_ROLES } from "Utils/constants";

const Dashboard: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const { currentUser } = useAppSelector((state) => state.scheduler);
  const navigate = useNavigate();

  // Assuming currentUser is available in scope or imported
  const empDesignation = currentUser?.emp_designation || "";
  const isL1Admin = ADMIN_ROLES.includes(empDesignation);
  const isSuperAdmin = SUPER_ADMIN_ROLES.includes(empDesignation);
  // "Admin" for layout purposes includes both
  const isManagement = isL1Admin || isSuperAdmin;

  const dispatch = useAppDispatch();

  // Force refetch on mount or when args change to avoid stale data
  // If Management, fetch all tasks (no user_id). If regular user, fetch ONLY their tasks.
  const { data: taskData } = useTaskListQuery(
    { ...(!isManagement && { user_id: currentUser?.emp_id }) },
    {
      refetchOnMountOrArgChange: true,
      skip: !currentUser, // Wait until we know who the user is
    }
  );

  const [getUserList] = useLazyUserListQuery();

  useEffect(() => {
    if (taskData) {
      console.log(taskData, "Fetched Tasks");
      dispatch(addTask(taskData));
    }
  }, [taskData, dispatch]);

  const allDevelopers = useAppSelector((state) => state.scheduler.developers);
  const [selectedManagerId, setSelectedManagerId] = useState("");

  const managerList = React.useMemo(() => {
    // Filter for ranks L1, L2, EM, CTO etc (Rank > 1)
    return allDevelopers.filter((d) => {
      // Need to ensure ROLE_RANK is imported or available.
      // It is not imported in Dashboard currently. I need to add import.
      // Assuming import is handled in next chunk or I add it now.
      return [
        "L1",
        "L2",
        "EM",
        "CTO",
        "PRODUCT",
        "OWNER",
        "SUPERADMIN",
      ].includes(d.emp_designation);
    });
  }, [allDevelopers]);

  useEffect(() => {
    if (isManagement) {
      getUserList({ user_id: currentUser?.emp_id })
        .unwrap()
        .then((resp) => {
          dispatch(addDeveloper(resp));
        });
    }
  }, [currentUser, isManagement, getUserList, dispatch]);
  const handleCreateTask = () => {
    setEditTask(null);
    onOpen();
  };

  const handleEditTask = (task: Task) => {
    setEditTask(task);
    onOpen();
  };

  return (
    <SimpleLayout>
      <Container maxW="container.xl" py={8}>
        {isManagement ? (
          // Admin View: Timeline Only (Task Listing on separate page)
          <Box>
            <Box mb={6}>
              <Breadcrumb>
                <BreadcrumbItem isCurrentPage>
                  <BreadcrumbLink href="#">Home</BreadcrumbLink>
                </BreadcrumbItem>
              </Breadcrumb>
            </Box>
            <Flex justify="space-between" align="center" mb={6}>
              <Box>
                <HStack spacing={4} mb={1}>
                  <Heading size="lg" color="gray.700">
                    Team View
                  </Heading>
                  <Select
                    placeholder="All Members"
                    w="200px"
                    size="sm"
                    borderRadius="md"
                    bg="white"
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                  >
                    {managerList.map((mgr) => (
                      <option key={mgr.emp_id} value={mgr.emp_id}>
                        {mgr.emp_name} ({mgr.emp_designation})
                      </option>
                    ))}
                  </Select>
                </HStack>
                <Text color="gray.500">View developer schedules</Text>
              </Box>
              <HStack spacing={4}>
                <Button
                  leftIcon={<FaPlus />}
                  colorScheme="blue"
                  size="md"
                  onClick={handleCreateTask}
                  boxShadow="lg"
                >
                  Create Task
                </Button>
                <Button
                  leftIcon={<FaList />}
                  colorScheme="teal"
                  size="md"
                  onClick={() => navigate("/task-list")}
                  boxShadow="lg"
                >
                  View List
                </Button>
              </HStack>
            </Flex>
            <TimelineView
              onEditTask={handleEditTask}
              filteredManagerId={selectedManagerId}
            />
          </Box>
        ) : (
          // Developer View: Stacked Timeline + Task List
          <VStack spacing={8} align="stretch">
            <Flex justify="space-between" align="center">
              <Box>
                <Heading size="lg" color="gray.700">
                  My Dashboard
                </Heading>
                <Text color="gray.500">My schedule and tasks</Text>
              </Box>
            </Flex>

            <Box>
              <Heading size="md" mb={4} color="gray.600">
                Timeline
              </Heading>
              <TimelineView onEditTask={handleEditTask} />
            </Box>

            <Box>
              <Heading size="md" mb={4} color="gray.600">
                My Tasks
              </Heading>
              <TaskListingView onEditTask={handleEditTask} />
            </Box>
          </VStack>
        )}

        <TaskCreationModal
          isOpen={isOpen}
          onClose={onClose}
          editTaskData={editTask}
        />
      </Container>
    </SimpleLayout>
  );
};

export default Dashboard;
