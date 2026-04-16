import { Module } from '@nestjs/common';
import { AutentiqueService } from './autentique.service';

@Module({
  providers: [AutentiqueService],
  exports: [AutentiqueService],
})
export class AutentiqueModule {}
