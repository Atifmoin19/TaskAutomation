import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import "./index.css";
import { ChakraProvider } from "@chakra-ui/react";
import { BrowserRouter as Router } from "react-router-dom";

import { persistStore } from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";

import App from "App";
import { store } from "app/store";
import { theme } from "Styles";

const persistor = persistStore(store);

createRoot(document.getElementById("root")!).render(
  <ChakraProvider resetCSS theme={theme}>
    <Provider store={store}>
      <Router basename="/task-automation">
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Router>
    </Provider>
  </ChakraProvider>
);
