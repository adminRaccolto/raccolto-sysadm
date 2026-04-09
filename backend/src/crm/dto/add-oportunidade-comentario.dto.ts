import { IsString, MinLength } from 'class-validator';

export class AddOportunidadeComentarioDto {
  @IsString()
  @MinLength(1)
  mensagem!: string;
}
