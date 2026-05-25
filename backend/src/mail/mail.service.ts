import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const BCC_COMERCIAL = 'comercial@raccolto.com.br';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;
    const host = process.env.SMTP_HOST;
    if (!host) return null;
    this.transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return this.transporter;
  }

  async enviarLinkAssinatura(params: {
    to: string;
    toNome: string;
    documento: string;
    linkAssinatura: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn('SMTP não configurado — e-mail de assinatura não enviado.');
      return;
    }

    const from = process.env.SMTP_FROM || '"Raccolto" <noreply@raccolto.com.br>';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9f9f9;">
        <div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
          <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Assinatura Digital</p>
          <h2 style="margin:0 0 20px;font-size:22px;color:#1a2b4a;">${params.documento}</h2>
          <p style="color:#444;line-height:1.6;">Olá, <strong>${params.toNome}</strong>.</p>
          <p style="color:#444;line-height:1.6;">Você recebeu um documento para assinatura digital. Clique no botão abaixo para acessar e assinar:</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${params.linkAssinatura}"
               style="background:#1a2b4a;color:#fff;padding:13px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
              Assinar documento
            </a>
          </div>
          <p style="color:#888;font-size:12px;line-height:1.5;">
            Ou copie e cole este link no seu navegador:<br/>
            <a href="${params.linkAssinatura}" style="color:#1a2b4a;word-break:break-all;">${params.linkAssinatura}</a>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="color:#aaa;font-size:11px;margin:0;">
            Este e-mail foi enviado pela Raccolto em parceria com a Autentique para assinatura digital segura.
          </p>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from,
        to: `"${params.toNome}" <${params.to}>`,
        bcc: BCC_COMERCIAL,
        subject: `Link para assinatura — ${params.documento}`,
        html,
      });
      this.logger.log(`E-mail de assinatura enviado para ${params.to} (bcc: ${BCC_COMERCIAL})`);
    } catch (err) {
      this.logger.error('Falha ao enviar e-mail de assinatura:', err);
    }
  }

  async enviarLinkAceite(params: {
    to: string;
    toNome: string;
    titulo: string;
    linkProposta: string;
    empresaNome: string;
    validadeAte?: Date | null;
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn('SMTP não configurado — e-mail de aceite não enviado.');
      return;
    }

    const from = process.env.SMTP_FROM || '"Raccolto" <noreply@raccolto.com.br>';
    const validadeStr = params.validadeAte
      ? ` A proposta é válida até ${new Date(params.validadeAte).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`
      : '';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9f9f9;">
        <div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
          <p style="margin:0 0 8px;font-size:13px;color:#888;text-transform:uppercase;letter-spacing:.5px;">Proposta Comercial</p>
          <h2 style="margin:0 0 20px;font-size:22px;color:#1a2b4a;">${params.titulo}</h2>
          <p style="color:#444;line-height:1.6;">Olá, <strong>${params.toNome}</strong>.</p>
          <p style="color:#444;line-height:1.6;">
            A <strong>${params.empresaNome}</strong> enviou uma proposta comercial para sua avaliação.${validadeStr}
            Clique no botão abaixo para visualizar e aceitar a proposta:
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${params.linkProposta}"
               style="background:#1a2b4a;color:#fff;padding:13px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
              Ver e aceitar proposta
            </a>
          </div>
          <p style="color:#888;font-size:12px;line-height:1.5;">
            Ou copie e cole este link no seu navegador:<br/>
            <a href="${params.linkProposta}" style="color:#1a2b4a;word-break:break-all;">${params.linkProposta}</a>
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="color:#aaa;font-size:11px;margin:0;">
            Este e-mail foi enviado pela ${params.empresaNome} via plataforma Raccolto.
          </p>
        </div>
      </div>
    `;

    try {
      await transporter.sendMail({
        from,
        to: `"${params.toNome}" <${params.to}>`,
        bcc: BCC_COMERCIAL,
        subject: `Proposta para avaliação — ${params.titulo}`,
        html,
      });
      this.logger.log(`E-mail de aceite enviado para ${params.to}`);
    } catch (err) {
      this.logger.error('Falha ao enviar e-mail de aceite:', err);
    }
  }

  async enviarContratoAssinado(params: {
    to: string;
    toNome: string;
    titulo: string;
    pdfBuffer: Buffer;
    pdfNome: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn('SMTP não configurado — e-mail de contrato assinado não enviado.');
      return;
    }
    const from = process.env.SMTP_FROM || '"Raccolto" <noreply@raccolto.com.br>';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
        <h2 style="color:#1a2b4a;">Contrato assinado — ${params.titulo}</h2>
        <p>Olá, <strong>${params.toNome}</strong>.</p>
        <p>Segue em anexo o contrato <strong>${params.titulo}</strong> assinado por ambas as partes.</p>
        <p>Guarde este documento para seus registros.</p>
        <p style="color:#888;font-size:12px;margin-top:24px;">Este e-mail foi enviado pela plataforma Raccolto.</p>
      </div>`;
    try {
      await transporter.sendMail({
        from,
        to: params.to,
        subject: `Contrato assinado — ${params.titulo}`,
        html,
        attachments: [{ filename: params.pdfNome, content: params.pdfBuffer, contentType: 'application/pdf' }],
      });
      this.logger.log(`Contrato assinado enviado para ${params.to}`);
    } catch (err) {
      this.logger.error('Falha ao enviar contrato assinado:', err);
    }
  }

  async enviarAvisoAtrasoArato(params: {
    to: string;
    toNome: string;
    parcelasVencidas: number;
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn('SMTP não configurado — aviso de atraso Arato não enviado.');
      return;
    }
    const from = process.env.SMTP_FROM || '"Raccolto" <noreply@raccolto.com.br>';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
        <h2 style="color:#1a2b4a;">Aviso de atraso — Assinatura Arato</h2>
        <p>Olá, <strong>${params.toNome}</strong>.</p>
        <p>Identificamos <strong>${params.parcelasVencidas} parcela(s) vencida(s)</strong> em sua assinatura Arato.</p>
        <p>Por favor, entre em contato para regularizar sua situação e evitar a suspensão do acesso.</p>
      </div>`;
    try {
      await transporter.sendMail({ from, to: params.to, subject: 'Aviso de atraso — Assinatura Arato', html });
    } catch (err) {
      this.logger.error('Falha ao enviar aviso Arato:', err);
    }
  }

  async enviarCodigoValidacao(params: {
    to: string;
    toNome: string;
    codigo: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP não configurado — código ${params.codigo} NÃO enviado para ${params.to}`);
      return;
    }
    const from = process.env.SMTP_FROM || '"Raccolto" <noreply@raccolto.com.br>';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9f9f9;">
        <div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
          <h2 style="margin:0 0 20px;font-size:22px;color:#1a2b4a;">Seu código de verificação</h2>
          <p style="color:#444;line-height:1.6;">Olá, <strong>${params.toNome}</strong>.</p>
          <p style="color:#444;line-height:1.6;">Use o código abaixo para continuar o diagnóstico:</p>
          <div style="text-align:center;margin:28px 0;">
            <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#1a2b4a;">${params.codigo}</span>
          </div>
          <p style="color:#888;font-size:12px;">O código expira em 15 minutos.</p>
        </div>
      </div>`;
    try {
      await transporter.sendMail({ from, to: params.to, subject: 'Seu código de verificação — Raccolto', html });
      this.logger.log(`Código de validação enviado para ${params.to}`);
    } catch (err) {
      this.logger.error('Falha ao enviar código de validação:', err);
    }
  }

  async enviarDiagnosticoLead(params: {
    to: string;
    toNome: string;
    score: { geral: { percentual: number; nivel: string; diagnostico: string } };
    linkResultado: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP não configurado — link do diagnóstico NÃO enviado para ${params.to}`);
      return;
    }
    const from = process.env.SMTP_FROM || '"Raccolto" <noreply@raccolto.com.br>';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9f9f9;">
        <div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
          <h2 style="margin:0 0 20px;font-size:22px;color:#1a2b4a;">Seu diagnóstico está pronto!</h2>
          <p style="color:#444;line-height:1.6;">Olá, <strong>${params.toNome}</strong>.</p>
          <p style="color:#444;line-height:1.6;">
            Seu diagnóstico de gestão foi concluído. Resultado geral: <strong>${params.score.geral.percentual}%</strong>.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${params.linkResultado}"
               style="background:#1a2b4a;color:#fff;padding:13px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
              Ver resultado completo
            </a>
          </div>
        </div>
      </div>`;
    try {
      await transporter.sendMail({ from, to: params.to, subject: 'Seu diagnóstico de gestão — Raccolto', html });
      this.logger.log(`Diagnóstico enviado para ${params.to}`);
    } catch (err) {
      this.logger.error('Falha ao enviar diagnóstico:', err);
    }
  }

  async enviarRelatorioReembolso(params: {
    destinatarios: { nome: string; email: string }[];
    titulo: string;
    documentoUrl: string | null;
    responsavelNome: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn('SMTP não configurado — e-mail de relatório de reembolso não enviado.');
      return;
    }
    const from = process.env.SMTP_FROM || '"Raccolto" <noreply@raccolto.com.br>';
    const docLink = params.documentoUrl ? `<div style="text-align:center;margin:20px 0;"><a href="${params.documentoUrl}" style="background:#1a2b4a;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block;">Ver documento</a></div>` : '';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9f9f9;">
        <div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
          <h2 style="margin:0 0 20px;font-size:22px;color:#1a2b4a;">Relatório de Reembolso — ${params.titulo}</h2>
          <p style="color:#444;line-height:1.6;">Um relatório de reembolso foi enviado para sua avaliação.</p>
          <p style="color:#444;line-height:1.6;"><strong>Responsável:</strong> ${params.responsavelNome}</p>
          ${docLink}
          <p style="color:#aaa;font-size:11px;margin-top:24px;">Este e-mail foi enviado pela plataforma Raccolto.</p>
        </div>
      </div>`;
    for (const dest of params.destinatarios) {
      try {
        await transporter.sendMail({
          from,
          to: dest.nome ? `"${dest.nome}" <${dest.email}>` : dest.email,
          subject: `Relatório de reembolso para aprovação — ${params.titulo}`,
          html,
        });
        this.logger.log(`Relatório de reembolso enviado para ${dest.email}`);
      } catch (err) {
        this.logger.error(`Falha ao enviar relatório de reembolso para ${dest.email}:`, err);
      }
    }
  }

  async enviarResetSenha(params: {
    to: string;
    toNome: string;
    link: string;
  }): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP não configurado — e-mail de reset NÃO enviado para ${params.to}`);
      return;
    }
    const from = process.env.SMTP_FROM || '"Raccolto" <noreply@raccolto.com.br>';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#f9f9f9;">
        <div style="background:#fff;border-radius:8px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
          <h2 style="margin:0 0 20px;font-size:22px;color:#1a2b4a;">Redefinir senha</h2>
          <p style="color:#444;line-height:1.6;">Olá, <strong>${params.toNome}</strong>.</p>
          <p style="color:#444;line-height:1.6;">Clique no botão abaixo para criar uma nova senha. O link é válido por 1 hora.</p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${params.link}"
               style="background:#1a2b4a;color:#fff;padding:13px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
              Redefinir minha senha
            </a>
          </div>
          <p style="color:#888;font-size:12px;">Se você não solicitou a redefinição, ignore este e-mail.</p>
        </div>
      </div>`;
    try {
      await transporter.sendMail({ from, to: params.to, subject: 'Redefinição de senha — Raccolto', html });
      this.logger.log(`E-mail de reset enviado para ${params.to}`);
    } catch (err) {
      this.logger.error('Falha ao enviar e-mail de reset:', err);
    }
  }
}
