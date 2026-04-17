import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  empresaId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  senha!: string;
}
