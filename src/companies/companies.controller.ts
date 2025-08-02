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
    description: 'Creates a new institution and its owner user in a single atomic transaction. This is the ONLY endpoint to create new users in the system.' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Institution and owner created successfully',
    example: {
      user: {
        id: 'uuid',
        email: 'owner@institution.com',
        full_name: 'John Doe',
        role: 'admin'
      },
      institution: {
        id: 'uuid',
        name: 'Educational Institution',
        legal_id: '12345678',
        email_institucional: 'contact@institution.edu'
      },
      message: 'Institution and owner created successfully'
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email or legal ID already exists' })
  async createCompanyWithOwner(@Body() createCompanyDto: CreateCompanyWithOwnerDto) {
    return await this.companiesService.createCompanyWithOwner(createCompanyDto);
  }

  @Get()
  @UseGuards(JwtCookieAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all institutions (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all institutions' })
  async getAllCompanies() {
    const result = await this.companiesService.getAllCompanies();
    return result.rows;
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
