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
}
