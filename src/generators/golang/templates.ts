import * as fs from 'fs';
import * as path from 'path';
import { Config, Definition, Schema } from '../../grammar/base.interfaces.js';
import { makeLinkedModels } from '../../grammar/grammar_parser.js';
import { DO_NOT_EDIT, pascalToSnake, snakeToPascal } from './common.js';
import { makeControllerFromTemplate } from './templates/controller.template.js';
import { makeMainFromTemplate } from './templates/main.template.js';
import { makeServiceFromTemplate } from './templates/service.template.js';
import { makeSchemaMapFromTemplate } from './templates/schema.template.js';
import { makeOpionsMiddlewareFromTemplate } from './templates/options.template.js';

export const createGoTemplateFiles = (schema: Schema, config: Config, definition: Definition) => {
  
  const outputPath = config.generator.go.outputPath;

  const definitionModelKeys = Object.keys(definition.models);
  const modelsInDefinition = schema.models.filter(m => definitionModelKeys.includes(m.name));

  fs.cpSync(path.join(config.codePath, `./generators/golang/static_files`), outputPath, { recursive: true });

  const controllersPath = path.join(outputPath, `./controllers`);
  if (!fs.existsSync(controllersPath)) fs.mkdirSync(controllersPath);
  modelsInDefinition.forEach(m => {
    const fileName = `${controllersPath}/${pascalToSnake(m.name)}.go`;
    fs.writeFileSync(fileName, makeControllerFromTemplate(m), { encoding: 'utf-8' });
  });

  const servicesPath = path.join(outputPath, `./services`);
  if (!fs.existsSync(servicesPath)) fs.mkdirSync(servicesPath);
  modelsInDefinition.forEach(m => {
    const fileName = `${servicesPath}/${pascalToSnake(m.name)}.go`;
    const modelRelations = schema.relations
      .filter(r => r.fields.some(f => f.type  === m.name))
      .map(r => r.fields.filter(f => f.type !== m.name).map(f => snakeToPascal(f.name)))
      .flat();
    fs.writeFileSync(fileName, makeServiceFromTemplate(m, modelRelations), { encoding: 'utf-8' });
  });
  
  const middlewaresPath = path.join(outputPath, `./middlewares`);
  if (!fs.existsSync(middlewaresPath)) fs.mkdirSync(middlewaresPath);
  const optionsMiddlewarePath = path.join(middlewaresPath, `./options.go`);
  fs.writeFileSync(optionsMiddlewarePath, makeOpionsMiddlewareFromTemplate(config), { encoding: 'utf-8' });


  const mainFilePath = path.join(outputPath, `./main.go`);
  fs.writeFileSync(mainFilePath, makeMainFromTemplate(definition.models), { encoding: 'utf-8' });
}

export const createSchemaMapFile = (config: Config) => {
  const outputPath = config.generator.go.outputPath;

  const packagePath = path.join(outputPath, `./${config.generator.go.packageName}`);
  if (!fs.existsSync(packagePath)) fs.mkdirSync(packagePath);
  const subpackagePath = path.join(packagePath, `./schema`);
  if (!fs.existsSync(subpackagePath)) fs.mkdirSync(subpackagePath);
  const schemaJsonFilePath = path.join(subpackagePath, `./schema.go`);

  const fileData = `${DO_NOT_EDIT}\n\n${makeSchemaMapFromTemplate(makeLinkedModels(config))}`;

  fs.writeFileSync(schemaJsonFilePath, fileData, { encoding: 'utf-8' });
}