import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { ModelosDocumentoModule } from '../modelos-documento/modelos-documento.module';
import { AutentiqueService } from './autentique.service';
import { ContratosController } from './contratos.controller';
import { ContratosService } from './contratos.service';

@Module({
  imports: [NotificacoesModule, ModelosDocumentoModule],
  controllers: [ContratosController],
  providers: [ContratosService, AutentiqueService],
  exports: [ContratosService],
})
export class ContratosModule {}
