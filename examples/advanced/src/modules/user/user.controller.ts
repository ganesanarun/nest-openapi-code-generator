import { Injectable, Query, Param, Body } from '@nestjs/common';
// Note: This import will be available after running the generator
// import { UserManagementController as GeneratedUserController } from '../../generated/controllers/user-management.controller';
import { UserService } from './user.service';

@Injectable()
export class UserController {
  constructor(private readonly userService: UserService) {}

  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
    @Query('search') search?: string,
    @Query('status') status?: string[],
    @Query('role') role?: string[],
    @Query('createdAfter') createdAfter?: string,
    @Query('createdBefore') createdBefore?: string,
  ) {
    return this.userService.getUsers({
      page,
      limit,
      sort,
      search,
      status,
      role,
      createdAfter,
      createdBefore,
    });
  }

  async createUser(@Body() body: any) {
    return this.userService.createUser(body);
  }

  async getUserById(
    @Param('userId') userId: string,
    @Query('includeProfile') includeProfile?: boolean,
    @Query('includePreferences') includePreferences?: boolean,
  ) {
    return this.userService.getUserById(userId, {
      includeProfile,
      includePreferences,
    });
  }

  async updateUser(
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.userService.updateUser(userId, body);
  }

  async deleteUser(
    @Param('userId') userId: string,
    @Query('permanent') permanent?: boolean,
  ) {
    return this.userService.deleteUser(userId, permanent);
  }
}