import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';
// Importamos los guards y decoradores de auth
import { JwtCookieAuthGuard } from '../auth/guards/jwt-cookie-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { CertificatesService } from './certificates.service';
import type { CreateCertificateDto } from './certificates.service';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  private readonly logger = new Logger(CertificatesController.name);

  constructor(private readonly certificatesService: CertificatesService) {}

  // ========================================
  // � ENDPOINT PRINCIPAL - CREACIÓN AUTOMÁTICA
  // ========================================

  @Post('create-complete')
  // @UseGuards(JwtCookieAuthGuard, RolesGuard) // Temporalmente comentado para testing
  // @Roles('admin', 'owner') // Temporalmente comentado para testing
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ 
    summary: 'Crear certificado completo automáticamente',
    description: 'Crea un certificado completo en un solo paso: básico → Pinata → Avalanche → QR.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Datos del certificado e imagen',
    schema: {
      type: 'object',
      properties: {
        course_name: { type: 'string', example: 'Certificado de Especialización en Blockchain' },
        recipient_name: { type: 'string', example: 'Juan Pérez García' },
        institute_id: { type: 'string', example: 'a61fbe42-db63-4b1d-853f-bebb56fae790' },
        issued_at: { type: 'string', format: 'date-time', example: '2025-01-15T00:00:00.000Z' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Imagen del certificado (requerida)'
        }
      },
      required: ['course_name', 'recipient_name', 'institute_id', 'issued_at', 'image']
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Certificado completo creado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        certificate_id: { type: 'string' },
        certificate: { type: 'object' },
        pinata: { type: 'object' },
        avalanche: { type: 'object' },
        qr_url: { type: 'string' },
        urls: { type: 'object' }
      }
    }
  })
  @ApiResponse({ 
    status: 206, 
    description: 'Certificado básico creado, pero falló algún paso posterior. Se puede continuar manualmente.'
  })
  async createCompleteCertificate(
    @Body() createDto: CreateCertificateDto,
    @UploadedFile() file: Express.Multer.File,
    // @GetUser() user?: any, // Temporalmente comentado para testing
  ) {
    const user = { email: 'test@example.com' }; // Usuario temporal para testing
    this.logger.log(`Creating complete certificate for: ${createDto.recipient_name} (by user: ${user?.email})`);

    if (!file) {
      throw new HttpException(
        {
          success: false,
          message: 'Image file is required for automatic certificate creation',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const result = await this.certificatesService.createCompleteCertificate(createDto, file.buffer);

      if (result.success) {
        this.logger.log(`🎉 Complete certificate created successfully: ${result.certificate_id} by user: ${user?.email}`);
        return {
          ...result,
          created_by: user?.email,
          creation_type: 'automatic',
        };
      } else {
        // Certificado básico creado, pero falló algún paso
        this.logger.warn(`⚠️ Partial certificate creation: ${result.certificate_id} by user: ${user?.email}. Error: ${result.error}`);
        return {
          ...result,
          created_by: user?.email,
          creation_type: 'automatic_partial',
          message: 'Certificate was partially created. Check the progress details.',
        };
      }

    } catch (error) {
      this.logger.error(`❌ Error in automatic certificate creation: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to create complete certificate',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ========================================
  // 🌐 ENDPOINTS PÚBLICOS (No requieren autenticación)
  // ========================================

  @Get('health')
  @ApiOperation({ summary: 'Health check del servicio de certificados' })
  async healthCheck() {
    this.logger.log(`🏥 Health check for certificates service`);
    
    return {
      success: true,
      service: 'certificates',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      endpoints: {
        create: 'POST /certificates/create-complete - Create complete certificate automatically',
        get: 'GET /certificates/:id - Get certificate by ID',
        status: 'GET /certificates/:id/status - Get certificate status',
        validate: 'GET /certificates/:id/validate - Validate certificate',
        health: 'GET /certificates/health - Health check',
      },
      features: {
        automatic_creation: 'enabled',
        pinata: 'enabled',
        avalanche: 'enabled',
        qr_generation: 'enabled',
        authentication: 'jwt-cookie (temporary disabled)',
        authorization: 'role-based (admin, owner)',
      },
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener certificado por ID',
    description: 'Obtiene la información completa de un certificado específico.'
  })
  async getCertificate(@Param('id') id: string) {
    this.logger.log(`🔍 Getting certificate: ${id}`);

    try {
      const certificate = await this.certificatesService.getCertificateById(id);

      return {
        success: true,
        data: certificate,
      };
    } catch (error) {
      this.logger.error(`❌ Error getting certificate: ${error.message}`);
      
      if (error.status === 404) {
        throw new HttpException(
          {
            success: false,
            message: 'Certificate not found',
            error: error.message,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        {
          success: false,
          message: 'Failed to get certificate',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/status')
  @ApiOperation({ 
    summary: 'Obtener estado del certificado',
    description: 'Obtiene el progreso y estado actual del proceso de creación del certificado.'
  })
  async getCertificateStatus(@Param('id') id: string) {
    this.logger.log(`📊 Getting certificate status: ${id}`);

    try {
      const status = await this.certificatesService.getCertificateStatus(id);

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error(`❌ Error getting certificate status: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get certificate status',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/validate')
  @ApiOperation({ 
    summary: 'Validar certificado',
    description: 'Valida la integridad y autenticidad de un certificado.'
  })
  async validateCertificate(@Param('id') id: string) {
    this.logger.log(`🔍 Validating certificate: ${id}`);

    try {
      const validation = await this.certificatesService.validateCertificate(id);

      return {
        success: validation.valid,
        data: validation,
      };
    } catch (error) {
      this.logger.error(`❌ Error validating certificate: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to validate certificate',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
