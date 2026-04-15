import { createContext, useContext, useState, useEffect } from "react";
import { authApi } from "../utils/supabaseApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then((resolvedUser) => {
        setUser(resolvedUser);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const userData = await authApi.login(username, password);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isCoordinator: user?.role === "coordinator",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
