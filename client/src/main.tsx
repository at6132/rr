import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ProductProvider } from "./contexts/product-context";
import { ThemeProvider } from "./contexts/theme-context";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <ProductProvider>
      <App />
    </ProductProvider>
  </ThemeProvider>
);
