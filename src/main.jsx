import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthGate } from "./components/auth/AuthGate.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      {({ user, role, onSignOut }) => (
        <App key={user.id} currentUser={user} currentRole={role} onSignOut={onSignOut} />
      )}
    </AuthGate>
  </React.StrictMode>,
);
