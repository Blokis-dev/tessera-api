import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';

export class PendingInstitutionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  domain: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty({ required: false })
  owner_email?: string;

  @ApiProperty({ required: false })
  owner_name?: string;
}

export class PendingUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  institution_id?: string;

  @ApiProperty({ required: false })
  institution_name?: string;

  @ApiProperty()
  created_at: string;
}

export class ApproveInstitutionDto {
  @ApiProperty({ description: 'The UUID of the institution to approve' })
  @IsUUID()
  @IsString()
  institutionId: string;

  @ApiProperty({ enum: ['verified', 'rejected'], description: 'The new status for the institution' })
  @IsEnum(['verified', 'rejected'])
  status: 'verified' | 'rejected';

  @ApiProperty({ required: false, description: 'Optional admin notes about the approval decision' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class ApproveUserDto {
  @ApiProperty({ description: 'The UUID of the user to approve' })
  @IsUUID()
  @IsString()
  userId: string;

  @ApiProperty({ enum: ['verified', 'rejected'], description: 'The new status for the user' })
  @IsEnum(['verified', 'rejected'])
  status: 'verified' | 'rejected';

  @ApiProperty({ required: false, description: 'Optional admin notes about the approval decision' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
