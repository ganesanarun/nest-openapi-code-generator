import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
// Note: These imports will be available after running the generator
// import { User, CreateUserRequest, UpdateUserRequest, UserDetailed } from '../../generated/dtos';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  
  // Mock data store - replace with actual database
  private users: any[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      status: 'active',
      role: 'admin',
      createdAt: '2023-01-15T10:30:00Z',
      updatedAt: '2023-01-15T10:30:00Z',
      lastLoginAt: '2023-01-20T10:30:00Z',
      profile: {
        bio: 'System administrator',
        location: 'San Francisco, CA',
      },
      preferences: {
        theme: 'dark',
        language: 'en-US',
        notifications: {
          email: true,
          push: false,
          sms: false,
        },
      },
    },
  ];

  async getUsers(filters: {
    page?: number;
    limit?: number;
    sort?: string;
    search?: string;
    status?: string[];
    role?: string[];
    createdAfter?: string;
    createdBefore?: string;
  }) {
    this.logger.log(`Getting users with filters: ${JSON.stringify(filters)}`);

    let filteredUsers = [...this.users];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status?.length) {
      filteredUsers = filteredUsers.filter(user =>
        filters.status!.includes(user.status)
      );
    }

    if (filters.role?.length) {
      filteredUsers = filteredUsers.filter(user =>
        filters.role!.includes(user.role)
      );
    }

    if (filters.createdAfter) {
      filteredUsers = filteredUsers.filter(user =>
        new Date(user.createdAt) >= new Date(filters.createdAfter!)
      );
    }

    if (filters.createdBefore) {
      filteredUsers = filteredUsers.filter(user =>
        new Date(user.createdAt) <= new Date(filters.createdBefore!)
      );
    }

    // Apply sorting
    if (filters.sort) {
      const [field, direction] = filters.sort.split(':');
      filteredUsers.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'desc' ? -comparison : comparison;
      });
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return {
      data: paginatedUsers,
      pagination: {
        page,
        limit,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / limit),
        hasNext: endIndex < filteredUsers.length,
        hasPrevious: page > 1,
      },
    };
  }

  async createUser(createUserRequest: any) {
    this.logger.log(`Creating user: ${createUserRequest.email}`);

    // Check if user already exists
    const existingUser = this.users.find(u => u.email === createUserRequest.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const newUser = {
      id: this.generateUuid(),
      ...createUserRequest,
      status: 'active',
      role: createUserRequest.role || 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    // Remove password from stored user
    const { password, ...userWithoutPassword } = newUser;
    this.users.push(userWithoutPassword);

    this.logger.log(`User created successfully: ${newUser.id}`);
    return userWithoutPassword;
  }

  async getUserById(userId: string, options: {
    includeProfile?: boolean;
    includePreferences?: boolean;
  } = {}) {
    this.logger.log(`Getting user by ID: ${userId}`);

    const user = this.users.find(u => u.id === userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    let result = { ...user };

    // Add additional data based on options
    if (options.includeProfile && user.profile) {
      result.profile = user.profile;
    }

    if (options.includePreferences && user.preferences) {
      result.preferences = user.preferences;
    }

    // Add statistics
    result.statistics = {
      loginCount: Math.floor(Math.random() * 100),
      lastActiveAt: user.lastLoginAt || user.updatedAt,
      accountAge: Math.floor(
        (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      ),
    };

    return result;
  }

  async updateUser(userId: string, updateUserRequest: any) {
    this.logger.log(`Updating user: ${userId}`);

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

    this.logger.log(`User updated successfully: ${userId}`);
    return updatedUser;
  }

  async deleteUser(userId: string, permanent: boolean = false) {
    this.logger.log(`Deleting user: ${userId} (permanent: ${permanent})`);

    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (permanent) {
      // Permanently delete the user
      this.users.splice(userIndex, 1);
      this.logger.log(`User permanently deleted: ${userId}`);
    } else {
      // Soft delete - mark as inactive
      this.users[userIndex] = {
        ...this.users[userIndex],
        status: 'inactive',
        updatedAt: new Date().toISOString(),
      };
      this.logger.log(`User soft deleted: ${userId}`);
    }
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}