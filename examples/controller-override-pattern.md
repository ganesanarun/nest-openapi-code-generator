# Controller Override Pattern Guide

This guide explains the controller override pattern used by the OpenAPI NestJS Generator, which provides a clean
separation between framework concerns and business logic.

## Overview

The generator creates abstract base controllers that use a dual-method pattern:

- **Decorated methods** (prefixed with `_`) handle all NestJS framework concerns
- **Abstract methods** provide clean interfaces for your business logic implementation

## Pattern Structure

### Generated Base Controller

```typescript
// Generated: src/generated/user/user.controller.base.ts
import {
    Get, Post, Put, Patch, Delete,
    Body, Param, Query, Headers, HttpCode
} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery} from '@nestjs/swagger';
import {CreateUserRequestDto, UserDto, UpdateUserRequestDto} from './user.dto';

@ApiTags('users')
export abstract class UserControllerBase {
    // Decorated method - handles all framework concerns
    @Get('/users')
    @ApiOperation({summary: 'Get all users'})
    @ApiQuery({name: 'page', type: Number, required: false})
    @ApiQuery({name: 'limit', type: Number, required: false})
    @ApiResponse({status: 200, type: [UserDto]})
    @ApiResponse({status: 400, description: 'Bad Request'})
    _getUsers(
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ): Promise<UserDto[]> {
        return this.getUsers(page, limit); // Delegates to your implementation
    }

    // Abstract method - clean interface for your implementation
    abstract getUsers(
        page?: number,
        limit?: number
    ): Promise<UserDto[]>;

    @Post('/users')
    @ApiOperation({summary: 'Create a new user'})
    @ApiResponse({status: 201, type: UserDto})
    @ApiResponse({status: 400, description: 'Validation Error'})
    _createUser(
        @Body() body: CreateUserRequestDto
    ): Promise<UserDto> {
        return this.createUser(body);
    }

    abstract createUser(body: CreateUserRequestDto): Promise<UserDto>;

    // Path parameters are automatically converted from OpenAPI {userId} to NestJS :userId
    @Get('/users/:userId')
    @ApiOperation({summary: 'Get user by ID'})
    @ApiParam({name: 'userId', type: String})
    @ApiResponse({status: 200, type: UserDto})
    @ApiResponse({status: 404, description: 'User not found'})
    _getUserById(
        @Param('userId') userId: string
    ): Promise<UserDto> {
        return this.getUserById(userId);
    }

    abstract getUserById(userId: string): Promise<UserDto>;
}
```

### Your Implementation

```typescript
// Your implementation: src/modules/user/user.controller.ts
import {Controller, NotFoundException} from '@nestjs/common';
import {UserControllerBase} from '../../generated/user/user.controller.base';
import {CreateUserRequestDto, UserDto} from '../../generated/user/user.dto';
import {UserService} from './user.service';

@Controller() // Important: Add @Controller here for dependency injection
export class UserController extends UserControllerBase {
    constructor(private readonly userService: UserService) {
        super();
    }

    // Clean implementation - no decorators, just business logic
    async getUsers(page?: number, limit?: number): Promise<UserDto[]> {
        const options = {
            page: page || 1,
            limit: limit || 10
        };
        return this.userService.findAll(options);
    }

    async createUser(body: CreateUserRequestDto): Promise<UserDto> {
        // Validation is handled by the framework via the decorated method
        return this.userService.create(body);
    }

    async getUserById(userId: string): Promise<UserDto> {
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }
        return user;
    }
}
```

## Key Benefits

### 1. Clean Separation of Concerns

**Framework Concerns (Generated Base Class):**

- HTTP method decorators (`@Get`, `@Post`, etc.)
- Parameter decorators (`@Body`, `@Param`, `@Query`)
- API documentation decorators (`@ApiOperation`, `@ApiResponse`)
- Validation and transformation
- Routing and path handling

**Business Logic (Your Implementation):**

- Service calls and data processing
- Business rule validation
- Error handling and exceptions
- Domain-specific logic

### 2. Type Safety

Both methods have identical signatures, ensuring type safety:

```typescript
// Both methods have the same signature
_getUsers(page?: number, limit?: number): Promise<UserDto[]>  // Decorated

abstract getUsers(page?: number, limit?: number): Promise<UserDto[]>  // Abstract
```

### 3. Easy Testing

