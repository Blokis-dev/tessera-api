import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface UserApprovalEmailData {
  userEmail: string;
  fullName: string;
  institutionName: string;
  temporaryPassword: string;
  loginUrl?: string;
}

export interface UserRejectionEmailData {
  userEmail: string;
  fullName: string;
  institutionName: string;
  rejectionReason: string;
  adminNotes?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private brevoClient: AxiosInstance;
  private fromEmail: string;
  private companyName: string;
  private loginUrl: string;
  private frontendUrl: string;
  private isConfigured: boolean = false;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.fromEmail = this.configService.get<string>('FROM_EMAIL') || 'no-reply@tessera.com';
    this.companyName = this.configService.get<string>('COMPANY_NAME') || 'Tessera';
    this.loginUrl = this.configService.get<string>('LOGIN_URL') || 'http://localhost:3001/login';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    if (apiKey && !apiKey.includes('your_')) {
      this.brevoClient = axios.create({
        baseURL: 'https://api.brevo.com/v3',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey
        }
      });
      
      this.isConfigured = true;
      this.logger.log('✅ Email service initialized with Brevo');
      this.logger.log(`📧 From email configured as: ${this.fromEmail}`);
      this.logger.log(`🌐 Login URL configured as: ${this.loginUrl}`);
      this.logger.log(`🖥️ Frontend URL configured as: ${this.frontendUrl}`);
    } else {
      this.logger.warn('⚠️ Brevo API key not configured. Email service will run in mock mode.');
    }
  }

  async sendUserApprovalEmail(data: UserApprovalEmailData): Promise<boolean> {
    try {
      const subject = `¡Bienvenido a ${this.companyName}! Tu cuenta ha sido aprobada`;
      const htmlContent = this.generateApprovalEmailHTML(data);
      const textContent = this.generateApprovalEmailText(data);

      if (!this.isConfigured) {
        this.logger.warn('📧 Email service in mock mode. Would send email to:', data.userEmail);
        this.logger.warn('📄 Email content:', { subject, textContent });
        return true;
      }

      this.logger.log(`📤 Sending approval email from ${this.fromEmail} to ${data.userEmail}`);
      
      const emailData = {
        sender: {
          name: this.companyName,
          email: this.fromEmail
        },
        to: [
          {
            email: data.userEmail,
            name: data.fullName
          }
        ],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
        tags: [`user-approval`, `institution-${data.institutionName.replace(/\s+/g, '-').toLowerCase()}`]
      };

      const response = await this.brevoClient.post('/smtp/email', emailData);

      this.logger.log(`✅ Approval email sent successfully to ${data.userEmail}`, {
        messageId: response.data.messageId,
        statusCode: response.status,
        timestamp: new Date().toISOString()
      });

      return true;

    } catch (error) {
      this.logger.error(`❌ Failed to send approval email to ${data.userEmail}:`, {
        error: error.message,
        response: error.response?.data || 'No response data',
        statusCode: error.response?.status || 'No status code'
      });
      return false;
    }
  }

  private generateApprovalEmailHTML(data: UserApprovalEmailData): string {
    const loginUrl = this.loginUrl || data.loginUrl || 'http://localhost:3001/login';
    const firstTimeLoginUrl = `${loginUrl}?first-time=true&email=${encodeURIComponent(data.userEmail)}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cuenta Aprobada - ${this.companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .password-box { background-color: #e8f5e8; border: 2px solid #4CAF50; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .password { font-family: monospace; font-size: 18px; font-weight: bold; color: #2E7D32; text-align: center; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 15px 0; border-radius: 5px; color: #856404; }
          .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; font-size: 12px; color: #666; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Cuenta Aprobada!</h1>
            <p>Bienvenido a ${this.companyName}</p>
          </div>
          <div class="content">
            <h2>Hola ${data.fullName},</h2>
            
            <p>¡Excelentes noticias! Tu cuenta para <strong>${data.institutionName}</strong> ha sido aprobada y ya puedes acceder a ${this.companyName}.</p>
            
            <h3>📧 Datos de acceso:</h3>
            <p><strong>Email:</strong> ${data.userEmail}</p>
            
            <div class="password-box">
              <p><strong>🔐 Contraseña temporal:</strong></p>
              <div class="password">${data.temporaryPassword}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Esta contraseña temporal será invalidada después de tu primer login exitoso. Debes cambiarla inmediatamente.
            </div>
            
            <h3>🚀 Configura tu contraseña:</h3>
            <ol>
              <li>Haz clic en "Configurar Contraseña" abajo</li>
              <li>Ingresa tu contraseña temporal</li>
              <li>Crea una nueva contraseña segura</li>
              <li>¡Comienza a usar ${this.companyName}!</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="${firstTimeLoginUrl}" class="button">🔐 Configurar Contraseña</a>
            </div>
            
            <p style="text-align: center; font-size: 12px; color: #666;">
              O accede manualmente a: <a href="${loginUrl}">${loginUrl}</a>
            </p>
            
            <h3>💡 Características de tu nueva contraseña:</h3>
            <ul>
              <li>✅ 16+ caracteres de longitud</li>
              <li>✅ Mayúsculas y minúsculas</li>
              <li>✅ Números y símbolos especiales</li>
              <li>✅ Generación criptográficamente segura</li>
            </ul>
            
            <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar a nuestro equipo de soporte.</p>
            
            <p>¡Bienvenido al equipo!</p>
          </div>
          <div class="footer">
            <p>Este es un mensaje automático de ${this.companyName}. Por favor no respondas a este email.</p>
            <p>Si no solicitaste una cuenta, puedes ignorar este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateApprovalEmailText(data: UserApprovalEmailData): string {
    const loginUrl = this.loginUrl || data.loginUrl || 'http://localhost:3001/login';
    const firstTimeLoginUrl = `${loginUrl}?first-time=true&email=${encodeURIComponent(data.userEmail)}`;
    
    return `
¡Cuenta Aprobada! - ${this.companyName}

Hola ${data.fullName},

¡Excelentes noticias! Tu cuenta para ${data.institutionName} ha sido aprobada y ya puedes acceder a ${this.companyName}.

DATOS DE ACCESO:
Email: ${data.userEmail}
Contraseña temporal: ${data.temporaryPassword}

IMPORTANTE: Esta contraseña temporal será invalidada después de tu primer login exitoso. Debes cambiarla inmediatamente.

CONFIGURAR TU CONTRASEÑA:
1. Accede directamente a: ${firstTimeLoginUrl}
2. Ingresa tu contraseña temporal
3. Crea una nueva contraseña segura
4. ¡Comienza a usar ${this.companyName}!

O accede manualmente a: ${loginUrl}
3. Cambia tu contraseña por una nueva y segura
4. ¡Comienza a usar ${this.companyName}!

CARACTERÍSTICAS DE TU NUEVA CONTRASEÑA:
- 16+ caracteres de longitud
- Mayúsculas y minúsculas
- Números y símbolos especiales
- Generación criptográficamente segura

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar a nuestro equipo de soporte.

¡Bienvenido al equipo!

---
Este es un mensaje automático de ${this.companyName}. Por favor no respondas a este email.
Si no solicitaste una cuenta, puedes ignorar este mensaje.
    `;
  }

  async sendPasswordResetEmail(userEmail: string, resetToken: string): Promise<boolean> {
    try {
      const subject = `Restablecer contraseña - ${this.companyName}`;
      const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;
      
      const htmlContent = `
        <h2>Restablecer contraseña</h2>
        <p>Has solicitado restablecer tu contraseña en ${this.companyName}.</p>
        <p><a href="${resetUrl}">Haz clic aquí para restablecer tu contraseña</a></p>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no solicitaste este cambio, ignora este email.</p>
      `;

      if (!this.isConfigured) {
        this.logger.warn('📧 Email service in mock mode. Would send password reset to:', userEmail);
        return true;
      }

      const emailData = {
        sender: {
          name: this.companyName,
          email: this.fromEmail
        },
        to: [
          {
            email: userEmail
          }
        ],
        subject: subject,
        htmlContent: htmlContent,
        tags: ['password-reset']
      };

      await this.brevoClient.post('/smtp/email', emailData);

      return true;

    } catch (error) {
      return false;
    }
  }

  async sendUserRejectionEmail(data: UserRejectionEmailData): Promise<boolean> {
    try {
      const subject = `Actualización sobre tu solicitud en ${this.companyName}`;
      const htmlContent = this.generateRejectionEmailHTML(data);
      const textContent = this.generateRejectionEmailText(data);

      if (!this.isConfigured) {
        return true;
      }

      this.logger.log(`📤 Sending rejection email from ${this.fromEmail} to ${data.userEmail}`);
      
      const emailData = {
        sender: {
          name: this.companyName,
          email: this.fromEmail
        },
        to: [
          {
            email: data.userEmail,
            name: data.fullName
          }
        ],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
        tags: [`user-rejection`, `institution-${data.institutionName.replace(/\s+/g, '-').toLowerCase()}`]
      };

      const response = await this.brevoClient.post('/smtp/email', emailData);

      this.logger.log(`✅ Rejection email sent successfully to ${data.userEmail}`, {
        messageId: response.data.messageId,
        statusCode: response.status,
        timestamp: new Date().toISOString()
      });

      return true;

    } catch (error) {
      this.logger.error(`❌ Failed to send rejection email to ${data.userEmail}:`, {
        error: error.message,
        response: error.response?.data || 'No response data',
        statusCode: error.response?.status || 'No status code'
      });
      return false;
    }
  }

  private generateRejectionEmailHTML(data: UserRejectionEmailData): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Actualización de solicitud - ${this.companyName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .rejection-box { background: #fee; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
          .company-name { font-weight: bold; color: #667eea; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Actualización sobre tu solicitud</h1>
          <p>Información importante sobre tu cuenta en <span class="company-name">${this.companyName}</span></p>
        </div>
        
        <div class="content">
          <h2>Estimado/a ${data.fullName},</h2>
          
          <p>Esperamos que te encuentres bien. Te escribimos para informarte sobre el estado de tu solicitud de acceso a nuestra plataforma para <strong>${data.institutionName}</strong>.</p>
          
          <div class="rejection-box">
            <h3>🔒 Estado de tu solicitud: No aprobada</h3>
            <p><strong>Motivo:</strong> ${data.rejectionReason}</p>
            ${data.adminNotes ? `<p><strong>Notas adicionales:</strong> ${data.adminNotes}</p>` : ''}
          </div>
          
          <p>Lamentamos informarte que no hemos podido aprobar tu solicitud en este momento. Esta decisión se basa en nuestros criterios de evaluación y las políticas de la plataforma.</p>
          
          <h3>¿Qué puedes hacer ahora?</h3>
          <ul>
            <li>Si consideras que hay un error, puedes contactar a nuestro equipo de soporte</li>
            <li>Puedes realizar una nueva solicitud en el futuro si las circunstancias cambian</li>
            <li>Revisa que toda la información proporcionada sea correcta y completa</li>
          </ul>
          
          <p>Agradecemos tu interés en formar parte de <span class="company-name">${this.companyName}</span> y esperamos que comprendas nuestra decisión.</p>
          
          <p>Si tienes preguntas o necesitas más información, no dudes en contactarnos.</p>
          
          <p>Saludos cordiales,<br>
          <strong>El equipo de ${this.companyName}</strong></p>
        </div>
        
        <div class="footer">
          <p>Este es un mensaje automático de <span class="company-name">${this.companyName}</span>.</p>
          <p>Por razones de seguridad, todos los datos asociados a esta solicitud han sido eliminados de nuestros sistemas.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateRejectionEmailText(data: UserRejectionEmailData): string {
    return `
Actualización sobre tu solicitud - ${this.companyName}

Estimado/a ${data.fullName},

Te escribimos para informarte sobre el estado de tu solicitud de acceso a nuestra plataforma para ${data.institutionName}.

ESTADO DE TU SOLICITUD: No aprobada

Motivo: ${data.rejectionReason}
${data.adminNotes ? `Notas adicionales: ${data.adminNotes}` : ''}

Lamentamos informarte que no hemos podido aprobar tu solicitud en este momento. Esta decisión se basa en nuestros criterios de evaluación y las políticas de la plataforma.

¿Qué puedes hacer ahora?
- Si consideras que hay un error, puedes contactar a nuestro equipo de soporte
- Puedes realizar una nueva solicitud en el futuro si las circunstancias cambian
- Revisa que toda la información proporcionada sea correcta y completa

Agradecemos tu interés en formar parte de ${this.companyName} y esperamos que comprendas nuestra decisión.

Si tienes preguntas o necesitas más información, no dudes en contactarnos.

Saludos cordiales,
El equipo de ${this.companyName}

---
Este es un mensaje automático de ${this.companyName}.
Por razones de seguridad, todos los datos asociados a esta solicitud han sido eliminados de nuestros sistemas.
    `;
  }
}
