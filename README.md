# @snow-tzu/nest-openapi-code-generator

[![npm version](https://img.shields.io/npm/v/@snow-tzu/nest-openapi-code-generator.svg)](https://www.npmjs.com/package/@snow-tzu/nest-openapi-code-generator) [![build](https://github.com/ganesanarun/nest-openapi-code-generator/actions/workflows/build.yml/badge.svg)](https://github.com/ganesanarun/nest-openapi-code-generator/actions/workflows/build.yml)

![Open API Generator](docs/images/master.jpeg)

A contract-first OpenAPI code generator for NestJS applications that automatically generates controllers, DTOs, and type
definitions from OpenAPI 3.1 specifications with built-in validation.

## Features

- 🚀 **Contract-First Development**: Generate NestJS code from OpenAPI specifications
- 🔍 **OpenAPI 3.1 Support**: Full compatibility with the latest OpenAPI specification
- 🛡️ **Automatic Validation**: Built-in class-validator decorators for request/response validation
- 🔄 **Path Parameter Conversion**: Automatic conversion from OpenAPI `{param}` to NestJS `:param` format
- 📁 **File Watching**: Automatic regeneration when OpenAPI specs change
- 🎯 **TypeScript First**: Full TypeScript support with comprehensive type definitions
- 🔧 **Configurable**: Flexible configuration options for different project needs
- 📦 **Zero Dependencies**: Works out of the box with minimal setup

## Installation

### npm

```bash
npm install @snow-tzu/nest-openapi-code-generator
```

### yarn

```bash
yarn add @snow-tzu/nest-openapi-code-generator
```

### pnpm

```bash
pnpm add @snow-tzu/nest-openapi-code-generator
```

## Quick Start

### 1. Create an OpenAPI Specification

Create a file `specs/user.openapi.yaml`:

```yaml
openapi: 3.1.0
info:
  title: User API
  version: 1.0.0

paths:
  /users:
    get:
      operationId: getUsers
      summary: Get all users
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'

    post:
      operationId: createUser
      summary: Create a new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - firstName
        - lastName
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        firstName:
          type: string
          minLength: 1
          maxLength: 50
        lastName:
          type: string
          minLength: 1
          maxLength: 50

    CreateUserRequest:
      type: object
      required:
        - email
        - firstName
        - lastName
      properties:
        email:
          type: string
          format: email
        firstName:
          type: string
          minLength: 1
          maxLength: 50
        lastName:
          type: string
          minLength: 1
          maxLength: 50
```

### 2. Generate Code

#### Using CLI

```bash
npx openapi-generate
```

#### Using Node.js API

```typescript
import {generateFromConfig} from '@snow-tzu/nest-openapi-code-generator';

await generateFromConfig({
    specsDir: './specs',
    outputDir: './src/generated'
});
```

### 3. Generated Output

The generator will create:

**Controllers** (`src/generated/user/user.controller.base.ts`):

```typescript
import {
    Get, Post, Put, Patch, Delete,
    Body, Param, Query, Headers, HttpCode
} from '@nestjs/common';
import {ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiHeader} from '@nestjs/swagger';
import {CreateUserRequestDto, UserDto} from './user.dto';

@ApiTags('users')
export abstract class UserControllerBase {
    // Decorated method with all NestJS annotations
    @Get('/users')
    @ApiOperation({summary: 'Get all users'})
    @ApiResponse({status: 200, type: [UserDto]})
    _getUsers(): Promise<UserDto[]> {
        return this.getUsers();
    }

    // Abstract method for your implementation (no decorators)
    abstract getUsers(): Promise<UserDto[]>;

    @Post('/users')
    @ApiOperation({summary: 'Create a new user'})
    @ApiResponse({status: 201, type: UserDto})
    _createUser(
        @Body() body: CreateUserRequestDto
    ): Promise<UserDto> {
        return this.createUser(body);
    }

    abstract createUser(body: CreateUserRequestDto): Promise<UserDto>;
}
```

**Implementation** (`src/modules/user/user.controller.ts`):

```typescript
import {Controller} from '@nestjs/common';
import {UserControllerBase} from '../../generated/user/user.controller.base';
import {CreateUserRequestDto, UserDto} from '../../generated/user/user.dto';
import {UserService} from './user.service';

@Controller('users') // Add @Controller here for dependency injection
export class UserController extends UserControllerBase {
    constructor(private readonly userService: UserService) {
        super();
    }

    // Clean implementation without decorators - just business logic
    async getUsers(): Promise<UserDto[]> {
        return this.userService.findAll();
    }

    async createUser(body: CreateUserRequestDto): Promise<UserDto> {
        return this.userService.create(body);
    }
}
```

**Key Benefits of the Override Pattern:**

- 🎯 **Clean Separation**: Framework concerns (decorators) are separated from business logic
- 🔧 **Easy Override**: Just implement the abstract methods without worrying about decorators
- 🚀 **Dependency Injection**: Add `@Controller()` to your implementation class for proper DI
- 📝 **Type Safety**: Both methods have identical signatures ensuring type safety

**DTOs** (`src/generated/dtos/user.dto.ts`):

```typescript
import {IsString, IsEmail, IsUUID, MinLength, MaxLength, IsNotEmpty} from 'class-validator';
import {ApiProperty} from '@nestjs/swagger';

export class User {
    @ApiProperty({format: 'uuid'})
    @IsUUID()
    id: string;

    @ApiProperty({format: 'email'})
    @IsEmail()
    email: string;

    @ApiProperty({minLength: 1, maxLength: 50})
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({minLength: 1, maxLength: 50})
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    @IsNotEmpty()
    lastName: string;
}

export class CreateUserRequest {
    @ApiProperty({format: 'email'})
    @IsEmail()
    email: string;

    @ApiProperty({minLength: 1, maxLength: 50})
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({minLength: 1, maxLength: 50})
    @IsString()
    @MinLength(1)
    @MaxLength(50)
    @IsNotEmpty()
    lastName: string;
}
```

## CLI Usage

### Basic Commands

```bash
# Generate from default configuration
npx openapi-generate

# Specify custom paths
npx openapi-generate --specs ./api-specs --output ./src/api

# Watch for changes
npx openapi-generate --watch

# Use custom config file
npx openapi-generate --config ./openapi.config.js
```

### CLI Options

| Option     | Alias | Description             | Default             |
|------------|-------|-------------------------|---------------------|
| `--config` | `-c`  | Path to config file     | `openapi.config.js` |
| `--specs`  | `-s`  | Path to specs directory | `./specs`           |
| `--output` | `-o`  | Output directory        | `./src/generated`   |
| `--watch`  | `-w`  | Watch for changes       | `false`             |

## Configuration

### Configuration File

Create `openapi.config.js` in your project root:

```javascript
module.exports = {
    specsDir: './specs',
    outputDir: './src/generated',
    generateControllers: true,
    generateDtos: true,
    generateTypes: true,
    generatorOptions: {
        useSingleRequestParameter: false,
        additionalProperties: {
            // Custom properties for templates
        }
    },
    vendorExtensions: {
        'x-controller-name': 'controllerName'
    }
};
```

### TypeScript Configuration

For TypeScript projects, create `openapi.config.ts`:

```typescript
import {GeneratorConfig} from '@snow-tzu/nest-openapi-code-generator';

const config: GeneratorConfig = {
    specsDir: './specs',
    outputDir: './src/generated',
    generateControllers: true,
    generateDtos: true,
    generateTypes: true,
    generatorOptions: {
        useSingleRequestParameter: false
    }
};

export default config;
```

### Configuration Options

| Option                                           | Type      | Description                                         | Default           |
|--------------------------------------------------|-----------|-----------------------------------------------------|-------------------|
| `specsDir`                                       | `string`  | Directory containing OpenAPI specs                  | `./specs`         |
| `outputDir`                                      | `string`  | Output directory for generated code                 | `./src/generated` |
| `generateControllers`                            | `boolean` | Generate NestJS controllers                         | `true`            |
| `generateDtos`                                   | `boolean` | Generate DTO classes                                | `true`            |
| `generateTypes`                                  | `boolean` | Generate TypeScript types                           | `true`            |
| `templateDir`                                    | `string`  | Custom template directory                           | `undefined`       |
| `generatorOptions.useSingleRequestParameter`     | `boolean` | Use single parameter for request body               | `false`           |
| `generatorOptions.includeErrorTypesInReturnType` | `boolean` | Include error response types in method return types | `false`           |
| `vendorExtensions`                               | `object`  | Custom vendor extension mappings                    | `{}`              |

## Programmatic API

### Basic Usage

```typescript
import {
    generateFromConfig,
    GeneratorOrchestrator,
    ConfigLoader
} from '@snow-tzu/nest-openapi-code-generator';

// Quick generation with default config
await generateFromConfig();

// Custom configuration
await generateFromConfig({
    specsDir: './my-specs',
    outputDir: './src/api'
});

// Advanced usage with orchestrator
const configLoader = new ConfigLoader();
const config = await configLoader.loadConfig();
const orchestrator = new GeneratorOrchestrator(config);
await orchestrator.generate();
```

### Parsing OpenAPI Specs

```typescript
import {parseSpec, SpecParser} from '@snow-tzu/nest-openapi-code-generator';

// Quick parsing
const spec = await parseSpec('./specs/user.openapi.yaml');

// Advanced parsing with custom parser
const parser = new SpecParser();
const spec = await parser.parseSpec('./specs/user.openapi.yaml');
```

### File Watching

```typescript
import {SpecWatcher} from '@snow-tzu/nest-openapi-code-generator';

const watcher = new SpecWatcher({
    specsDir: './specs',
    outputDir: './src/generated'
});

await watcher.start();

// Stop watching
watcher.stop();
```

## Naming Conventions & Code Generation Patterns

### File Naming Conventions

The generator follows specific naming conventions based on your OpenAPI specification file names:

#### Spec File Names → Generated Class Names

| Spec File                       | Generated Controller Class      | Generated DTO File        |
|---------------------------------|---------------------------------|---------------------------|
| `user.openapi.yaml`             | `UserControllerBase`            | `user.dto.ts`             |
| `user.query.openapi.yaml`       | `UserQueryControllerBase`       | `user.query.dto.ts`       |
| `order-management.openapi.yaml` | `OrderManagementControllerBase` | `order-management.dto.ts` |
| `api.v1.users.openapi.yaml`     | `ApiV1UsersControllerBase`      | `api.v1.users.dto.ts`     |

The generator automatically:

- Splits file names on dots (`.`), hyphens (`-`), and underscores (`_`)
- Capitalizes each part using PascalCase
- Joins them together for the class name

### Shared DTOs
A shared DTO is a Data Transfer Object that is used across multiple resources or modules in your API. To avoid duplication, shared DTOs are generated once in a dedicated `shared/` folder in the `shared.dto.ts` file and imported wherever needed.

#### How to Mark a Schema as Shared
To mark a schema as shared, add the `x-shared: true` vendor extension to your schema definition in your OpenAPI YAML file. For example:
```yaml
# specs/schemas/common.yaml
components:
  schemas:
    ApiMessage:
      x-shared: true
      type: object
      required:
        - message
      properties:
        message:
          type: string
```

Then use it in your `user.openapi.yaml` file:
```yaml
# specs/user.openapi.yaml
openapi: 3.1.0
...
paths:
  /users:
    get:
      operationId: getUsers
      summary: Get all users
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ApiMessage' 

components:
  schemas:
    User:
      type: object
      ...
    ApiMessage: # <-- reference external schema from here
      $ref: './schemas/common.yaml#/components/schemas/ApiMessage'
```
For correct parsing, it's important to first reference your external schema under `user.openapi.yaml` `components.schemas`. Additionally, if a schema from an external file uses a shared schema, that shared schema should also be referenced under `user.openapi.yaml` `components.schemas` (only top-level shared schemas are parsed by generator)

Any schema with `x-shared: true` will be generated as a shared DTO.
This approach keeps your code DRY and your DTOs consistent across your API.

#### Nested Shared DTO

Shared schemas can be nested for better composition. For example, this is valid syntax:
```yaml
# specs/schemas/common.yaml
components:
  schemas:
    NestedInfo:  
      type: object
      required:
        - infoId
      properties:
        infoId:
          type: string
          format: uuid
          description: The unique identifier for the nested info
          example: "123e4567-e89b-12d3-a456-426614174000"

    ComplexObject:
      x-shared: true
      type: object
      required:
        - message
      properties:
        message:
          type: string
        nestedInfo:
          $ref: '#/components/schemas/NestedInfo'
```
`x-shared` is optional for nested objects as they aren't directly exposed to `user.openapi.yaml`.

### Directory Structure

Generated files are organized by resource name.
Shared dto's are under shared/ folder
```
src/generated/
├── user/
│   ├── user.controller.base.ts
│   └── user.dto.ts
├── user.query/
│   ├── user.query.controller.base.ts
│   └── user.query.dto.ts
├── order-management/
│   ├── order-management.controller.base.ts
│   └── order-management.dto.ts
└── shared/
    └── shared.dto.ts
```

## Path Parameter Handling

The generator automatically converts OpenAPI path parameter format to NestJS format:

### Path Parameter Conversion

OpenAPI specifications use curly braces `{paramName}` for path parameters, while NestJS uses colons `:paramName`. The generator handles this conversion automatically:

**OpenAPI Specification:**
```yaml
paths:
  /users/{userId}:
    get:
      operationId: getUserById
      parameters:
        - name: userId
          in: path
          required: true
          schema:
            type: string
```

**Generated Controller:**
```typescript
@Get('/users/:userId')  // Automatically converted to NestJS format
@ApiParam({ name: 'userId', type: String })
_getUserById(
    @Param('userId') userId: string
): Promise<UserDto> {
    return this.getUserById(userId);
}
```

### Multiple Path Parameters

The conversion works seamlessly with multiple path parameters:

**OpenAPI:**
```yaml
/users/{userId}/posts/{postId}:
  get:
    operationId: getUserPost
```

**Generated:**
```typescript
@Get('/users/:userId/posts/:postId')
_getUserPost(
    @Param('userId') userId: string,
    @Param('postId') postId: string
): Promise<PostDto> {
    return this.getUserPost(userId, postId);
}
```

### Parameter Name Preservation

The generator preserves exact parameter names including:
- CamelCase: `{userId}` → `:userId`
- Underscores: `{user_id}` → `:user_id`
- Numbers: `{user_id_123}` → `:user_id_123`
- Mixed formats: `{api_version}` → `:api_version`

## Advanced Features

### Custom Templates

You can provide custom Handlebars templates for code generation:

1. Create the templates' directory:
    ```
    templates/
    ├── controller.hbs
    ├── dto.hbs
    └── types.hbs
    ```

2. Configure the template directory:

    ```javascript
    module.exports = {
        templateDir: './templates',
        // ... other options
    };
    ```

### Vendor Extensions

Support for custom OpenAPI vendor extensions:

```yaml
# In your OpenAPI spec
paths:
  /users:
    get:
      x-controller-name: UserManagement
      x-custom-decorator: '@CustomDecorator()'
```

```javascript
// In your config
module.exports = {
    vendorExtensions: {
        'x-controller-name': 'controllerName',
        'x-custom-decorator': 'customDecorator'
    }
};
```

### Multiple Spec Files

The generator automatically processes all OpenAPI files in the specs directory:

```
specs/
├── user.openapi.yaml
├── product.openapi.json
├── order.openapi.yml
└── inventory.openapi.yaml
```

Each spec file generates its own set of controllers and DTOs.

## Integration with NestJS

### 1. Extend Generated Controller Base Class

```typescript
// user.service.ts
import {Injectable} from '@nestjs/common';
import {User, CreateUserRequest} from './generated/dtos';

@Injectable()
export class UserService {
    async getUsers(): Promise<User[]> {
        // Your implementation
        return [];
    }

    async createUser(request: CreateUserRequest): Promise<User> {
        // Your implementation
        return {} as User;
    }
}
```

```typescript
// user.controller.ts (extend generated controller)
import {Controller} from '@nestjs/common';
import {UserControllerBase} from './generated/user/user.controller.base';
import {UserService} from './user.service';
import {CreateUserRequestDto, UserDto} from './generated/user/user.dto';

@Controller() // Add @Controller for dependency injection
export class UserController extends UserControllerBase {
    constructor(private userService: UserService) {
        super();
    }

    // Clean implementation without decorators
    async getUsers(): Promise<UserDto[]> {
        return this.userService.getUsers();
    }

    async createUser(body: CreateUserRequestDto): Promise<UserDto> {
        return this.userService.createUser(body);
    }
}
```

### 2. Import Implemented Controller

```typescript
// app.module.ts
import {Module} from '@nestjs/common';
import {UserController} from './controllers/user.controller';

@Module({
    controllers: [UserController],
    // ... other module configuration
})
export class AppModule {
}
```

### 3. Validation Pipeline

The generated DTOs work seamlessly with NestJS validation:

```typescript
// main.ts
import {ValidationPipe} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    await app.listen(3000);
}

bootstrap();
```

## Best Practices

### 1. Organize Your Specs

```
specs/
├── common/
│   ├── errors.yaml
│   └── pagination.yaml
├── user/
│   └── user.openapi.yaml
├── product/
│   └── product.openapi.yaml
└── order/
    └── order.openapi.yaml
```

### 2. Use References

```yaml
# specs/common/errors.yaml
components:
  schemas:
    Error:
      type: object
      properties:
        code:
          type: string
        message:
          type: string

# specs/user/user.openapi.yaml
openapi: 3.1.0
# ... other content
components:
  schemas:
    # Reference common schemas
    Error:
      $ref: '../common/errors.yaml#/components/schemas/Error'
```

### 3. Validation Best Practices

```yaml
# Use comprehensive validation in your schemas
CreateUserRequest:
  type: object
  required:
    - email
    - firstName
    - lastName
  properties:
    email:
      type: string
      format: email
      maxLength: 255
    firstName:
      type: string
      minLength: 1
      maxLength: 50
      pattern: '^[a-zA-Z\s]+$'
    age:
      type: integer
      minimum: 13
      maximum: 120
```

### 4. Use Meaningful Operation IDs

```yaml
paths:
  /users:
    get:
      operationId: getUsers  # Becomes method name
    post:
      operationId: createUser
  /users/{id}:
    get:
      operationId: getUserById
    put:
      operationId: updateUser
    delete:
      operationId: deleteUser
```

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

Make sure you've installed all peer dependencies:

```bash
yarn install @nestjs/common @nestjs/swagger class-validator class-transformer
```

#### 2. Validation is not working

Ensure you have the ValidationPipe configured:

```typescript
app.useGlobalPipes(new ValidationPipe());
```

#### 3. Generated files not updating

Try clearing the output directory and regenerating:

```bash
rm -rf src/generated
npx openapi-generate
```

#### 4. TypeScript compilation errors

Check that your `tsconfig.json` includes the generated files:

```json
{
  "include": [
    "src/**/*",
    "src/generated/**/*"
  ]
}
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=openapi-generator npx openapi-generate
```

Or programmatically:

```typescript
import {Logger, LogLevel} from '@snow-tzu/nest-openapi-code-generator';

const logger = new Logger();
logger.setLevel(LogLevel.DEBUG);
```

### Development Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/ganesanarun/nest-openapi-code-generator.git
    cd nest-openapi-code-generator
    ```

2. Install dependencies:

    ```bash
    yarn install
    ```

3. Run tests:

    ```bash
    yarn test
    ```

4. Build the project:

    ```bash
    yarn run build
    ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/ganesanarun/nest-openapi-code-generator/wiki)
- 🐛 [Issue Tracker](https://github.com/ganesanarun/nest-openapi-code-generator/issues)
- 📧 [Email Support](mailto:ganesan1063@gmail.com)