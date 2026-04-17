import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AutentiqueService } from './autentique.service';
import { ContratosController } from './contratos.controller';
import { ContratosService } from './contratos.service';

@Module({
  imports: [NotificacoesModule],
  controllers: [ContratosController],
  providers: [ContratosService, AutentiqueService],
  exports: [ContratosService],
})
export class ContratosModule {}
