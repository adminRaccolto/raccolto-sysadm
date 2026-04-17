# Raccolto Suite v11 — Teste rápido

## Foco da versão
- Multiempresa operacional inicial
- Troca de empresa no contexto do usuário
- Perfis e permissões dinâmicas
- Administração de empresas, usuários e perfis

## Subida
### Backend
```bash
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:push
npm run start:dev
```

### Frontend
```bash
cp .env.example .env
npm install
npm run dev
```

## Validação recomendada
1. Fazer login
2. Abrir **Empresas** e cadastrar uma nova empresa
3. Trocar a empresa atual no seletor do topo
4. Abrir **Perfis & Permissões**
5. Criar um perfil novo com permissões
6. Abrir **Usuários**
7. Criar um usuário novo vinculado ao perfil e a mais de uma empresa
8. Validar que a empresa atual e o perfil dinâmico aparecem no topo do sistema

## Observação
Nesta v11, a base operacional de multiempresa e permissões dinâmicas está implementada. A aplicação fina dessas permissões em todos os módulos ainda é uma camada futura.
