import { Injectable } from '@nestjs/common';

@Injectable()
export class SuporteService {
  getManifesto() {
    return {
      sistema: 'Raccolto',
      versao: '0.4.0',
      proposta: 'Sistema web unificado para operação, contratos, projetos, tarefas, entregáveis e base gerencial da consultoria.',
      diretrizes: [
        'Estrutura modular em NestJS com banco PostgreSQL via Prisma.',
        'Camada administrativa para parametrizações e cadastros auxiliares.',
        'Front-end web separado para validação contínua com o usuário.',
        'Base pronta para crescer para documentos, notificações, CRM e financeiro completo.',
      ],
      modulosImplementados: [
        'Autenticação',
        'Clientes ampliados',
        'Produtos/Serviços',
        'Contratos ampliados com base para financeiro',
        'Projetos',
        'Tarefas com vista lista/kanban no front',
        'Entregáveis',
        'Dashboard',
        'Financeiro (recebíveis automáticos básicos)',
      ],
    };
  }
}
