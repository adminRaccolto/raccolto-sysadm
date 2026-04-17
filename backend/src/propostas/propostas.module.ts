import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AutentiqueService } from '../contratos/autentique.service';
import { PropostasController } from './propostas.controller';
import { PropostasService } from './propostas.service';

@Module({
  imports: [NotificacoesModule],
  controllers: [PropostasController],
  providers: [PropostasService, AutentiqueService],
})
export class PropostasModule {}
