import * as fs from 'fs';
import * as path from 'path';
import { Config, Model, ModelField, ModelFieldValidation, ModelType, Relation, RelationField, Schema, SubmitJson } from './base.interfaces';
import { sha256Buffer, sha256Str } from '../commands/common.js';

export const buildSubmitJson = (config: Config) => {
  const submitJson: SubmitJson = {};

  for (const interfaceType of ['models', 'relations']) {
    const folderPath = path.join(config.paths.build, `./${interfaceType}`);
    const fileNames = fs.readdirSync(folderPath);
    for (const file of fileNames) {
      const filePath = path.join(folderPath, file);
      if (!fs.statSync(filePath).isFile()) continue;
      const data = fs.readFileSync(filePath, 'utf-8');
      const fileHash = sha256Str(data);
      const interfaceName = file.split('.')[0];
      const rootHash = sha256Str(interfaceName);

      // const hashInput = interfaceName;
      // const interfaceNameArr = interfaceName.split('-');
      // const hashInput = interfaceNameArr.length > 1 ?
      //   Buffer.from(interfaceNameArr.map(sha256Str).join(''), 'hex') :
      //   interfaceName;
  
      const previousInterface = config.build.previousInterfaces?.[interfaceName];
      const remoteInterface = config.build.remoteIntefaces?.[interfaceName];
      const prev = (previousInterface === null) ? rootHash :
        (previousInterface || remoteInterface || rootHash);
  
      submitJson[interfaceName] = { root: rootHash, prev, file: fileHash };
    }
  }

  const fileName = path.join(config.paths.build, `./submit.json`);
  fs.writeFileSync(fileName, JSON.stringify(submitJson, undefined, 2), { encoding: 'utf-8' });
}

const checkSameHash = (config: Config, interfaceName: string, fileData: string) => {
  const fileHashBuffer = sha256Buffer(fileData);
  
  const prevHash = config.build.remoteIntefaces?.[interfaceName] || config.build.previousInterfaces?.[interfaceName];
  let isSameHash = false;
  if(prevHash) {
    const prevHashBuffer = Buffer.from(prevHash, 'hex');
    isSameHash = Buffer.compare(fileHashBuffer, prevHashBuffer) === 0;
  }
  return isSameHash;
}

export const buildSchema = (schema: Schema, config: Config) => {

  if (fs.existsSync(config.paths.build)) fs.rmSync(config.paths.build, { recursive: true });
  fs.mkdirSync(config.paths.build);

  const modelsPath = path.join(config.paths.build, `./models`);
  if (!fs.existsSync(modelsPath)) fs.mkdirSync(modelsPath);
  schema.models.forEach(m => {
    const fileName = `${modelsPath}/${m.name}.di`;
    const fileData = makeModel(m);
    const isSameHash = checkSameHash(config, m.name, fileData);
    if(isSameHash) return;
    fs.writeFileSync(fileName, makeModel(m), { encoding: 'utf-8' });
  });

  const relationsPath = path.join(config.paths.build, `./relations`);
  if (!fs.existsSync(relationsPath)) fs.mkdirSync(relationsPath);
  schema.relations.forEach(r => {
    const sortedFieldNames = r.fields.sort((a,b) => a.type.localeCompare(b.type));
    const relationName = [
      sortedFieldNames.map(f => f.type),
      sortedFieldNames.map(f => f.name)
    ].flat().join('-');
    const fileName = `${relationsPath}/${relationName}.di`;
    const fileData = makeRelation(r);
    const isSameHash = checkSameHash(config, relationName, fileData);
    if(isSameHash) return;
    fs.writeFileSync(fileName, makeRelation(r), { encoding: 'utf-8' });
  });
}

export const makeModel = (m: Model) => {
  return (
`model ${m.name} {
${
  [
    ...m.compositions.sort((a, b) => a.name.localeCompare(b.name)).map(f => `\t${f.name}`),
    ...m.fields.sort((a, b) => a.name.localeCompare(b.name)).map(f => makeModelField(f))
  ].join('\n')
}
}`
  );
}

