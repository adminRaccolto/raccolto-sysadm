import { Controller, Get, Param, Patch } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { NotificacoesService } from './notificacoes.service';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.notificacoesService.listForUser(user.empresaId, user.sub);
  }

  @Patch(':id/lida')
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificacoesService.marcarComoLida(user.empresaId, user.sub, id);
  }

  @Patch('marcar-todas-lidas')
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificacoesService.marcarTodasComoLidas(user.empresaId, user.sub);
  }
}
