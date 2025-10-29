import { Injectable, NotFoundException } from '@nestjs/common';
import { User, CreateUserRequest, UpdateUserRequest } from '../generated/dtos';

@Injectable()
export class UserService {
  private users: User[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      createdAt: '2023-01-15T10:30:00Z',
      updatedAt: '2023-01-15T10:30:00Z',
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      age: 25,
      createdAt: '2023-01-16T10:30:00Z',
      updatedAt: '2023-01-16T10:30:00Z',
    },
  ];

  async getUsers(page: number = 1, limit: number = 10) {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = this.users.slice(startIndex, endIndex);
    
    return {
      data: paginatedUsers,
      pagination: {
        page,
        limit,
        total: this.users.length,
        totalPages: Math.ceil(this.users.length / limit),
      },
    };
  }

  async createUser(createUserRequest: CreateUserRequest): Promise<User> {
    const newUser: User = {
      id: this.generateUuid(),
      ...createUserRequest,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    this.users.push(newUser);
    return newUser;
  }

  async getUserById(userId: string): Promise<User> {
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  async updateUser(userId: string, updateUserRequest: UpdateUserRequest): Promise<User> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updatedUser = {
      ...this.users[userIndex],
      ...updateUserRequest,
      updatedAt: new Date().toISOString(),
    };

    this.users[userIndex] = updatedUser;
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    this.users.splice(userIndex, 1);
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}