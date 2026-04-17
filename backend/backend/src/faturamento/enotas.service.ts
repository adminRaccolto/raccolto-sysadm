import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export type EnotasCliente = {
  nome: string;
  email?: string;
  cpfCnpj?: string;
  inscricaoEstadual?: string;
  endereco?: {
    pais?: string;
    uf?: string;
    cidade?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
  };
};

export type EnotasEmitirPayload = {
  idExterno: string;
  dataCompetencia: string;
  cliente: EnotasCliente;
  servico: {
    descricao: string;
    valorServico: number;
    aliquotaIss: number;
    itemListaServico?: string;
    codigoTributacaoMunicipio?: string;
    cnae?: string;
  };
  enviarEmail?: boolean;
};

export type EnotasNfse = {
  id: string;
  status: 'Processando' | 'Autorizada' | 'Cancelada' | 'Erro';
  numero?: string;
  numeroRps?: string;
  serieRps?: string;
  codigoVerificacao?: string;
  linkVisualizacaoPdf?: string;
  linkDownloadXml?: string;
  mensagemErro?: string;
};

@Injectable()
export class EnotasService {
  private readonly logger = new Logger(EnotasService.name);
  private readonly baseUrl = 'https://app.enotas.com.br/api';

  private get apiKey(): string {
    return process.env.ENOTAS_API_KEY || '';
  }

  private get empresaId(): string {
    return process.env.ENOTAS_EMPRESA_ID || '';
  }

  private get headers() {
    return {
      Authorization: `ApiKey ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  get configurado(): boolean {
    return !!this.apiKey && !!this.empresaId;
  }

  async emitirNfse(payload: EnotasEmitirPayload): Promise<EnotasNfse> {
    if (!this.configurado) {
      throw new Error('eNotas não configurado. Defina ENOTAS_API_KEY e ENOTAS_EMPRESA_ID no .env');
    }

    this.logger.log(`Emitindo NFS-e via eNotas para idExterno=${payload.idExterno}`);

    const response = await axios.post<EnotasNfse>(
      `${this.baseUrl}/empresas/${this.empresaId}/nfses`,
      payload,
      { headers: this.headers },
    );

    this.logger.log(`NFS-e criada no eNotas: id=${response.data.id} status=${response.data.status}`);
    return response.data;
  }

  async consultarNfse(enotasId: string): Promise<EnotasNfse> {
    const response = await axios.get<EnotasNfse>(
      `${this.baseUrl}/empresas/${this.empresaId}/nfses/${enotasId}`,
      { headers: this.headers },
    );
    return response.data;
  }

  async cancelarNfse(enotasId: string): Promise<void> {
    await axios.delete(
      `${this.baseUrl}/empresas/${this.empresaId}/nfses/${enotasId}`,
      { headers: this.headers },
    );
    this.logger.log(`NFS-e ${enotasId} cancelada no eNotas`);
  }
}
