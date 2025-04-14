import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ProductProvider } from "./contexts/product-context";
import { ThemeProvider } from "./contexts/theme-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ProductProvider>
        <App />
      </ProductProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
