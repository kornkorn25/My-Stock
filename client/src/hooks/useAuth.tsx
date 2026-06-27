import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { api, getToken, setToken } from "../lib/api";
import { User } from "../lib/types";

interface RegisterResult {
  needsVerification?: boolean;
  message?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<RegisterResult>;
  loginWithGoogle: (credential: string) => Promise<void>;
  updateProfile: (displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthResponse {
  token: string;
  user: User;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, if a token exists, fetch the current user.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: User }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>("/api/auth/login", { email, password });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string): Promise<RegisterResult> => {
      // Registration no longer logs in: the account is locked until the user
      // clicks the verification link we email them.
      return api.post<RegisterResult>("/api/auth/register", {
        email,
        password,
        displayName,
      });
    },
    []
  );

  const loginWithGoogle = useCallback(async (credential: string) => {
    const res = await api.post<AuthResponse>("/api/auth/google", { credential });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const updateProfile = useCallback(async (displayName: string) => {
    const res = await api.patch<{ user: User }>("/api/auth/profile", { displayName });
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, loginWithGoogle, updateProfile, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
