import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("lt_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => localStorage.removeItem("lt_token"))
      .finally(() => setLoading(false));
  }, []);

  function loginWithResult(result) {
    localStorage.setItem("lt_token", result.token);
    setUser(result.user);
  }

  function logout() {
    localStorage.removeItem("lt_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithResult, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
