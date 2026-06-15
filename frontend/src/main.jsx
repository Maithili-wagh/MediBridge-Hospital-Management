import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/styles.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error">
          <h1>MediBridge could not load</h1>
          <p>{this.state.error.message}</p>
          <button onClick={() => {
            localStorage.removeItem("mb_user");
            localStorage.removeItem("mb_token");
            location.reload();
          }}>
            Reset and Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
