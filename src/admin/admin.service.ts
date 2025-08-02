import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { PendingInstitutionDto, PendingUserDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private databaseService: DatabaseService,
    private emailService: EmailService,
  ) {}

  async getPendingInstitutions(): Promise<PendingInstitutionDto[]> {
    const query = `
      SELECT 
        i.id,
        i.name,
        i.email_institucional as domain,
        i.status,
        i.created_at,
        u.email as owner_email,
        u.full_name as owner_name
      FROM institutions i
      LEFT JOIN users u ON i.id = u.institution_id AND u.role = 'owner'
      WHERE i.status = 'pending'
      ORDER BY i.created_at DESC
    `;
    
    const result = await this.databaseService.query(query);
    return result.rows;
  }

  async getPendingUsers(): Promise<PendingUserDto[]> {
    const query = `
      SELECT 
        u.id,
        u.full_name as name,
        u.email,
        u.role,
        u.status,
        u.institution_id,
        i.name as institution_name,
        u.created_at
      FROM users u
      LEFT JOIN institutions i ON u.institution_id = i.id
      WHERE u.status = 'pending'
      ORDER BY u.created_at DESC
    `;
    
    const result = await this.databaseService.query(query);
    return result.rows;
  }

  async approveInstitution(
    institutionId: string,
    status: 'verified' | 'rejected',
    adminNotes?: string
  ) {
    try {
      const transaction = async (client) => {
        // Check if institution exists and is pending
        const checkQuery = 'SELECT id, status FROM institutions WHERE id = $1';
        const checkResult = await client.query(checkQuery, [institutionId]);
        
        if (checkResult.rows.length === 0) {
          throw new NotFoundException('Institution not found');
        }

        if (checkResult.rows[0].status !== 'pending') {
          throw new BadRequestException('Institution is not in pending status');
        }

        // Update institution status
        const updateQuery = `
          UPDATE institutions 
          SET status = $1, admin_notes = $2, updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, [status, adminNotes, institutionId]);
        return result.rows[0];
      };

      return await this.databaseService.executeTransaction(transaction);
    } catch (error) {
      console.error('Error in approveInstitution:', error);
      throw error;
    }
  }

  async approveUser(
    userId: string,
    status: 'verified' | 'rejected',
    adminNotes?: string
  ) {
    try {
      const transaction = async (client) => {
        // Check if user exists and is pending
        const checkQuery = `
          SELECT u.id, u.status, u.email, u.full_name, u.institution_id, u.temporary_password,
                 i.name as institution_name
          FROM users u
          LEFT JOIN institutions i ON u.institution_id = i.id
          WHERE u.id = $1
        `;
        const checkResult = await client.query(checkQuery, [userId]);
        
        if (checkResult.rows.length === 0) {
          throw new NotFoundException('User not found');
        }

        const userData = checkResult.rows[0];
        
        if (userData.status !== 'pending') {
          throw new BadRequestException('User is not in pending status');
        }

        if (status === 'verified' && userData.temporary_password) {
          console.log('🔥 DEBUG: Enviando email de aprobación', {
            userEmail: userData.email,
            hasTemporaryPassword: !!userData.temporary_password,
            temporaryPasswordLength: userData.temporary_password?.length
          });
          
          await this.emailService.sendUserApprovalEmail({
            userEmail: userData.email,
            fullName: userData.full_name,
            institutionName: userData.institution_name || 'Tu institución',
            temporaryPassword: userData.temporary_password,
            loginUrl: 'http://localhost:3001/login'
          });
          
          console.log('🔥 DEBUG: Email enviado exitosamente');
          
          const updateQuery = `
            UPDATE users 
            SET status = $1, admin_notes = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING id, full_name, email, role, status, institution_id
          `;
          
          const result = await client.query(updateQuery, [status, adminNotes, userId]);
          return result.rows[0];
        }

        if (status === 'rejected') {
          await this.emailService.sendUserRejectionEmail({
            userEmail: userData.email,
            fullName: userData.full_name,
            institutionName: userData.institution_name || 'Tu institución',
            rejectionReason: adminNotes || 'No se proporcionó un motivo específico',
            adminNotes: adminNotes
          });

          await this.deleteUserWithAssociatedData(client, userId, userData);
          
          return {
            message: 'Usuario rechazado, email enviado y datos eliminados correctamente',
            deletedUser: {
              email: userData.email,
              fullName: userData.full_name,
              institutionName: userData.institution_name
            }
          };
        }
      };

      return await this.databaseService.executeTransaction(transaction);
    } catch (error) {
      console.error('Error in approveUser:', error);
      throw error;
    }
  }

  private async deleteUserWithAssociatedData(client: any, userId: string, userData: any) {
    if (userData.role === 'owner' && userData.institution_id) {
      const otherUsersQuery = `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE institution_id = $1 AND id != $2
      `;
      const otherUsersResult = await client.query(otherUsersQuery, [userData.institution_id, userId]);
      
      if (otherUsersResult.rows[0].count == 0) {
        await client.query('DELETE FROM institutions WHERE id = $1', [userData.institution_id]);
      }
    }

    await client.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  async deleteUserWithCompany(userId: string) {
    try {
      const transaction = async (client) => {
        const userQuery = `
          SELECT u.id, u.email, u.full_name, u.role, u.institution_id,
                 i.name as institution_name
          FROM users u
          LEFT JOIN institutions i ON u.institution_id = i.id
          WHERE u.id = $1
        `;
        const userResult = await client.query(userQuery, [userId]);
        
        if (userResult.rows.length === 0) {
          throw new NotFoundException('Usuario no encontrado');
        }

        const userData = userResult.rows[0];
        let deletedInstitution = null;

        if (userData.institution_id) {
          if (userData.role === 'owner') {
            const deleteUsersQuery = 'DELETE FROM users WHERE institution_id = $1 RETURNING email, full_name';
            const deletedUsersResult = await client.query(deleteUsersQuery, [userData.institution_id]);
            
            const deleteInstitutionQuery = 'DELETE FROM institutions WHERE id = $1 RETURNING name';
            const deletedInstitutionResult = await client.query(deleteInstitutionQuery, [userData.institution_id]);
            
            deletedInstitution = deletedInstitutionResult.rows[0];
            
            return {
              message: 'Usuario owner eliminado junto con su institución y todos los usuarios asociados',
              deletedUser: userData,
              deletedInstitution: deletedInstitution,
              deletedUsers: deletedUsersResult.rows
            };
          } else {
            await client.query('DELETE FROM users WHERE id = $1', [userId]);
            
            return {
              message: 'Usuario eliminado (institución conservada)',
              deletedUser: userData
            };
          }
        } else {
          await client.query('DELETE FROM users WHERE id = $1', [userId]);
          
          return {
            message: 'Usuario eliminado (sin institución asociada)',
            deletedUser: userData
          };
        }
      };

      return await this.databaseService.executeTransaction(transaction);
    } catch (error) {
      console.error('Error in deleteUserWithCompany:', error);
      throw error;
    }
  }

  async approveInstitutionWithOwner(institutionId: string) {
    try {
      const transaction = async (client) => {
        const institutionQuery = 'SELECT id, status FROM institutions WHERE id = $1';
        const institutionResult = await client.query(institutionQuery, [institutionId]);
        
        if (institutionResult.rows.length === 0) {
          throw new NotFoundException('Institution not found');
        }

        if (institutionResult.rows[0].status !== 'pending') {
          throw new BadRequestException('Institution is not in pending status');
        }

        const ownerQuery = `
          SELECT id, status FROM users 
          WHERE institution_id = $1 AND role = 'owner'
        `;
        const ownerResult = await client.query(ownerQuery, [institutionId]);
        
        if (ownerResult.rows.length === 0) {
          throw new NotFoundException('Owner user not found for this institution');
        }

        const ownerId = ownerResult.rows[0].id;

        const updateInstitutionQuery = `
          UPDATE institutions 
          SET status = 'verified', updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
        
        const institutionUpdateResult = await client.query(updateInstitutionQuery, [institutionId]);

        const updateUserQuery = `
          UPDATE users 
          SET status = 'verified', updated_at = NOW()
          WHERE id = $1
          RETURNING id, full_name, email, role, status, institution_id
        `;
        
        const userUpdateResult = await client.query(updateUserQuery, [ownerId]);

        return {
          institution: institutionUpdateResult.rows[0],
          owner: userUpdateResult.rows[0],
          message: 'Institution and owner user have been approved successfully'
        };
      };

      return await this.databaseService.executeTransaction(transaction);
    } catch (error) {
      console.error('Error in approveInstitutionWithOwner:', error);
      throw error;
    }
  }
}
