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
  HStack,
  Select,
} from "@chakra-ui/react";
import TaskListingView from "Components/Timeline/TaskListingView";
import SimpleLayout from "Layouts/simpleLayout";
import { Link, useNavigate } from "react-router-dom";
import { useDisclosure } from "@chakra-ui/react";
import { Task } from "types";
import TaskCreationModal from "Components/Timeline/TaskCreationModal";
import { useTaskListQuery, useLazyUserListQuery } from "Services/user.api";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { addTask, addDeveloper } from "app/slices/scheduler.slice";
import { ADMIN_ROLES, SUPER_ADMIN_ROLES } from "Utils/constants";
import { FaChartBar } from "react-icons/fa";

const TaskListPage: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const dispatch = useAppDispatch();
  const { currentUser } = useAppSelector((state) => state.scheduler);
  const navigate = useNavigate();

  const isAdmin =
    currentUser &&
    (ADMIN_ROLES.includes(currentUser.emp_designation) ||
      SUPER_ADMIN_ROLES.includes(currentUser.emp_designation));

  const { data: taskData } = useTaskListQuery(
    { ...(!isAdmin && { user_id: currentUser?.emp_id }) },
    {
      refetchOnMountOrArgChange: true,
      skip: !currentUser,
    }
  );

  const [getUserList] = useLazyUserListQuery();

  useEffect(() => {
    if (taskData) {
      dispatch(addTask(taskData));
    }
  }, [taskData, dispatch]);

  useEffect(() => {
    if (currentUser) {
      getUserList({ user_id: currentUser.emp_id })
        .unwrap()
        .then((resp) => {
          dispatch(addDeveloper(resp));
        });
    }
  }, [currentUser, getUserList, dispatch]);

  const allDevelopers = useAppSelector((state) => state.scheduler.developers);
  const [selectedManagerId, setSelectedManagerId] = useState("");

  const managerList = React.useMemo(() => {
    return allDevelopers.filter((d) => {
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
            {isAdmin && (
              <Box mt={2}>
                <HStack>
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
              </Box>
            )}
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

        <TaskListingView
          onEditTask={handleEditTask}
          filteredManagerId={selectedManagerId}
        />

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
