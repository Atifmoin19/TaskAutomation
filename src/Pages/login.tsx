import React, { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  Container,
} from "@chakra-ui/react";
import { useAppDispatch } from "app/hooks";
import { setCurrentUser, setToken } from "app/slices/scheduler.slice";
import { useNavigate } from "react-router-dom";
import { useLazyGetUserQuery, useLoginMutation } from "Services/user.api";
import SimpleLayout from "Layouts/simpleLayout";

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const [userId, setUserId] = useState("");
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      toast({ title: "Please enter a User ID", status: "warning" });
      return;
    }

    try {
      const result = await login({ emp_id: userId }).unwrap();
      console.log(result, "resultresultresult");
      if (result) {
        dispatch(setToken(result?.token));
        dispatch(setCurrentUser(result?.userData));
        toast({
          title: `Welcome ${result?.userData?.emp_name}`,
          status: "success",
        });
        navigate("/");
      }
    } catch (error) {
      console.log(error, "errorerrorerror");
      toast({
        title: "Login Failed",
        description: "User not found or API error.",
        status: "error",
      });
    }
  };

  return (
    <SimpleLayout>
      <Container maxW="md" py={20}>
        <Box bg="white" p={8} borderRadius="lg" boxShadow="lg">
          <VStack spacing={6} as="form" onSubmit={handleLogin}>
            <Heading size="lg" color="blue.600">
              DevScheduler
            </Heading>
            <Text color="gray.500">Sign in to manage your tasks</Text>

            <FormControl isRequired>
              <FormLabel>User ID</FormLabel>
              <Input
                placeholder="Enter your ID (e.g. admin, d1)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </FormControl>

            <Button
              type="submit"
              colorScheme="blue"
              width="full"
              size="lg"
              isLoading={isLoading}
            >
              Login
            </Button>
          </VStack>
        </Box>
      </Container>
    </SimpleLayout>
  );
};

export default Login;
