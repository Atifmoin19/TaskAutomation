import {
  Flex,
  Text,
  Button,
  useDisclosure,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Stack,
  DrawerCloseButton,
  DrawerHeader,
  IconButton,
  Box,
  Badge,
} from "@chakra-ui/react";
import { FaUser, FaPowerOff, FaBell } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { HEADER_HEIGHT, ADMIN_ROLES, SUPER_ADMIN_ROLES } from "Utils/constants";
import { useAppSelector, useAppDispatch } from "app/hooks";
import { resetStore } from "app/slices/scheduler.slice";
import { useLogoutMutation } from "Services/user.api";
import PendingTasksModal from "./PendingTasksModal";
import { useState, useEffect, useRef } from "react";

const Header = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentUser, tasks } = useAppSelector((state) => state.scheduler);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isModalOpen,
    onOpen: onModalOpen,
    onClose: onModalClose,
  } = useDisclosure();

  const hasOpenedRef = useRef(false);

  const pendingCount = tasks.filter(
    (t) =>
      currentUser &&
      t.task_assigned_to === currentUser.emp_id &&
      (t.task_status === "backlog" || t.task_status === "todo")
  ).length;

  useEffect(() => {
    if (currentUser && pendingCount > 0 && !hasOpenedRef.current) {
      onModalOpen();
      hasOpenedRef.current = true;
    }
  }, [currentUser, pendingCount, onModalOpen]);

  const [logout] = useLogoutMutation();
  const handleLogout = () => {
    logout({})
      .unwrap()
      .then(() => {
        dispatch(resetStore()); // Clear user
        navigate("/login", { replace: true });
        onClose();
      });
  };

  const isAdmin =
    currentUser && ADMIN_ROLES.includes(currentUser.emp_designation);

  return (
    <>
      <Flex
        height={HEADER_HEIGHT}
        bg={"white"}
        position={"fixed"}
        w={"100%"}
        px={6}
        left={0}
        top={0}
        boxSizing="border-box"
        alignItems={"center"}
        justifyContent={"space-between"}
        shadow={"sm"}
        zIndex={999}
        borderBottom="1px solid"
        borderColor="gray.200"
      >
        <Flex alignItems="center" gap={4}>
          <Text
            fontSize="xl"
            fontWeight="bold"
            color="blue.600"
            cursor="pointer"
            onClick={() => {
              if (
                currentUser &&
                SUPER_ADMIN_ROLES.includes(currentUser.emp_designation)
              ) {
                navigate("/dashboard/home");
              } else {
                navigate("/");
              }
            }}
          >
            TaskBoard
          </Text>
        </Flex>
        {currentUser && (
          <Flex alignItems="center" gap={4}>
            {/* Bell Icon for Pending Tasks */}
            <Box position="relative">
              <IconButton
                aria-label="Pending Tasks"
                icon={<FaBell />}
                variant="ghost"
                colorScheme="gray"
                onClick={onModalOpen}
              />
              {pendingCount > 0 && (
                <Badge
                  position="absolute"
                  top="-1px"
                  right="-1px"
                  colorScheme="red"
                  borderRadius="full"
                  fontSize="0.7em"
                  px={1.5}
                >
                  {pendingCount}
                </Badge>
              )}
            </Box>
            <Flex
              alignItems="center"
              gap={2}
              bg="gray.100"
              px={3}
              py={1}
              borderRadius="full"
            >
              <FaUser color="gray.500" />
              <Text fontWeight="medium" fontSize="sm">
                {currentUser.emp_name} ({currentUser.emp_designation})
              </Text>
            </Flex>

            <Button
              size="sm"
              colorScheme="red"
              variant="ghost"
              onClick={handleLogout}
              leftIcon={<FaPowerOff />}
            >
              Logout
            </Button>
          </Flex>
        )}
      </Flex>
      <PendingTasksModal isOpen={isModalOpen} onClose={onModalClose} />
    </>
  );
};

export default Header;
