import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { SuporteService } from './suporte.service';

@Controller('suporte')
export class SuporteController {
  constructor(private readonly suporteService: SuporteService) {}

  @Public()
  @Get('manifesto')
  getManifesto() {
    return this.suporteService.getManifesto();
  }
}
