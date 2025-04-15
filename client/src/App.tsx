import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home-fixed";
import { ProductProvider } from "./contexts/product-context";
import { ThemeProvider } from "./contexts/theme-context";

function Router() {
  // Chrome extensions need to handle paths differently than regular web apps
  // When opened as a popup, the extension URL might not be exactly "/"
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Match ALL paths to Home in extension context to avoid 404s */}
      <Route path="*" component={Home} />
      <Route component={Home} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ProductProvider>
          <Router />
          <Toaster />
        </ProductProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
