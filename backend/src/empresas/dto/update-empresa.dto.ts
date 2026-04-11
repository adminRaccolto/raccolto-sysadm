import { IsBoolean, IsEmail, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateEmpresaDto {
  @IsOptional() @IsString() nome?: string;
  @IsOptional() @IsString() nomeFantasia?: string;
  @IsOptional() @IsString() cnpj?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() complemento?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() cidade?: string;
  @IsOptional() @IsString() estado?: string;
  @IsOptional() @IsString() cep?: string;
  @IsOptional() @IsString() representanteNome?: string;
  @IsOptional() @IsString() representanteCargo?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() infBancarias?: string;

  // Configuração da empresa
  @IsOptional() @IsString() regimeTributario?: string;
  @IsOptional() @IsString() inscricaoEstadual?: string;
  @IsOptional() @IsString() inscricaoMunicipal?: string;
  @IsOptional() @IsString() certificadoDigitalValidade?: string;
  @IsOptional() @IsString() certificadoDigitalStatus?: string;
  @IsOptional() @IsString() certificadoDigitalUrl?: string;
  @IsOptional() @IsString() certificadoDigitalSenha?: string;

  // Configuração fiscal NFS-e
  @IsOptional() @IsNumber() issAliquota?: number;
  @IsOptional() @IsString() itemListaServico?: string;
  @IsOptional() @IsString() codigoTributacaoMunicipio?: string;
  @IsOptional() @IsString() cnaeServico?: string;
  @IsOptional() @IsString() enotasEmpresaId?: string;
  @IsOptional() @IsString() enotasToken?: string;
  @IsOptional() @IsBoolean() nfseAtivo?: boolean;
  @IsOptional() @IsString() nfseAmbiente?: string;
}
