import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { QrService } from '../qr/qr.service';
import { PinataService } from '../ipfs/pinata.service';
import { randomUUID } from 'crypto';

// Nuevas interfaces según tu flujo
export interface CreateCertificateDto {
  course_name: string;
  recipient_name: string;
  institute_id: string;
  issued_at: string;
}

export interface CertificateMetadata {
  id: string;
  course_name: string;
  recipient_name: string;
  institution_name: string;
  issued_at: string;
  certificate_type: string;
  blockchain: string;
  api_version: string;
  created_at: string;
  image?: string;
  external_url?: string;
  name?: string;
  description?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
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
  avalanche?: {
    transaction_hash: string;
    block_number?: number;
    gas_used?: string;
    contract_address?: string;
    network?: string;
  };
  arbitrum?: {
    transaction_hash: string;
    block_number?: number;
    gas_used?: string;
    contract_address?: string;
    network?: string;
  };
}

export interface Certificate {
  id: string;
  recipient_name: string;
  course_name: string;
  institute_id: string;
  issued_at: string;
  image_hash?: string;
  metadata_hash?: string;
  transaction_hash?: string;
  arbitrum_hash?: string;
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
    this.logger.log(`🎓 Creating basic certificate for: ${createDto.recipient_name}`);

    try {
      const certificateId = randomUUID();
      
      const certificateRecord = {
        id: certificateId,
        recipient_name: createDto.recipient_name,
        course_name: createDto.course_name,
        institute_id: createDto.institute_id,
        issued_at: createDto.issued_at,
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
        .eq('id', certificate.institute_id)
        .single();
  const gatewayUrlRaw = this.configService.get('PINATA_GATEWAY_URL') || 'https://gateway.pinata.cloud';
  const gatewayUrl = this.ensureHttpUrl(gatewayUrlRaw).replace(/\/+$/, '');
  const publicGatewayRaw = this.configService.get('PUBLIC_IPFS_GATEWAY') || gatewayUrl;
  const publicGatewayUrl = this.ensureHttpUrl(publicGatewayRaw).replace(/\/+$/, '');
  const frontendRaw = this.configService.get('FRONTEND_URL') || '';
  const frontendUrl = frontendRaw ? this.ensureHttpUrl(frontendRaw).replace(/\/+$/, '') : '';

      // 1. Subir imagen a Pinata usando PinataService
      this.logger.log(`🖼️ Uploading certificate image...`);
      const imageUpload = await this.pinataService.uploadFile(imageBuffer, {
        name: `certificate-${certificateId}.png`,
        keyvalues: {
          certificate_id: certificateId,
          type: 'image',
          recipient_name: certificate.recipient_name
        }
      });

      this.logger.log(`✅ Image uploaded to Pinata: ${imageUpload.cid}`);

      // Generar metadata incluyendo la URL de la imagen para compatibilidad con explorers
  const imageUrl = `${gatewayUrl}/ipfs/${imageUpload.cid}`;
  const imageUrlPublic = `${publicGatewayUrl}/ipfs/${imageUpload.cid}`;
      const metadataObj = this.generateMetadata(certificate, institution?.name || 'Unknown Institution');
  // Usar gateway público en el campo image del metadata para mayor compatibilidad
  metadataObj.image = imageUrlPublic;
      if (frontendUrl) {
        metadataObj.external_url = `${frontendUrl}/certificate/${certificateId}`;
      }

      // 2. Subir metadatos a Pinata usando PinataService
      this.logger.log(`📄 Uploading certificate metadata...`);
      const metadataUpload = await this.pinataService.uploadJSON(metadataObj, {
        name: `certificate-metadata-${certificateId}.json`,
        keyvalues: {
          certificate_id: certificateId,
          type: 'metadata',
          recipient_name: certificate.recipient_name
        }
      });

      this.logger.log(`✅ Metadata uploaded to Pinata: ${metadataUpload.cid}`);

  const response: PinataUploadResponse = {
        image_hash: imageUpload.cid,
        metadata_hash: metadataUpload.cid,
        image_url: imageUrl,
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

      // Obtener información completa de la institución
      const { data: institution, error: institutionError } = await this.supabaseService.client
        .from('institutions')
        .select('*')
        .eq('id', certificate.institute_id)
        .single();

      if (institutionError || !institution) {
        throw new Error(`Institution not found: ${institutionError?.message}`);
      }

      // Intentar obtener datos del usuario (estudiante) por nombre
      // Como no tenemos relación directa, buscamos por recipient_name en la tabla users
      const { data: studentUser, error: studentError } = await this.supabaseService.client
        .from('users')
        .select('*')
        .eq('full_name', certificate.recipient_name)
        .eq('institution_id', certificate.institute_id)
        .single();

      // Si no encontramos al usuario, usamos valores por defecto pero mantenemos el nombre real
      let studentData;
      if (studentUser && !studentError) {
        studentData = {
          id: studentUser.id,
          email: studentUser.email,
          full_name: studentUser.full_name,
          wallet_address: "0xEe1001B535826EDc4247E7f3a024dDc145A20bdb" // Hardcodeado para MVP
        };
        this.logger.log(`👤 Student found in DB: ${studentUser.full_name} (${studentUser.email})`);
      } else {
        // Usuario no encontrado en BD, usar valores por defecto
        studentData = {
          id: "550e8400-e29b-41d4-a716-446655440000", // ID por defecto para MVP
          email: "estudiante@email.com", // Email por defecto para MVP
          full_name: certificate.recipient_name, // Usar nombre del certificado
          wallet_address: "0xEe1001B535826EDc4247E7f3a024dDc145A20bdb" // Hardcodeado para MVP
        };
        this.logger.log(`👤 Student not found in DB, using defaults for: ${certificate.recipient_name}`);
      }

      const gatewayUrl = this.configService.get('PINATA_GATEWAY_URL') || 'https://gateway.pinata.cloud';
      const frontendUrl = this.configService.get('FRONTEND_URL') || '';

      // Preparar datos para Avalanche blockchain con formato exacto requerido
      const avalancheData = {
        student: studentData,
        certificate: {
          title: `Certificado de Finalización - ${certificate.course_name}`, // Dinámico
          description: "Certificado que acredita la finalización exitosa del curso", // Hardcodeado MVP
          course_name: certificate.course_name, // Dinámico desde BD
          issued_at: new Date(certificate.issued_at).toISOString(), // Dinámico convertido a ISO
          grade: "A+", // Hardcodeado para MVP
          credits: 10 // Hardcodeado para MVP
        },
        institution: {
          id: institution.id, // Dinámico desde BD
          name: institution.name || "Blokis Academy", // Dinámico o fallback
          legal_id: institution.legal_id || "RUC-20123456789", // Dinámico o fallback MVP
          address: "Ciudad de México, México", // Hardcodeado para MVP
          website: institution.website || "https://blokis.com/" // Dinámico o fallback MVP
        },
        ipfs: {
          image_hash: certificate.image_hash, // Dinámico desde BD - Requerido
          metadata_hash: certificate.metadata_hash, // Dinámico desde BD - Requerido
          image_url: `${gatewayUrl}/ipfs/${certificate.image_hash}`,
          metadata_url: `${gatewayUrl}/ipfs/${certificate.metadata_hash}`,
          token_uri: `${gatewayUrl}/ipfs/${certificate.metadata_hash}`,
          front_end_url: frontendUrl ? `${frontendUrl}/certificate/${certificate.id}` : undefined,
        }
      };

      this.logger.log(`📤 Sending to Avalanche blockchain...`);
      this.logger.log(`🎓 Student: ${avalancheData.student.full_name}`);
      this.logger.log(`📜 Course: ${avalancheData.certificate.course_name}`);
      this.logger.log(`🏢 Institution: ${avalancheData.institution.name}`);

      // Log del JSON que se va a enviar (para debugging)
      this.logger.log(`📤 JSON a enviar a Avalanche:`);
      this.logger.log(JSON.stringify(avalancheData, null, 2));

      // VALIDACIÓN PRE-MINT: verificar que el metadata_url y la image_url sean accesibles
      try {
        const metadataUrl = `${gatewayUrl}/ipfs/${certificate.metadata_hash}`;
        this.logger.log(`🔎 Validating metadata URL: ${metadataUrl}`);
        const metaResp = await fetch(metadataUrl, { method: 'GET' });
        if (!metaResp.ok) {
          const text = await metaResp.text().catch(() => 'no body');
          this.logger.error(`❌ Metadata URL not accessible: ${metaResp.status} - ${text}`);
          throw new Error(`Metadata URL not accessible: ${metadataUrl}`);
        }

        const metaJson = await metaResp.json().catch(() => null);
        if (!metaJson || !metaJson.image) {
          this.logger.error(`❌ Metadata JSON missing 'image' field or invalid JSON: ${metadataUrl}`);
          throw new Error('Metadata JSON missing required "image" field');
        }

        const imageUrl = metaJson.image.startsWith('http') ? metaJson.image : `${gatewayUrl}/ipfs/${metaJson.image}`;
        this.logger.log(`🔎 Validating image URL: ${imageUrl}`);
        const imgResp = await fetch(imageUrl, { method: 'GET' });
        if (!imgResp.ok) {
          this.logger.error(`❌ Image URL not accessible: ${imgResp.status}`);
          throw new Error(`Image URL not accessible: ${imageUrl}`);
        }

        const contentType = imgResp.headers.get('content-type') || '';
        if (!contentType.startsWith('image/')) {
          this.logger.error(`❌ Image URL content-type is not image/*: ${contentType}`);
          throw new Error(`Image URL does not return image content-type: ${contentType}`);
        }

        this.logger.log(`✅ Metadata and image validated successfully`);
      } catch (validationError) {
        this.logger.error(`❌ Pre-mint validation failed: ${validationError.message}`);
        throw validationError;
      }

      // Enviar a la API de Avalanche (sin Authorization por ahora)
      const response = await fetch('https://tessera-blockchain.blokislabs.com/api/certificates/mint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(avalancheData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`❌ Avalanche API error: ${response.status} - ${errorText}`);
        this.logger.error(`❌ Request URL: https://tessera-blockchain.blokislabs.com/api/certificates/mint`);
        this.logger.error(`❌ Request body: ${JSON.stringify(avalancheData, null, 2)}`);
        throw new Error(`Avalanche API failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      this.logger.log(`⛷️  Avalanche response: ${JSON.stringify(result, null, 2)}`);

      // Extraer transaction_hash de la respuesta - estructura anidada de Avalanche
      let transactionHash;
      
      // La API devuelve una estructura anidada: result.data.avalanche.data.transaction_hash
      if (result.data && result.data.avalanche && result.data.avalanche.data) {
        transactionHash = result.data.avalanche.data.transaction_hash;
      } else if (result.data && result.data.arbitrum && result.data.arbitrum.data) {
        // Fallback a Arbitrum si Avalanche no está disponible
        transactionHash = result.data.arbitrum.data.transaction_hash;
      } else {
        // Buscar en la estructura plana por compatibilidad
        transactionHash = result.transaction_hash || result.hash || result.txHash || result.tx_hash || result.transactionHash;
      }
      
      this.logger.log(`🔍 Looking for transaction hash in response:`);
      this.logger.log(`  - result.data.avalanche.data.transaction_hash: ${result.data?.avalanche?.data?.transaction_hash}`);
      this.logger.log(`  - result.data.arbitrum.data.transaction_hash: ${result.data?.arbitrum?.data?.transaction_hash}`);
      this.logger.log(`  - result.transaction_hash: ${result.transaction_hash}`);
      this.logger.log(`  - Final transactionHash: ${transactionHash}`);
      
      if (!transactionHash) {
        this.logger.error(`❌ Full Avalanche response object: ${JSON.stringify(result, null, 2)}`);
        throw new Error('No transaction hash received from Avalanche API');
      }

      // Actualizar transaction_hash en BD (usar el de Avalanche como principal)
      await this.updateTransactionHash(certificateId, transactionHash);

      this.logger.log(`✅ Certificate ${certificateId} sent to Avalanche successfully`);
      
  // Construir respuesta con información de ambas redes si están disponibles
      const avalancheResponse: AvalancheResponse = {
        transaction_hash: transactionHash,
      };

      // Información de Avalanche
      if (result.data?.avalanche?.data) {
        const avalancheData = result.data.avalanche.data;
        avalancheResponse.avalanche = {
          transaction_hash: avalancheData.transaction_hash,
          block_number: avalancheData.block_number,
          gas_used: avalancheData.gas_used,
          contract_address: avalancheData.contract_address,
          network: avalancheData.network,
        };
      }

      // Información de Arbitrum
      if (result.data?.arbitrum?.data) {
        const arbitrumData = result.data.arbitrum.data;
        avalancheResponse.arbitrum = {
          transaction_hash: arbitrumData.transaction_hash,
          block_number: arbitrumData.block_number,
          gas_used: arbitrumData.gas_used,
          contract_address: arbitrumData.contract_address,
          network: arbitrumData.network,
        };
        // Guardar el hash de Arbitrum en la BD (nueva columna arbitrum_hash)
        if (arbitrumData.transaction_hash) {
          await this.updateArbitrumHash(certificateId, arbitrumData.transaction_hash);
          this.logger.log(`✅ Arbitrum hash stored for certificate ${certificateId}: ${arbitrumData.transaction_hash}`);
        }
      }

      return avalancheResponse;
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

      // Build a frontend verification URL and encode it into the QR so the
      // frontend can call /api/certificates/{id}/validate and render the data.
      const frontendRaw = this.configService.get('FRONTEND_URL') || '';
      const frontendUrl = frontendRaw ? this.ensureHttpUrl(frontendRaw).replace(/\/+$/, '') : '';
      const verificationUrl = frontendUrl ? `${frontendUrl}/verify/${certificateId}` : `/verify/${certificateId}`;

      // Generate QR that encodes the verification URL (frontend will fetch validation data)
      const qrBuffer = await this.qrService.generateCustomQR(verificationUrl);

      // Subir QR a Pinata usando PinataService
      this.logger.log(`🔗 Uploading QR code to Pinata...`);
      const qrUpload = await this.pinataService.uploadFile(qrBuffer, {
        name: `certificate-qr-${certificateId}.png`,
        keyvalues: {
          certificate_id: certificateId,
          type: 'qr_code',
          recipient_name: certificate.recipient_name
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

  // 🎯 MÉTODO AUTOMÁTICO: Crear certificado completo en un solo paso
  async createCompleteCertificate(createDto: CreateCertificateDto, imageBuffer: Buffer): Promise<any> {
    this.logger.log(`🚀 Starting automatic certificate creation for: ${createDto.recipient_name}`);

    try {
      // PASO 1: Crear certificado básico
      this.logger.log(`📝 Step 1/4: Creating basic certificate...`);
      const certificate = await this.createBasicCertificate(createDto);
      const certificateId = certificate.id;

      const progress = {
        certificate_id: certificateId,
        recipient_name: createDto.recipient_name,
        current_step: '',
        error: null,
        completed_at: null,
      };

      try {
        // PASO 2: Subir a Pinata
        this.logger.log(`📤 Step 2/4: Uploading to Pinata...`);
        progress.current_step = 'Uploading to Pinata';
        const pinataResult = await this.uploadToPinata(certificateId, imageBuffer);
        // PASO 3: Enviar a Avalanche
        this.logger.log(`⛷️ Step 3/4: Sending to Avalanche...`);
        progress.current_step = 'Sending to Avalanche';
        const avalancheResult = await this.sendToAvalanche(certificateId);
        // PASO 4: Generar QR
        this.logger.log(`🔗 Step 4/4: Generating QR code...`);
        progress.current_step = 'Generating QR code';
  // Construir la URL de verificación frontend y generar un QR que la encodifique.
  const frontendRaw = this.configService.get('FRONTEND_URL') || '';
  const frontendUrl = frontendRaw ? this.ensureHttpUrl(frontendRaw).replace(/\/+$/, '') : '';
  const verificationUrl = frontendUrl ? `${frontendUrl}/verify/${certificateId}` : `/verify/${certificateId}`;
  // Generar QR con la URL de verificación (el frontend llamará a /api/certificates/{id}/validate)
  const qrBuffer = await this.qrService.generateCustomQR(verificationUrl);
        // Subir QR a Pinata
        const gatewayUrl = this.configService.get('PINATA_GATEWAY_URL') || 'https://gateway.pinata.cloud';
        const qrUpload = await this.pinataService.uploadFile(qrBuffer, {
          name: `certificate-qr-${certificateId}.png`,
          keyvalues: {
            certificate_id: certificateId,
            type: 'qr_code',
            recipient_name: certificate.recipient_name
          }
        });
        const qrUrl = `${gatewayUrl}/ipfs/${qrUpload.cid}`;
        await this.updateQRUrl(certificateId, qrUrl);

        // Obtener certificado final completo
        const finalCertificate = await this.getCertificateById(certificateId);

        // Reconstruir URLs de explorers a partir del resultado de mint
        const blockchainAvalancheUrl = avalancheResult?.avalanche?.transaction_hash
          ? `https://testnet.snowtrace.io/tx/${avalancheResult.avalanche.transaction_hash}`
          : null;
        const blockchainArbitrumUrl = avalancheResult?.arbitrum?.transaction_hash
          ? `https://sepolia.arbiscan.io/tx/${avalancheResult.arbitrum.transaction_hash}`
          : null;

        this.logger.log(`🎉 Certificate creation completed successfully: ${certificateId}`);

        // Helper para limpiar doble slash en URLs
        const cleanUrl = (url: string) => url.replace(/([^:]\/)\/+/, '$1');

        return {
          success: true,
          certificate_id: certificateId,
          certificate: finalCertificate,
          pinata: pinataResult,
          avalanche: avalancheResult,
          qr_url: qrUrl,
          progress: {
            certificate_id: certificateId,
            recipient_name: createDto.recipient_name,
            current_step: 'Completed',
            error: null,
            completed_at: new Date().toISOString(),
          },
          urls: {
            certificate_view: cleanUrl(`${this.configService.get('FRONTEND_URL')}/certificate/${certificateId}`),
            verification: cleanUrl(`${this.configService.get('FRONTEND_URL')}/verify/${certificateId}`),
            image: pinataResult.image_url,
            metadata: pinataResult.metadata_url,
            qr: verificationUrl,
            blockchain_avalanche_url: blockchainAvalancheUrl,
            blockchain_arbitrum_url: blockchainArbitrumUrl,
          },
        };

      } catch (stepError) {
        // Si falla algún paso, marcar el error pero mantener el certificado básico
        this.logger.error(`❌ Error in automatic creation at step "${progress.current_step}": ${stepError.message}`);
        
        // Obtener estado actual del certificado
        const currentStatus = await this.getCertificateStatus(certificateId);
        
        return {
          success: false,
          certificate_id: certificateId,
          error: stepError.message,
          progress: {
            ...progress,
            error: stepError.message,
            failed_at: new Date().toISOString(),
          },
          current_status: currentStatus,
          message: `Certificate basic creation succeeded, but failed at: ${progress.current_step}. You can continue manually using individual endpoints.`,
        };
      }

    } catch (error) {
      this.logger.error(`❌ Error in automatic certificate creation: ${error.message}`);
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

  // Guardar el hash de Arbitrum en la nueva columna arbitrum_hash de certificates
  private async updateArbitrumHash(certificateId: string, arbitrumHash: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('certificates')
      .update({
        arbitrum_hash: arbitrumHash,
      })
      .eq('id', certificateId);

    if (error) {
      throw new Error(`Failed to update Arbitrum hash: ${error.message}`);
    }

    this.logger.log(`✅ Arbitrum hash updated: ${certificateId}`);
  }

  // Ensure URLs include http/https scheme; if missing, prefix with https://
  private ensureHttpUrl(url: string): string {
    if (!url) return url;
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  private generateMetadata(certificate: Certificate, institutionName: string): CertificateMetadata {
    const name = `Certificado - ${certificate.recipient_name}`;
    const description = `Certificado de ${certificate.course_name} emitido por ${institutionName}`;
    const attributes = [
      { trait_type: 'Recipient', value: certificate.recipient_name },
      { trait_type: 'Course', value: certificate.course_name },
      { trait_type: 'Institution', value: institutionName },
      { trait_type: 'Issued At', value: certificate.issued_at },
    ];

    return {
      id: certificate.id,
      name,
      description,
      course_name: certificate.course_name,
      recipient_name: certificate.recipient_name,
      institution_name: institutionName,
      issued_at: certificate.issued_at,
      certificate_type: 'Digital Certificate',
      blockchain: 'avalanche',
      api_version: '2.0.0',
      created_at: new Date().toISOString(),
      attributes,
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
        arbitrum_check: !!certificate.arbitrum_hash,
        recipient_name: certificate.recipient_name,
        issued_at: certificate.issued_at,
        // Normalize FRONTEND_URL to avoid double slashes and build verification URL
        verification_url: (() => {
          const gatewayUrl = this.configService.get('PINATA_GATEWAY_URL') || 'https://gateway.pinata.cloud';
          const frontendRaw = this.configService.get('FRONTEND_URL') || '';
          const frontendUrl = frontendRaw ? this.ensureHttpUrl(frontendRaw).replace(/\/+$/, '') : '';
          return frontendUrl ? `${frontendUrl}/verify/${certificateId}` : `/verify/${certificateId}`;
        })(),
        // IPFS and blockchain links
        image_url: certificate.image_hash ? `${this.configService.get('PINATA_GATEWAY_URL') || 'https://gateway.pinata.cloud'}/ipfs/${certificate.image_hash}` : null,
        metadata_url: certificate.metadata_hash ? `${this.configService.get('PINATA_GATEWAY_URL') || 'https://gateway.pinata.cloud'}/ipfs/${certificate.metadata_hash}` : null,
        avalanche_explorer_url: certificate.transaction_hash ? `https://testnet.snowtrace.io/tx/${certificate.transaction_hash}` : null,
        arbitrum_explorer_url: certificate.arbitrum_hash ? `https://sepolia.arbiscan.io/tx/${certificate.arbitrum_hash}` : null,
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
      recipient_name: certificate.recipient_name,
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
