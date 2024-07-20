import { Config, Relation, RelationField } from '../../grammar/base.interfaces.js'
import { GoModel, GoRelationField } from './go.interfaces.js'
import { getMaxLength, makeGoFieldName } from './common.js'

export const genGolangRelationStruct = (model: GoModel, relations: Relation[], config?: Config) => {
  const additionalLine = `\t${model.name}Dto \`bun:",extend"\`\n`;
  const suffix = '';

  let structCode = `type ${model.name}${suffix} struct {\n`;
  structCode += additionalLine;

  const goImports = new Set<string>();
  goImports.add("github.com/uptrace/bun");

  const filteredRelations = relations.filter(r => r.fields.some(f => f.type === model.name));
  const relationIdFields  = filteredRelations.map(r => makeRelationIdField(model, r.fields)).flat().filter(k => !!k) as GoRelationField[];
  const relationFields    = filteredRelations.map(r => makeRelationFieldComplement(model, r.fields)).flat().filter(k => !!k) as GoRelationField[];

  const maxFieldLength = Math.max(
    getMaxLength(relationIdFields.map(k => k.complement.goFieldName)),
    getMaxLength(relationFields.map(k => k.complement.goFieldName)),
  );
  const maxTypeLength  = Math.max(
    getMaxLength(relationIdFields.map(k => k.complement.goType)),
    getMaxLength(relationFields.map(k => k.complement.goType)),
  );

  relationIdFields.map((r) => {
    structCode += makeGoRelationIdLine(r, maxFieldLength, maxTypeLength);
  });

  relationFields.map((r) => {
    structCode += makeGoRelationLine(r, maxFieldLength, maxTypeLength);
  });

  structCode += '}\n\n';
  return structCode;
}

const makeGoRelationLine = (
  field: GoRelationField,
  maxFieldLength: number,
  maxTypeLength: number,
): string => {
  const {goType, goFieldName} = field.complement;

  const spaces1 = ' '.repeat(Math.max(maxFieldLength - goFieldName.length + 1, 1));
  const spaces2 = ' '.repeat(Math.max(maxTypeLength - goType.length + 1, 1));

  const tags = makeRelationTags(field);

  return `\t${goFieldName}${spaces1}${goType}${spaces2}\`${tags}\`\n`;
}

const makeRelationTags = (field: GoRelationField) => {
  const {bunRelation, nullableTag} = field.complement;
  return [
    bunRelation,
    `json:"${field.name},omitempty"`,
    ...(nullableTag ? [nullableTag] : []),
  ].join(' ');
}

const makeRelationGoType = (field: RelationField) => {
  const pointerStr = field.isArray ? '[]*' : '*';
  return `${pointerStr}${field.type}`;
}

const makeGoRelationIdLine = (
  field: GoRelationField,
  maxFieldLength: number,
  maxTypeLength: number,
): string => {
  const {goType, goFieldName} = field.complement;

  const spaces1 = ' '.repeat(Math.max(maxFieldLength - goFieldName.length + 1, 1));
  const spaces2 = ' '.repeat(Math.max(maxTypeLength - goType.length + 1, 1));

  const tags = field.complement.tags?.join(' ');

  return `\t${goFieldName}${spaces1}${goType}${spaces2}\`${tags}\`\n`;
}

export const makeRelationIdField = (model: GoModel, fields: RelationField[]): GoRelationField | undefined => {
  let field1 = fields.find(f => f.type === model.name);
  let field2 = fields.find(f => f.type !== model.name);

  if(!field2) field2 = field1;
  if(!field1 || !field2) return;

  if((field1 !== field2 && field2.isNullable) || field2.isArray) return;

  // let refs1 = field1.references;
  let refs2 = field2.references;

  if(refs2?.length) return;

  const idField: GoRelationField = {
    name: field2.name,
    type: 'string',
    isRelationId: true,
    complement: {
      goType:      'string',
      goFieldName: '',
      bunRelation: '',
      nullableTag: '',
      tags: [`bun:"_${field2.name}"`, `json:"-"`],
    },
  };

  idField.complement.goFieldName = makeGoFieldName(idField);
  
  return idField;
}

export const makeRelationFieldComplement = (model: GoModel, fields: RelationField[]): GoRelationField | undefined => {
  let field1 = fields.find(f => f.type === model.name);
  let field2 = fields.find(f => f.type !== model.name);

  if(!field2) field2 = field1;
  if(!field1 || !field2) return;

  let refs1 = field1.references;
  let refs2 = field2.references;

  let bunRelType = '';
  let bunNullZero = '';
  let nullableTag = '';

  if(field1 === field2) {
    throw new Error("Self Relation not implemented yet");
  } else if(field1.isArray && field2.isArray) {
    throw new Error("Many to Many Relation not implemented yet");
    bunRelType = 'rel:many-to-many';
  } else if(!field1.isArray && field2.isArray) {
    bunRelType = 'rel:has-many';
    refs1 = refs1 || [`_id`];
    refs2 = refs2 || [`_${field1.name}`];
  } else if(field1.isArray && !field2.isArray) {
    bunRelType = 'rel:has-one';
    refs1 = refs1 || [`_${field2.name}`];
    refs2 = refs2 || [`_id`];
  } else if(!field1.isArray && !field2.isArray) {
    bunRelType = 'rel:has-one';
    refs1 = refs1 || [`_id`];
    refs2 = refs2 || [`_${field1.name}`];
  }

  if(!refs1 || !refs2 || refs1.length !== refs2.length) return;

  if(field2.isArray) {
    bunNullZero = ',nullzero';
  } else {
    nullableTag = 'nullable:"true"';
  }

  const bunJoins = refs1.map((_,i) => `join:${[refs1[i], refs2[i]].join('=')}`);

  const bunTag = [bunNullZero, bunRelType, ...bunJoins].filter(k => !!k).join(',');

  return {
    ...field2,
    complement: {
      goType:      makeRelationGoType(field2),
      goFieldName: makeGoFieldName(field2),
      bunRelation: `bun:"${bunTag}"`,
      nullableTag,
    },
  };
}