const makeModelField = (f: ModelField) => {
  const isNullableSymbol   = f.isNullable ? '?' : '';
  const doNotCreateSymbol  = f.doNotCreate ? '+' : '';
  const doNotUpdateSymbol  = f.doNotUpdate ? '-' : '';
  const isPrivateSpecifier = f.isPrivate ? 'private' : '';
  const isHiddenSpecifier  = f.isHidden ? 'hidden' : '';
  const isAutoGenSpecifier = f.isAutoGen ? 'auto' : '';
  const isUniqueSpecifier  = f.isUnique ? 'unique' : '';
  const validations: string[] = [];
  if(f.validation) {
    if(([
      'int', 'int8', 'int16', 'int32', 'int64',
      'uint', 'uint8', 'uint16', 'uint32', 'uint64',
      'float', 'float32', 'float64', 'date'
    ] as ModelType[]).includes(f.type)) {
      (['gt', 'gte', 'lt', 'lte', 'mul'] as (keyof ModelFieldValidation)[]).forEach(k => {
        const validationParam = f.validation?.[k];
        if(validationParam !== undefined) {
          validations.push(`${k}(${validationParam})`)
        }
      });
    }
    if((['string'] as ModelType[]).includes(f.type)) {
      (['minlen', 'maxlen', 'regex'] as (keyof ModelFieldValidation)[]).forEach(k => {
        const validationParam = f.validation?.[k];
        if(validationParam !== undefined) {
          validations.push(`${k}(${validationParam})`)
        }
      });
    }
  }
  return (
`\t${f.name} ${f.type}${isNullableSymbol}${doNotCreateSymbol}${doNotUpdateSymbol}${['', ...[isAutoGenSpecifier, isUniqueSpecifier, isHiddenSpecifier, isPrivateSpecifier, ...validations].filter(k => k)].join(' ')}`
  );
}

const makeRelationNameForError = (r: Relation) => {
  return r.fields
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(f => [f.type, f.name]).flat().join('-');
}

export const makeRelation = (r: Relation) => {
  if(r.fields.length <= 0 || 2 < r.fields.length) {
    throw new Error(`Wrong quantity of fields in relation ${makeRelationNameForError(r)}`);
  }
  if(r.fields.length == 2 && r.fields.every(f => f.isNullable)) {
    throw new Error(`Not all fields can be nullable in relation ${makeRelationNameForError(r)}`);
  }
  if(r.fields.length == 2 && r.fields.every(f => !f.isNullable && !f.isArray)) {
    throw new Error(`Not all fields can be required in relation ${makeRelationNameForError(r)}`);
  }
  if(r.fields.length == 1 && r.fields.every(f => !f.isNullable)) {
    throw new Error(`Self-relation field must be nullable in relation ${makeRelationNameForError(r)}`);
  }
  return (
`relation {
${r.fields.sort((a, b) => a.name.localeCompare(b.name)).map(f => makeRelationField(f, r.fields)).join('\n')}
}`
  );
}

const makeRelationField = (f: RelationField, fields: RelationField[]) => {
  const isArraySymbol      = f.isArray ? '[]' : '';
  const isNullableSymbol   = f.isNullable ? '?' : '';
  const isMutualSpecifier  = (f.isMutual && f.isNullable && fields.length === 1) ? 'mutual' : '';
  const isMutableSpecifier = (f.isMutable && !f.isNullable && !f.isArray) ? 'mutable' : '';
  const onDeleteSpecifier  = f.onDelete ? `delete(${f.onDelete})` : '';
  const onUpdateSpecifier  = f.onUpdate ? `update(${f.onUpdate})` : '';
  const references         = f.references ? `ref(${f.references.join(',')})` : '';
  //TODO: check if references params exist in models
  return (
`\t${f.name} ${f.type}${isArraySymbol}${isNullableSymbol}${['', ...[isMutualSpecifier, isMutableSpecifier, references, onDeleteSpecifier, onUpdateSpecifier].filter(k => k)].join(' ')}`
  );
}
