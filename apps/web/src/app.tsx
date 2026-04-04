import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthGuard } from "@/components/auth-guard";
import { SetupGuard } from "@/components/setup-guard";
import { Login } from "@/pages/login";
import { Setup } from "@/pages/setup";
import { Dashboard } from "@/pages/dashboard";
import { Editor } from "@/pages/editor";
import { SharedBoard } from "@/pages/shared-board";
import { Settings } from "@/pages/settings/index";
import { Profile } from "@/pages/settings/profile";
import { Members } from "@/pages/settings/members";
import { CollectionsSettings } from "@/pages/settings/collections";
import { LegalSettings } from "@/pages/settings/legal";
import { TermsOfService } from "@/pages/legal/terms";
import { PrivacyPolicy } from "@/pages/legal/privacy";

export function App() {
  return (
    <BrowserRouter>
      <SetupGuard>
        <Routes>
          {/* Public routes */}
          <Route path="/setup" element={<Setup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/share/:token" element={<SharedBoard />} />
          <Route path="/draw" element={<Editor />} />
          <Route path="/legal/terms" element={<TermsOfService />} />
          <Route path="/legal/privacy" element={<PrivacyPolicy />} />

          {/* Auth-required routes */}
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
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Settings />
              </AuthGuard>
            }
          />
          <Route
            path="/settings/profile"
            element={
              <AuthGuard>
                <Profile />
              </AuthGuard>
            }
          />
          <Route
            path="/settings/members"
            element={
              <AuthGuard>
                <Members />
              </AuthGuard>
            }
          />
          <Route
            path="/settings/legal"
            element={
              <AuthGuard>
                <LegalSettings />
              </AuthGuard>
            }
          />
          <Route
            path="/settings/collections"
            element={
              <AuthGuard>
                <CollectionsSettings />
              </AuthGuard>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </SetupGuard>
    </BrowserRouter>
  );
}
