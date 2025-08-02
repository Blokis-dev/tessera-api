import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your_supabase') || supabaseKey.includes('your_supabase')) {
      this.logger.warn('Supabase credentials not configured. Using mock mode for testing.');
      this.supabase = null as any; // Mock mode
      return;
    }

    try {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.log('Supabase client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Supabase client:', error.message);
      this.supabase = null as any; // Mock mode
    }
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  // Users methods
  async findUserByEmail(email: string) {
    if (!this.supabase) {
      this.logger.warn('Supabase not configured. Returning mock user for testing.');
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

    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      this.logger.error(`Error finding user by email: ${error.message}`);
      return null;
    }

    return data;
  }

  async createUser(userData: {
    email: string;
    full_name: string;
    role: string;
    institution_id?: string;
  }) {
    if (!this.supabase) {
      this.logger.warn('Supabase not configured. Returning mock created user for testing.');
      return {
        id: `mock-${Date.now()}`,
        ...userData,
        created_at: new Date().toISOString(),
      };
    }

    const { data, error } = await this.supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating user: ${error.message}`);
      throw error;
    }

    return data;
  }

  // Institutions methods
  async findInstitutionById(id: string) {
    const { data, error } = await this.supabase
      .from('institutions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error(`Error finding institution: ${error.message}`);
      return null;
    }

    return data;
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
    const { data, error } = await this.supabase
      .from('institutions')
      .insert([institutionData])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating institution: ${error.message}`);
      throw error;
    }

    return data;
  }

  async updateInstitutionStatus(id: string, status: string, approved_by?: string) {
    const updateData: any = { status };
    if (approved_by) {
      updateData.approved_by = approved_by;
    }

    const { data, error } = await this.supabase
      .from('institutions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error updating institution status: ${error.message}`);
      throw error;
    }

    return data;
  }

  // Certificates methods
  async createCertificate(certificateData: {
    title: string;
    description?: string;
    student_id: string;
    institution_id: string;
    ipfs_hash?: string;
    blockchain_tx?: string;
    qr_code_url?: string;
    nft_metadata_url?: string;
    token_id?: number;
  }) {
    const { data, error } = await this.supabase
      .from('certificates')
      .insert([certificateData])
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating certificate: ${error.message}`);
      throw error;
    }

    return data;
  }

  async findCertificatesByInstitution(institutionId: string) {
    const { data, error } = await this.supabase
      .from('certificates')
      .select(`
        *,
        students:student_id(id, email, full_name),
        institutions:institution_id(id, name)
      `)
      .eq('institution_id', institutionId);

    if (error) {
      this.logger.error(`Error finding certificates: ${error.message}`);
      return [];
    }

    return data;
  }

  async findCertificatesByStudent(studentId: string) {
    const { data, error } = await this.supabase
      .from('certificates')
      .select(`
        *,
        institutions:institution_id(id, name, logo_url)
      `)
      .eq('student_id', studentId);

    if (error) {
      this.logger.error(`Error finding certificates: ${error.message}`);
      return [];
    }

    return data;
  }
}
