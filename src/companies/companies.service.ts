import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { CreateCompanyWithOwnerDto } from './dto/create-company.dto';
import { PasswordGeneratorService } from '../auth/password-generator.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CompaniesService {
  constructor(
    private databaseService: DatabaseService,
    private passwordGeneratorService: PasswordGeneratorService,
    private emailService: EmailService,
  ) {}

  async createCompanyWithOwner(createCompanyDto: CreateCompanyWithOwnerDto) {
    const temporaryPassword = this.passwordGeneratorService.generateUltraSecureTemporaryPassword();
    
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(temporaryPassword, saltRounds);

    const transactionData = {
      name: createCompanyDto.name,
      legal_id: createCompanyDto.legal_id,
      email_institucional: createCompanyDto.email_institucional,
      website: createCompanyDto.website,
      description: createCompanyDto.description,
      logo_url: createCompanyDto.logo_url,
      owner_email: createCompanyDto.owner_email,
      owner_full_name: createCompanyDto.owner_full_name,
      owner_password_hash: hashedPassword,
      temporary_password: temporaryPassword,
    };

    const result = await this.databaseService.createCompanyWithOwner(transactionData);

    return {
      ...result,
      temporaryPassword: temporaryPassword,
      message: `Institution and owner created successfully. User is pending approval.`,
      important_notice: 'User will receive welcome email with password when approved by admin.',
      security_info: {
        password_length: temporaryPassword.length,
        password_strength: 'Ultra-secure with mixed characters',
        status: 'Pending admin approval',
        email_pending: true
      }
    };
  }

  async findCompanyById(id: string) {
    return await this.databaseService.findInstitutionById(id);
  }

  async getAllCompanies() {
    return await this.databaseService.query('SELECT * FROM institutions ORDER BY created_at DESC');
  }
}
