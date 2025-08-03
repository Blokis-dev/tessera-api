import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyWithOwnerDto } from './dto/create-company.dto';
import { JwtCookieAuthGuard } from '../auth/guards/jwt-cookie-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post('create-with-owner')
  @ApiOperation({ 
    summary: 'Create institution with owner (ONLY way to create users)',
    description: 'Creates a new institution and its owner user in a single atomic transaction. This is the ONLY endpoint to create new users in the system. A temporary password is automatically generated for the owner.' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Institution and owner created successfully with auto-generated temporary password',
    example: {
      user: {
        id: 'uuid',
        email: 'owner@institution.com',
        full_name: 'John Doe',
        role: 'owner',
        first_time_login: true
      },
      institution: {
        id: 'uuid',
        name: 'Educational Institution',
        legal_id: '12345678',
        email_institucional: 'contact@institution.edu'
      },
      temporary_password: 'Casa-Luna-123',
      message: 'Institution and owner created successfully. Temporary password: Casa-Luna-123',
      important_notice: 'The user must change this password on first login. Please communicate this password securely to the user.'
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email or legal ID already exists' })
  async createCompanyWithOwner(@Body() createCompanyDto: CreateCompanyWithOwnerDto) {
    return await this.companiesService.createCompanyWithOwner(createCompanyDto);
  }

  @Get('public/institutions')
  @ApiOperation({ 
    summary: 'Get all institutions - Public endpoint',
    description: 'Returns a list of all institutions with basic information. No authentication required.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all institutions',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        total: { type: 'number' },
        institutions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              legal_id: { type: 'string' },
              email_institucional: { type: 'string' },
              website: { type: 'string' },
              description: { type: 'string' },
              logo_url: { type: 'string' },
              status: { type: 'string' },
              created_at: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @Get()
  // @UseGuards(JwtCookieAuthGuard, RolesGuard) // Temporalmente deshabilitado para pruebas
  // @Roles('admin') // Temporalmente deshabilitado para pruebas
  // @ApiBearerAuth() // Temporalmente deshabilitado para pruebas
  @ApiOperation({ summary: 'Get all institutions (No auth required - Testing)' })
  @ApiResponse({ status: 200, description: 'List of all institutions' })
  async getAllCompanies() {
    const result = await this.companiesService.getAllCompanies();
    return result.rows;
  }

  @Get('public/institutions')
  @ApiOperation({ 
    summary: 'Get all institutions - Public endpoint',
    description: 'Returns a list of all institutions with basic information. No authentication required.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all institutions',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        total: { type: 'number' },
        institutions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              legal_id: { type: 'string' },
              email_institucional: { type: 'string' },
              website: { type: 'string' },
              description: { type: 'string' },
              logo_url: { type: 'string' },
              status: { type: 'string' },
              created_at: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getPublicInstitutions() {
    const result = await this.companiesService.getAllInstitutions();
    return {
      success: true,
      total: result.length,
      institutions: result
    };
  }

  @Get(':id')
  @UseGuards(JwtCookieAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get institution by ID' })
  @ApiResponse({ status: 200, description: 'Institution details' })
  @ApiResponse({ status: 404, description: 'Institution not found' })
  async getCompanyById(@Param('id') id: string) {
    return await this.companiesService.findCompanyById(id);
  }
}
