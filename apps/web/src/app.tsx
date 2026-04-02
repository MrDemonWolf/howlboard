import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthGuard } from "@/components/auth-guard";
import { Login } from "@/pages/login";
import { Dashboard } from "@/pages/dashboard";
import { Editor } from "@/pages/editor";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <Dashboard />
            </AuthGuard>
          }
        />
        <Route
          path="/board/:id"
          element={
            <AuthGuard>
              <Editor />
            </AuthGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
