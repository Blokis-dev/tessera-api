import { Controller, Post, Body, Get, Param, UseGuards, Patch } from '@nestjs/common';
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
}
