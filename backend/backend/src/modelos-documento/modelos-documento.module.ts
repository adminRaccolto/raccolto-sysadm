import { Module } from '@nestjs/common';
import { ModelosDocumentoController } from './modelos-documento.controller';
import { ModelosDocumentoService } from './modelos-documento.service';

@Module({
  controllers: [ModelosDocumentoController],
  providers: [ModelosDocumentoService],
  exports: [ModelosDocumentoService],
})
export class ModelosDocumentoModule {}
