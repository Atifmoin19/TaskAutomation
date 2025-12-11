import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Heading,
  Button,
  Flex,
} from "@chakra-ui/react";
import TaskListingView from "Components/Timeline/TaskListingView";
import SimpleLayout from "Layouts/simpleLayout";
import { Link, useNavigate } from "react-router-dom";
import { useDisclosure } from "@chakra-ui/react";
import { Task } from "types";
import TaskCreationModal from "Components/Timeline/TaskCreationModal";
import { useTaskListQuery } from "Services/user.api";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { addTask } from "app/slices/scheduler.slice";
import { ADMIN_ROLES } from "Utils/constants";
import { FaChartBar } from "react-icons/fa";

const TaskListPage: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector((state) => state.scheduler);
  const navigate = useNavigate();

  const isAdmin =
    currentUser && ADMIN_ROLES.includes(currentUser.emp_designation);

  const { data: taskData } = useTaskListQuery(
    { ...(!isAdmin && { user_id: currentUser?.emp_id }) },
    {
      refetchOnMountOrArgChange: true,
      skip: !currentUser && !isAdmin,
    }
  );

  useEffect(() => {
    if (taskData) {
      dispatch(addTask(taskData));
    }
  }, [taskData, dispatch]);

  const handleEditTask = (task: Task) => {
    setEditTask(task);
    onOpen();
  };

  return (
    <SimpleLayout>
      <Container maxW="container.xl" py={8}>
        <Flex justify="space-between" align="center" mb={6}>
          <Box>
            <Breadcrumb>
              <BreadcrumbItem>
                <BreadcrumbLink as={Link} to="/">
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                <BreadcrumbLink href="#">Task List</BreadcrumbLink>
              </BreadcrumbItem>
            </Breadcrumb>
            <Heading size="lg" mt={2} color="gray.700">
              Task List
            </Heading>
          </Box>
          {isAdmin && (
            <Button
              leftIcon={<FaChartBar />}
              colorScheme="blue"
              onClick={() => navigate("/")}
              boxShadow="lg"
            >
              View Timeline
            </Button>
          )}
        </Flex>

        <TaskListingView onEditTask={handleEditTask} />

        <TaskCreationModal
          isOpen={isOpen}
          onClose={onClose}
          editTaskData={editTask}
        />
      </Container>
    </SimpleLayout>
  );
};

export default TaskListPage;
