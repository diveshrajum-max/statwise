import { useState } from "react";
import {
  BarChart3,
  UserRound,
  LockKeyhole,
  Moon,
  Sun,
} from "lucide-react";
import "./Login.css";

function Login() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`login-page ${darkMode ? "dark" : ""}`}>
      <button
        className="theme-button"
        onClick={() => setDarkMode(!darkMode)}
        aria-label="Change theme"
      >
        {darkMode ? <Sun size={25} /> : <Moon size={25} />}
      </button>

      <main className="login-card">
        <div className="logo-box">
          <BarChart3 size={46} strokeWidth={2.2} />
        </div>

        <h1>Statistical Quality Analysis</h1>

        <p className="company-name">
          Rane (Madras) Limited
          <br />
          Brake Components Division
        </p>

        <form
            className="login-form"
            onSubmit={(event) => {
                event.preventDefault();
                window.location.href = "/dashboard";
            }}
        >
          <div className="form-group">
            <label htmlFor="username">Username</label>

            <div className="input-container">
              <UserRound size={23} />

              <input
                id="username"
                type="text"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <div className="input-container">
              <LockKeyhole size={23} />

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <label className="remember-container">
            <input type="checkbox" />
            <span>Remember me</span>
          </label>

          <button type="submit" className="sign-in-button">
            Sign In
          </button>
        </form>

        <div className="demo-message">
          Demo: Use any username and password to login
        </div>
      </main>

      <footer>
        © 2026 Rane (Madras) Limited. All rights reserved.
      </footer>
    </div>
  );
}

export default Login;