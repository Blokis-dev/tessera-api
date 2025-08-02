import { Controller, Post, Body, Get, Param, UseGuards, Patch, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtCookieAuthGuard } from '../auth/guards/jwt-cookie-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { 
  PendingInstitutionDto, 
  PendingUserDto, 
  ApproveInstitutionDto, 
  ApproveUserDto 
} from './dto/admin.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtCookieAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('institutions/pending')
  @ApiOperation({ summary: 'Get all pending institutions (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending institutions', type: [PendingInstitutionDto] })
  async getPendingInstitutions(): Promise<PendingInstitutionDto[]> {
    return await this.adminService.getPendingInstitutions();
  }

  @Get('users/pending')
  @ApiOperation({ summary: 'Get all pending users (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of pending users', type: [PendingUserDto] })
  async getPendingUsers(): Promise<PendingUserDto[]> {
    return await this.adminService.getPendingUsers();
  }

  @Patch('institutions/approve')
  @ApiOperation({ summary: 'Approve or reject an institution (Admin only)' })
  @ApiResponse({ status: 200, description: 'Institution status updated' })
  async approveInstitution(@Body() approveDto: ApproveInstitutionDto) {
    return await this.adminService.approveInstitution(
      approveDto.institutionId,
      approveDto.status,
      approveDto.adminNotes
    );
  }

  @Patch('users/approve')
  @ApiOperation({ summary: 'Approve or reject a user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  async approveUser(@Body() approveDto: ApproveUserDto) {
    return await this.adminService.approveUser(
      approveDto.userId,
      approveDto.status,
      approveDto.adminNotes
    );
  }

  @Post('institutions/:id/approve-with-owner')
  @ApiOperation({ 
    summary: 'Approve institution and its owner user in one action (Admin only)',
    description: 'Approves both the institution and its owner user simultaneously'
  })
  @ApiResponse({ status: 200, description: 'Institution and owner approved' })
  async approveInstitutionWithOwner(@Param('id') institutionId: string) {
    return await this.adminService.approveInstitutionWithOwner(institutionId);
  }

  @Delete('users/:id/with-company')
  @ApiOperation({ 
    summary: 'Delete user and associated company/institution (Development/Admin)',
    description: 'Deletes a user and their associated company. If user is owner, deletes the entire institution and all associated users. Use with caution!'
  })
  @ApiResponse({ status: 200, description: 'User and associated data deleted' })
  async deleteUserWithCompany(@Param('id') userId: string) {
    return await this.adminService.deleteUserWithCompany(userId);
  }

  @Get('config/urls')
  @ApiOperation({ 
    summary: 'Get current frontend URLs configuration (Admin only)',
    description: 'Returns the currently configured frontend URLs for login, password reset, etc.'
  })
  @ApiResponse({ status: 200, description: 'Frontend URLs configuration' })
  async getFrontendUrls() {
    // This could be expanded to read from database or config service
    return {
      loginUrl: process.env.LOGIN_URL || 'http://localhost:3001/login',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
      companyName: process.env.COMPANY_NAME || 'Tessera',
      fromEmail: process.env.FROM_EMAIL || 'no-reply@tessera.com'
    };
  }
}
