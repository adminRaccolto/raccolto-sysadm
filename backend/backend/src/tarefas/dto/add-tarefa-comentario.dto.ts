import { IsString, MinLength } from 'class-validator';

export class AddTarefaComentarioDto {
  @IsString()
  @MinLength(1)
  mensagem!: string;
}
