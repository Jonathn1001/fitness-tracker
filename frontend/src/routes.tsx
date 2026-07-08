/* eslint-disable react-refresh/only-export-components --
   Route config: mixes the route table with lazy wrappers by design;
   full-page reload on edit is acceptable here. */
import { lazy, Suspense, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { setUnauthorizedHandler } from "./api/client";

function RootShell() {
  const navigate = useNavigate();
  useEffect(() => {
    setUnauthorizedHandler(() => navigate("/login", { replace: true }));
  }, [navigate]);
  return <Outlet />;
}

const SessionPage = lazy(() =>
  import("./pages/SessionPage").then((m) => ({ default: m.SessionPage })),
);
const HistoryPage = lazy(() =>
  import("./pages/HistoryPage").then((m) => ({ default: m.HistoryPage })),
);
const ProgressPage = lazy(() =>
  import("./pages/ProgressPage").then((m) => ({ default: m.ProgressPage })),
);
const FeedbackPage = lazy(() =>
  import("./pages/FeedbackPage").then((m) => ({ default: m.FeedbackPage })),
);
const ProfilePage = lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);

const PageFallback = () => (
  <div className="p-6 text-gray-400 text-sm">Loading…</div>
);

const lazyRoute = (element: React.ReactNode) => (
  <Suspense fallback={<PageFallback />}>{element}</Suspense>
);

export const routes = [
  {
    element: <RootShell />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/signup", element: <SignupPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <Layout />,
            children: [
              { path: "/", element: <DashboardPage /> },
              { path: "/session/:id", element: lazyRoute(<SessionPage />) },
              { path: "/history", element: lazyRoute(<HistoryPage />) },
              { path: "/progress", element: lazyRoute(<ProgressPage />) },
              { path: "/feedback", element: lazyRoute(<FeedbackPage />) },
              { path: "/profile", element: lazyRoute(<ProfilePage />) },
            ],
          },
        ],
      },
    ],
  },
];
