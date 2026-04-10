import { Module } from '@nestjs/common';
import { DeslocamentosController } from './deslocamentos.controller';
import { DeslocamentosService } from './deslocamentos.service';

@Module({
  controllers: [DeslocamentosController],
  providers: [DeslocamentosService],
  exports: [DeslocamentosService],
})
export class DeslocamentosModule {}
