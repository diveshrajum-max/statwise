import {
  Menu,
  Moon,
  Sun,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { useLocation } from "react-router-dom";

import "./Header.css";

function Header() {
  const location = useLocation();

  /*
  Sidebar starts open on desktop.
  */

  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  /*
  Read the saved theme.
  */

  const [darkMode, setDarkMode] =
    useState(() => {
      return (
        localStorage.getItem(
          "statwise-theme",
        ) === "dark"
      );
    });

  /* Change heading based on URL */

  const getPageDetails = () => {
    switch (location.pathname) {
      case "/dashboard":
        return {
          title: "Dashboard",
          subtitle:
            "Brake Components Division · Rane (Madras) Limited",
        };

      case "/upload":
        return {
          title: "Upload Dataset",
          subtitle:
            "Upload and classify manufacturing datasets",
        };

      case "/datasets":
        return {
          title: "Manage Datasets",
          subtitle:
            "Brake Components Division · Rane (Madras) Limited",
        };

      default:
        return {
          title:
            "Statistical Quality Analysis",
          subtitle:
            "Rane (Madras) Limited",
        };
    }
  };

  const pageDetails =
    getPageDetails();

  /*
  Apply dark mode to the whole website.
  */

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      darkMode,
    );

    localStorage.setItem(
      "statwise-theme",
      darkMode
        ? "dark"
        : "light",
    );
  }, [darkMode]);

  /*
  Open or close sidebar.
  */

  const toggleSidebar = () => {
    const nextSidebarState =
      !sidebarOpen;

    setSidebarOpen(
      nextSidebarState,
    );

    window.dispatchEvent(
      new CustomEvent(
        "sidebar-toggle",
        {
          detail: {
            open:
              nextSidebarState,
          },
        },
      ),
    );
  };

  return (
    <header className="main-header">
      <div className="header-left">
        {/* Menu / cross button */}

        <button
          type="button"
          className="header-menu-button"
          aria-label={
            sidebarOpen
              ? "Close navigation"
              : "Open navigation"
          }
          title={
            sidebarOpen
              ? "Close sidebar"
              : "Open sidebar"
          }
          onClick={
            toggleSidebar
          }
        >
          {sidebarOpen ? (
            <X size={25} />
          ) : (
            <Menu size={25} />
          )}
        </button>

        <div>
          <h2>
            {
              pageDetails.title
            }
          </h2>

          <p>
            {
              pageDetails.subtitle
            }
          </p>
        </div>
      </div>

      {/* Dark-mode button */}

      <button
        type="button"
        className="theme-toggle-button"
        aria-label={
          darkMode
            ? "Switch to light mode"
            : "Switch to dark mode"
        }
        title={
          darkMode
            ? "Light mode"
            : "Dark mode"
        }
        onClick={() =>
          setDarkMode(
            (
              previousMode,
            ) =>
              !previousMode,
          )
        }
      >
        {darkMode ? (
          <Sun size={24} />
        ) : (
          <Moon size={24} />
        )}
      </button>
    </header>
  );
}

export default Header;