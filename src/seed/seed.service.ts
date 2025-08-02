import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private databaseService: DatabaseService) {}

  async seedUsers() {
    const users = [
      {
        email: 'admin@tessera.com',
        full_name: 'Administrador Principal',
        role: 'admin',
      },
      {
        email: 'institucion@universidad.edu',
        full_name: 'Usuario Institución Universidad',
        role: 'institution',
      },
    ];

    const createdUsers: any[] = [];
    for (const user of users) {
      try {
        // Verificar si el usuario ya existe
        const existingUser = await this.databaseService.findUserByEmail(user.email);
        if (existingUser) {
          this.logger.log(`User ${user.email} already exists, skipping...`);
          createdUsers.push(existingUser);
          continue;
        }

        const createdUser = await this.databaseService.createUser(user);
        createdUsers.push(createdUser);
        this.logger.log(`Created user: ${user.email}`);
      } catch (error) {
        this.logger.error(`Error creating user ${user.email}:`, error.message);
      }
    }

    return {
      message: 'Users seeding completed',
      created: createdUsers.length,
      users: createdUsers,
    };
  }

  async seedInstitutions() {
    // Primero asegurémonos de que existe un usuario de tipo institución
    const institutionUser = await this.databaseService.findUserByEmail('institucion@universidad.edu');
    if (!institutionUser) {
      throw new Error('Institution user not found. Please seed users first.');
    }

    const institutions = [
      {
        name: 'Universidad de Ejemplo',
        legal_id: 'UNI123456789',
        email_institucional: 'contacto@universidad.edu',
        website: 'https://universidad.edu',
        description: 'Universidad de ejemplo para pruebas del sistema',
        logo_url: 'https://example.com/logo.png',
        submitted_by: institutionUser.id,
      },
      {
        name: 'Instituto Tecnológico',
        legal_id: 'INST987654321',
        email_institucional: 'info@instituto.edu',
        website: 'https://instituto.edu',
        description: 'Instituto tecnológico de formación técnica',
        submitted_by: institutionUser.id,
      },
    ];

    const createdInstitutions: any[] = [];
    for (const institution of institutions) {
      try {
        const createdInstitution = await this.databaseService.createInstitution(institution);
        createdInstitutions.push(createdInstitution);
        this.logger.log(`Created institution: ${institution.name}`);
      } catch (error) {
        this.logger.error(`Error creating institution ${institution.name}:`, error.message);
      }
    }

    return {
      message: 'Institutions seeding completed',
      created: createdInstitutions.length,
      institutions: createdInstitutions,
    };
  }

  async seedAll() {
    this.logger.log('Starting complete seed process...');
    
    const usersResult = await this.seedUsers();
    const institutionsResult = await this.seedInstitutions();

    return {
      message: 'Complete seeding completed',
      users: usersResult,
      institutions: institutionsResult,
    };
  }
}