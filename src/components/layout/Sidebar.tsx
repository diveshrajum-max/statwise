import {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  LayoutDashboard,
  Upload,
  Calculator,
  BarChart3,
  TrendingUp,
  FileBarChart,
  GitCompare,
  BrainCircuit,
  FileText,
  FolderOpen,
  Settings,
  LogOut,
  UserRound,
  ChevronDown,
  ChevronUp,
  Menu,
} from "lucide-react";

import "./Sidebar.css";

function Sidebar() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  /*
  Main sidebar visibility
  */

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(true);

  /*
  Sidebar sections
  */

  const [
    dataOpen,
    setDataOpen,
  ] = useState(true);

  const [
    statisticsOpen,
    setStatisticsOpen,
  ] = useState(true);

  const [
    qualityOpen,
    setQualityOpen,
  ] = useState(true);

  /*
  Listen for Header menu/cross clicks.
  */

  useEffect(() => {
    const handleSidebarToggle =
      (
        event: Event,
      ) => {
        const customEvent =
          event as CustomEvent<{
            open: boolean;
          }>;

        setSidebarOpen(
          customEvent.detail
            .open,
        );
      };

    window.addEventListener(
      "sidebar-toggle",
      handleSidebarToggle,
    );

    return () => {
      window.removeEventListener(
        "sidebar-toggle",
        handleSidebarToggle,
      );
    };
  }, []);

  /*
  Tell CSS whether sidebar
  is open or closed.
  */

  useEffect(() => {
    document.documentElement.classList.toggle(
      "sidebar-closed",
      !sidebarOpen,
    );

    return () => {
      document.documentElement.classList.remove(
        "sidebar-closed",
      );
    };
  }, [sidebarOpen]);

  return (
    <aside
      className={
        sidebarOpen
          ? "sidebar sidebar-open"
          : "sidebar sidebar-hidden"
      }
    >
      <div className="sidebar-brand">
        <div className="sidebar-logo">
          <BarChart3
            size={27}
          />
        </div>

        <div>
          <h2>
            SQA Platform
          </h2>

          <p>
            Rane (Madras)
            Limited
          </p>
        </div>
      </div>

      <div className="navigation-heading">
        <span>
          NAVIGATION
        </span>

        <div>
          <Menu
            size={16}
          />

          <span>
            Multi-expand
          </span>
        </div>
      </div>

      <nav className="sidebar-navigation">
        <button
          className={`sidebar-main-item ${
            location.pathname ===
            "/dashboard"
              ? "active"
              : ""
          }`}
          onClick={() =>
            navigate(
              "/dashboard",
            )
          }
        >
          <LayoutDashboard
            size={22}
          />

          <span>
            Dashboard
          </span>
        </button>

        <button
          className="sidebar-main-item"
          onClick={() =>
            setDataOpen(
              !dataOpen,
            )
          }
        >
          <Upload
            size={22}
          />

          <span>
            Data Management
          </span>

          {dataOpen ? (
            <ChevronUp
              className="sidebar-chevron"
              size={17}
            />
          ) : (
            <ChevronDown
              className="sidebar-chevron"
              size={17}
            />
          )}
        </button>

        {dataOpen && (
          <div className="sidebar-submenu">
            <button
              onClick={() =>
                navigate(
                  "/upload",
                )
              }
            >
              Upload Dataset
            </button>

            <button
              onClick={() =>
                navigate(
                  "/datasets",
                )
              }
            >
              Manage Datasets
            </button>
          </div>
        )}

        <button
          className="sidebar-main-item"
          onClick={() =>
            setStatisticsOpen(
              !statisticsOpen,
            )
          }
        >
          <Calculator
            size={22}
          />

          <span>
            Basic Statistics
          </span>

          {statisticsOpen ? (
            <ChevronUp
              className="sidebar-chevron"
              size={17}
            />
          ) : (
            <ChevronDown
              className="sidebar-chevron"
              size={17}
            />
          )}
        </button>

        {statisticsOpen && (
          <div className="sidebar-submenu">
            <button
              onClick={() =>
                navigate(
                  "/statistics",
                )
              }
            >
              Descriptive
              Statistics
            </button>

            <button
              onClick={() =>
                navigate(
                  "/graphical-summary",
                )
              }
            >
              Graphical Summary
            </button>
          </div>
        )}

        <button
          className="sidebar-main-item"
          onClick={() =>
            setQualityOpen(
              !qualityOpen,
            )
          }
        >
          <BarChart3
            size={22}
          />

          <span>
            Quality Tools
          </span>

          {qualityOpen ? (
            <ChevronUp
              className="sidebar-chevron"
              size={17}
            />
          ) : (
            <ChevronDown
              className="sidebar-chevron"
              size={17}
            />
          )}
        </button>

        {qualityOpen && (
          <div className="sidebar-submenu">
            <button
              onClick={() =>
                navigate(
                  "/capability",
                )
              }
            >
              Process Capability
            </button>

            <button
              onClick={() =>
                navigate(
                  "/capability-six-pack",
                )
              }
            >
              Capability Six Pack
            </button>
          </div>
        )}

        <button
  className="sidebar-main-item"
  onClick={() =>
    navigate(
      "/regression-analysis",
    )
  }
>
  <TrendingUp
    size={22}
  />

  <span>
    Regression Analysis
  </span>
</button>

        <button className="sidebar-main-item">
          <FileBarChart
            size={22}
          />

          <span>
            ANOVA
          </span>
        </button>

        <button className="sidebar-main-item">
          <GitCompare
            size={22}
          />

          <span>
            Comparison Analytics
          </span>
        </button>

        <button className="sidebar-main-item">
          <BrainCircuit
            size={22}
          />

          <span>
            AI Insights
          </span>
        </button>

        <button className="sidebar-main-item">
          <FileText
            size={22}
          />

          <span>
            Reports
          </span>
        </button>

        <button className="sidebar-main-item">
          <FolderOpen
            size={22}
          />

          <span>
            Projects
          </span>
        </button>

        <button className="sidebar-main-item">
          <Settings
            size={22}
          />

          <span>
            Settings
          </span>
        </button>
      </nav>

      <div className="sidebar-bottom">
        <div className="user-card">
          <div className="user-avatar">
            <UserRound
              size={20}
            />
          </div>

          <div>
            <strong>
              Quality Engineer
            </strong>

            <span>
              Brake Components
              Division
            </span>
          </div>
        </div>

        <button
          className="sign-out-button"
          onClick={() =>
            navigate(
              "/login",
            )
          }
        >
          <LogOut
            size={19}
          />

          <span>
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;