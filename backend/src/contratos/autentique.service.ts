import { BadRequestException, Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');

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

@Injectable()
export class AutentiqueService {
  private readonly logger = new Logger(AutentiqueService.name);
  private readonly endpoint = 'https://api.autentique.com.br/v2/graphql';
  private readonly token = process.env.AUTENTIQUE_TOKEN || '';

  async enviarDocumento(params: {
    nome: string;
    textoContrato: string;
    signatarioNome: string;
    signatarioEmail: string;
  }): Promise<{ docId: string; signUrl: string }> {
    const pdfBuffer = await this.gerarPdf(params.nome, params.textoContrato);

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
    form.append('0', new Blob([pdfBuffer.buffer as ArrayBuffer], { type: 'application/pdf' }), `${params.nome}.pdf`);

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

  private gerarPdf(titulo: string, texto: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 60, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Cabeçalho
      doc.fontSize(18).font('Helvetica-Bold').text(titulo, { align: 'center' });
      doc.moveDown(1.5);

      // Corpo do contrato
      doc.fontSize(11).font('Helvetica');
      const linhas = texto.split('\n');
      for (const linha of linhas) {
        const trimmed = linha.trim();
        if (!trimmed) {
          doc.moveDown(0.5);
          continue;
        }
        // Títulos de seções (ex: "1.", "CLÁUSULA", letras maiúsculas)
        if (/^[\d]+\.|^CLÁUSULA|^[A-ZÁÉÍÓÚ\s]{8,}$/.test(trimmed)) {
          doc.font('Helvetica-Bold').text(trimmed).font('Helvetica');
        } else {
          doc.text(trimmed, { align: 'justify' });
        }
        doc.moveDown(0.3);
      }

      // Rodapé de assinatura
      doc.moveDown(3);
      doc.fontSize(10).font('Helvetica').fillColor('#666666')
        .text('Assinado digitalmente via Autentique — www.autentique.com.br', { align: 'center' });

      doc.end();
    });
  }
}
