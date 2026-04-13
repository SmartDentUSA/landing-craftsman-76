import { Badge } from '@/components/ui/badge';
import { Shield, User } from 'lucide-react';
import { useAuthReady } from '@/hooks/useAuthReady';

export function AdminStatusBadge() {
  const { userRole } = useAuthReady();

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
