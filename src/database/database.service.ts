import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: Pool | null = null;

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

      // Test the connection
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
      this.logger.warn('Database not connected. Returning mock data.');
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

  // Transaction methods
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

  // Users methods
  async findUserByEmail(email: string) {
    if (!this.pool) {
      this.logger.warn('Database not connected. Returning mock user.');
      if (email === 'admin@tessera.com') {
        return {
          id: 'mock-admin-id',
          email: 'admin@tessera.com',
          full_name: 'Mock Admin',
          role: 'admin',
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

  // Companies methods
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

  // Institutions methods
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
        status: 'pendiente',
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

  // Test connection method
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

  // Transaction methods for complex operations
  async createCompanyWithOwner(companyData: {
    // Institution data (renamed from company)
    name: string;
    legal_id: string;
    email_institucional: string;
    website?: string;
    description?: string;
    logo_url?: string;
    // Owner data
    owner_email: string;
    owner_full_name: string;
    owner_password_hash: string;
  }) {
    return this.executeTransaction(async (client) => {
      // 1. Create the institution first
      const institutionResult = await client.query(
        `INSERT INTO institutions (name, legal_id, email_institucional, website, description, logo_url) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          companyData.name,
          companyData.legal_id,
          companyData.email_institucional,
          companyData.website,
          companyData.description,
          companyData.logo_url
        ]
      );
      
      const createdInstitution = institutionResult.rows[0];

      // 2. Create the owner user with reference to the institution
      const userResult = await client.query(
        `INSERT INTO users (email, full_name, encrypted_password, role, institution_id, status) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          companyData.owner_email,
          companyData.owner_full_name,
          companyData.owner_password_hash,
          'owner',
          createdInstitution.id,
          'pending'
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
