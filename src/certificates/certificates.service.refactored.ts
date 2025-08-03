import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { QrService } from '../qr/qr.service';
import { PinataService } from '../ipfs/pinata.service';
import { randomUUID } from 'crypto';

// Nuevas interfaces según tu flujo
export interface CreateCertificateDto {
  description: string;
  student_name: string;
  institution_id: string;
  issued_at: string;
  expiration_date?: string;
}

export interface CertificateMetadata {
  id: string;
  description: string;
  student_name: string;
  institution_name: string;
  issued_at: string;
  expiration_date?: string;
  certificate_type: string;
  blockchain: string;
  api_version: string;
  created_at: string;
}

export interface PinataUploadResponse {
  image_hash: string;
  metadata_hash: string;
  image_url: string;
  metadata_url: string;
}

export interface AvalancheResponse {
  transaction_hash: string;
  block_number?: number;
  gas_used?: string;
}

export interface Certificate {
  id: string;
  description: string;
  student_name: string;
  institution_id: string;
  issued_at: string;
  expiration_date?: string;
  image_hash?: string;
  metadata_hash?: string;
  transaction_hash?: string;
  qr_url?: string;
  created_at: string;
}

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);
  
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly qrService: QrService,
    private readonly configService: ConfigService,
    private readonly pinataService: PinataService,
  ) {}

  // 🎯 PASO 1: Crear certificado básico en BD
  async createBasicCertificate(createDto: CreateCertificateDto): Promise<Certificate> {
    this.logger.log(`🎓 Creating basic certificate for: ${createDto.student_name}`);

    try {
      const certificateId = randomUUID();
      
      const certificateRecord = {
        id: certificateId,
        description: createDto.description,
        student_name: createDto.student_name,
        institution_id: createDto.institution_id,
        issued_at: createDto.issued_at,
        expiration_date: createDto.expiration_date || null,
      };

      const { data, error } = await this.supabaseService.client
        .from('certificates')
        .insert(certificateRecord)
        .select()
        .single();

      if (error) {
        this.logger.error(`❌ Error creating certificate: ${error.message}`);
        throw new Error(`Database error: ${error.message}`);
      }

      this.logger.log(`✅ Basic certificate created: ${certificateId}`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error creating basic certificate: ${error.message}`);
      throw error;
    }
  }

  // 🎯 PASO 2: Subir imagen y metadatos a Pinata
  async uploadToPinata(certificateId: string, imageBuffer: Buffer): Promise<PinataUploadResponse> {
    this.logger.log(`📤 Uploading certificate ${certificateId} to Pinata`);

    try {
      // Obtener el certificado de la BD para generar metadatos
      const certificate = await this.getCertificateById(certificateId);
      
      // Obtener información de la institución
      const { data: institution } = await this.supabaseService.client
        .from('institutions')
        .select('name')
        .eq('id', certificate.institution_id)
        .single();

      // Generar metadatos
      const metadata = this.generateMetadata(certificate, institution?.name || 'Unknown Institution');

      // 1. Subir imagen a Pinata usando PinataService
      this.logger.log(`🖼️ Uploading certificate image...`);
      const imageUpload = await this.pinataService.uploadFile(imageBuffer, {
        name: `certificate-${certificateId}.png`,
        keyvalues: {
          certificate_id: certificateId,
          type: 'image',
          student_name: certificate.student_name
        }
      });

      this.logger.log(`✅ Image uploaded to Pinata: ${imageUpload.cid}`);

      // 2. Subir metadatos a Pinata usando PinataService
      this.logger.log(`📄 Uploading certificate metadata...`);
      const metadataUpload = await this.pinataService.uploadJSON(metadata, {
        name: `certificate-metadata-${certificateId}.json`,
        keyvalues: {
          certificate_id: certificateId,
          type: 'metadata',
          student_name: certificate.student_name
        }
      });

      this.logger.log(`✅ Metadata uploaded to Pinata: ${metadataUpload.cid}`);

      const gatewayUrl = this.configService.get('PINATA_GATEWAY_URL') || 'https://gateway.pinata.cloud';

      const response: PinataUploadResponse = {
        image_hash: imageUpload.cid,
        metadata_hash: metadataUpload.cid,
        image_url: `${gatewayUrl}/ipfs/${imageUpload.cid}`,
        metadata_url: `${gatewayUrl}/ipfs/${metadataUpload.cid}`,
      };

      // 3. Actualizar la BD con los hashes
      await this.updateCertificateHashes(certificateId, response.image_hash, response.metadata_hash);

      this.logger.log(`✅ Certificate ${certificateId} uploaded to Pinata successfully`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error uploading to Pinata: ${error.message}`);
      throw error;
    }
  }

  // 🎯 PASO 3: Enviar a Avalanche y obtener transaction_hash
  async sendToAvalanche(certificateId: string): Promise<AvalancheResponse> {
    this.logger.log(`⛷️  Sending certificate ${certificateId} to Avalanche`);

    try {
      const certificate = await this.getCertificateById(certificateId);

      if (!certificate.image_hash || !certificate.metadata_hash) {
        throw new Error('Certificate must have image and metadata hashes before sending to Avalanche');
      }

      // Preparar datos para Avalanche
      const avalancheData = {
        certificate_id: certificateId,
        image_hash: certificate.image_hash,
        metadata_hash: certificate.metadata_hash,
        student_name: certificate.student_name,
        description: certificate.description,
        issued_at: certificate.issued_at,
      };

      // TODO: Aquí irá la URL real de Avalanche
      const avalancheUrl = this.configService.get('AVALANCHE_API_URL') || 'http://localhost:8080/api/certificates';

      const response = await fetch(avalancheUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.configService.get('AVALANCHE_API_KEY')}`,
        },
        body: JSON.stringify(avalancheData),
      });

      if (!response.ok) {
        throw new Error(`Avalanche API failed: ${response.statusText}`);
      }

      const result = await response.json();
      this.logger.log(`⛷️  Avalanche response: ${result.transaction_hash}`);

      // Actualizar transaction_hash en BD
      await this.updateTransactionHash(certificateId, result.transaction_hash);

      this.logger.log(`✅ Certificate ${certificateId} sent to Avalanche successfully`);
      return {
        transaction_hash: result.transaction_hash,
        block_number: result.block_number,
        gas_used: result.gas_used,
      };
    } catch (error) {
      this.logger.error(`❌ Error sending to Avalanche: ${error.message}`);
      throw error;
    }
  }

  // 🎯 PASO 4: Generar QR con transaction_hash
  async generateQRCode(certificateId: string): Promise<string> {
    this.logger.log(`🔗 Generating QR code for certificate: ${certificateId}`);

    try {
      const certificate = await this.getCertificateById(certificateId);

      if (!certificate.transaction_hash) {
        throw new Error('Certificate must have transaction_hash before generating QR');
      }

      // Generar QR con solo el transaction_hash
      const qrBuffer = await this.qrService.generateCertificateQR(
        certificateId,
        certificate.transaction_hash
      );

      // Subir QR a Pinata usando PinataService
      this.logger.log(`🔗 Uploading QR code to Pinata...`);
      const qrUpload = await this.pinataService.uploadFile(qrBuffer, {
        name: `certificate-qr-${certificateId}.png`,
        keyvalues: {
          certificate_id: certificateId,
          type: 'qr_code',
          student_name: certificate.student_name
        }
      });

      const gatewayUrl = this.configService.get('PINATA_GATEWAY_URL') || 'https://gateway.pinata.cloud';
      const qrUrl = `${gatewayUrl}/ipfs/${qrUpload.cid}`;

      // Actualizar QR URL en BD
      await this.updateQRUrl(certificateId, qrUrl);

      this.logger.log(`✅ QR code generated and uploaded: ${qrUrl}`);
      return qrUrl;
    } catch (error) {
      this.logger.error(`❌ Error generating QR code: ${error.message}`);
      throw error;
    }
  }

  // 🛠️ MÉTODOS AUXILIARES

  async getCertificateById(certificateId: string): Promise<Certificate> {
    this.logger.log(`🔍 Getting certificate: ${certificateId}`);

    try {
      const { data, error } = await this.supabaseService.client
        .from('certificates')
        .select('*')
        .eq('id', certificateId)
        .single();

      if (error || !data) {
        throw new NotFoundException(`Certificate ${certificateId} not found`);
      }

      this.logger.log(`✅ Certificate found: ${data.student_name}`);
      return data;
    } catch (error) {
      this.logger.error(`❌ Error getting certificate: ${error.message}`);
      throw error;
    }
  }

  private async updateCertificateHashes(certificateId: string, imageHash: string, metadataHash: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('certificates')
      .update({
        image_hash: imageHash,
        metadata_hash: metadataHash,
      })
      .eq('id', certificateId);

    if (error) {
      throw new Error(`Failed to update certificate hashes: ${error.message}`);
    }

    this.logger.log(`✅ Certificate hashes updated: ${certificateId}`);
  }

  private async updateTransactionHash(certificateId: string, transactionHash: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('certificates')
      .update({
        transaction_hash: transactionHash,
      })
      .eq('id', certificateId);

    if (error) {
      throw new Error(`Failed to update transaction hash: ${error.message}`);
    }

    this.logger.log(`✅ Transaction hash updated: ${certificateId}`);
  }

  private async updateQRUrl(certificateId: string, qrUrl: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('certificates')
      .update({
        qr_url: qrUrl,
      })
      .eq('id', certificateId);

    if (error) {
      throw new Error(`Failed to update QR URL: ${error.message}`);
    }

    this.logger.log(`✅ QR URL updated: ${certificateId}`);
  }

  private generateMetadata(certificate: Certificate, institutionName: string): CertificateMetadata {
    return {
      id: certificate.id,
      description: certificate.description,
      student_name: certificate.student_name,
      institution_name: institutionName,
      issued_at: certificate.issued_at,
      expiration_date: certificate.expiration_date,
      certificate_type: 'Digital Certificate',
      blockchain: 'avalanche',
      api_version: '2.0.0',
      created_at: new Date().toISOString(),
    };
  }

  // 🔍 MÉTODO PARA VALIDACIÓN
  async validateCertificate(certificateId: string): Promise<any> {
    this.logger.log(`🔍 Validating certificate: ${certificateId}`);

    try {
      const certificate = await this.getCertificateById(certificateId);

      const validation = {
        certificate_id: certificateId,
        valid: true,
        database_check: true,
        pinata_check: !!(certificate.image_hash && certificate.metadata_hash),
        avalanche_check: !!certificate.transaction_hash,
        qr_generated: !!certificate.qr_url,
        student_name: certificate.student_name,
        issued_at: certificate.issued_at,
        verification_url: `${this.configService.get('FRONTEND_URL')}/verify/${certificateId}`,
        verified_at: new Date().toISOString(),
      };

      this.logger.log(`✅ Certificate validation completed`);
      return validation;
    } catch (error) {
      this.logger.error(`❌ Error validating certificate: ${error.message}`);
      return {
        certificate_id: certificateId,
        valid: false,
        error: error.message,
        verified_at: new Date().toISOString(),
      };
    }
  }

  // 📊 MÉTODO PARA OBTENER ESTADO DEL CERTIFICADO
  async getCertificateStatus(certificateId: string): Promise<any> {
    const certificate = await this.getCertificateById(certificateId);
    
    return {
      certificate_id: certificateId,
      student_name: certificate.student_name,
      progress: {
        basic_created: true,
        uploaded_to_pinata: !!(certificate.image_hash && certificate.metadata_hash),
        sent_to_avalanche: !!certificate.transaction_hash,
        qr_generated: !!certificate.qr_url,
      },
      urls: {
        image_url: certificate.image_hash ? `${this.configService.get('PINATA_GATEWAY_URL')}/ipfs/${certificate.image_hash}` : null,
        metadata_url: certificate.metadata_hash ? `${this.configService.get('PINATA_GATEWAY_URL')}/ipfs/${certificate.metadata_hash}` : null,
        qr_url: certificate.qr_url,
      },
      avalanche: {
        transaction_hash: certificate.transaction_hash,
      },
    };
  }
}
