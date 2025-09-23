import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function AdminStatusBadge() {
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: isAdmin } = await supabase
          .rpc('has_role', { 
            _user_id: session.user.id, 
            _role: 'admin' 
          });

        setUserRole(isAdmin ? 'admin' : 'user');
      } catch (error) {
        console.error('Error checking role:', error);
        setUserRole('user');
      }
    };

    checkRole();
  }, []);

  if (!userRole) return null;

  return (
    <Badge 
      variant={userRole === 'admin' ? 'default' : 'secondary'}
      className="flex items-center gap-2"
    >
      {userRole === 'admin' ? (
        <>
          <Shield className="h-3 w-3" />
          Logado como: Admin
        </>
      ) : (
        <>
          <User className="h-3 w-3" />
          Usuário (somente leitura)
        </>
      )}
    </Badge>
  );
}