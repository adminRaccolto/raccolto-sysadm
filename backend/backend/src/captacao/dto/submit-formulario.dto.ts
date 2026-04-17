import { IsOptional, IsString, MinLength } from 'class-validator';

export class SubmitFormularioDto {
  @IsString()
  @MinLength(2)
  nomeContato!: string;

  @IsOptional()
  @IsString()
  empresaNome?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  mensagem?: string;
}
