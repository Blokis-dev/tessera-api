import { Controller, Post, Body, HttpException, HttpStatus, Get, UseGuards, Request, Response, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtCookieAuthGuard } from './guards/jwt-cookie-auth.guard';
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
}
