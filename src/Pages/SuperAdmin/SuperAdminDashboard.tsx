import React from "react";
import {
  Container,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  Card,
  CardBody,
  Icon,
} from "@chakra-ui/react";
import { FaUserPlus, FaTasks, FaCalendarAlt, FaUserEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import SimpleLayout from "Layouts/simpleLayout";

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <SimpleLayout>
      <Container maxW="container.xl" py={8}>
        <Heading size="lg" mb={8} color="gray.700">
          Super Admin Dashboard
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
          <Card
            cursor="pointer"
            onClick={() => navigate("/dashboard/create-task")}
            _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
            transition="all 0.2s"
          >
            <CardBody>
              <VStack spacing={4} align="center" py={8}>
                <Icon as={FaTasks} boxSize={12} color="blue.500" />
                <Heading size="md" color="gray.700">
                  Create Tasks
                </Heading>
                <Text color="gray.500" textAlign="center">
                  Create new tasks either individually or via bulk upload.
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card
            cursor="pointer"
            onClick={() => navigate("/dashboard/create-user")}
            _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
            transition="all 0.2s"
          >
            <CardBody>
              <VStack spacing={4} align="center" py={8}>
                <Icon as={FaUserPlus} boxSize={12} color="green.500" />
                <Heading size="md" color="gray.700">
                  Create Users
                </Heading>
                <Text color="gray.500" textAlign="center">
                  Onboard new users individually or via bulk CSV upload.
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card
            cursor="pointer"
            onClick={() => navigate("/dashboard/update-user")}
            _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
            transition="all 0.2s"
          >
            <CardBody>
              <VStack spacing={4} align="center" py={8}>
                <Icon as={FaUserEdit} boxSize={12} color="orange.500" />
                <Heading size="md" color="gray.700">
                  Update Users
                </Heading>
                <Text color="gray.500" textAlign="center">
                  View and manage existing users and their details.
                </Text>
              </VStack>
            </CardBody>
          </Card>

          <Card
            cursor="pointer"
            onClick={() => navigate("/")}
            _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
            transition="all 0.2s"
          >
            <CardBody>
              <VStack spacing={4} align="center" py={8}>
                <Icon as={FaCalendarAlt} boxSize={12} color="purple.500" />
                <Heading size="md" color="gray.700">
                  View Timeline
                </Heading>
                <Text color="gray.500" textAlign="center">
                  View and manage all tasks in the timeline view.
                </Text>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>
      </Container>
    </SimpleLayout>
  );
};

export default SuperAdminDashboard;