Test your business logic without framework dependencies:

```typescript
// user.controller.spec.ts
describe('UserController', () => {
    let controller: UserController;
    let service: UserService;

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                {
                    provide: UserService,
                    useValue: {
                        findAll: jest.fn(),
                        create: jest.fn(),
                        findById: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<UserController>(UserController);
        service = module.get<UserService>(UserService);
    });

    describe('getUsers', () => {
        it('should return users from service', async () => {
            const mockUsers = [{id: '1', name: 'John'}];
            jest.spyOn(service, 'findAll').mockResolvedValue(mockUsers);

            const result = await controller.getUsers(1, 10);

            expect(service.findAll).toHaveBeenCalledWith({page: 1, limit: 10});
            expect(result).toEqual(mockUsers);
        });
    });
});
```

### 4. Maintainability

- Changes to OpenAPI spec only affect the generated base class
- Your business logic remains unchanged
- Framework updates don't break your implementation
- Easy to refactor and modify business logic

## Implementation Guidelines

### 1. Controller Setup

Always add `@Controller()` to your implementation class:

```typescript

@Controller() // Required for dependency injection
export class UserController extends UserControllerBase {
    // ...
}
```

### 2. Method Implementation

Implement all abstract methods from the base class:

```typescript
export class UserController extends UserControllerBase {
    // Must implement all abstract methods
    async getUsers(page?: number, limit?: number): Promise<UserDto[]> {
        // Your implementation
    }

    async createUser(body: CreateUserRequestDto): Promise<UserDto> {
        // Your implementation
    }

    // ... implement all other abstract methods
}
```

### 3. Error Handling

Handle business logic errors in your implementation:

```typescript
async getUserById(userId: string): Promise <UserDto> {
    const user = await this.userService.findById(userId);
    if(!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
   }
   return user;
}
```

### 4. Service Integration

Inject and use services for business logic:

```typescript

@Controller('users')
export class UserController extends UserControllerBase {
    constructor(
        private readonly userService: UserService,
        private readonly emailService: EmailService,
        private readonly auditService: AuditService
    ) {
        super();
    }

    async createUser(body: CreateUserRequestDto): Promise<UserDto> {
        // Business logic with multiple services
        const user = await this.userService.create(body);
        await this.emailService.sendWelcomeEmail(user.email);
        await this.auditService.logUserCreation(user.id);
        return user;
    }
}
```

## Module Configuration

Register your controller in the module:

```typescript
// user.module.ts
import {Module} from '@nestjs/common';
import {UserController} from './user.controller';
import {UserService} from './user.service';

@Module({
    controllers: [UserController], // Your implementation, not the base class
    providers: [UserService],
    exports: [UserService]
})
export class UserModule {
}
```

## Advanced Patterns

### 1. Middleware Integration

The pattern works seamlessly with NestJS middleware:

```typescript

@Controller()
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
export class UserController extends UserControllerBase {
    // Your implementation inherits all middleware
}
```

### 2. Custom Decorators

Add custom decorators to your implementation class:

```typescript

@Controller()
@ApiExtraModels(UserDto, CreateUserRequestDto)
export class UserController extends UserControllerBase {
    @Roles('admin')
    async createUser(body: CreateUserRequestDto): Promise<UserDto> {
        // Implementation with role-based access
    }
}
```

### 3. Async Operations

Handle complex async operations cleanly:

```typescript
async createUser(body: CreateUserRequestDto): Promise<UserDto> {
    // Complex business logic
    const existingUser = await this.userService.findByEmail(body.email);
    if(existingUser) {
        throw new ConflictException('User already exists');
    }

    const user = await this.userService.create(body);

    // Fire and forget operations
    this.emailService.sendWelcomeEmail(user.email).catch(console.error);
    this.analyticsService.trackUserRegistration(user.id).catch(console.error);

    return user;
}
```


## Best Practices

1. **Keep implementations clean** - No framework decorators in your implementation
2. **Use dependency injection** - Add `@Controller()` to your implementation class
3. **Handle errors appropriately** - Use NestJS exceptions in your business logic
4. **Test business logic** - Focus tests on your implementation methods
5. **Leverage services** - Keep controllers thin, services thick
6. **Document business rules** - Add comments to your implementation methods

This pattern provides a robust, maintainable, and testable foundation for your NestJS applications while keeping your
code clean and focused on business value.