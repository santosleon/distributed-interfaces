import { Config } from '../../grammar/base.interfaces.js'
import { GoModel, GoModelField } from './go.interfaces.js'
import { getMaxLength } from './common.js';


export const genGolangIdStruct = (model: GoModel, fields: GoModelField[], config?: Config) => {
  const additionalLine = '';
  const suffix = 'IdDto';

  let structCode = `type ${model.name}${suffix} struct {\n`;
  structCode += additionalLine;

  const goImports = new Set<string>();
  goImports.add("github.com/uptrace/bun");

  const maxFieldLength = getMaxLength(fields.map(k => k.complement.goFieldName));
  const maxTypeLength  = getMaxLength(fields.map(k => k.complement.goType));

  fields.forEach((f) => {
    structCode += makeGoIdStructLine(f, maxFieldLength, maxTypeLength);
  });

  structCode += '}\n\n';
  return structCode;
}

const makeGoIdStructLine = (
  field: GoModelField,
  maxFieldLength: number,
  maxTypeLength: number,
): string => {
  const {goType, goFieldName} = field.complement;

  const spaces1 = ' '.repeat(Math.max(maxFieldLength - goFieldName.length + 1, 1));
  const spaces2 = ' '.repeat(Math.max(maxTypeLength - goType.length + 1, 1));

  const tags = `path:"_id"`;

  return `\t${goFieldName}${spaces1}${goType}${spaces2}\`${tags}\`\n`;
}
