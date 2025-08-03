import { Controller, Post, Body, HttpException, HttpStatus, Get, UseGuards, Request, Response, Res, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtCookieAuthGuard } from './guards/jwt-cookie-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { FirstTimeLoginDto, ChangePasswordDto } from './dto/password-change.dto';
import type { LoginDto } from './auth.service';
import type { Response as ExpressResponse } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ 
    summary: 'Iniciar sesión con cookies',
    description: 'Login que establece el JWT en una cookie HttpOnly segura'
  })
  @ApiBody({
    description: 'Credenciales de usuario',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          example: 'admin@tessera.com',
        },
        password: {
          type: 'string',
          example: 'admin123',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Login exitoso - JWT establecido en cookie',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-string' },
            email: { type: 'string', example: 'admin@tessera.com' },
            full_name: { type: 'string', example: 'Administrador' },
            role: { type: 'string', example: 'admin' },
            institution_id: { type: 'string', example: 'uuid-string' },
            institution_name: { type: 'string', example: 'Universidad Nacional' },
            status: { type: 'string', example: 'verified' },
            first_time_login: { type: 'boolean', example: false },
          },
        },
        message: { type: 'string', example: 'Login successful - JWT set in cookie' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas',
  })
  @ApiResponse({
    status: 403,
    description: 'Primer login requerido - Usuario debe cambiar contraseña',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'FIRST_TIME_LOGIN_REQUIRED' },
        message: { type: 'string', example: 'User must change password on first login' },
        action: { type: 'string', example: 'redirect_to_first_time_login' },
      },
    },
  })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: ExpressResponse) {
    try {
      const result = await this.authService.login(loginDto);
      
      response.cookie('tessera_token', result.access_token, {
        httpOnly: true,           
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax',        
        maxAge: 24 * 60 * 60 * 1000, 
        path: '/',
      });

      response.cookie('tessera_secure', result.secure_token, {
        httpOnly: true,          
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });

      return {
        user: result.user,
        message: 'Login successful - Secure tokens set in cookies'
      };
    } catch (error) {
      if (error.message === 'REDIRECT_TO_FIRST_TIME_LOGIN') {
        throw new HttpException(
          {
            error: 'FIRST_TIME_LOGIN_REQUIRED',
            message: 'User must complete first-time login to set password',
            action: 'redirect_to_first_time_login',
            redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/login?first-time=true&email=${encodeURIComponent(loginDto.email)}`
          },
          HttpStatus.FORBIDDEN,
        );
      }
      
      throw new HttpException(
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Post('logout')
  @ApiOperation({ 
    summary: 'Cerrar sesión',
    description: 'Elimina la cookie del JWT'
  })
  @ApiResponse({
    status: 201,
    description: 'Logout exitoso',
  })
  async logout(@Res({ passthrough: true }) response: ExpressResponse) {
    response.clearCookie('tessera_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.clearCookie('tessera_secure', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return {
      message: 'Logout successful - All secure tokens cleared'
    };
  }

  @Get('verify')
  @UseGuards(JwtCookieAuthGuard)
  @ApiOperation({ 
    summary: 'Verificar JWT desde Cookie y obtener información del usuario',
    description: 'Endpoint para verificar JWT desde cookie HttpOnly - el frontend debe incluir cookies en la petición'
  })
  @ApiResponse({
    status: 200,
    description: 'Token válido - Información del usuario',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'uuid-string' },
        email: { type: 'string', example: 'admin@tessera.com' },
        full_name: { type: 'string', example: 'Administrador del Sistema' },
        role: { type: 'string', example: 'admin' },
        institution_id: { type: 'string', example: 'uuid-string', nullable: true },
        institution_name: { type: 'string', example: 'Universidad Nacional', nullable: true },
        status: { type: 'string', example: 'verified' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Cookie no encontrada o token inválido',
  })
  async verify(@Request() req) {
    return {
      userId: req.user.userId,
      email: req.user.email,
      full_name: req.user.full_name,
      role: req.user.role,
      institution_id: req.user.institution_id,
      institution_name: req.user.institution_name,
      status: req.user.status,
      verified: true,
      message: 'Token from cookie is valid'
    };
  }

  @Get('myinfo')
  @UseGuards(JwtCookieAuthGuard)
  @ApiOperation({ 
    summary: 'Obtener información completa del usuario autenticado',
    description: 'Devuelve toda la información disponible del usuario usando el JWT cookie, incluyendo datos de la institución'
  })
  @ApiResponse({
    status: 200,
    description: 'Información completa del usuario',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'uuid-string' },
        email: { type: 'string', example: 'admin@tessera.com' },
        full_name: { type: 'string', example: 'Administrador del Sistema' },
        role: { type: 'string', example: 'admin' },
        status: { type: 'string', example: 'verified' },
        first_time_login: { type: 'boolean', example: false },
        created_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        updated_at: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        institution: {
          type: 'object',
          nullable: true,
          properties: {
            id: { type: 'string', example: 'uuid-string' },
            name: { type: 'string', example: 'Universidad Nacional' },
            legal_id: { type: 'string', example: '12345678901' },
            email: { type: 'string', example: 'info@universidad.edu' },
            website: { type: 'string', example: 'https://universidad.edu' },
            description: { type: 'string', example: 'Universidad pública nacional' },
            logo_url: { type: 'string', example: 'https://universidad.edu/logo.png' },
            status: { type: 'string', example: 'approved' },
          },
        },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          example: ['read:all', 'write:all', 'delete:all'],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Cookie no encontrada o token inválido',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado en la base de datos',
  })
  async getMyInfo(@GetUser() user: any) {
    try {
      const completeUserInfo = await this.authService.getUserCompleteInfo(user.userId);
      return completeUserInfo;
    } catch (error) {
      throw new HttpException(
        error.message || 'User not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post('first-time-login')
  @ApiOperation({ 
    summary: 'Cambiar contraseña en el primer login (One-time use)',
  })
  @ApiResponse({
    status: 201,
    description: 'Contraseña cambiada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully. Please login with your new password.' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-string' },
            email: { type: 'string', example: 'user@institution.com' },
            full_name: { type: 'string', example: 'Usuario Institucional' },
            role: { type: 'string', example: 'owner' },
            status: { type: 'string', example: 'verified' },
            first_time_login: { type: 'boolean', example: false },
          },
        },
        requiresNewLogin: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos, contraseña temporal incorrecta, o primer login ya completado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async firstTimeLogin(@Body() firstLoginDto: FirstTimeLoginDto) {
    try {
      const result = await this.authService.firstTimeLogin(firstLoginDto);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to change password',
        error.message.includes('not found') ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch('change-password')
  @UseGuards(JwtCookieAuthGuard)
  @ApiOperation({ 
    summary: 'Cambiar contraseña para usuarios autenticados',
    description: 'Permite a usuarios autenticados cambiar su contraseña actual. Solo pueden cambiar su propia contraseña.'
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña cambiada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully. Please login with your new password.' },
        requiresNewLogin: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Contraseña actual incorrecta o nueva contraseña inválida' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No autorizado - solo puedes cambiar tu propia contraseña' })
  async changePassword(@GetUser() user: any, @Body() changePasswordDto: ChangePasswordDto) {
    try {
      // Validación adicional: el usuario solo puede cambiar su propia contraseña
      const result = await this.authService.changePassword(user.userId, changePasswordDto);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to change password',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('check-first-time/:email')
  @ApiOperation({ 
    summary: 'Verificar si un usuario necesita cambiar contraseña en primer login',
    description: 'Endpoint público para verificar el estado de primer login de un usuario'
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de primer login del usuario',
    schema: {
      type: 'object',
      properties: {
        isFirstTimeLogin: { type: 'boolean', example: true },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-string' },
            email: { type: 'string', example: 'user@institution.com' },
            full_name: { type: 'string', example: 'Usuario Institucional' },
            role: { type: 'string', example: 'owner' },
            status: { type: 'string', example: 'verified' },
            first_time_login: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async checkFirstTimeLogin(@Param('email') email: string) {
    try {
      const result = await this.authService.checkFirstTimeLoginStatus(email);
      return result;
    } catch (error) {
      throw new HttpException(
        error.message || 'User not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
