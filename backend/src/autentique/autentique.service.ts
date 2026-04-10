import { BadRequestException, Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

export interface AutentiqueSignature {
  public_id: string;
  name: string;
  email: string;
  link: { short_link: string } | null;
  signed?: { created_at?: string } | null;
}

export interface AutentiqueDocument {
  id: string;
  name: string;
  files: { original: string | null; signed: string | null };
  signatures: AutentiqueSignature[];
}

export interface DeslocamentoRelatorioItem {
  data: Date;
  docFiscal?: string | null;
  descricao?: string | null;
  distanciaKm: number;
  precoKm: number;
  valorTotal: number;
  pedagios?: number | null;
  refeicao?: number | null;
}

export interface RelatorioDeslocamentoParams {
  empresaNome: string;
  empresaCnpj?: string | null;
  empresaInfoBancarias?: string | null;
  clienteNome: string;
  responsavelNome: string;
  periodoInicio: Date;
  periodoFim: Date;
  deslocamentos: DeslocamentoRelatorioItem[];
  adiantamento: number;
  anotacoes: string;
}

@Injectable()
export class AutentiqueService {
  private readonly logger = new Logger(AutentiqueService.name);
  private readonly endpoint = 'https://api.autentique.com.br/v2/graphql';
  private readonly token = process.env.AUTENTIQUE_TOKEN || '';

  async enviarDocumento(params: {
    nome: string;
    pdfBuffer: Buffer;
    signatarioNome: string;
    signatarioEmail: string;
  }): Promise<{ docId: string; signUrl: string }> {
    const mutation = `
      mutation CreateDocumentMutation(
        $document: DocumentInput!,
        $signers: [SignerInput!]!,
        $file: Upload!
      ) {
        createDocument(document: $document, signers: $signers, file: $file) {
          id
          name
          files { original signed }
          signatures {
            public_id name email
            link { short_link }
          }
        }
      }
    `;

    const operations = JSON.stringify({
      query: mutation,
      variables: {
        document: { name: params.nome },
        signers: [{ name: params.signatarioNome, email: params.signatarioEmail, action: 'SIGN' }],
        file: null,
      },
    });

    const map = JSON.stringify({ '0': ['variables.file'] });

    const form = new FormData();
    form.append('operations', operations);
    form.append('map', map);
    form.append('0', new Blob([params.pdfBuffer.buffer as ArrayBuffer], { type: 'application/pdf' }), `${params.nome}.pdf`);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });

    const rawText = await response.text();
    this.logger.debug(`Autentique createDocument status=${response.status} body=${rawText}`);

    let json: { data?: { createDocument: AutentiqueDocument }; errors?: { message: string }[] };
    try {
      json = JSON.parse(rawText);
    } catch {
      throw new BadRequestException(`Autentique retornou resposta inválida: ${rawText.slice(0, 200)}`);
    }

    if (json.errors?.length) {
      this.logger.error('Autentique error:', json.errors);
      throw new BadRequestException(`Autentique: ${json.errors[0].message}`);
    }

    const doc = json.data?.createDocument;
    if (!doc) throw new BadRequestException(`Autentique não retornou o documento. Resposta: ${rawText.slice(0, 300)}`);

    const signUrl = doc.signatures[0]?.link?.short_link || '';
    this.logger.log(`Documento enviado ao Autentique: ${doc.id}`);
    return { docId: doc.id, signUrl };
  }

  async consultarDocumento(docId: string): Promise<AutentiqueDocument | null> {
    const query = `
      query {
        document(id: "${docId}") {
          id name
          files { original signed }
          signatures {
            public_id name email
            link { short_link }
            signed { created_at }
          }
        }
      }
    `;

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const json = (await response.json()) as { data?: { document: AutentiqueDocument } };
    return json.data?.document ?? null;
  }

  gerarPdfContrato(titulo: string, texto: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text(titulo, { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(11).font('Helvetica');
      const linhas = texto.split('\n');
      for (const linha of linhas) {
        const trimmed = linha.trim();
        if (!trimmed) { doc.moveDown(0.5); continue; }
        if (/^[\d]+\.|^CLÁUSULA|^[A-ZÁÉÍÓÚ\s]{8,}$/.test(trimmed)) {
          doc.font('Helvetica-Bold').text(trimmed).font('Helvetica');
        } else {
          doc.text(trimmed, { align: 'justify' });
        }
        doc.moveDown(0.3);
      }

      doc.moveDown(3);
      doc.fontSize(10).font('Helvetica').fillColor('#666666')
        .text('Assinado digitalmente via Autentique — www.autentique.com.br', { align: 'center' });
      doc.end();
    });
  }

  gerarPdfRelatorioDeslocamento(params: RelatorioDeslocamentoParams): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const L = 40;   // left margin
      const W = 515;  // content width (595 - 40*2)
      const R = L + W;
      const ORANGE = '#C0392B';
      const DARK = '#1a1a1a';
      const HEADER_BG = '#2c3e50';
      const ROW_BG = '#f9f9f9';
      const BORDER = '#cccccc';

      const fmt = (n: number) =>
        n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const fmtDate = (d: Date) =>
        new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      const fmtPeriod = (d: Date) =>
        new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

      // ── TÍTULO ──────────────────────────────────────────────────────────
      doc.fontSize(20).font('Helvetica-Bold').fillColor(DARK)
        .text('RELATÓRIO DE DESLOCAMENTO', L, 40, { width: 300 });

      doc.fontSize(16).font('Helvetica-Bold').fillColor(ORANGE)
        .text(params.clienteNome.toUpperCase(), L + 300, 40, { width: 215, align: 'right' });

      doc.moveTo(L, 70).lineTo(R, 70).strokeColor(ORANGE).lineWidth(2).stroke();

      // ── CABEÇALHO ───────────────────────────────────────────────────────
      let y = 80;

      // Linha: FINALIDADE + PERÍODO
      doc.rect(L, y, W, 20).fillColor('#eeeeee').fill();
      doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
        .text('FINALIDADE:', L + 4, y + 5);
      doc.font('Helvetica').fillColor(DARK)
        .text('DESLOCAMENTO PARA ATENDIMENTO', L + 68, y + 5, { width: 180 });
      doc.font('Helvetica-Bold')
        .text('PERÍODO DE PAGAMENTO', L + 270, y + 5);
      doc.font('Helvetica')
        .text(fmtPeriod(params.periodoInicio), L + 375, y + 5);
      doc.font('Helvetica-Bold').text('A:', L + 425, y + 5);
      doc.font('Helvetica')
        .text(fmtPeriod(params.periodoFim), L + 437, y + 5);

      y += 24;

      // Seção INFORMAÇÕES
      doc.fontSize(10).font('Helvetica-Bold').fillColor(ORANGE).text('INFORMAÇÕES :', L, y);
      doc.moveTo(L, y + 14).lineTo(R, y + 14).strokeColor(BORDER).lineWidth(0.5).stroke();
      y += 18;

      // NOME + CNPJ
      doc.fontSize(8).font('Helvetica-Bold').fillColor(DARK).text('NOME', L + 4, y + 3);
      doc.font('Helvetica').text(params.responsavelNome, L + 45, y + 3, { width: 200 });
      doc.font('Helvetica-Bold').text('CNPJ', L + 330, y + 3);
      doc.font('Helvetica').text(params.empresaCnpj ?? '', L + 355, y + 3, { width: 160 });

      y += 16;

      // INF. BANCÁRIAS + R$/TOTAL + Valor Km
      const totalGeral = params.deslocamentos.reduce((s, d) => {
        return s + d.valorTotal + (d.pedagios ?? 0) + (d.refeicao ?? 0);
      }, 0) - params.adiantamento;

      const precoKmRef = params.deslocamentos[0]?.precoKm ?? 0;

      doc.font('Helvetica-Bold').text('INF. BANCÁRIAS', L + 4, y + 3);
      doc.font('Helvetica').text(params.empresaInfoBancarias ?? '', L + 72, y + 3, { width: 200 });
      doc.font('Helvetica-Bold').text('R$/TOTAL', L + 290, y + 3);
      doc.font('Helvetica-Bold').fillColor(ORANGE).text(fmt(totalGeral), L + 335, y + 3, { width: 90, align: 'right' });
      doc.fillColor(DARK).font('Helvetica-Bold').text('Valor Km:', L + 430, y + 3);
      doc.font('Helvetica').text(precoKmRef.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), L + 478, y + 3);

      y += 20;
      doc.moveTo(L, y).lineTo(R, y).strokeColor(BORDER).lineWidth(0.5).stroke();
      y += 6;

      // ── TABELA ──────────────────────────────────────────────────────────
      // Colunas: Data(65) | Doc.Fiscal(65) | Descrição(135) | KM(50) | R$/Km(50) | Pedágios(55) | Refeição(55) | Total(40)
      const cols = [
        { label: 'Data',       w: 65,  align: 'left'  },
        { label: 'Doc. Fiscal',w: 65,  align: 'left'  },
        { label: 'Descrição',  w: 135, align: 'left'  },
        { label: 'KM Rodado',  w: 50,  align: 'right' },
        { label: 'R$ Km',      w: 50,  align: 'right' },
        { label: 'Pedágios',   w: 55,  align: 'right' },
        { label: 'Refeição',   w: 55,  align: 'right' },
        { label: 'Total',      w: 40,  align: 'right' },
      ] as const;

      // Header row
      doc.rect(L, y, W, 18).fillColor(HEADER_BG).fill();
      let cx = L;
      for (const col of cols) {
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
          .text(col.label, cx + 3, y + 5, { width: col.w - 6, align: col.align as 'left' | 'right' });
        cx += col.w;
      }
      y += 18;

      // Data rows
      let totalKm = 0, totalRsKm = 0, totalPedagios = 0, totalRefeicao = 0, totalLinha = 0;

      params.deslocamentos.forEach((desl, i) => {
        const rowH = 16;
        doc.rect(L, y, W, rowH).fillColor(i % 2 === 0 ? '#ffffff' : ROW_BG).fill();
        doc.rect(L, y, W, rowH).strokeColor(BORDER).lineWidth(0.3).stroke();

        const linhaTotal = desl.valorTotal + (desl.pedagios ?? 0) + (desl.refeicao ?? 0);
        totalKm += desl.distanciaKm;
        totalRsKm += desl.valorTotal;
        totalPedagios += desl.pedagios ?? 0;
        totalRefeicao += desl.refeicao ?? 0;
        totalLinha += linhaTotal;

        const values = [
          fmtDate(desl.data),
          desl.docFiscal ?? '',
          desl.descricao ?? '',
          desl.distanciaKm.toString(),
          fmt(desl.valorTotal),
          desl.pedagios ? fmt(desl.pedagios) : '',
          desl.refeicao ? fmt(desl.refeicao) : '',
          linhaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        ];

        cx = L;
        values.forEach((val, vi) => {
          const col = cols[vi];
          doc.fontSize(8).font('Helvetica').fillColor(DARK)
            .text(val, cx + 3, y + 4, { width: col.w - 6, align: col.align as 'left' | 'right' });
          cx += col.w;
        });
        y += rowH;
      });

      // ── TOTAL ROW ────────────────────────────────────────────────────────
      doc.rect(L, y, W, 18).fillColor('#e8e8e8').fill();
      doc.rect(L, y, W, 18).strokeColor(BORDER).lineWidth(0.5).stroke();

      doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK).text('Total', L + 3, y + 5);

      const totals = ['', '', totalKm.toString(), fmt(totalRsKm), fmt(totalPedagios), fmt(totalRefeicao), fmt(totalLinha)];
      cx = L + cols[0].w + cols[1].w;
      totals.forEach((val, vi) => {
        const col = cols[vi + 2];
        doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
          .text(val, cx + 3, y + 5, { width: col.w - 6, align: col.align as 'left' | 'right' });
        cx += col.w;
      });
      y += 22;

      // ── SUBTOTAL / ADIANTAMENTO / TOTAL ─────────────────────────────────
      const subtotal = totalLinha;
      const totalFinal = subtotal - params.adiantamento;

      const summaryX = L + 330;
      const summaryW = W - 330;

      doc.fontSize(9).font('Helvetica').fillColor(DARK)
        .text('SUBTOTAL', summaryX, y, { width: summaryW - 80 })
        .font('Helvetica-Bold')
        .text(fmt(subtotal), summaryX + summaryW - 80, y, { width: 80, align: 'right' });
      y += 14;

      doc.font('Helvetica').text('ADIANTAMENTOS', summaryX, y, { width: summaryW - 80 })
        .font('Helvetica').text(fmt(params.adiantamento), summaryX + summaryW - 80, y, { width: 80, align: 'right' });
      y += 14;

      doc.rect(summaryX, y, summaryW, 18).fillColor(ORANGE).fill();
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff')
        .text('TOTAL', summaryX + 4, y + 4, { width: summaryW - 80 })
        .text(fmt(totalFinal), summaryX + summaryW - 80, y + 4, { width: 80, align: 'right' });
      y += 24;

      // ── ASSINATURA / ANOTAÇÕES ───────────────────────────────────────────
      y += 10;
      doc.moveTo(L, y + 30).lineTo(L + 180, y + 30).strokeColor(DARK).lineWidth(0.5).stroke();
      doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK).text('ASSINATURA:', L, y + 34);

      if (params.anotacoes) {
        doc.fontSize(9).font('Helvetica-Bold').text('ANOTAÇÕES:', L + 220, y);
        doc.font('Helvetica').text(params.anotacoes, L + 220, y + 12, { width: 295 });
      }

      // Rodapé
      doc.fontSize(8).font('Helvetica').fillColor('#888888')
        .text('Assinado digitalmente via Autentique — www.autentique.com.br', L, doc.page.height - 35, { align: 'center', width: W });

      doc.end();
    });
  }
}
