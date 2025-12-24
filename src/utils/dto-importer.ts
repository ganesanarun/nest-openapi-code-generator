import { OpenAPISpec } from '../types/openapi';


export class DtoImporter {

  static readonly SHARED_FOLDER = 'shared';
  static readonly SHARED_DTO_FILE = 'shared.dto';
  private static readonly SHARED_FILE_PATH = `../${DtoImporter.SHARED_FOLDER}/${DtoImporter.SHARED_DTO_FILE}`;
  private static readonly SHARED_SCHEMA_MARKER = 'x-shared';
  
  static isSharedSchema(schema: any): boolean {
    return schema && schema[DtoImporter.SHARED_SCHEMA_MARKER] === true;
  }

  static resolveDtoImports(usedDtos: Set<string>,spec: OpenAPISpec): { localDtos: string[]; sharedDtosUsed: string[] } {
    const sharedDtos = this.getSharedDtoNames(spec);
    const localDtos: string[] = [];
    const sharedDtosUsed: string[] = [];
    usedDtos.forEach(dto => {
      if (sharedDtos.includes(dto)) {
        sharedDtosUsed.push(dto);
      } else {
        localDtos.push(dto);
      }
    });
    return { localDtos, sharedDtosUsed };
  }

  static generateImportStatements(localDtos: string[],sharedDtosUsed: string[],resourceName: string): string {
    const imports: string[] = [];
    if (localDtos.length > 0) {
      imports.push(
        `import { ${localDtos.join(', ')} } from './${resourceName}.dto';`
      );
    }
    if (sharedDtosUsed.length > 0) {
      imports.push(
        `import { ${sharedDtosUsed.join(', ')} } from '${DtoImporter.SHARED_FILE_PATH}';`
      );
    }
    return imports.join('\n');
  }

  static mergeSharedDtos(sharedDtoContents: string[]): string {
    // Deduplicate based on class and enum names
    const seenNames = new Set<string>();
    const uniqueContents: string[] = [];
    
    for (const content of sharedDtoContents) {
      // Extract class and enum names from the content
      const classMatches = content.matchAll(/(?:export\s+)?(?:class|interface)\s+(\w+)/g);
      const enumMatches = content.matchAll(/(?:export\s+)?enum\s+(\w+)/g);
      
      const names: string[] = [];
      for (const match of classMatches) {
        names.push(match[1]);
      }
      for (const match of enumMatches) {
        names.push(match[1]);
      }
      
      // Check if any of the names already exist
      const hasExisting = names.some(name => seenNames.has(name));
      
      if (!hasExisting && names.length > 0) {
        // Add all names to the set
        names.forEach(name => seenNames.add(name));
        uniqueContents.push(content);
      } else if (names.length === 0) {
        // If no class/enum detected, keep the content (could be imports, etc.)
        uniqueContents.push(content);
      }
    }
    
    return uniqueContents.join('\n\n');
  }


  private static getSharedDtoNames(spec: OpenAPISpec): string[] {
    const schemas = spec.components?.schemas || {};
    return Object.entries(schemas)
      .filter(([_, schema]) => this.isSharedSchema(schema))
      .map(([name]) => `${name}Dto`);
  }
}