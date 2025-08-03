import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinataSDK } from 'pinata';

export interface PinataUploadOptions {
  name?: string;
  keyvalues?: Record<string, string>;
}

@Injectable()
export class PinataService {
  private readonly logger = new Logger(PinataService.name);
  private readonly pinata: PinataSDK;

  constructor(private readonly configService: ConfigService) {
    const jwt = this.configService.get<string>('PINATA_JWT');
    const gatewayUrl = this.configService.get<string>('PINATA_GATEWAY_URL');

    if (!jwt) {
      throw new Error('PINATA_JWT is required');
    }

    this.pinata = new PinataSDK({
      pinataJwt: jwt,
      pinataGateway: gatewayUrl || 'https://gateway.pinata.cloud',
    });

    this.logger.log('🌐 Pinata service initialized');
    this.logger.log(`📡 Gateway URL: ${gatewayUrl || 'https://gateway.pinata.cloud'}`);
  }

  async uploadFile(fileBuffer: Buffer, options: PinataUploadOptions = {}): Promise<any> {
    this.logger.log(`📁 Uploading file to IPFS: ${options.name || 'unnamed file'}`);

    try {
      const file = new File([fileBuffer], options.name || 'file');
      const upload = await this.pinata.upload.public.file(file);

      this.logger.log(`✅ File uploaded successfully: ${upload.cid}`);
      return upload;
    } catch (error) {
      this.logger.error(`❌ Error uploading file: ${error.message}`);
      throw error;
    }
  }

  async uploadJSON(jsonData: any, options: PinataUploadOptions = {}): Promise<any> {
    this.logger.log(`📄 Uploading JSON to IPFS: ${options.name || 'json data'}`);

    try {
      const upload = await this.pinata.upload.public.json(jsonData);

      this.logger.log(`✅ JSON uploaded successfully: ${upload.cid}`);
      return upload;
    } catch (error) {
      this.logger.error(`❌ Error uploading JSON: ${error.message}`);
      throw error;
    }
  }

  async uploadNFTMetadata(metadata: any, options: PinataUploadOptions = {}): Promise<any> {
    this.logger.log(`🎨 Uploading NFT metadata to IPFS: ${options.name || 'NFT metadata'}`);
    return this.uploadJSON(metadata, options);
  }

  async createNFTMetadata(nftData: {
    name: string;
    description: string;
    imageUrl?: string;
    externalUrl?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
    properties?: Record<string, any>;
  }): Promise<any> {
    this.logger.log(`🎨 Creating NFT metadata for: ${nftData.name}`);

    const metadata = {
      name: nftData.name,
      description: nftData.description,
      image: nftData.imageUrl || '',
      external_url: nftData.externalUrl || '',
      attributes: nftData.attributes || [],
      properties: {
        category: 'image',
        ...nftData.properties,
      },
    };

    this.logger.log(`✅ NFT metadata created for: ${nftData.name}`);
    return metadata;
  }

  getGatewayUrl(cid: string): string {
    const gatewayUrl = this.configService.get<string>('PINATA_GATEWAY_URL') || 'https://gateway.pinata.cloud';
    // Ensure the URL has the correct protocol
    const formattedUrl = gatewayUrl.startsWith('http') ? gatewayUrl : `https://${gatewayUrl}`;
    return `${formattedUrl}/ipfs/${cid}`;
  }

  async testConnection(): Promise<{ connected: boolean; message: string }> {
    this.logger.log('� Testing Pinata connection...');

    try {
      // Try to upload a simple test file
      const testData = { test: 'connection', timestamp: new Date().toISOString() };
      const upload = await this.uploadJSON(testData, { name: 'connection-test' });
      
      this.logger.log('✅ Pinata connection successful');
      return {
        connected: true,
        message: `Successfully connected to Pinata. Test CID: ${upload.cid}`,
      };
    } catch (error) {
      this.logger.error(`❌ Pinata connection failed: ${error.message}`);
      return {
        connected: false,
        message: error.message,
      };
    }
  }
}
