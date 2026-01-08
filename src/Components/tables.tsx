import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Box,
} from "@chakra-ui/react";

const employeeData = [
  {
    id: 2,
    emp_id: "s00218",
    emp_email: "atif.moin@zopper.com",
    emp_name: "atif moin",
    emp_phone: "7007136187",
    emp_designation: "SE",
    emp_department: "Frontend",
    emp_joining_date: "01/01/2023",
    emp_hierarchy: "L1",
  },
  {
    id: 3,
    emp_id: "s00148",
    emp_email: "saurabh.kumar@zopper.com",
    emp_name: "saurabh kumar",
    emp_phone: "9458466102",
    emp_designation: "SSE",
    emp_department: "Backend",
    emp_joining_date: "01/01/2022",
    emp_hierarchy: "L2",
  },
  {
    id: 4,
    emp_id: "s00070",
    emp_email: "rakesh.ranjan@zopper.com",
    emp_name: "rakesh ranjan",
    emp_phone: "9911963904",
    emp_designation: "SE",
    emp_department: "QA",
    emp_joining_date: "01/01/2022",
    emp_hierarchy: "L1",
  },
];

const Tables = () => {
  return (
    <Box p={4} bg={"#fff"}>
      <TableContainer>
        <Table variant="striped" colorScheme="gray">
          <Thead>
            <Tr>
              <Th color={"#fff"}>ID</Th>
              <Th color={"#fff"}>Emp ID</Th>
              <Th color={"#fff"}>Name</Th>
              <Th color={"#fff"}>Email</Th>
              <Th color={"#fff"}>Phone</Th>
              <Th color={"#fff"}>Designation</Th>
              <Th color={"#fff"}>Department</Th>
              <Th color={"#fff"}>Joining Date</Th>
              <Th color={"#fff"}>Hierarchy</Th>
            </Tr>
          </Thead>
          <Tbody>
            {employeeData.map((emp, idx) => (
              <Tr key={emp.id}>
                <Td>{idx + 1}</Td>
                <Td>{emp.emp_id}</Td>
                <Td>{emp.emp_name}</Td>
                <Td>{emp.emp_email}</Td>
                <Td>{emp.emp_phone}</Td>
                <Td>{emp.emp_designation}</Td>
                <Td>{emp.emp_department}</Td>
                <Td>{emp.emp_joining_date}</Td>
                <Td>{emp.emp_hierarchy}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Tables;
