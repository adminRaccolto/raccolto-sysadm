import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EntregaveisController } from './entregaveis.controller';
import { EntregaveisService } from './entregaveis.service';

@Module({
  imports: [PrismaModule],
  controllers: [EntregaveisController],
  providers: [EntregaveisService],
})
export class EntregaveisModule {}
