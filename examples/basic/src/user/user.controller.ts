import { Controller } from '@nestjs/common';
import { UserControllerBase } from '../generated/user/user.controller.base';
import { UserService } from './user.service';
import { UserDto, CreateUserRequestDto, UpdateUserRequestDto } from '../generated/user/user.dto';

@Controller('users') // Add @Controller for dependency injection
export class UserController extends UserControllerBase {
  constructor(private readonly userService: UserService) {
    super();
  }

  // Clean implementation without decorators - just business logic
  async getUsers(page?: number, limit?: number): Promise<UserDto[]> {
    return this.userService.getUsers(page, limit);
  }

  async createUser(body: CreateUserRequestDto): Promise<UserDto> {
    return this.userService.createUser(body);
  }

  async getUserById(userId: string): Promise<UserDto> {
    return this.userService.getUserById(userId);
  }

  async updateUser(userId: string, body: UpdateUserRequestDto): Promise<UserDto> {
    return this.userService.updateUser(userId, body);
  }

  async deleteUser(userId: string): Promise<void> {
    return this.userService.deleteUser(userId);
  }
}