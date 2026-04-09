import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TarefasController } from './tarefas.controller';
import { TarefasService } from './tarefas.service';

@Module({
  imports: [PrismaModule, NotificacoesModule],
  controllers: [TarefasController],
  providers: [TarefasService],
})
export class TarefasModule {}
