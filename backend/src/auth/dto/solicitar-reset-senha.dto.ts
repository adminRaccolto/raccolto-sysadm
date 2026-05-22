import { IsEmail } from 'class-validator';

export class SolicitarResetSenhaDto {
  @IsEmail()
  email!: string;
}
