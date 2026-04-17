import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BancosController } from './bancos.controller';
import { BancosService } from './bancos.service';

@Module({
  imports: [PrismaModule],
  controllers: [BancosController],
  providers: [BancosService],
  exports: [BancosService],
})
export class BancosModule {}
