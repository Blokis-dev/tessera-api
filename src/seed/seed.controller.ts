import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SeedService } from './seed.service';

@ApiTags('seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear usuarios de prueba (solo admins)' })
  @ApiResponse({ status: 201, description: 'Usuarios de prueba creados' })
  async seedUsers() {
    return this.seedService.seedUsers();
  }

  @Post('institutions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear instituciones de prueba (solo admins)' })
  @ApiResponse({ status: 201, description: 'Instituciones de prueba creadas' })
  async seedInstitutions() {
    return this.seedService.seedInstitutions();
  }

  @Post('all')
  @ApiOperation({ summary: 'Crear todos los datos de prueba (público para testing)' })
  @ApiResponse({ status: 201, description: 'Todos los datos de prueba creados' })
  async seedAll() {
    return this.seedService.seedAll();
  }
}
