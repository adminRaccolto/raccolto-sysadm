import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PrismaModule } from '../prisma/prisma.module';
import { EntregaveisController } from './entregaveis.controller';
import { EntregaveisService } from './entregaveis.service';

@Module({
  imports: [PrismaModule, NotificacoesModule],
  controllers: [EntregaveisController],
  providers: [EntregaveisService],
})
export class EntregaveisModule {}
