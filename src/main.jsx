import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";

// Providers (vamos preencher depois com lógica real)
import { AuthProvider } from "./contexts/AuthContext";
import { RoleProvider } from "./contexts/RoleContext";

// CSS global
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <RoleProvider>
          <App />
          <Toaster position="top-right" />
        </RoleProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
