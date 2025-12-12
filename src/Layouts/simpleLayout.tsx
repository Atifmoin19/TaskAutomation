// src/layouts/SimpleLayout.tsx

import { Flex } from "@chakra-ui/react"; // Example using Chakra UI
// import { PageWrapper } from "AppRouter";
import { ComponentStripper } from "Components/ElementStripper";

("Animations/transtion");
import Header from "Components/Header";
import React from "react";
import { HEADER_HEIGHT } from "Utils/constants"; // Assuming this utility exists

interface ISimpleLayout {
  hasStripTransition?: boolean;
  children: React.ReactNode;
}

const SimpleLayout: React.FC<ISimpleLayout> = (props) => {
  const { children, hasStripTransition = false } = props;

  return (
    <>
      <Header />
      {hasStripTransition ? (
        <ComponentStripper
          SourceComponent={() => (
            <Flex
              w={"100%"}
              direction="column"
              marginTop={HEADER_HEIGHT}
              bg={"#f7fafc"}
              minH="calc(100vh - 60px)"
            >
              {children}
            </Flex>
          )}
          nStrips={8}
        />
      ) : (
        <Flex
          w={"100%"}
          direction="column"
          marginTop={HEADER_HEIGHT}
          bgGradient="linear(to-br, gray.50, blue.50, purple.50)"
          minH="calc(100vh - 60px)"
        >
          {children}
        </Flex>
      )}
    </>
  );
};

export default SimpleLayout;
