import { Injectable, Query } from '@nestjs/common';
import { UserController as GeneratedUserController } from '../generated/controllers/user.controller';
import { UserService } from './user.service';
import { User, CreateUserRequest, UpdateUserRequest } from '../generated/dtos';

@Injectable()
export class UserController extends GeneratedUserController {
  constructor(private readonly userService: UserService) {
    super();
  }

  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.userService.getUsers(page, limit);
  }

  async createUser(body: CreateUserRequest): Promise<User> {
    return this.userService.createUser(body);
  }

  async getUserById(userId: string): Promise<User> {
    return this.userService.getUserById(userId);
  }

  async updateUser(userId: string, body: UpdateUserRequest): Promise<User> {
    return this.userService.updateUser(userId, body);
  }

  async deleteUser(userId: string): Promise<void> {
    return this.userService.deleteUser(userId);
  }
}