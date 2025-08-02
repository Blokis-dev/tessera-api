import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';

export class CreateCompanyWithOwnerDto {
  @ApiProperty({ 
    description: 'Company name',
    example: 'Tech Corp Solutions' 
  })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Legal identification number',
    example: '12345678-9' 
  })
  @IsString()
  legal_id: string;

  @ApiProperty({ 
    description: 'Institutional email',
    example: 'contact@techcorp.com' 
  })
  @IsEmail()
  email_institucional: string;

  @ApiProperty({ 
    description: 'Company website',
    example: 'https://techcorp.com',
    required: false 
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ 
    description: 'Company description',
    example: 'Leading technology solutions provider',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Company logo URL',
    example: 'https://techcorp.com/logo.png',
    required: false 
  })
  @IsOptional()
  @IsString()
  logo_url?: string;

  @ApiProperty({ 
    description: 'Owner email address',
    example: 'john.doe@techcorp.com' 
  })
  @IsEmail()
  owner_email: string;

  @ApiProperty({ 
    description: 'Owner full name',
    example: 'John Doe' 
  })
  @IsString()
  owner_full_name: string;
}
