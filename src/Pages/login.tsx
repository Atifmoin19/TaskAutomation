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
  Container,
} from "@chakra-ui/react";
import { ToastService } from "app/hooks/toast.services";
import { SUPER_ADMIN_ROLES } from "Utils/constants";
import { useAppDispatch } from "app/hooks";
import { setCurrentUser, setToken } from "app/slices/scheduler.slice";
import { useNavigate } from "react-router-dom";
import { useLoginMutation, useRegisterMutation } from "Services/user.api";
import { motion, AnimatePresence } from "framer-motion";
import { Image, Flex } from "@chakra-ui/react";
import taskboardImg from "assets/taskboard.png"; // Assuming alias or path works, otherwise relative
// If alias 'assets' doesn't exist, I need relative path: ../assets/taskboard.png?
// Checking file structure: src/assets/taskboard.png. Pages/login.tsx is in src/Pages. So ../assets/taskboard.png.
// Actually, webpack/vite alias 'assets' might not be set. Safe to use relative or absolute if supported.
// Using default import for image.

const MotionFlex = motion(Flex);
const MotionBox = motion(Box);

import SimpleLayout from "Layouts/simpleLayout";

const Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [login, { isLoading }] = useLoginMutation();
  const [register, { isLoading: isRegistering }] = useRegisterMutation();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim() || (isSignup && !email.trim())) {
      ToastService.showErrorToast({
        title: "Validation Error",
        message: "Please fill all required fields",
      });
      return;
    }

    if (isSignup) {
      try {
        const result = await register({
          emp_id: userId,
          password: password,
          emp_email: email,
        }).unwrap();

        if (result) {
          dispatch(setToken(result?.token));
          dispatch(setCurrentUser(result?.userData));
          ToastService.showSuccessTaost({
            title: "Signup Successful",
            message: "Welcome to DevScheduler!",
          });
          navigate("/");
        }
      } catch (error: any) {
        console.log(error?.data, "errorerrorerror");
        const errorMsg =
          error?.data?.message ||
          error?.data?.data?.details ||
          "Could not create account. Try again.";
        ToastService.showErrorToast({
          title: "Signup Failed",
          message: errorMsg,
        });
      }
    } else {
      // LOGIN FLOW
      try {
        // Passing password if the API supports it, otherwise just ID as before
        const result = await login({ emp_id: userId, password }).unwrap();
        console.log(result, "resultresultresult");
        if (result) {
          dispatch(setToken(result?.token));
          dispatch(setCurrentUser(result?.userData));
          ToastService.showSuccessTaost({
            title: `Welcome ${result?.userData?.emp_name}`,
          });

          if (SUPER_ADMIN_ROLES.includes(result?.userData?.emp_designation)) {
            navigate("/dashboard/home");
          } else {
            navigate("/");
          }
        }
      } catch (error) {
        console.log(error, "errorerrorerror");
        ToastService.showErrorToast({
          title: "Login Failed",
          message: "User not found or API error.",
        });
      }
    }
  };

  return (
    <SimpleLayout>
      <Container maxW="container.lg" py={10} centerContent>
        <MotionFlex
          w={{ base: "100%", md: "900px" }}
          h="600px"
          bg="white"
          borderRadius="xl"
          boxShadow="2xl"
          overflow="hidden"
          layout
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          flexDirection={isSignup ? "row-reverse" : "row"} // This swaps the sides
        >
          {/* Image Section */}
          <MotionBox layout w="50%" h="100%" position="relative" bg="gray.100">
            <Image
              src={taskboardImg}
              alt="Taskboard Illustration"
              objectFit="cover"
              w="100%"
              h="100%"
            />
            {/* Overlay for Futuristic feel */}
            <Box
              position="absolute"
              top={0}
              left={0}
              w="100%"
              h="100%"
              bgGradient="linear(to-b, transparent 0%, rgba(0,0,0,0.4) 100%)"
            />
          </MotionBox>

          {/* Form Section */}
          <MotionBox
            layout
            w="50%"
            h="100%"
            bg="white"
            p={10}
            display="flex"
            flexDirection="column"
            justifyContent="center"
          >
            <AnimatePresence mode="wait">
              {/* Using key to trigger internal form animation if desired, or just keep same form instance */}
              <VStack
                spacing={5}
                as="form"
                onSubmit={handleAuth}
                w="100%"
                key={isSignup ? "signup" : "login"}
              >
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  style={{ width: "100%" }}
                >
                  <Heading size="xl" color="blue.600" mb={2} textAlign="center">
                    {isSignup ? "Create Account" : "Welcome Back"}
                  </Heading>
                  <Text color="gray.500" mb={8} textAlign="center">
                    {isSignup
                      ? "Join the future of task management."
                      : "Enter your credentials to access your workspace."}
                  </Text>

                  <VStack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>User ID</FormLabel>
                      <Input
                        placeholder="e.g. admin"
                        size="lg"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        fontSize="md"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Password</FormLabel>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        size="lg"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fontSize="md"
                      />
                    </FormControl>

                    {isSignup && (
                      <FormControl isRequired>
                        <FormLabel>Email Address</FormLabel>
                        <Input
                          type="email"
                          placeholder="you@company.com"
                          size="lg"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          fontSize="md"
                        />
                      </FormControl>
                    )}

                    <Button
                      type="submit"
                      colorScheme="blue"
                      width="full"
                      size="lg"
                      mt={2}
                      isLoading={
                        (isLoading && !isSignup) || (isRegistering && isSignup)
                      }
                      boxShadow="lg"
                      _hover={{
                        transform: "translateY(-2px)",
                        boxShadow: "xl",
                      }}
                    >
                      {isSignup ? "Sign Up" : "Login"}
                    </Button>
                  </VStack>

                  <Box textAlign="center" mt={6}>
                    <Text fontSize="sm" color="gray.500">
                      {isSignup
                        ? "Already have an account?"
                        : "New to DevScheduler?"}
                    </Text>
                    <Button
                      variant="link"
                      colorScheme="blue"
                      fontWeight="bold"
                      onClick={() => {
                        setIsSignup(!isSignup);
                        // Clear fields as requested
                        setUserId("");
                        setPassword("");
                        setEmail("");
                      }}
                    >
                      {isSignup ? "Log In" : "Create Account"}
                    </Button>
                  </Box>
                </motion.div>
              </VStack>
            </AnimatePresence>
          </MotionBox>
        </MotionFlex>
      </Container>
    </SimpleLayout>
  );
};

export default Login;
