import * as fs from 'fs';
import * as path from 'path';
import { Config, Schema } from '../../grammar/base.interfaces.js';
import { GoModel } from './go.interfaces.js';
import { DO_NOT_EDIT, makeModelFieldComplement } from './common.js';
import { genGolangCreateStruct } from './create.js';
import { genGolangEntityStruct } from './entity.js';
import { genGolangIdStruct } from './id.js';
import { genGolangRelationStruct } from './relation.js';
import { genGolangUpdateStruct } from './update.js';


export const genGoStructs = (schema: Schema, config: Config) => {
  const dirPath = path.join(config.generator.go.outputPath, `./${config.generator.go.packageName}`);

  if(fs.existsSync(dirPath)) fs.rmSync(dirPath, { recursive: true });
  fs.mkdirSync(dirPath);

  const { models, relations } = schema;

  models.forEach((model) => {
    const m = model as GoModel;
    m.fields = m.fields.map(k => makeModelFieldComplement(k));
    const header = `${DO_NOT_EDIT}\n\npackage ${config.generator.go.packageName || 'di'}\n\n`;

    const goImports = Array.from(new Set([
      "github.com/uptrace/bun",
    ]));

    let resultStr = header;

    if(goImports.length) {
      const goImportsStr = `import (\n${goImports.map(k => `  "${k}"`).join('\n')}\n)\n\n`;
      resultStr += goImportsStr;
    }
    resultStr += [
      genGolangEntityStruct(m, m.fields.filter(k => !k.isHidden && !k.isPrivate), config),
      genGolangRelationStruct(m, relations, config),
      genGolangIdStruct(m, m.fields.filter(k => k.name === '_id'), config),
      genGolangCreateStruct(m, m.fields.filter(k => !k.doNotCreate), relations, config),
      genGolangUpdateStruct(m, m.fields.filter(k => !k.doNotUpdate), relations, config),
    ].join('');

    const fileName = `${dirPath}/${m.name}.go`;
    fs.writeFileSync(fileName, resultStr, { encoding: 'utf-8' });
  });
}