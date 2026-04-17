import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { ModelosDocumentoModule } from '../modelos-documento/modelos-documento.module';
import { AutentiqueModule } from '../autentique/autentique.module';
import { ContratosController } from './contratos.controller';
import { ContratosService } from './contratos.service';

@Module({
  imports: [NotificacoesModule, ModelosDocumentoModule, AutentiqueModule],
  controllers: [ContratosController],
  providers: [ContratosService],
  exports: [ContratosService],
})
export class ContratosModule {}
