import { IsString, MinLength } from 'class-validator';

export class RedefinirSenhaDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(6)
  novaSenha!: string;
}
