import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';

export interface LoginDto {
  email: string;
  password: string;
}

export interface JwtPayload {
  email: string;
  sub: string;
  role: string;
  institution_id?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private databaseService: DatabaseService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateJwtToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.sign(payload);
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.databaseService.findUserByEmail(email);
    
    if (!user) {
      return null;
    }

    // Check if user is verified
    if (user.status !== 'verified') {
      throw new Error('Account pending approval. Please wait for admin verification.');
    }

    // If user has encrypted_password, verify it; otherwise use default passwords for testing
    if (user.encrypted_password) {
      const isPasswordValid = await this.comparePasswords(password, user.encrypted_password);
      if (!isPasswordValid) {
        return null;
      }
    } else {
      // For backward compatibility with seed data - only for system admin
      if (email === 'admin@tessera.com' && password === 'admin123') {
        return user;
      }
      
      return null;
    }
    
    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const payload: JwtPayload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      institution_id: user.institution_id,
    };

    return {
      access_token: await this.generateJwtToken(payload),
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        institution_id: user.institution_id,
      },
    };
  }
}
