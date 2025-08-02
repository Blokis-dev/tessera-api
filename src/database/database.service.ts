import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;
  
  private mockUsers: any[] = [];
  private mockInstitutions: any[] = [];

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');

    if (!databaseUrl || databaseUrl.includes('your_')) {
      this.logger.warn('Database URL not configured. Using mock mode for testing.');
      return;
    }

    try {
      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: {
          rejectUnauthorized: false,
        },
      });

      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.logger.log('Database connection established successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database:', error.message);
      this.pool = null;
    }
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.log('Database connection closed');
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      this.logger.warn('Database not connected. Using mock storage.');
      
      if (text.includes('SELECT * FROM users WHERE email = $1')) {
        const email = params?.[0];
        const user = this.mockUsers.find(u => u.email === email);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
      }
      
      if (text.includes('UPDATE users') && text.includes('WHERE id = $')) {
        const userId = params?.[params.length - 1]; // Last parameter is usually the ID
        const userIndex = this.mockUsers.findIndex(u => u.id === userId);
        if (userIndex >= 0) {
          if (text.includes('encrypted_password')) {
            this.mockUsers[userIndex].encrypted_password = params?.[0];
          }
          if (text.includes('first_time_login')) {
            this.mockUsers[userIndex].first_time_login = false;
          }
          this.mockUsers[userIndex].updated_at = new Date().toISOString();
          return { rows: [this.mockUsers[userIndex]], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
      
      return { rows: [], rowCount: 0 };
    }

    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      this.logger.error('Database query error:', error.message);
      throw error;
    }
  }

  async getClient(): Promise<PoolClient | null> {
    if (!this.pool) {
      return null;
    }
    return this.pool.connect();
  }

  async executeTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Transaction rolled back:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async findUserByEmail(email: string) {
    if (!this.pool) {
      this.logger.warn('Database not connected. Using mock storage.');
      
      const mockUser = this.mockUsers.find(u => u.email === email);
      if (mockUser) {
        return mockUser;
      }
      
      if (email === 'admin@tessera.com') {
        return {
          id: 'mock-admin-id',
          email: 'admin@tessera.com',
          full_name: 'Mock Admin',
          role: 'admin',
          status: 'verified',
          encrypted_password: null,
          first_time_login: false,
          created_at: new Date().toISOString(),
        };
      }
      return null;
    }

    try {
      const result = await this.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`Error finding user by email: ${error.message}`);
      return null;
    }
  }

  async createUser(userData: {
    email: string;
    full_name: string;
    role: string;
    institution_id?: string;
  }) {
    if (!this.pool) {
      this.logger.warn('Database not connected. Returning mock created user.');
      return {
        id: `mock-${Date.now()}`,
        ...userData,
        created_at: new Date().toISOString(),
      };
    }

    try {
      const result = await this.query(
        `INSERT INTO users (email, full_name, role, institution_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userData.email, userData.full_name, userData.role, userData.institution_id]
      );
      return result.rows[0];
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  async findAllUsers() {
    if (!this.pool) {
      this.logger.warn('Database not connected. Returning mock users.');
      return [
        {
          id: 'mock-admin-id',
          email: 'admin@tessera.com',
          full_name: 'Mock Admin',
          role: 'admin',
          created_at: new Date().toISOString(),
        },
      ];
    }

    try {
      const result = await this.query(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      this.logger.error(`Error finding all users: ${error.message}`);
      return [];
    }
  }

  async findCompanyById(id: string) {
    if (!this.pool) {
      return null;
    }

    try {
      const result = await this.query(
        'SELECT * FROM companies WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`Error finding company: ${error.message}`);
      return null;
    }
  }

  async findInstitutionById(id: string) {
    if (!this.pool) {
      return null;
    }

    try {
      const result = await this.query(
        'SELECT * FROM institutions WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error(`Error finding institution: ${error.message}`);
      return null;
    }
  }

  async createInstitution(institutionData: {
    name: string;
    legal_id: string;
    email_institucional: string;
    website?: string;
    description?: string;
    logo_url?: string;
    submitted_by: string;
  }) {
    if (!this.pool) {
      this.logger.warn('Database not connected. Returning mock created institution.');
      return {
        id: `mock-inst-${Date.now()}`,
        ...institutionData,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
    }

    try {
      const result = await this.query(
        `INSERT INTO institutions (name, legal_id, email_institucional, website, description, logo_url, submitted_by) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          institutionData.name,
          institutionData.legal_id,
          institutionData.email_institucional,
          institutionData.website,
          institutionData.description,
          institutionData.logo_url,
          institutionData.submitted_by,
        ]
      );
      return result.rows[0];
    } catch (error) {
      this.logger.error(`Error creating institution: ${error.message}`);
      throw error;
    }
  }

  async testConnection() {
    if (!this.pool) {
      return { connected: false, message: 'Database pool not initialized' };
    }

    try {
      const result = await this.query('SELECT NOW() as current_time');
      return {
        connected: true,
        message: 'Database connection successful',
        timestamp: result.rows[0].current_time,
      };
    } catch (error) {
      return {
        connected: false,
        message: `Database connection failed: ${error.message}`,
      };
    }
  }

  async createCompanyWithOwner(companyData: {
    name: string;
    legal_id: string;
    email_institucional: string;
    website?: string;
    description?: string;
    logo_url?: string;
    owner_email: string;
    owner_full_name: string;
    owner_password_hash: string;
    temporary_password: string;
  }) {
    if (!this.pool) {
      this.logger.warn('Database not connected. Using mock storage.');
      const mockInstitution = {
        id: `mock-inst-${Date.now()}`,
        name: companyData.name,
        legal_id: companyData.legal_id,
        email_institucional: companyData.email_institucional,
        website: companyData.website,
        description: companyData.description,
        logo_url: companyData.logo_url,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      
      const mockUser = {
        id: `mock-user-${Date.now()}`,
        email: companyData.owner_email,
        full_name: companyData.owner_full_name,
        encrypted_password: companyData.owner_password_hash,
        temporary_password: companyData.temporary_password,
        role: 'owner',
        institution_id: mockInstitution.id,
        status: 'pending',
        first_time_login: true,
        created_at: new Date().toISOString(),
      };

      this.mockInstitutions.push(mockInstitution);
      this.mockUsers.push(mockUser);

      return {
        user: mockUser,
        institution: mockInstitution,
        message: 'Institution and owner created successfully (MOCK MODE)'
      };
    }

    return this.executeTransaction(async (client) => {
      const institutionResult = await client.query(
        `INSERT INTO institutions (name, legal_id, email_institucional, website, description, logo_url, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          companyData.name,
          companyData.legal_id,
          companyData.email_institucional,
          companyData.website,
          companyData.description,
          companyData.logo_url,
          'pending'
        ]
      );
      
      const createdInstitution = institutionResult.rows[0];

      const userResult = await client.query(
        `INSERT INTO users (email, full_name, encrypted_password, temporary_password, role, institution_id, status, first_time_login) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [
          companyData.owner_email,
          companyData.owner_full_name,
          companyData.owner_password_hash,
          companyData.temporary_password,
          'owner',
          createdInstitution.id,
          'pending',
          true
        ]
      );

      const createdUser = userResult.rows[0];

      return {
        user: createdUser,
        institution: createdInstitution,
        message: 'Institution and owner created successfully'
      };
    });
  }
}
