import { Module } from '@nestjs/common';
import { PerfisAcessoModule } from '../perfis-acesso/perfis-acesso.module';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [PerfisAcessoModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
