import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { ModelosDocumentoModule } from '../modelos-documento/modelos-documento.module';
import { AutentiqueModule } from '../autentique/autentique.module';
import { PropostasController } from './propostas.controller';
import { PropostasService } from './propostas.service';

@Module({
  imports: [NotificacoesModule, ModelosDocumentoModule, AutentiqueModule],
  controllers: [PropostasController],
  providers: [PropostasService],
})
export class PropostasModule {}
