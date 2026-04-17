import { Module } from '@nestjs/common';
import { CaptacaoController } from './captacao.controller';
import { CaptacaoService } from './captacao.service';

@Module({
  controllers: [CaptacaoController],
  providers: [CaptacaoService],
})
export class CaptacaoModule {}
