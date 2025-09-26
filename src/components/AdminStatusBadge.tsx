import { Badge } from '@/components/ui/badge';
import { Shield, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AdminStatusBadge() {
  const { userRole, loading } = useAuth();

  if (loading || !userRole) return null;

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