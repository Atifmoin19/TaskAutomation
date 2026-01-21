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
  Avatar,
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
import { ADMIN_ROLES, SUPER_ADMIN_ROLES, ROLE_RANK } from "Utils/constants";

const Dashboard: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const { currentUser, tasks } = useAppSelector((state) => state.scheduler);
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
    },
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

            {/* Available Developers Section */}
            <Box
              mb={6}
              bg="white"
              p={4}
              borderRadius="xl"
              shadow="sm"
              border="1px solid"
              borderColor="gray.100"
            >
              <Heading size="sm" mb={3} color="gray.600">
                Available Developers
              </Heading>
              <Flex gap={3} wrap="wrap">
                {(() => {
                  const availableDevs = allDevelopers.filter((dev) => {
                    // Filter by Manager if selected
                    if (
                      selectedManagerId &&
                      dev.manager_id !== selectedManagerId
                    )
                      return false;

                    // Filter Out Managers/Admins (Rank >= 4)
                    // We need ROLE_RANK. If not imported, we default to showing them if 1-3.
                    // Assuming standard dev roles are ASE(1), SE(1), etc.
                    const rank = ROLE_RANK[dev.emp_designation] || 1;
                    if (rank >= 4) return false;

                    // Check for Active Task
                    const hasActiveTask =
                      tasks &&
                      tasks.some(
                        (t) =>
                          t.task_assigned_to === dev.emp_id &&
                          (t.task_status === "in-progress" ||
                            t.task_status === "in progress"),
                      );
                    return !hasActiveTask;
                  });

                  if (availableDevs.length === 0) {
                    return (
                      <Text fontSize="sm" color="gray.400" fontStyle="italic">
                        No developers currently available.
                      </Text>
                    );
                  }

                  return availableDevs.map((dev) => (
                    <Flex
                      key={dev.emp_id}
                      role="group"
                      align="center"
                      bg="gray.50"
                      borderRadius="full"
                      border="1px solid"
                      borderColor="gray.200"
                      p={1}
                      pr={1}
                      cursor="pointer"
                      transition="all 0.3s ease"
                      maxW="42px" // Collapsed width (Avatar + padding)
                      overflow="hidden"
                      whiteSpace="nowrap"
                      _hover={{
                        maxW: "200px", // Expanded width
                        pr: 4,
                        bg: "green.50",
                        borderColor: "green.200",
                      }}
                    >
                      <Avatar
                        size="sm"
                        name={dev.emp_name}
                        src={dev.avatar}
                        border="1px solid white"
                        ignoreFallback
                      />
                      <Text
                        ml={2}
                        fontSize="sm"
                        fontWeight="medium"
                        color="gray.700"
                        opacity={0}
                        transform="translateX(-10px)"
                        transition="all 0.3s ease"
                        _groupHover={{ opacity: 1, transform: "translateX(0)" }}
                        // Note: _groupHover requires 'role=group' on parent usually, or direct css
                        sx={{
                          ".chakra-ui-dark &": { color: "gray.200" },
                          // Inline hover trick for parent interaction
                          transitionDelay: "0.1s",
                        }}
                        // We use the parent hover state implicitly by nesting styles if needed,
                        // but Chakra's _hover on parent affecting child is best done with css vars or role='group'
                      >
                        {dev.emp_name}
                      </Text>
                    </Flex>
                  ));
                })()}
              </Flex>
            </Box>

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
