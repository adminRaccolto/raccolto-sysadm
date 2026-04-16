import { IsBoolean, IsOptional } from 'class-validator';

export class ConvertOportunidadeDto {
  @IsOptional()
  @IsBoolean()
  criarContrato?: boolean;

  @IsOptional()
  @IsBoolean()
  criarProjeto?: boolean;
}
