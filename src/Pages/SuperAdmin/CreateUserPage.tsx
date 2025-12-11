import React, { useState, useRef } from "react";
import {
  Box,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Input,
  Select,
  Button,
  useToast,
  VStack,
} from "@chakra-ui/react";
import SimpleLayout from "Layouts/simpleLayout";
import {
  useCreateUserMutation,
  useUploadUsersMutation,
} from "Services/user.api";

const CreateUserPage: React.FC = () => {
  const [createUser] = useCreateUserMutation();
  const [uploadUsers, { isLoading: isUploading }] = useUploadUsersMutation();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single User State
  const [empName, setEmpName] = useState("");
  const [empId, setEmpId] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empDesignation, setEmpDesignation] = useState("");
  const [empDepartment, setEmpDepartment] = useState("");
  const [empHierarchy, setEmpHierarchy] = useState("");

  // Bulk Upload State
  const [file, setFile] = useState<File | null>(null);

  const handleSingleSubmit = async () => {
    if (!empName || !empId || !empEmail || !empDesignation) {
      toast({ title: "Please fill all required fields", status: "error" });
      return;
    }

    const newUser = {
      emp_name: empName,
      emp_id: empId,
      emp_email: empEmail,
      emp_phone: empPhone,
      emp_designation: empDesignation,
      emp_department: empDepartment,
      emp_hierarchy: empHierarchy || undefined,
    };

    try {
      await createUser(newUser).unwrap();
      toast({ title: "User Created Successfully", status: "success" });
      // Reset form
      setEmpName("");
      setEmpId("");
      setEmpEmail("");
      setEmpPhone("");
      setEmpDesignation("");
      setEmpDepartment("");
      setEmpHierarchy("");
    } catch (err) {
      toast({
        title: "Failed to create user",
        description: "Something went wrong",
        status: "error",
      });
    }
  };

  const handleBulkUpload = async () => {
    if (!file) {
      toast({ title: "Please select a CSV file", status: "warning" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      await uploadUsers(formData).unwrap();
      toast({ title: "Users Uploaded Successfully", status: "success" });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast({
        title: "Failed to upload users",
        description: "Check file format.",
        status: "error",
      });
    }
  };

  return (
    <SimpleLayout>
      <Container maxW="container.md" py={8}>
        <Heading size="lg" mb={6} color="gray.700">
          Create User
        </Heading>
        <Tabs variant="enclosed">
          <TabList>
            <Tab>Single User Creation</Tab>
            <Tab>Bulk User Creation</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <VStack
                spacing={4}
                align="stretch"
                bg="white"
                p={6}
                borderRadius="md"
                shadow="sm"
              >
                <FormControl isRequired>
                  <FormLabel>Employee Name</FormLabel>
                  <Input
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="e.g. Atif Moin"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Employee ID</FormLabel>
                  <Input
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    placeholder="e.g. S00218"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="e.g. atif.moin@zopper.com"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Phone</FormLabel>
                  <Input
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="e.g. 7007136187"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Designation</FormLabel>
                  <Input
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    placeholder="e.g. SE1"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Department</FormLabel>
                  <Input
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    placeholder="e.g. FE"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Hierarchy</FormLabel>
                  <Select
                    value={empHierarchy}
                    onChange={(e) => setEmpHierarchy(e.target.value)}
                    placeholder="Select Hierarchy"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="L1">L1</option>
                    <option value="L2">L2</option>
                    <option value="Admin">Admin</option>
                  </Select>
                </FormControl>

                <Button
                  colorScheme="green"
                  onClick={handleSingleSubmit}
                  width="full"
                  mt={4}
                >
                  Create User
                </Button>
              </VStack>
            </TabPanel>
            <TabPanel>
              <Box
                bg="white"
                p={6}
                borderRadius="md"
                shadow="sm"
                textAlign="center"
              >
                <Heading size="md" mb={4} color="gray.600">
                  CSV Bulk Upload
                </Heading>
                <Input
                  type="file"
                  p={1}
                  mb={4}
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files) {
                      setFile(e.target.files[0]);
                    }
                  }}
                />
                <Button
                  colorScheme="green"
                  onClick={handleBulkUpload}
                  isLoading={isUploading}
                >
                  Upload CSV
                </Button>
                <Box mt={4} color="gray.500" fontSize="sm">
                  <p>Upload a CSV file containing user details.</p>
                </Box>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </SimpleLayout>
  );
};

export default CreateUserPage;
