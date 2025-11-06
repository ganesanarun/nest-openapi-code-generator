# Quick Reference: Controller Override Pattern

## Generated Base Controller
```typescript
// Generated: src/generated/user/user.controller.base.ts
@ApiTags('users')
export abstract class UserControllerBase {
  // Decorated method (framework concerns)
  @Get('/users')
  @ApiOperation({ summary: 'Get users' })
  @ApiResponse({ status: 200, type: [UserDto] })
  _getUsers(@Query('page') page?: number): Promise<UserDto[]> {
    return this.getUsers(page); // Calls your implementation
  }

  // Abstract method (your implementation)
  abstract getUsers(page?: number): Promise<UserDto[]>;
}
```

## Your Implementation
```typescript
// Your implementation: src/modules/user/user.controller.ts
import { Controller } from '@nestjs/common';
import { UserControllerBase } from '../../generated/user/user.controller.base';

@Controller() // ← Required for dependency injection
export class UserController extends UserControllerBase {
  constructor(private userService: UserService) {
    super();
  }

  // Clean implementation (no decorators)
  async getUsers(page?: number): Promise<UserDto[]> {
    return this.userService.findAll({ page });
  }
}
```

## Key Points

### ✅ Do
- Add `@Controller()` to your implementation class
- Implement all abstract methods from the base class
- Focus on business logic in your implementation
- Use dependency injection in your constructor

### ❌ Don't
- Add framework decorators to your implementation methods
- Register the base class in modules (only register your implementation)
- Modify the generated base class files

## Module Registration
```typescript
@Module({
  controllers: [UserController], // Your implementation
  providers: [UserService],
})
export class UserModule {}
```

## Testing
```typescript
describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should return users', async () => {
    const result = await controller.getUsers(1);
    expect(result).toBeDefined();
  });
});
```

## Benefits
- 🎯 **Clean Separation**: Framework vs business logic
- 🔧 **Easy Testing**: Test business logic without framework dependencies
- 📝 **Type Safety**: Identical method signatures
- 🚀 **Maintainable**: Changes to OpenAPI only affect generated code