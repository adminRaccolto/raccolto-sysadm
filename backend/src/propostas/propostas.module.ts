import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { MailModule } from '../mail/mail.module';
import { AutentiqueModule } from '../autentique/autentique.module';
import { PropostasController } from './propostas.controller';
import { PropostasService } from './propostas.service';

@Module({
  imports: [NotificacoesModule, MailModule, AutentiqueModule],
  controllers: [PropostasController],
  providers: [PropostasService],
})
export class PropostasModule {}
