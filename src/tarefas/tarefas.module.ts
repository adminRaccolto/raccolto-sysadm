import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TarefasController } from './tarefas.controller';
import { TarefasService } from './tarefas.service';

@Module({
  imports: [PrismaModule],
  controllers: [TarefasController],
  providers: [TarefasService],
})
export class TarefasModule {}
