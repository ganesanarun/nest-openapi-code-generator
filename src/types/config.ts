export interface GeneratorConfig {
  specsDir: string;
  outputDir: string;
  
  generateControllers: boolean;
  generateDtos: boolean;
  generateTypes: boolean;
  generateServices?: boolean;
  
  templateDir?: string;
  
  vendorExtensions?: {
    [key: string]: string;
  };
  
  generatorOptions?: {
    useSingleRequestParameter?: boolean;
    includeErrorTypesInReturnType?: boolean;
    additionalProperties?: Record<string, any>;
  };
}

export const defaultConfig: GeneratorConfig = {
  specsDir: './specs',
  outputDir: './src/generated',
  generateControllers: true,
  generateDtos: true,
  generateTypes: true,
  generateServices: false,
  generatorOptions: {
    includeErrorTypesInReturnType: false, // Default to only success types
  },
};