import React, { useEffect, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
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
  VStack,
  useToast,
  HStack,
} from "@chakra-ui/react";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { addTask, updateTask } from "app/slices/scheduler.slice";
import { Priority, Task } from "types";
import {
  useCreateTaskMutation,
  useUpdateTaskMutation,
} from "Services/user.api";
import { ADMIN_ROLES, SUPER_ADMIN_ROLES } from "Utils/constants";

interface TaskCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTaskData?: Task | null;
}

const TaskCreationModal: React.FC<TaskCreationModalProps> = ({
  isOpen,
  onClose,
  editTaskData,
}) => {
  const [createTask] = useCreateTaskMutation();
  const [updateTaskApi] = useUpdateTaskMutation();
  const hitCreateTask = async (taskData: Task) => {
    return await createTask(taskData);
  };
  const hitUpdateTask = async (taskData: Task) => {
    return await updateTaskApi(taskData);
  };
  const dispatch = useAppDispatch();
  const developers = useAppSelector((state) => state.scheduler.developers);
  const allTasks = useAppSelector((state) => state.scheduler.tasks);
  const currentUser = useAppSelector((state) => state.scheduler.currentUser);
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [priority, setPriority] = useState<Priority>("P1");
  const [status, setStatus] = useState<string>("todo");
  const [assigneeId, setAssigneeId] = useState("");

  const isAdmin =
    currentUser &&
    (ADMIN_ROLES.includes(currentUser.emp_designation) ||
      SUPER_ADMIN_ROLES.includes(currentUser.emp_designation));

  useEffect(() => {
    if (editTaskData) {
      setTitle(editTaskData.task_name);
      setDescription(editTaskData.task_description || "");

      const rawDuration = editTaskData.task_duration || "1";
      if (String(rawDuration).includes(":")) {
        const [h, m] = String(rawDuration).split(":").map(Number);
        setDurationHours(h || 0);
        setDurationMinutes(m || 0);
      } else {
        const d = Number(rawDuration);
        const totalMinutes = Math.round(d * 60);
        setDurationHours(Math.floor(totalMinutes / 60));
        setDurationMinutes(totalMinutes % 60);
      }

      setPriority((editTaskData.task_priority as Priority) || "P1");
      setStatus(editTaskData.task_status || "todo");
      setAssigneeId(editTaskData.task_assigned_to || "");
    } else {
      // Reset or set defaults for new task
      setTitle("");
      setDescription("");
      setDurationHours(0);
      setDurationMinutes(0);
      setPriority("P1");
      setStatus("todo");
      // If not admin, default to self and lock
      if (currentUser && !isAdmin) {
        setAssigneeId(currentUser.emp_id);
      } else {
        setAssigneeId("");
      }
    }
  }, [editTaskData, isOpen, currentUser, isAdmin]);

  const handleSubmit = async () => {
    if (!title) {
      toast({ title: "Title is required", status: "error" });
      return;
    }

    // New validation: ensure an assignee is selected (cannot be unassigned)
    if (!assigneeId) {
      toast({
        title: "Assignee is required",
        description: "Please select a user to assign the task.",
        status: "error",
      });
      return;
    }

    if (editTaskData) {
      // Update logic
      const oldPriority = editTaskData.task_priority as string;
      const newPriority = priority;

      // Check if priority is upgraded (e.g. P1 -> P0). P0 < P1 string-wise.
      // If upgraded, we want to treat this task as "Arriving Now" to preempt currently running tasks
      // without rewriting past history.
      const isPriorityUpgraded = newPriority < oldPriority;

      // Check if total duration is at least 10 minutes
      const totalEditMinutes =
        Number(durationHours) * 60 + Number(durationMinutes);
      if (totalEditMinutes < 10) {
        toast({
          title: "Task duration must be at least 10 minutes.",
          status: "error",
        });
        return;
      }

      // Format as HH:MM
      const finalDuration = `${String(durationHours).padStart(2, "0")}:${String(
        durationMinutes
      ).padStart(2, "0")}`;

      const updatedTask: Task = {
        ...editTaskData,
        task_name: title,
        task_description: description,
        task_duration: String(finalDuration),
        task_priority: priority,
        task_status: status,
        task_assigned_to: assigneeId || undefined,
        // If priority upgraded, reset start time to NOW to force split/insert behavior
        task_created_at: isPriorityUpgraded
          ? new Date().toISOString()
          : editTaskData.task_created_at,
        task_assigned_date: isPriorityUpgraded
          ? new Date().toISOString()
          : editTaskData.task_assigned_date,
      };

      const resp = await hitUpdateTask(updatedTask);
      if (resp) {
        dispatch(updateTask(updatedTask));
        toast({ title: "Task Updated", status: "success" });
      }
    } else {
      // Create logic
      const totalNewMinutes =
        Number(durationHours) * 60 + Number(durationMinutes);
      if (totalNewMinutes < 10) {
        toast({
          title: "Task duration must be at least 10 minutes.",
          status: "error",
        });
        return;
      }
      const finalDuration = `${String(durationHours).padStart(2, "0")}:${String(
        durationMinutes
      ).padStart(2, "0")}`;
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        task_name: title,
        task_description: description,
        task_duration: String(finalDuration),
        task_priority: priority,
        task_assigned_to: assigneeId || undefined,
        task_status: status,
        task_created_at: new Date().toISOString(),
      };

      // Security check: if not admin, ensure assignee is self
      if (!isAdmin && newTask.task_assigned_to !== currentUser?.emp_id) {
        toast({
          title: "You can only assign tasks to yourself.",
          status: "error",
        });
        return;
      }
      const resp = await hitCreateTask(newTask);
      if (resp?.data) {
        console.log(resp);
        dispatch(addTask([...allTasks, newTask]));
        toast({ title: "Task Created", status: "success" });
      }
    }

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader>
          {editTaskData ? "Edit Task" : "Create New Task"}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Task Title</FormLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fix Login Bug"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Description</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details..."
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Duration</FormLabel>
              <HStack spacing={4}>
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.500">
                    Hours
                  </FormLabel>
                  <NumberInput
                    min={0}
                    max={100}
                    value={durationHours}
                    onChange={(val) => setDurationHours(Number(val))}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="xs" color="gray.500">
                    Minutes
                  </FormLabel>
                  <NumberInput
                    min={0}
                    max={59}
                    value={durationMinutes}
                    onChange={(val) => setDurationMinutes(Number(val))}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
              </HStack>
            </FormControl>

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
                {(currentUser?.emp_designation?.toUpperCase() === "L1" ||
                  status === "in-progress") && (
                  <option value="in-progress">In Progress</option>
                )}
                {(currentUser?.emp_designation?.toUpperCase() === "L1" ||
                  status === "done") && <option value="done">Done</option>}
              </Select>
            </FormControl>

            <FormControl isDisabled={!isAdmin && !editTaskData}>
              {/* Allow editing assignee if admin, or disable if basic user creating task. 
                  Actually requirement says "only that user can add that task in their pannel or admin can add in any one".
                  So if not admin, it should be locked to self.
              */}
              <FormLabel>Assign To</FormLabel>
              <Select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                placeholder="Unassigned"
                isDisabled={!isAdmin}
              >
                {developers?.map((dev) => (
                  <option key={dev.id} value={dev.emp_id}>
                    {dev.emp_name} ({dev.emp_designation})
                  </option>
                ))}
              </Select>
              {!isAdmin && (
                <FormLabel fontSize="xs" color="gray.500">
                  You can only assign tasks to yourself.
                </FormLabel>
              )}
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSubmit}>
            {editTaskData ? "Update Task" : "Create Task"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TaskCreationModal;
