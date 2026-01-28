import React, { useContext, useState } from "react";

import AuthContext from "../context/AuthContext";

export default function AuthPanel() {
  const { user, authStatus, login, register, logout, agreement } = useContext(AuthContext);
  const [mode, setMode] = useState("login");
  const [formState, setFormState] = useState({
    username: "",
    email: "",
    password: "",
    acceptAgreement: false,
  });
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (mode === "login") {
      const result = await login({
        username: formState.username,
        password: formState.password,
      });
      if (!result.ok) {
        setMessage("Login failed. Check credentials.");
      }
    } else {
      const result = await register({
        username: formState.username,
        email: formState.email,
        password: formState.password,
        accept_agreement: formState.acceptAgreement,
      });
      if (!result.ok) {
        setMessage("Registration failed. Review the form and try again.");
      } else {
        setMessage("Registration successful. You can log in now.");
        setMode("login");
      }
    }
  };

  if (user) {
    return (
      <div className="panel">
        <h3 className="panel-title">Session</h3>
        <div className="space-y-2 text-sm text-slate-200/80">
          <p>
            Signed in as <span className="text-white font-semibold">{user.username}</span>
          </p>
          <p className="uppercase tracking-[0.2em] text-xs text-slate-300/70">{user.role}</p>
          <button className="btn-secondary" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="flex items-center justify-between">
        <h3 className="panel-title">Access</h3>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={mode === "login" ? "tab-active" : "tab"}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={mode === "register" ? "tab-active" : "tab"}
          >
            Register
          </button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        <label className="block text-xs uppercase tracking-widest text-slate-300/80">Username</label>
        <input
          className="input"
          name="username"
          value={formState.username}
          onChange={handleChange}
          required
        />
        {mode === "register" && (
          <>
            <label className="block text-xs uppercase tracking-widest text-slate-300/80">Email</label>
            <input
              className="input"
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
            />
          </>
        )}
        <label className="block text-xs uppercase tracking-widest text-slate-300/80">Password</label>
        <input
          className="input"
          type="password"
          name="password"
          value={formState.password}
          onChange={handleChange}
          required
        />
        {mode === "register" && agreement && (
          <label className="flex items-center gap-2 text-xs text-slate-200/80">
            <input
              type="checkbox"
              name="acceptAgreement"
              checked={formState.acceptAgreement}
              onChange={handleChange}
            />
            I agree to the {agreement.title}
          </label>
        )}
        <button className="btn-primary" type="submit" disabled={authStatus.loading}>
          {authStatus.loading ? "Processing..." : mode === "login" ? "Sign in" : "Create account"}
        </button>
        {(authStatus.error || message) && (
          <p className="text-xs text-rose-200/90">{authStatus.error || message}</p>
        )}
      </form>
    </div>
  );
}
