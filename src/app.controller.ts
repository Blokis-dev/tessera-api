import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { Roles } from './auth/decorators/roles.decorator';
import { GetUser } from './auth/decorators/get-user.decorator';

@ApiTags('general')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Endpoint de prueba público' })
  @ApiResponse({ status: 200, description: 'Mensaje de bienvenida' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Estado de salud de la aplicación y base de datos' })
  @ApiResponse({ status: 200, description: 'Estado de salud del sistema' })
  async getHealth() {
    const dbStatus = await this.databaseService.testConnection();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Endpoint protegido que requiere autenticación' })
  @ApiResponse({ status: 200, description: 'Mensaje personalizado para usuario autenticado' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido o faltante' })
  getProtected(@GetUser() user: any): string {
    return `Hello ${user.email}, this is a protected route!`;
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Endpoint solo para administradores' })
  @ApiResponse({ status: 200, description: 'Mensaje para administradores' })
  @ApiResponse({ status: 401, description: 'Token JWT inválido o faltante' })
  @ApiResponse({ status: 403, description: 'Acceso denegado - rol insuficiente' })
  getAdminOnly(@GetUser() user: any): string {
    return `Hello admin ${user.email}!`;
  }
}
