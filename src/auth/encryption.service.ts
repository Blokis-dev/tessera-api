import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  

  encryptWithUserSecret(payload: string, userPassword: string): string {
    try {
      const key = crypto.createHash('sha256').update(userPassword).digest();
      
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(payload, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  decryptWithUserSecret(encryptedData: string, userPassword: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
      
      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted data format');
      }
      
      const key = crypto.createHash('sha256').update(userPassword).digest();
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }


  generateSessionToken(userId: string, email: string, timestamp: number): string {
    const data = `${userId}:${email}:${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  validateSessionToken(token: string, userId: string, email: string, timestamp: number): boolean {
    const expectedToken = this.generateSessionToken(userId, email, timestamp);
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  }
}
