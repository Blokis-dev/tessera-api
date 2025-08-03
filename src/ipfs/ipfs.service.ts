import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PinataService } from './pinata.service';

export interface IpfsRecord {
  id?: string;
  file_name?: string;
  file_type?: string;
  ipfs_hash?: string;
  uploaded_by?: string;
  uploaded_at?: string;
}

export interface UploadResult {
  ipfs_hash: string;
  gateway_url: string;
  record_id: string;
}

@Injectable()
export class IpfsService {
  private readonly logger = new Logger(IpfsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly pinataService: PinataService,
  ) {}

  async uploadFileToIPFS(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    uploadedBy?: string,
  ): Promise<UploadResult> {
    this.logger.log(`📁 Uploading file to IPFS: ${fileName}`);

    try {
      // 1. Upload to Pinata
      const pinataResponse = await this.pinataService.uploadFile(fileBuffer, {
        name: fileName,
      });

      const ipfsHash = pinataResponse.cid;
      const gatewayUrl = this.pinataService.getGatewayUrl(ipfsHash);

      // 2. Save record to database
      const ipfsRecord: IpfsRecord = {
        file_name: fileName,
        file_type: fileType,
        ipfs_hash: ipfsHash,
        uploaded_by: uploadedBy,
        uploaded_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabaseService.client
        .from('ipfs')
        .insert(ipfsRecord)
        .select()
        .single();

      if (error) {
        this.logger.error(`❌ Error saving IPFS record: ${error.message}`);
        throw new Error(`Database error: ${error.message}`);
      }

      this.logger.log(`✅ File uploaded to IPFS: ${ipfsHash}`);
      this.logger.log(`🌐 Gateway URL: ${gatewayUrl}`);

      return {
        ipfs_hash: ipfsHash,
        gateway_url: gatewayUrl,
        record_id: data.id,
      };
    } catch (error) {
      this.logger.error(`❌ Error uploading file to IPFS: ${error.message}`);
      throw error;
    }
  }

  async uploadJSONToIPFS(
    jsonData: any,
    fileName: string,
    uploadedBy?: string,
  ): Promise<UploadResult> {
    this.logger.log(`📄 Uploading JSON to IPFS: ${fileName}`);

    try {
      // 1. Upload to Pinata
      const pinataResponse = await this.pinataService.uploadJSON(jsonData, {
        name: fileName,
      });

      const ipfsHash = pinataResponse.cid;
      const gatewayUrl = this.pinataService.getGatewayUrl(ipfsHash);

      // 2. Save record to database
      const ipfsRecord: IpfsRecord = {
        file_name: fileName,
        file_type: 'application/json',
        ipfs_hash: ipfsHash,
        uploaded_by: uploadedBy,
        uploaded_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabaseService.client
        .from('ipfs')
        .insert(ipfsRecord)
        .select()
        .single();

      if (error) {
        this.logger.error(`❌ Error saving IPFS record: ${error.message}`);
        throw new Error(`Database error: ${error.message}`);
      }

      this.logger.log(`✅ JSON uploaded to IPFS: ${ipfsHash}`);
      this.logger.log(`🌐 Gateway URL: ${gatewayUrl}`);

      return {
        ipfs_hash: ipfsHash,
        gateway_url: gatewayUrl,
        record_id: data.id,
      };
    } catch (error) {
      this.logger.error(`❌ Error uploading JSON to IPFS: ${error.message}`);
      throw error;
    }
  }

  async getIpfsRecord(ipfsHash: string): Promise<IpfsRecord | null> {
    this.logger.log(`🔍 Getting IPFS record: ${ipfsHash}`);

    try {
      const { data, error } = await this.supabaseService.client
        .from('ipfs')
        .select('*')
        .eq('ipfs_hash', ipfsHash)
        .single();

      if (error || !data) {
        this.logger.warn(`IPFS record not found: ${ipfsHash}`);
        return null;
      }

      return data;
    } catch (error) {
      this.logger.error(`❌ Error getting IPFS record: ${error.message}`);
      throw error;
    }
  }

  async listUserFiles(userId: string, limit = 50, offset = 0): Promise<{ files: IpfsRecord[]; total: number }> {
    this.logger.log(`📋 Listing files for user: ${userId}`);

    try {
      // Get total count
      const { count } = await this.supabaseService.client
        .from('ipfs')
        .select('*', { count: 'exact', head: true })
        .eq('uploaded_by', userId);

      // Get files
      const { data, error } = await this.supabaseService.client
        .from('ipfs')
        .select('*')
        .eq('uploaded_by', userId)
        .order('uploaded_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        this.logger.error(`❌ Error listing files: ${error.message}`);
        throw new Error(`Database error: ${error.message}`);
      }

      return {
        files: data || [],
        total: count || 0,
      };
    } catch (error) {
      this.logger.error(`❌ Error listing user files: ${error.message}`);
      throw error;
    }
  }

  getGatewayUrl(ipfsHash: string): string {
    return this.pinataService.getGatewayUrl(ipfsHash);
  }
}
