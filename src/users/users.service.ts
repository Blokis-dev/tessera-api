import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private databaseService: DatabaseService) {}

  async findByEmail(email: string) {
    return this.databaseService.findUserByEmail(email);
  }

  async findAll() {
    return this.databaseService.findAllUsers();
  }
}
