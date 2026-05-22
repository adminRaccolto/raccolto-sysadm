import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDiagramaDto {
  @IsString()
  @IsNotEmpty()
  titulo!: string;

  @IsOptional()
  @IsString()
  projetoId?: string;

  @IsOptional()
  conteudo?: object;
}
