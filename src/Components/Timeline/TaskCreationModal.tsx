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
  const [duration, setDuration] = useState(1);
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
      setDuration(Number(editTaskData.task_duration || 1));
      setPriority((editTaskData.task_priority as Priority) || "P1");
      setStatus(editTaskData.task_status || "todo");
      setAssigneeId(editTaskData.task_assigned_to || "");
    } else {
      // Reset or set defaults for new task
      setTitle("");
      setDescription("");
      setDuration(1);
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

      const updatedTask: Task = {
        ...editTaskData,
        task_name: title,
        task_description: description,
        task_duration: String(duration),
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
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        task_name: title,
        task_description: description,
        task_duration: String(duration),
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
