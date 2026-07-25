import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export const useAdminAuth = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        console.log('AdminAuth: No user found');
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      console.log('AdminAuth: Checking admin role for user:', user.email);
      
      try {
        const { data, error } = await supabase.rpc('is_admin', {
          _user_id: user.id
        });

        if (error) {
          console.error('AdminAuth: Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          console.log('AdminAuth: Admin check result:', data);
          setIsAdmin(data || false);
        }
      } catch (error) {
        console.error('AdminAuth: Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };

    if (!loading) {
      checkAdminRole();
    }
  }, [user, loading]);

  return {
    isAdmin,
    adminLoading: loading || adminLoading,
    user
  };
};