import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus("unauthorized");
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin");

      if (roles && roles.length > 0) {
        setStatus("authorized");
      } else {
        await supabase.auth.signOut();
        setStatus("unauthorized");
      }
    };
    check();
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
