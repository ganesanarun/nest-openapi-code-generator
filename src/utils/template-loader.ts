import * as fs from 'fs-extra';
import * as path from 'path';
import Handlebars from 'handlebars';

export class TemplateLoader {
  private templateCache = new Map<string, HandlebarsTemplateDelegate>();

  constructor(private templateDir?: string) {
    this.registerHelpers();
  }

  async loadTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    const cacheKey = `${this.templateDir || 'default'}:${templateName}`;
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    let templateContent: string;

    if (this.templateDir) {
      // Load from custom template directory
      const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
      if (await fs.pathExists(templatePath)) {
        templateContent = await fs.readFile(templatePath, 'utf-8');
      } else {
        // Fallback to default template
        templateContent = await this.getDefaultTemplate(templateName);
      }
    } else {
      // Use default template
      templateContent = await this.getDefaultTemplate(templateName);
    }

    const compiled = Handlebars.compile(templateContent);
    this.templateCache.set(cacheKey, compiled);
    return compiled;
  }

  private async getDefaultTemplate(templateName: string): Promise<string> {
    // Load from default templates directory (now in src/templates)
    const defaultTemplatesDir = path.join(__dirname, '../templates');
    const templatePath = path.join(defaultTemplatesDir, `${templateName}.hbs`);
    
    if (await fs.pathExists(templatePath)) {
      return await fs.readFile(templatePath, 'utf-8');
    }
    
    // Fallback to hardcoded templates if file doesn't exist
    switch (templateName) {
      case 'controller':
        return this.getDefaultControllerTemplate();
      case 'service':
        return this.getDefaultServiceTemplate();
      case 'dto':
        return this.getDefaultDtoTemplate();
      default:
        throw new Error(`Unknown template: ${templateName}`);
    }
  }

  private getDefaultControllerTemplate(): string {
    return `import { 
  Controller, Get, Post, Put, Patch, Delete, 
  Body, Param, Query, HttpCode, NotImplementedException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
{{#if dtoImports}}
{{{dtoImports}}}
{{/if}}

@Controller('{{basePath}}')
{{#if tags}}
@ApiTags({{#each tags}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}})
{{/if}}
export abstract class {{className}}Base {
{{#each methods}}

  @{{httpMethod}}({{#if path}}'{{path}}'{{/if}})
  {{#each decorators}}
  {{{this}}}
  {{/each}}
  {{methodName}}({{#if hasParams}}{{#each parameters}}
    {{{decorator}}} {{name}}: {{type}}{{#unless @last}},{{/unless}}{{/each}}{{#if bodyParam}}{{#if parameters}},{{/if}}
    {{{bodyParam.decorator}}} body: {{bodyParam.type}}{{/if}}{{/if}}
  ): Promise<{{returnType}}> {
    throw new NotImplementedException('{{methodName}} not yet implemented');
  }
{{/each}}
}`;
  }

  private getDefaultServiceTemplate(): string {
    return `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
{{#if dtoImports}}
{{{dtoImports}}}
{{/if}}

@Injectable()
export class {{className}}Service {
  private readonly logger = new Logger({{className}}Service.name);

{{#each methods}}
  async {{methodName}}({{#if hasParams}}{{#each parameters}}
    {{name}}: {{type}}{{#unless @last}},{{/unless}}{{/each}}{{#if bodyParam}}{{#if parameters}},{{/if}}
    body: {{bodyParam.type}}{{/if}}{{/if}}
  ): Promise<{{returnType}}> {
    this.logger.log('Executing {{methodName}}');
    
    // TODO: Implement business logic
    throw new Error('Method not implemented');
  }

{{/each}}
}`;
  }

  private getDefaultDtoTemplate(): string {
    return `import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, IsNumber, IsBoolean, IsArray, IsOptional, 
  IsEmail, IsEnum, Min, Max, MinLength, MaxLength, Matches,
  ValidateNested, IsInt
} from 'class-validator';
import { Type } from 'class-transformer';
{{#if dtoImports}}
{{{dtoImports}}}
{{/if}}

{{#each enums}}
export enum {{name}} {
{{#each values}}
  {{key}} = '{{value}}'{{#unless @last}},{{/unless}}
{{/each}}
}

{{/each}}
{{#each schemas}}
export class {{name}} {
{{#each properties}}
  {{#if description}}
  /**
   * {{description}}
   */
  {{/if}}
  {{#each decorators}}
  {{{this}}}
  {{/each}}
  {{name}}: {{type}};

{{/each}}
}

{{/each}}`;
  }

  private registerHelpers(): void {
    // Register Handlebars helpers
    Handlebars.registerHelper('camelCase', (str: string) => {
      if (!str || typeof str !== 'string') return '';
      return str.charAt(0).toLowerCase() + str.slice(1);
    });

    Handlebars.registerHelper('kebabCase', (str: string) => {
      if (!str || typeof str !== 'string') return '';
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    });

    Handlebars.registerHelper('eq', (a: any, b: any) => {
      return a === b;
    });

    Handlebars.registerHelper('or', (...args: any[]) => {
      // Remove the options object (last argument)
      const values = args.slice(0, -1);
      return values.some(Boolean);
    });
  }
}