import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { Navigation } from "./components/Navigation";
import { Home } from "./pages/Home";
import { PriceTracker } from "./pages/PriceTracker";
import { UnderConstruction } from "./pages/UnderConstruction";

function App() {
  return (
    <BrowserRouter>
      <Box minH="100vh">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/price-tracker" element={<PriceTracker />} />
          <Route path="/bitcoin-uae-map" element={<UnderConstruction />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}

export default App;
