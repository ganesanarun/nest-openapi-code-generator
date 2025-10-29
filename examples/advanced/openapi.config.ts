import { GeneratorConfig } from '@openapi-nestjs/generator';

const config: GeneratorConfig = {
  specsDir: './specs',
  outputDir: './src/generated',
  generateControllers: true,
  generateDtos: true,
  generateTypes: true,
  
  // Custom template directory
  templateDir: './templates',
  
  // Generator options
  generatorOptions: {
    useSingleRequestParameter: false,
    additionalProperties: {
      generateServices: true,
      includeValidation: true,
      useCustomDecorators: true,
    }
  },
  
  // Vendor extension mappings
  vendorExtensions: {
    'x-controller-name': 'controllerName',
    'x-generate-service': 'generateService',
    'x-validation-rules': 'validationRules',
    'x-custom-decorator': 'customDecorator',
    'x-auth-required': 'authRequired',
    'x-rate-limit': 'rateLimit',
  }
};

export default config;