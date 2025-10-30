# @snow-tzu/nest-openapi-code-generator

A contract-first OpenAPI code generator for NestJS applications that automatically generates controllers, DTOs, and type definitions from OpenAPI 3.1 specifications with built-in validation.

## Features

- 🚀 **Contract-First Development**: Generate NestJS code from OpenAPI specifications
- 🔍 **OpenAPI 3.1 Support**: Full compatibility with the latest OpenAPI specification
- 🛡️ **Automatic Validation**: Built-in class-validator decorators for request/response validation
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
import { generateFromConfig } from '@snow-tzu/nest-openapi-code-generator';

await generateFromConfig({
  specsDir: './specs',
  outputDir: './src/generated'
});
```

### 3. Generated Output

The generator will create:

**Controllers** (`src/generated/controllers/user.controller.ts`):
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User, CreateUserRequest } from '../dtos';

@ApiTags('users')
@Controller('users')
export class UserController {
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users', type: [User] })
  async getUsers(): Promise<User[]> {
    // Implementation goes here
    throw new Error('Method not implemented');
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created', type: User })
  async createUser(@Body() body: CreateUserRequest): Promise<User> {
    // Implementation goes here
    throw new Error('Method not implemented');
  }
}
```

**DTOs** (`src/generated/dtos/user.dto.ts`):
```typescript
import { IsString, IsEmail, IsUUID, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class User {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsNotEmpty()
  lastName: string;
}

export class CreateUserRequest {
  @ApiProperty({ format: 'email' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 1, maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ minLength: 1, maxLength: 50 })
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

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--config` | `-c` | Path to config file | `openapi.config.js` |
| `--specs` | `-s` | Path to specs directory | `./specs` |
| `--output` | `-o` | Output directory | `./src/generated` |
| `--watch` | `-w` | Watch for changes | `false` |

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
import { GeneratorConfig } from '@snow-tzu/nest-openapi-code-generator';

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

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `specsDir` | `string` | Directory containing OpenAPI specs | `./specs` |
| `outputDir` | `string` | Output directory for generated code | `./src/generated` |
| `generateControllers` | `boolean` | Generate NestJS controllers | `true` |
| `generateDtos` | `boolean` | Generate DTO classes | `true` |
| `generateTypes` | `boolean` | Generate TypeScript types | `true` |
| `templateDir` | `string` | Custom template directory | `undefined` |
| `generatorOptions.useSingleRequestParameter` | `boolean` | Use single parameter for request body | `false` |
| `vendorExtensions` | `object` | Custom vendor extension mappings | `{}` |

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
import { parseSpec, SpecParser } from '@snow-tzu/nest-openapi-code-generator';

// Quick parsing
const spec = await parseSpec('./specs/user.openapi.yaml');

// Advanced parsing with custom parser
const parser = new SpecParser();
const spec = await parser.parseSpec('./specs/user.openapi.yaml');
```

### File Watching

```typescript
import { SpecWatcher } from '@snow-tzu/nest-openapi-code-generator';

const watcher = new SpecWatcher({
  specsDir: './specs',
  outputDir: './src/generated'
});

await watcher.start();

// Stop watching
watcher.stop();
```

## Advanced Features

### Custom Templates

You can provide custom Handlebars templates for code generation:

1. Create a templates directory:
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

### 1. Import Generated Controllers

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './generated/controllers/user.controller';

@Module({
  controllers: [UserController],
  // ... other module configuration
})
export class AppModule {}
```

### 2. Implement Controller Methods

```typescript
// user.service.ts
import { Injectable } from '@nestjs/common';
import { User, CreateUserRequest } from './generated/dtos';

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
import { Injectable } from '@nestjs/common';
import { UserController as GeneratedUserController } from './generated/controllers/user.controller';
import { UserService } from './user.service';

@Injectable()
export class UserController extends GeneratedUserController {
  constructor(private userService: UserService) {
    super();
  }

  async getUsers() {
    return this.userService.getUsers();
  }

  async createUser(body) {
    return this.userService.createUser(body);
  }
}
```

### 3. Validation Pipeline

The generated DTOs work seamlessly with NestJS validation:

```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

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

#### 2. Validation not working
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
import { Logger, LogLevel } from '@snow-tzu/nest-openapi-code-generator';

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

- 📖 [Documentation](https://github.com/openapi-nestjs/generator/wiki)
- 🐛 [Issue Tracker](https://github.com/openapi-nestjs/generator/issues)
- 💬 [Discussions](https://github.com/openapi-nestjs/generator/discussions)
- 📧 [Email Support](mailto:ganesan1063@gmail.com)