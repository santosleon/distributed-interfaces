import * as fs from 'fs';
import { Config, Definition } from '../grammar/base.interfaces.js';
import { ignoreObjectKeys, sortObjectKeys, uppercaseHash } from './common.js';
import { makeModel, makeRelation } from '../grammar/build.js';
import { parseSchema } from '../grammar/grammar_parser.js';


export const ignoreByConfigAndSort = (obj: Record<string, string>, config: Config) => {
  return sortObjectKeys(ignoreObjectKeys(obj, config.build.ignore))
}

export const createDefinitionFile = (config: Config) => {
  const models: Record<string, string> = {};
  const relations: Record<string, string> = {};

  const schemaStr = fs.readFileSync(config.paths.schema, 'utf-8');
  const schema = parseSchema(config, schemaStr);

  schema.models.forEach(m => {
    const fileData = makeModel(m);
    const interfaceName = m.name;
    const fileHash = uppercaseHash(fileData);

    if(!models[interfaceName]) {
      models[interfaceName] = fileHash;
    }
  });

  schema.relations.forEach(r => {
    const sortedFieldNames = r.fields.sort((a,b) => a.type.localeCompare(b.type));
    const interfaceName = [
      sortedFieldNames.map(f => f.type),
      sortedFieldNames.map(f => f.name)
    ].flat().join('-');
    const fileData = makeRelation(r);
    const fileHash = uppercaseHash(fileData);
    if(!relations[interfaceName]) {
      relations[interfaceName] = fileHash;
    }
  });
  
  Object.entries(config.build.remoteIntefaces || {}).forEach(([k, v]) => {
    if(!v) return;
    const isRelation = k.includes('-');
    const hash = v.toLocaleUpperCase();
    if(isRelation) {
      if(!relations[k]) relations[k] = hash;
    } else {
      if(!models[k]) models[k] = hash;
    }
  });

  const nonCompositions = Object.fromEntries(
    Object.entries(models).filter(([k]) => !config.build.compositions?.includes(k))
  );

  const compositions = Object.fromEntries(
    Object.entries(models).filter(([k]) => config.build.compositions?.includes(k))
  );

  const missingCompositionModels = schema.models
    .filter(m => !!m.compositions)
    .map((m) => m.compositions.filter((c) => !(nonCompositions[c.name] || compositions[c.name])))
    .flat()
    .map(c => c.name);


  const missingRelationModels = schema.relations
    .filter(m => !!m.fields)
    .map((m) => m.fields.filter((c) => !(nonCompositions[c.type] || compositions[c.type])))
    .flat()
    .map(c => c.type);

    
  const missingModels = [...missingCompositionModels, ...missingRelationModels];

  if(missingModels.length) {
    console.log(`The following models are missing:\n${missingModels.join(', ')}`)
    process.exit();
  }

  //TODO: check if some remote interface has missing model in composition or relation

  const definition: Definition = {
    server:       config.server || '',
    models:       sortObjectKeys(ignoreObjectKeys(nonCompositions, config.build.ignore)),
    compositions: sortObjectKeys(ignoreObjectKeys(compositions, config.build.ignore)),
    relations:    sortObjectKeys(ignoreObjectKeys(relations, config.build.ignore)),
  }

  fs.writeFileSync(config.paths.definition, JSON.stringify(definition, undefined, 2), { encoding: 'utf-8' });
}