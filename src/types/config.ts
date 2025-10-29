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
};