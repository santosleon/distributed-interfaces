import { Config } from '../../grammar/base.interfaces.js'
import { GoModel, GoModelField } from './go.interfaces.js'
import { getMaxLength, pascalToSnake } from './common.js';

export const genGolangEntityStruct = (model: GoModel, fields: GoModelField[], config?: Config) => {
  const tableSchema = config?.database.schema ? config?.database.schema + '.' : '';
  const additionalLine = `\tbun.BaseModel \`bun:"table:${tableSchema}${pascalToSnake(model.name)}"\`\n`;
  const suffix = 'Dto';

  let structCode = `type ${model.name}${suffix} struct {\n`;
  structCode += additionalLine;

  const maxFieldLength = getMaxLength(fields.map(k => k.complement.goFieldName));
  const maxTypeLength  = getMaxLength(fields.map(k => k.complement.goType));

  fields.forEach((f) => {
    structCode += makeGoEntityStructLine(f, maxFieldLength, maxTypeLength);
  });

  structCode += '}\n\n';
  return structCode;
}

const makeGoEntityStructLine = (
  field: GoModelField,
  maxFieldLength: number,
  maxTypeLength: number,
): string => {
  const {goType, goFieldName} = field.complement;

  const spaces1 = ' '.repeat(Math.max(maxFieldLength - goFieldName.length + 1, 1));
  const spaces2 = ' '.repeat(Math.max(maxTypeLength - goType.length + 1, 1));

  const tags = makeEntityTags(field);

  return `\t${goFieldName}${spaces1}${goType}${spaces2}\`${tags}\`\n`;
}

const makeEntityTags = (field: GoModelField) => {
  return [
    ...(field.isPrimaryKey ? [`bun:"${field.name},pk,nullzero"`] : []),
    ...(!field.isPrimaryKey && field.isBasicField ? [`bun:"${field.name}"`] : []),
    `json:"${field.name}"`,
    ...(!(field.isPrimaryKey || field.isBasicField) && field.isNullable ? [`nullable:"true"`] : [`nullable:"false"`]),
  ].join(' ');
}
