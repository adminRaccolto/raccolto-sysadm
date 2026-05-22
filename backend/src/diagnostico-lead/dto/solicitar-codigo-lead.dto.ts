import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SolicitarCodigoLeadDto {
  @IsString() @MinLength(2) nome!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) telefone!: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() profissao?: string;
}
