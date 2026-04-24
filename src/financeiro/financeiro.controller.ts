import { Controller, Get } from '@nestjs/common';
import { PerfilUsuario } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { FinanceiroService } from './financeiro.service';

@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.ANALISTA)
  @Get('recebiveis')
  async listRecebiveis(@CurrentUser() user: AuthenticatedUser) {
    return this.financeiroService.listRecebiveis(user.empresaId);
  }
}
