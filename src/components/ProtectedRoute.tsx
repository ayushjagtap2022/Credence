import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield, Lock } from 'lucide-react';
import type { AuthUser } from '../services/api';

interface ProtectedRouteProps {
  user: AuthUser | null;
  loading: boolean;
  allowedRoles?: ('STUDENT' | 'FACULTY' | 'ADMIN')[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  user,
  loading,
  allowedRoles,
  children,
}) => {
  const location = useLocation();

  // 1. Loading state while checking token/profile
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="relative mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 animate-pulse">
            <Shield size={28} />
          </div>
          <h2 className="text-base font-extrabold tracking-tight text-foreground">
            Authenticating Session...
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Verifying cryptographic identity & credentials
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Guests CANNOT access dashboards
  if (!user) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location.pathname,
          requireAuth: true,
          message: 'Please sign in to access this workspace.',
        }}
      />
    );
  }

  // 3. Strict Role-Based Access Control (RBAC)
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = (user.role || '').toUpperCase();
    const isAllowed = allowedRoles.includes(userRole as any);

    if (!isAllowed) {
      // Redirect users to their authorized workspace
      const redirectTarget =
        userRole === 'STUDENT'
          ? '/student'
          : userRole === 'FACULTY'
          ? '/faculty'
          : '/admin';

      return (
        <Navigate
          to={redirectTarget}
          replace
          state={{
            unauthorized: true,
            attemptedPath: location.pathname,
            message: `Access denied. Role "${userRole}" cannot access this page.`,
          }}
        />
      );
    }
  }

  // 4. Authorized user: render protected component
  return <>{children}</>;
};
