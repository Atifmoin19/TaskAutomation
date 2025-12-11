import React, { useState } from "react";
import {
  Box,
  Container,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  useToast,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import SimpleLayout from "Layouts/simpleLayout";
import {
  useUpdateUserMutation,
  useLazyUserListQuery,
  useUserListQuery,
} from "Services/user.api";
import { DESIGNATIONS, ROLE_RANK } from "Utils/constants";
import { useAppSelector } from "app/hooks";
import { FaEdit } from "react-icons/fa";
import { Employee } from "types";

const UserManagementPage: React.FC = () => {
  const [updateUser] = useUpdateUserMutation();
  const toast = useToast();

  const { developers: reduxDevelopers } = useAppSelector(
    (state) => state.scheduler
  );

  // Fetch users specifically for the list
  const { data: userList } = useUserListQuery(
    {},
    { refetchOnMountOrArgChange: true }
  );

  const usersToDisplay = userList || [];
  const potentialManagers =
    usersToDisplay.length > 0 ? usersToDisplay : reduxDevelopers;

  const [triggerUserList] = useLazyUserListQuery();

  // Edit Modal State
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();
  const [editingUser, setEditingUser] = useState<Employee | null>(null);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editHierarchy, setEditHierarchy] = useState("");
  const [editManagerId, setEditManagerId] = useState("");

  const editRank = ROLE_RANK[editDesignation] || 0;
  const showEditManager = editRank < 5;
  const validEditManagers = potentialManagers.filter(
    (m: Employee) => (ROLE_RANK[m.emp_designation] || 0) > editRank
  );

  const handleEditClick = (user: Employee) => {
    setEditingUser(user);
    setEditName(user.emp_name);
    setEditEmail(user.emp_email);
    setEditPhone(user.emp_phone || "");
    setEditDesignation(user.emp_designation);
    setEditDepartment(user.emp_department || "");
    setEditHierarchy(user.emp_hierarchy || "");
    setEditManagerId(user.manager_id || "");
    onEditOpen();
  };

  const handleUpdateSubmit = async () => {
    if (!editingUser) return;

    if (!editName || !editEmail || !editDesignation) {
      toast({ title: "Please fill required fields", status: "error" });
      return;
    }

    const updatedUser = {
      ...editingUser,
      emp_name: editName,
      emp_email: editEmail,
      emp_phone: editPhone,
      emp_designation: editDesignation,
      emp_department: editDepartment,
      emp_hierarchy: editHierarchy,
      manager_id: showEditManager ? editManagerId : undefined,
    };

    try {
      await updateUser(updatedUser).unwrap();
      toast({ title: "User Updated Successfully", status: "success" });
      onEditClose();
    } catch (error) {
      toast({ title: "Failed to update user", status: "error" });
    }
  };

  React.useEffect(() => {
    if (reduxDevelopers.length === 0) {
      triggerUserList({});
    }
  }, [reduxDevelopers.length, triggerUserList]);

  return (
    <SimpleLayout>
      <Container maxW="container.xl" py={8}>
        <Heading size="lg" mb={6} color="gray.700" textAlign="center">
          User Management
        </Heading>

        <Box
          bg="white"
          p={6}
          borderRadius="xl"
          boxShadow="xl"
          border="1px solid"
          borderColor="gray.100"
          overflowX="auto"
        >
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Emp ID</Th>
                <Th>Designation</Th>
                <Th>Manager</Th>
                <Th>Email</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {potentialManagers?.map((user: Employee) => (
                <Tr key={user.emp_id} _hover={{ bg: "gray.50" }}>
                  <Td fontWeight="medium">{user.emp_name}</Td>
                  <Td>{user.emp_id}</Td>
                  <Td>{user.emp_designation}</Td>
                  <Td>{user.manager_id || "-"}</Td>
                  <Td>{user.emp_email}</Td>
                  <Td>
                    <IconButton
                      aria-label="Edit User"
                      icon={<FaEdit />}
                      size="sm"
                      colorScheme="blue"
                      variant="ghost"
                      onClick={() => handleEditClick(user)}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>

        {/* Edit User Modal */}
        <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
          <ModalOverlay backdropFilter="blur(4px)" />
          <ModalContent>
            <ModalHeader>Update User</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Designation</FormLabel>
                  <Select
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="Select Designation"
                  >
                    {DESIGNATIONS.map((des) => (
                      <option key={des} value={des}>
                        {des}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                {showEditManager && editDesignation && (
                  <FormControl isRequired>
                    <FormLabel>Manager</FormLabel>
                    <Select
                      value={editManagerId}
                      onChange={(e) => setEditManagerId(e.target.value)}
                      placeholder="Select Manager"
                    >
                      {validEditManagers.map((dev: any) => (
                        <option key={dev.id || dev.emp_id} value={dev.emp_id}>
                          {dev.emp_name} ({dev.emp_designation})
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControl isRequired>
                  <FormLabel>Employee Name</FormLabel>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </FormControl>

                <FormControl isDisabled>
                  <FormLabel>Employee ID</FormLabel>
                  <Input value={editingUser?.emp_id} isReadOnly />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Phone</FormLabel>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Department</FormLabel>
                  <Input
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Hierarchy</FormLabel>
                  <Select
                    value={editHierarchy}
                    onChange={(e) => setEditHierarchy(e.target.value)}
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="L1">L1</option>
                    <option value="L2">L2</option>
                    <option value="Admin">Admin</option>
                  </Select>
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onEditClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleUpdateSubmit}>
                Update User
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </Container>
    </SimpleLayout>
  );
};

export default UserManagementPage;
