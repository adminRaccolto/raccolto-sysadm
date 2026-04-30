import { BadRequestException, Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface AutentiqueSignature {
  public_id: string;
  name: string;
  email: string;
  link: { short_link: string } | null;
  signed?: { created_at?: string } | null;
}

interface AutentiqueDocument {
  id: string;
  name: string;
  files: { original: string | null; signed: string | null };
  signatures: AutentiqueSignature[];
}

export interface PropostaDocData {
  titulo: string;
  objeto?: string | null;
  empresaNome: string;
  empresaCnpj?: string | null;
  empresaCidade?: string | null;
  empresaEmail?: string | null;
  empresaRepresentanteNome?: string | null;
  empresaRepresentanteCargo?: string | null;
  logoUrl?: string | null;
  clienteNome: string;
  clienteFantasia?: string | null;
  clienteCpfCnpj?: string | null;
  contatoNome?: string | null;
  dataInicio?: Date | null;
  dataFim?: Date | null;
  validadeAte?: Date | null;
  cobrancas: { ordem: number; vencimento: Date; valor: number; descricao?: string | null }[];
  textoFinal: string;
  signatarioNome: string;
  signatarioEmail: string;
}

// ─── Serviço ────────────────────────────────────────────────────────────────

@Injectable()
export class AutentiqueService {
  private readonly logger = new Logger(AutentiqueService.name);
  private readonly endpoint = 'https://api.autentique.com.br/v2/graphql';
  private readonly token = process.env.AUTENTIQUE_TOKEN || '';

  // ─── Envio genérico (contratos, texto simples) ───────────────────────────

  async enviarDocumento(params: {
    nome: string;
    textoContrato: string;
    signatarioNome: string;
    signatarioEmail: string;
  }): Promise<{ docId: string; signUrl: string }> {
    const pdfBuffer = await this.gerarPdf(params.nome, params.textoContrato);
    return this.uploadParaAutentique(params.nome, pdfBuffer, params.signatarioNome, params.signatarioEmail);
  }

  // ─── Envio de proposta com layout formatado ──────────────────────────────

  async enviarPropostaDocumento(params: PropostaDocData): Promise<{ docId: string; signUrl: string }> {
    const pdfBuffer = await this.gerarPdfProposta(params);
    return this.uploadParaAutentique(
      `Proposta — ${params.titulo}`,
      pdfBuffer,
      params.signatarioNome,
      params.signatarioEmail,
    );
  }

  // ─── Upload para Autentique ──────────────────────────────────────────────

  private async uploadParaAutentique(
    nome: string,
    pdfBuffer: Buffer,
    signatarioNome: string,
    signatarioEmail: string,
  ): Promise<{ docId: string; signUrl: string }> {
    const mutation = `
      mutation CreateDocumentMutation(
        $document: DocumentInput!,
        $signers: [SignerInput!]!,
        $file: Upload!
      ) {
        createDocument(document: $document, signers: $signers, file: $file) {
          id name
          files { original signed }
          signatures { public_id name email link { short_link } }
        }
      }
    `;

    const operations = JSON.stringify({
      query: mutation,
      variables: {
        document: { name: nome },
        signers: [{ name: signatarioNome, email: signatarioEmail, action: 'SIGN' }],
        file: null,
      },
    });

    const form = new FormData();
    form.append('operations', operations);
    form.append('map', JSON.stringify({ '0': ['variables.file'] }));
    form.append('0', new Blob([pdfBuffer.buffer as ArrayBuffer], { type: 'application/pdf' }), `${nome}.pdf`);

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });

    const rawText = await response.text();
    this.logger.debug(`Autentique createDocument status=${response.status}`);

    let json: { data?: { createDocument: AutentiqueDocument }; errors?: { message: string }[] };
    try { json = JSON.parse(rawText); } catch {
      throw new BadRequestException(`Autentique retornou resposta inválida: ${rawText.slice(0, 200)}`);
    }

    if (json.errors?.length) {
      this.logger.error('Autentique error:', json.errors);
      throw new BadRequestException(`Autentique: ${json.errors[0].message}`);
    }

    const doc = json.data?.createDocument;
    if (!doc) throw new BadRequestException(`Autentique não retornou o documento.`);

    const signUrl = doc.signatures[0]?.link?.short_link || '';
    this.logger.log(`Documento enviado ao Autentique: ${doc.id}`);
    return { docId: doc.id, signUrl };
  }

  // ─── Consulta de documento ───────────────────────────────────────────────

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
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const json = (await response.json()) as { data?: { document: AutentiqueDocument } };
    return json.data?.document ?? null;
  }

  // ─── PDF simples (contratos) ─────────────────────────────────────────────

  private gerarPdf(titulo: string, texto: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).font('Helvetica-Bold').text(titulo, { align: 'center' });
      doc.moveDown(1.5);
      doc.fontSize(11).font('Helvetica');
      for (const linha of texto.split('\n')) {
        const t = linha.trim();
        if (!t) { doc.moveDown(0.5); continue; }
        if (/^[\d]+\.|^CLÁUSULA|^[A-ZÁÉÍÓÚ\s]{8,}$/.test(t)) {
          doc.font('Helvetica-Bold').text(t).font('Helvetica');
        } else {
          doc.text(t, { align: 'justify' });
        }
        doc.moveDown(0.3);
      }
      doc.moveDown(3);
      doc.fontSize(10).fillColor('#666666').text('Assinado digitalmente via Autentique — www.autentique.com.br', { align: 'center' });
      doc.end();
    });
  }

  // ─── PDF proposta formatado ──────────────────────────────────────────────

  private async gerarPdfProposta(data: PropostaDocData): Promise<Buffer> {
    let logoBuffer: Buffer | null = null;
    if (data.logoUrl) {
      try {
        const r = await fetch(data.logoUrl);
        if (r.ok) logoBuffer = Buffer.from(await r.arrayBuffer());
      } catch { /* sem logo */ }
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 495;   // largura útil (595 - 2*50)
      const LX = 50;   // margem esquerda
      const BRAND = '#1a365d';
      const ACCENT = '#e07b1a';
      const LIGHT = '#eef3f9';
      const MUTED = '#555555';

      const valorFmt = (v: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
      const dateFmt = (d: Date) => d.toLocaleDateString('pt-BR');

      // ── CABEÇALHO ──────────────────────────────────────────────────────
      const headerY = 50;
      if (logoBuffer) {
        try { doc.image(logoBuffer, LX, headerY, { fit: [180, 55] }); } catch { /* skip */ }
      } else {
        doc.fontSize(16).font('Helvetica-Bold').fillColor(BRAND).text(data.empresaNome, LX, headerY + 10, { width: 200, lineBreak: false });
      }

      // Info empresa (direita)
      let yr = headerY;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(BRAND).text(data.empresaNome, 310, yr, { width: 235, align: 'right', lineBreak: false });
      yr += 14;
      doc.fontSize(9).font('Helvetica').fillColor(MUTED);
      if (data.empresaCnpj) {
        doc.text(`CNPJ: ${this.fmtDoc(data.empresaCnpj)}`, 310, yr, { width: 235, align: 'right', lineBreak: false });
        yr += 11;
      }
      if (data.empresaCidade) {
        doc.text(data.empresaCidade, 310, yr, { width: 235, align: 'right', lineBreak: false });
        yr += 11;
      }
      if (data.empresaEmail) {
        doc.text(data.empresaEmail, 310, yr, { width: 235, align: 'right', lineBreak: false });
      }

      // Linha separadora
      const lineY = 115;
      doc.moveTo(LX, lineY).lineTo(LX + W, lineY).strokeColor(BRAND).lineWidth(2).stroke();

      // ── TÍTULO ─────────────────────────────────────────────────────────
      let y = lineY + 18;
      doc.fontSize(22).font('Helvetica-Bold').fillColor(BRAND).text('PROPOSTA COMERCIAL', LX, y, { width: W });
      y = doc.y + 4;
      doc.fontSize(13).font('Helvetica-Bold').fillColor(ACCENT).text(data.objeto || data.titulo, LX, y, { width: W });
      y = doc.y + 18;

      // ── TABELA DE IDENTIFICAÇÃO ─────────────────────────────────────────
      const C1 = 130;
      const ROW_H = 22;

      const clienteLabel = [
        data.clienteNome,
        data.clienteFantasia ? `(${data.clienteFantasia})` : null,
        data.clienteCpfCnpj ? `— ${this.fmtDoc(data.clienteCpfCnpj)}` : null,
      ].filter(Boolean).join(' ');

      const infoRows: [string, string][] = [
        ['CLIENTE', clienteLabel],
        ['RESPONSÁVEL', data.contatoNome || '—'],
      ];
      if (data.dataInicio || data.dataFim) {
        const prazo = [data.dataInicio ? dateFmt(data.dataInicio) : null, data.dataFim ? `até ${dateFmt(data.dataFim)}` : null].filter(Boolean).join(' ');
        infoRows.push(['PRAZO ESTIMADO', prazo]);
      }
      if (data.validadeAte) {
        infoRows.push(['VALIDADE', dateFmt(data.validadeAte)]);
      }

      for (const [label, value] of infoRows) {
        doc.rect(LX, y, C1, ROW_H).fill(BRAND);
        doc.rect(LX + C1, y, W - C1, ROW_H).fill('#f8fafc');
        doc.moveTo(LX, y + ROW_H).lineTo(LX + W, y + ROW_H).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        doc.fontSize(8).font('Helvetica-Bold').fillColor('white').text(label, LX + 4, y + 7, { width: C1 - 8, lineBreak: false });
        doc.fontSize(10).font('Helvetica').fillColor('#222222').text(value, LX + C1 + 6, y + 6, { width: W - C1 - 10, lineBreak: false });
        y += ROW_H;
      }
      y += 20;

      // ── CONTEÚDO MARKDOWN ──────────────────────────────────────────────
      // Posiciona o doc na coordenada y atual para modo flow
      doc.y = y;

      // Detectar onde inserir tabela de cobrancas
      const temMarcador = data.textoFinal.includes('{{tabela_cobrancas}}');
      let segmentos: string[];
      if (temMarcador) {
        segmentos = data.textoFinal.split('{{tabela_cobrancas}}');
      } else {
        const m = data.textoFinal.match(/\n(## 6[. ])/);
        if (m && m.index !== undefined) {
          segmentos = [data.textoFinal.slice(0, m.index), data.textoFinal.slice(m.index)];
        } else {
          segmentos = [data.textoFinal, ''];
        }
      }

      this.renderMd(doc, segmentos[0] || '', LX, W, BRAND, ACCENT, LIGHT);
      if (data.cobrancas.length > 0) {
        this.drawPaymentTable(doc, data.cobrancas, LX, W, BRAND, valorFmt, dateFmt);
      }
      if (segmentos[1]) {
        this.renderMd(doc, segmentos[1], LX, W, BRAND, ACCENT, LIGHT);
      }

      // ── ASSINATURAS ─────────────────────────────────────────────────────
      const COL_W = (W - 30) / 2;
      // Garantir espaço suficiente (80pt) — adiciona página se necessário
      if (doc.y > doc.page.height - 130) doc.addPage();
      let sy = doc.y + 30;

      // Linha esq
      doc.moveTo(LX, sy).lineTo(LX + COL_W, sy).strokeColor(BRAND).lineWidth(1.5).stroke();
      doc.moveTo(LX + COL_W + 30, sy).lineTo(LX + W, sy).strokeColor(BRAND).lineWidth(1.5).stroke();
      sy += 8;

      const empNome = data.empresaRepresentanteNome || data.empresaNome;
      const empCargo = data.empresaRepresentanteCargo || 'Consultor Responsável';
      doc.fontSize(10).font('Helvetica').fillColor('#222').text(empNome, LX, sy, { width: COL_W, lineBreak: false });
      doc.text(data.clienteNome, LX + COL_W + 30, sy, { width: COL_W, lineBreak: false });
      sy += 13;
      doc.fontSize(9).font('Helvetica').fillColor(MUTED).text(empCargo, LX, sy, { width: COL_W, lineBreak: false });
      doc.text('Representante / RD', LX + COL_W + 30, sy, { width: COL_W, lineBreak: false });
      sy += 11;
      doc.fontSize(9).fillColor(MUTED).text(data.empresaNome, LX, sy, { width: COL_W, lineBreak: false });
      doc.text(data.clienteFantasia || data.clienteNome, LX + COL_W + 30, sy, { width: COL_W, lineBreak: false });
      sy += 20;

      // ── RODAPÉ ──────────────────────────────────────────────────────────
      if (sy > doc.page.height - 80) { doc.addPage(); sy = 50; }

      doc.moveTo(LX, sy).lineTo(LX + W, sy).strokeColor(BRAND).lineWidth(1.5).stroke();
      sy += 10;

      const empresaLabel = `${data.empresaNome}${data.empresaCnpj ? ` • CNPJ: ${this.fmtDoc(data.empresaCnpj)}` : ''}`;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(BRAND).text(empresaLabel, LX, sy, { width: W * 0.65, lineBreak: false });
      doc.fontSize(8).font('Helvetica').fillColor(MUTED).text(
        `Proposta gerada em ${new Date().toLocaleDateString('pt-BR')} — ${data.titulo}`,
        LX + W * 0.65, sy, { width: W * 0.35, align: 'right', lineBreak: false },
      );
      sy += 11;
      if (data.empresaEmail) {
        doc.fontSize(8).fillColor(MUTED).text(data.empresaEmail, LX, sy, { width: W * 0.5, lineBreak: false });
      }

      doc.end();
    });
  }

  // ─── Renderizador de markdown para PDF ──────────────────────────────────

  private renderMd(
    doc: InstanceType<typeof PDFDocument>,
    texto: string,
    lx: number,
    w: number,
    brand: string,
    accent: string,
    light: string,
  ) {
    type Block = { type: 'h1' | 'h2' | 'h3' | 'hr' | 'p'; text: string } | { type: 'ul'; items: string[] } | { type: 'blank' };
    const blocos: Block[] = [];
    let listaAtual: string[] | null = null;

    function flush() {
      if (listaAtual?.length) { blocos.push({ type: 'ul', items: [...listaAtual] }); listaAtual = null; }
    }

    for (const linha of texto.split('\n')) {
      const t = linha.trim();
      if (t.startsWith('### ')) { flush(); blocos.push({ type: 'h3', text: t.slice(4) }); }
      else if (t.startsWith('## ')) { flush(); blocos.push({ type: 'h2', text: t.slice(3) }); }
      else if (t.startsWith('# ')) { flush(); blocos.push({ type: 'h1', text: t.slice(2) }); }
      else if (t === '---') { flush(); blocos.push({ type: 'hr', text: '' }); }
      else if (t.startsWith('• ') || t.startsWith('- ') || t.startsWith('* ')) {
        if (!listaAtual) listaAtual = [];
        listaAtual.push(t.slice(2));
      } else if (t === '') { flush(); blocos.push({ type: 'blank' }); }
      else { flush(); blocos.push({ type: 'p', text: t }); }
    }
    flush();

    for (const bloco of blocos) {
      if (bloco.type === 'blank') { doc.moveDown(0.4); }
      else if (bloco.type === 'hr') {
        doc.moveDown(0.3);
        doc.moveTo(lx, doc.y).lineTo(lx + w, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        doc.moveDown(0.3);
      }
      else if (bloco.type === 'h1') {
        doc.moveDown(0.6);
        doc.fontSize(15).font('Helvetica-Bold').fillColor(brand).text(bloco.text, lx, undefined, { width: w });
        doc.moveDown(0.2);
        doc.moveTo(lx, doc.y).lineTo(lx + w, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
        doc.moveDown(0.3);
      }
      else if (bloco.type === 'h2') {
        doc.moveDown(0.5);
        const hy = doc.y;
        doc.rect(lx, hy, w, 20).fill(light);
        doc.moveTo(lx, hy).lineTo(lx, hy + 20).strokeColor(brand).lineWidth(3).stroke();
        doc.fontSize(12).font('Helvetica-Bold').fillColor(brand).text(bloco.text, lx + 8, hy + 4, { width: w - 12, lineBreak: false });
        doc.y = hy + 24;
        doc.moveDown(0.2);
      }
      else if (bloco.type === 'h3') {
        doc.moveDown(0.4);
        doc.fontSize(11).font('Helvetica-Bold').fillColor(brand).text(bloco.text, lx, undefined, { width: w });
        doc.moveDown(0.1);
      }
      else if (bloco.type === 'ul') {
        for (const item of bloco.items) {
          doc.fontSize(10).font('Helvetica').fillColor(accent).text('•', lx, undefined, { continued: true, lineBreak: false });
          doc.fillColor('#222222').text(' ' + this.stripBold(item), { width: w - 12 });
        }
        doc.moveDown(0.2);
      }
      else if (bloco.type === 'p') {
        doc.fontSize(10).font('Helvetica').fillColor('#222222').text(this.stripBold(bloco.text), lx, undefined, { width: w, align: 'justify' });
        doc.moveDown(0.3);
      }
    }
  }

  // ─── Tabela de cobrancas ─────────────────────────────────────────────────

  private drawPaymentTable(
    doc: InstanceType<typeof PDFDocument>,
    cobrancas: { ordem: number; vencimento: Date; valor: number; descricao?: string | null }[],
    lx: number,
    w: number,
    brand: string,
    valorFmt: (v: number) => string,
    dateFmt: (d: Date) => string,
  ) {
    doc.moveDown(0.5);
    const COLS = [40, 100, 225, 130]; // #, Vencimento, Descrição, Valor
    const ROW_H = 20;
    const labels = ['#', 'Vencimento', 'Descrição', 'Valor'];

    // Verificar espaço (header + pelo menos 1 linha)
    if (doc.y > doc.page.height - 80) doc.addPage();
    let ty = doc.y;

    // Header
    let cx = lx;
    doc.rect(lx, ty, w, ROW_H + 2).fill(brand);
    for (let i = 0; i < COLS.length; i++) {
      const align = i === 3 ? 'right' : 'left';
      doc.fontSize(9).font('Helvetica-Bold').fillColor('white').text(labels[i], cx + 4, ty + 6, { width: COLS[i] - 8, align, lineBreak: false });
      cx += COLS[i];
    }
    ty += ROW_H + 2;

    // Rows
    for (let ri = 0; ri < cobrancas.length; ri++) {
      if (ty > doc.page.height - 60) { doc.addPage(); ty = 50; }
      const c = cobrancas[ri];
      const bg = ri % 2 === 1 ? '#f8fafc' : '#ffffff';
      doc.rect(lx, ty, w, ROW_H).fill(bg);
      doc.moveTo(lx, ty + ROW_H).lineTo(lx + w, ty + ROW_H).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

      cx = lx;
      const cells = [String(c.ordem), dateFmt(c.vencimento), c.descricao || '—', valorFmt(c.valor)];
      for (let i = 0; i < COLS.length; i++) {
        const align = i === 3 ? 'right' : 'left';
        doc.fontSize(9).font('Helvetica').fillColor('#222222').text(cells[i], cx + 4, ty + 6, { width: COLS[i] - 8, align, lineBreak: false });
        cx += COLS[i];
      }
      ty += ROW_H;
    }

    doc.y = ty + 10;
    doc.moveDown(0.5);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private fmtDoc(v?: string | null): string {
    if (!v) return '';
    const d = v.replace(/\D/g, '');
    if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return v;
  }

  private stripBold(text: string): string {
    return text.replace(/\*\*([^*]+)\*\*/g, '$1');
  }
}
