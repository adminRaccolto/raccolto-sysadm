import { IsBoolean, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTipoGastoDto {
  @IsString()
  @MinLength(1)
  nome!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  ordem?: number;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
