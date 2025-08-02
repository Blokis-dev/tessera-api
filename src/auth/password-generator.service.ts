import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PasswordGeneratorService {

  generateSecurePassword(length: number = 14, includeSymbols: boolean = true): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = includeSymbols ? '!@#$%^&*-_=+[]{}' : '';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(numbers);
    password += this.getRandomChar(numbers);
    
    if (includeSymbols) {
      password += this.getRandomChar(symbols);
      password += this.getRandomChar(symbols);
    }
    
    const remainingLength = length - password.length;
    for (let i = 0; i < remainingLength; i++) {
      password += this.getRandomChar(allChars);
    }
    
    password = this.shuffleString(password);
    password = this.shuffleString(password);
    
    return password;
  }

  generateUserFriendlyPassword(length: number = 10): string {
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const numbers = '23456789';
    
    const allChars = lowercase + uppercase + numbers;
    
    let password = '';
    
    password += this.getRandomChar(lowercase);
    password += this.getRandomChar(uppercase);
    password += this.getRandomChar(numbers);
    
    const remainingLength = length - password.length;
    for (let i = 0; i < remainingLength; i++) {
      password += this.getRandomChar(allChars);
    }
    
    return this.shuffleString(password);
  }

  generateTemporaryPassword(): string {
    return this.generateSecurePassword(12, true);
  }

  generateUltraSecureTemporaryPassword(): string {
    const length = 16;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*-_=+';
    
    let password = '';
    
    for (let i = 0; i < 3; i++) {
      password += this.getRandomChar(lowercase);
      password += this.getRandomChar(uppercase);
      password += this.getRandomChar(numbers);
      password += this.getRandomChar(symbols);
    }
    
    const allChars = lowercase + uppercase + numbers + symbols;
    const remaining = length - password.length;
    for (let i = 0; i < remaining; i++) {
      password += this.getRandomChar(allChars);
    }
    
    password = this.shuffleString(password);
    password = this.shuffleString(password);
    password = this.shuffleString(password);
    
    return password;
  }

  private getRandomChar(charset: string): string {
    const randomIndex = crypto.randomInt(0, charset.length);
    return charset[randomIndex];
  }

  private shuffleString(str: string): string {
    const array = str.split('');
    for (let i = array.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }

  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 0;

    if (password.length >= 8) {
      score += 2;
    } else {
      suggestions.push('Use at least 8 characters');
    }

    if (/[a-z]/.test(password)) score += 1;
    else suggestions.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else suggestions.push('Include uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else suggestions.push('Include numbers');

    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    else suggestions.push('Include special characters');

    if (password.length >= 12) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score += 1;

    return {
      isValid: score >= 4,
      score: Math.min(score, 6),
      suggestions
    };
  }
}
