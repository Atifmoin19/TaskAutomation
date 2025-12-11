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
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  useToast,
  SimpleGrid,
  GridItem,
} from "@chakra-ui/react";
import SimpleLayout from "Layouts/simpleLayout";
import {
  useCreateTaskMutation,
  useUploadTasksMutation,
} from "Services/user.api";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { addTask } from "app/slices/scheduler.slice";
import { Priority, Task } from "types";
import { ROLE_RANK } from "Utils/constants";

const CreateTaskPage: React.FC = () => {
  const [createTask] = useCreateTaskMutation();
  const [uploadTasks, { isLoading: isUploading }] = useUploadTasksMutation();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const allTasks = useAppSelector((state) => state.scheduler.tasks);
  const developers = useAppSelector((state) => state.scheduler.developers);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single Task State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(1);
  const [priority, setPriority] = useState<Priority>("P1");
  const [status, setStatus] = useState<string>("todo");
  const [assigneeId, setAssigneeId] = useState("");

  // Bulk State
  const [file, setFile] = useState<File | null>(null);

  const handleSingleSubmit = async () => {
    if (!title || !assigneeId) {
      toast({ title: "Title and Assignee are required", status: "error" });
      return;
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      task_name: title,
      task_description: description,
      task_duration: String(duration),
      task_priority: priority,
      task_assigned_to: assigneeId,
      task_status: status,
      task_created_at: new Date().toISOString(),
    };

    const resp = await createTask(newTask);
    if (resp?.data) {
      dispatch(addTask([...allTasks, newTask]));
      toast({ title: "Task Created Successfully", status: "success" });
      // Reset form
      setTitle("");
      setDescription("");
      setDuration(1);
      setPriority("P1");
      setStatus("todo");
      setAssigneeId("");
    } else {
      toast({ title: "Failed to create task", status: "error" });
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
      await uploadTasks(formData).unwrap();
      toast({ title: "Tasks Uploaded Successfully", status: "success" });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      toast({
        title: "Failed to upload tasks",
        description: "Check file format.",
        status: "error",
      });
    }
  };

  return (
    <SimpleLayout>
      <Container maxW="container.xl" py={8}>
        <Heading size="lg" mb={6} color="gray.700" textAlign="center">
          Create Task
        </Heading>
        <Tabs variant="soft-rounded" colorScheme="blue">
          <TabList mb={4} justifyContent="center">
            <Tab>Single Task Creation</Tab>
            <Tab>Bulk Task Creation</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Box
                bg="white"
                p={8}
                borderRadius="xl"
                boxShadow="xl"
                border="1px solid"
                borderColor="gray.100"
              >
                <Heading size="md" color="gray.600" mb={6}>
                  Task Details
                </Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  <GridItem colSpan={{ base: 1, md: 2 }}>
                    <FormControl isRequired>
                      <FormLabel>Task Title</FormLabel>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Fix Login Bug"
                      />
                    </FormControl>
                  </GridItem>

                  <FormControl isRequired>
                    <FormLabel>Duration (Hours)</FormLabel>
                    <NumberInput
                      min={0.5}
                      max={100}
                      value={duration}
                      onChange={(val) => setDuration(Number(val))}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  <GridItem colSpan={{ base: 1, md: 3 }}>
                    <FormControl>
                      <FormLabel>Description</FormLabel>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Details..."
                        rows={4}
                      />
                    </FormControl>
                  </GridItem>

                  <FormControl>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                    >
                      <option value="P0">P0 - Critical</option>
                      <option value="P1">P1 - High</option>
                      <option value="P2">P2 - Normal</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="backlog">Backlog</option>
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </Select>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Assign To</FormLabel>
                    <Select
                      value={assigneeId}
                      onChange={(e) => setAssigneeId(e.target.value)}
                      placeholder="Select User"
                    >
                      {developers
                        ?.filter(
                          (dev) => (ROLE_RANK[dev.emp_designation] || 0) < 4
                        )
                        .map((dev) => (
                          <option key={dev.id} value={dev.emp_id}>
                            {dev.emp_name} ({dev.emp_designation})
                          </option>
                        ))}
                    </Select>
                  </FormControl>
                </SimpleGrid>

                <Button
                  colorScheme="blue"
                  onClick={handleSingleSubmit}
                  width="full"
                  mt={8}
                  size="lg"
                >
                  Create Task
                </Button>
              </Box>
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
                  <p>Upload a CSV file containing task details.</p>
                </Box>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </SimpleLayout>
  );
};

export default CreateTaskPage;
