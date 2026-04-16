import { IsString } from 'class-validator';

export class SwitchCompanyDto {
  @IsString()
  empresaId!: string;
}
