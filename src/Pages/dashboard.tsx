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
import { ADMIN_ROLES } from "Utils/constants";

const Dashboard: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const { currentUser } = useAppSelector((state) => state.scheduler);
  const navigate = useNavigate();

  // Assuming currentUser is available in scope or imported
  const isAdmin =
    currentUser && ADMIN_ROLES.includes(currentUser.emp_designation);
  const dispatch = useAppDispatch();

  // Force refetch on mount or when args change to avoid stale data
  const { data: taskData } = useTaskListQuery(
    { ...(!isAdmin && { user_id: currentUser?.emp_id }) },
    {
      refetchOnMountOrArgChange: true,
      skip: !currentUser && !isAdmin, // Wait until we know who the user is
    }
  );

  const [getUserList] = useLazyUserListQuery();

  useEffect(() => {
    if (taskData) {
      console.log(taskData, "Fetched Tasks");
      dispatch(addTask(taskData));
    }
  }, [taskData, dispatch]);

  useEffect(() => {
    if (isAdmin) {
      getUserList({})
        .unwrap()
        .then((resp) => {
          dispatch(addDeveloper(resp));
        });
    }
  }, [currentUser, isAdmin, getUserList, dispatch]);
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
        {isAdmin ? (
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
                <Heading size="lg" color="gray.700">
                  Timeline
                </Heading>
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
            <TimelineView onEditTask={handleEditTask} />
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
              <Button
                leftIcon={<FaPlus />}
                colorScheme="blue"
                size="md"
                onClick={handleCreateTask}
                boxShadow="lg"
              >
                Create Task
              </Button>
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
