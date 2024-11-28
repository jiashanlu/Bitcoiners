import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { PriceTracker } from "./pages/PriceTracker";

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: "gray.50",
      },
    },
  },
});

function App() {
  return (
    <ChakraProvider theme={theme}>
      <PriceTracker />
    </ChakraProvider>
  );
}

export default App;
