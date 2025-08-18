import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  darkColor?: string;
  lightColor?: string;
}

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);

  async generateCertificateQR(
    certificateId: string,
    transactionHash?: string,
    options: QRCodeOptions = {},
  ): Promise<Buffer> {
    this.logger.log(`🔗 Generating QR code for certificate: ${certificateId}`);

    try {
      // El QR debe contener los enlaces de Pinata, Avalanche y Arbitrum
      if (!transactionHash) {
        throw new Error('Transaction hash is required for QR generation');
      }

      // Para obtener los hashes de Avalanche y Arbitrum, el método debe recibirlos o buscar en la BD
      // Aquí solo tenemos el transactionHash, así que generamos los enlaces estándar
      const avalancheUrl = `https://testnet.snowtrace.io/tx/${transactionHash}`;
      const arbitrumUrl = `https://sepolia.arbiscan.io/tx/${transactionHash}`;
      // El enlace de Pinata no se puede obtener aquí, así que lo dejamos vacío o como ejemplo
      const pinataUrl = '';

      const qrData = {
        type: 'certificate',
        certificate_id: certificateId,
        transaction_hash: transactionHash,
        links: {
          pinata: pinataUrl,
          avalanche: avalancheUrl,
          arbitrum: arbitrumUrl,
        },
        generated_at: new Date().toISOString(),
      };

      const qrString = JSON.stringify(qrData);

      const qrCodeDataUrl = await QRCode.toDataURL(qrString, {
        width: options.width || 512,
        margin: options.margin || 2,
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF',
        },
      });

      // Convert data URL to buffer
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      this.logger.log(`✅ QR code generated successfully for certificate: ${certificateId}`);
      return buffer;
    } catch (error) {
      this.logger.error(`❌ Error generating QR code: ${error.message}`);
      throw error;
    }
  }

  async generateTransactionQR(
    transactionHash: string,
    options: QRCodeOptions = {},
  ): Promise<Buffer> {
    this.logger.log(`🔗 Generating QR code for transaction: ${transactionHash}`);

    try {
      const qrData = {
        type: 'blockchain_transaction',
        transaction_hash: transactionHash,
        explorer_url: `https://arbiscan.io/tx/${transactionHash}`,
        timestamp: new Date().toISOString(),
      };

      const qrString = JSON.stringify(qrData);
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrString, {
        width: options.width || 256,
        margin: options.margin || 1,
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF',
        },
      });

      // Convert data URL to buffer
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      this.logger.log(`✅ QR code generated successfully for transaction: ${transactionHash}`);
      return buffer;
    } catch (error) {
      this.logger.error(`❌ Error generating transaction QR: ${error.message}`);
      throw error;
    }
  }

  async generateCustomQR(
    data: any,
    options: QRCodeOptions = {},
  ): Promise<Buffer> {
    this.logger.log(`🔗 Generating custom QR code`);

    try {
      const qrString = typeof data === 'string' ? data : JSON.stringify(data);
      
      const qrCodeDataUrl = await QRCode.toDataURL(qrString, {
        width: options.width || 256,
        margin: options.margin || 1,
        errorCorrectionLevel: options.errorCorrectionLevel || 'M',
        color: {
          dark: options.darkColor || '#000000',
          light: options.lightColor || '#FFFFFF',
        },
      });

      // Convert data URL to buffer
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      this.logger.log(`✅ Custom QR code generated successfully`);
      return buffer;
    } catch (error) {
      this.logger.error(`❌ Error generating custom QR: ${error.message}`);
      throw error;
    }
  }

  validateQRData(qrString: string): { valid: boolean; data?: any; error?: string } {
    this.logger.log(`🔍 Validating QR data`);

    try {
      // Para nuestro caso simple, el QR solo contiene el hash
      // Verificamos que no esté vacío y tenga formato de hash
      if (!qrString || qrString.trim().length === 0) {
        return {
          valid: false,
          error: 'QR data is empty',
        };
      }

      // El QR debe contener un transaction hash (formato 0x...)
      if (qrString.length >= 10) {
        return { 
          valid: true, 
          data: {
            hash: qrString.trim(),
            type: qrString.startsWith('0x') ? 'transaction_hash' : 'other_hash'
          }
        };
      }

      return {
        valid: false,
        error: 'Invalid hash format',
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Error validating QR data',
      };
    }
  }
}
