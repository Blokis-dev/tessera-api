import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsEmail } from 'class-validator';

export class FirstTimeLoginDto {
  @ApiProperty({ 
    description: 'User email address',
    example: 'user@institution.com' 
  })
  @IsEmail()
  email: string;

  @ApiProperty({ 
    description: 'Temporary password provided during registration',
    example: 'Casa-Luna-123' 
  })
  @IsString()
  temporary_password: string;

  @ApiProperty({ 
    description: 'New password (minimum 8 characters)',
    example: 'NewSecurePassword123!',
    minLength: 8 
  })
  @IsString()
  @MinLength(8)
  new_password: string;

  @ApiProperty({ 
    description: 'Confirm new password',
    example: 'NewSecurePassword123!' 
  })
  @IsString()
  confirm_password: string;
}

export class ChangePasswordDto {
  @ApiProperty({ 
    description: 'Current password',
    example: 'currentPassword123' 
  })
  @IsString()
  current_password: string;

  @ApiProperty({ 
    description: 'New password (minimum 8 characters)',
    example: 'newPassword123!',
    minLength: 8 
  })
  @IsString()
  @MinLength(8)
  new_password: string;

  @ApiProperty({ 
    description: 'Confirm new password',
    example: 'newPassword123!' 
  })
  @IsString()
  confirm_password: string;
}
