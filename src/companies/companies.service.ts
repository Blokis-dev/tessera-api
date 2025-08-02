import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCompanyWithOwnerDto } from './dto/create-company.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CompaniesService {
  constructor(private databaseService: DatabaseService) {}

  async createCompanyWithOwner(createCompanyDto: CreateCompanyWithOwnerDto) {
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createCompanyDto.owner_password, saltRounds);

    // Prepare data for transaction
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
    };

    // Execute transaction
    return await this.databaseService.createCompanyWithOwner(transactionData);
  }

  async findCompanyById(id: string) {
    return await this.databaseService.findInstitutionById(id);
  }

  async getAllCompanies() {
    return await this.databaseService.query('SELECT * FROM institutions ORDER BY created_at DESC');
  }
}
