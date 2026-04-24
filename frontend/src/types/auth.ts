export type PerfilUsuario = 'ADMIN' | 'ANALISTA' | 'CLIENTE';

export interface EmpresaAutenticada {
  id: string;
  nome: string;
  nomeFantasia?: string | null;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  representanteNome?: string | null;
  representanteCargo?: string | null;
  logoUrl?: string | null;
  status?: string;
}

export interface EmpresaDisponivel {
  id: string;
  nome: string;
  nomeFantasia?: string | null;
  logoUrl?: string | null;
  principal?: boolean;
  perfilAcesso?: {
    id: string;
    nome: string;
  } | null;
}

export interface EmpresaLoginOption {
  id: string;
  nome: string;
  nomeFantasia?: string | null;
  logoUrl?: string | null;
}

export interface PerfilAcessoAtual {
  id: string;
  nome: string;
  descricao?: string | null;
}

export interface Permissao {
  chave: string;
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluir: boolean;
  aprovar: boolean;
  administrar: boolean;
}

export interface UsuarioAutenticado {
  id?: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  empresaId?: string;
  clienteId?: string | null;
  empresa?: EmpresaAutenticada | null;
  perfilAcessoAtual?: PerfilAcessoAtual | null;
  permissoes?: Permissao[] | null;
  empresasDisponiveis?: EmpresaDisponivel[];
}

export interface LoginResponse {
  tokenType: 'Bearer';
  accessToken: string;
  expiresIn: string;
  user: UsuarioAutenticado;
}
