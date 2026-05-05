import { createContext, useContext, useState, ReactNode } from "react";
import { AppUser, USERS, generateAccountId, generateUserId, Product, SellerReview } from "@/components/data/constants";

type AuthContextType = {
  user: AppUser | null;
  users: AppUser[];
  login: (email: string, password: string) => "ok" | "blocked" | "frozen" | "wrong";
  register: (username: string, email: string, password: string) => "ok" | "exists";
  logout: () => void;
  updateUsers: (users: AppUser[]) => void;
  addProduct: (product: Product) => void;
  addReview: (sellerId: string, review: Omit<SellerReview, "id">) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(USERS);
  const [user, setUser] = useState<AppUser | null>(null);

  const login = (email: string, password: string): "ok" | "blocked" | "frozen" | "wrong" => {
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) return "wrong";
    if (found.status === "blocked") return "blocked";
    if (found.status === "frozen") return "frozen";
    setUser(found);
    return "ok";
  };

  const register = (username: string, email: string, password: string): "ok" | "exists" => {
    const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase());
    if (exists) return "exists";
    const newUser: AppUser = {
      id: generateUserId(),
      accountId: generateAccountId(),
      username,
      email,
      password,
      role: "user",
      status: "active",
      deals: 0,
      joined: new Date().toLocaleDateString("ru-RU"),
      balance: 0,
      products: [],
      reviews: [],
    };
    setUsers((prev) => [...prev, newUser]);
    setUser(newUser);
    return "ok";
  };

  const logout = () => setUser(null);

  const updateUsers = (updated: AppUser[]) => {
    setUsers(updated);
    if (user) {
      const refreshed = updated.find((u) => u.id === user.id);
      if (refreshed) setUser(refreshed);
    }
  };

  const addProduct = (product: Product) => {
    if (!user) return;
    setUsers((prev) => prev.map((u) =>
      u.id === user.id ? { ...u, products: [...u.products, product] } : u
    ));
    setUser((prev) => prev ? { ...prev, products: [...prev.products, product] } : prev);
  };

  const addReview = (sellerId: string, review: Omit<SellerReview, "id">) => {
    const newReview: SellerReview = { ...review, id: `r-${Date.now()}` };
    setUsers((prev) => prev.map((u) =>
      u.id === sellerId ? { ...u, reviews: [...u.reviews, newReview] } : u
    ));
  };

  return (
    <AuthContext.Provider value={{ user, users, login, register, logout, updateUsers, addProduct, addReview }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
