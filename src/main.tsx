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

import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

const persistor = persistStore(store);

function MyEmotionProvider({
  nonce,
  children,
}: Readonly<{
  nonce: string;
  children: React.ReactNode;
}>) {
  const cache = createCache({ nonce: nonce, key: "css" });
  return <CacheProvider value={cache}>{children}</CacheProvider>;
}

createRoot(document.getElementById("root")!).render(
  <MyEmotionProvider nonce="bbbdbadfcdbafaffdbfcddccdbfafddb">
    <ChakraProvider resetCSS theme={theme}>
      <Provider store={store}>
        <Router basename="/task-automation/">
          <PersistGate loading={null} persistor={persistor}>
            <App />
          </PersistGate>
        </Router>
      </Provider>
    </ChakraProvider>
  </MyEmotionProvider>
);
