import { PerfilUsuario } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  sub: string;
  empresaId: string;
  clienteId: string | null;
  email: string;
  nome: string;
  perfil: PerfilUsuario;
  perfilAcessoId?: string | null;
}
