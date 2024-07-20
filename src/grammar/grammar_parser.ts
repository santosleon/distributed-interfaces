import * as crypto from 'crypto';
import * as fs from 'fs';
import * as ohm from 'ohm-js';
import * as path from 'path';
import { Composition, Config, DeleteUpdateAction, FieldOrComposition, LinkedModel, Model, ModelField, ModelFieldValidation, Relation, RelationField, Schema } from './base.interfaces.js';
import { addBasicFields, applyCompositions, sortCompositions, sortFields } from './fields.js';

const removeEmpty = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj
      .map(item => removeEmpty(item))
      .filter(item => !(Array.isArray(item) && item.length === 0) &&
        !(typeof item === 'object' && item !== null && Object.keys(item).length === 0) &&
        item !== null && item !== undefined && item !== false);
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(
      Object.entries(obj)
        .map(([key, val]) => [key, removeEmpty(val)])
        .filter(([key, val]) => !(Array.isArray(val) && val.length === 0) &&
          !(typeof val === 'object' && Object.keys(val).length === 0) &&
          val !== null && val !== undefined && val !== false)
    );
  }
  return obj;
}


const mergedObjArr = (obj: ohm.Node) => obj.parse().reduce((acc: any, curr: any) => ({ ...acc, ...curr }), {});

const processMany = (obj: Record<string, ohm.Node>) => {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v.parse()]));
};

const adjustComment = (value: ohm.Node) => {
  return value.sourceString
    .replace(/[\r\n\u2028\u2029]+/g, "\n")
    .replace(/^\s+/gm, "")
    .trim();
}

const processSchema = (schema: ohm.Node) => {
  const modelsAndRelations = schema.parse();
  const models: Model[] = [];
  const relations: Relation[] = [];
  for (const v of modelsAndRelations) {
    const {isModel, isRelation, ...item} = v;
    if(isModel) models.push(item);
    else if(isRelation) relations.push(item);
  }
  return { models, relations };
}

const processModel = (name: ohm.Node, comment: ohm.Node, fields: ohm.Node, annotations: ohm.Node) => {
  return {
    ...processMany({name, annotations}),
    ...processModelFields(fields),
    ...comment.parse()[0],
    isModel: true,
  };
}

const processModelFields = (obj: ohm.Node) => {
  const fieldsAndCompositions: FieldOrComposition[] = obj.parse();
  const fields: ModelField[] = [];
  const compositions: Composition[] = [];
  for (const v of fieldsAndCompositions) {
    const {isComposition, ...item} = v;
    if(isComposition) compositions.push(item as Composition);
    else fields.push(item as ModelField);
  }
  return { fields, compositions };
}

const processSpecifierSymbol = (specifier: ohm.Node) => {
  const str = specifier.sourceString;
  const result: Partial<ModelField & RelationField> = {};
       if(str.includes("?"))  result.isNullable  = true;
  else if(str.includes("[]")) result.isArray     = true;
  else if(str.includes("+"))  result.doNotCreate = true;
  else if(str.includes("-"))  result.doNotUpdate = true;
  else if(result.doNotCreate && result.doNotUpdate) result.isAutoGen = true;
  return result;
}

const processModelSpecifier = (specifier: ohm.Node) => {
  const str = specifier.sourceString;
  const result: Partial<ModelField> = {};
       if(str === "private") result.isPrivate = true;
  else if(str === "hidden")  result.isHidden  = true;
  else if(str === "unique")  result.isUnique  = true;
  else if(str === "auto")    result.isAutoGen = true;
  return result;
}

const processModelValidation = (operation: ohm.Node, params: ohm.Node) => {
  const opStr = operation.sourceString;
  const paramStr = params.sourceString;
  const result: Partial<ModelFieldValidation> = {};
       if(opStr === "mul")     result.mul    = parseInt(paramStr);
  else if(opStr === "gte")     result.gte    = parseInt(paramStr);
  else if(opStr === "lte")     result.lte    = parseInt(paramStr);
  else if(opStr === "gt")      result.gt     = parseInt(paramStr);
  else if(opStr === "lt")      result.lt     = parseInt(paramStr);
  else if(opStr === "gt")      result.gt     = parseInt(paramStr);
  else if(opStr === "minlen")  result.minlen = parseInt(paramStr);
  else if(opStr === "maxlen")  result.maxlen = parseInt(paramStr);
  else if(opStr === "regex")   result.regex  = paramStr;
  return result;
}

const processRelation = (comment: ohm.Node, fields: ohm.Node) => {
  return {
    ...processMany({fields}),
    ...comment.parse()[0],
    isRelation: true,
  };
}

const processRelationSpecifier = (specifier: ohm.Node, params?: ohm.Node) => {
  const str = specifier.sourceString;
  const result: Partial<RelationField> = {};
       if(str === "mutual")  result.isMutual   = true;
  else if(str === "mutable") result.isMutable  = true;
  else if(str === "delete")  result.onDelete   = params?.sourceString as DeleteUpdateAction;
  else if(str === "update")  result.onUpdate   = params?.sourceString as DeleteUpdateAction;
  else if(str === "ref")     result.references = params?.parse();
  return result;
}

const processField = (name: ohm.Node, type: ohm.Node, comment: ohm.Node) => {
  return {...processMany({name}), ...type.parse(), ...comment.parse()[0]};
}

const processType = (type: ohm.Node, specifierSymbol: ohm.Node, specifier: ohm.Node, validation?: ohm.Node) => {
  return {...processMany({type}), ...processSpecifierSymbol(specifierSymbol), ...mergedObjArr(specifier), ...(validation ? { validation: mergedObjArr(validation) } : {})};
}

const makeSemantics = (grammar: ohm.Grammar) => {
  // Define semantics to collect information about the schema
  return grammar.createSemantics().addOperation('parse', {
    Schema:            (schema) => processSchema(schema),
    
    Model:             (_1, name, _2, comment, fields, annotations, _3) => processModel(name, comment, fields, annotations),

    ModelField:            (name, type, comment, _1) => processField(name, type, comment),
    ModelComposition:      (name, comment, _1) => ({...processMany({name}), ...comment.parse()[0], isComposition: true}),
    ModelType:             (type, specifierSymbol, specifier, validation) => processType(type, specifierSymbol, specifier, validation),
    ModelBaseType:         (type) => type.sourceString,
    ModelAnnotation:       (_1, type, _2, params, _3) => processMany({type, params}),
    
    modelName:             (_1, _2) => _1.sourceString + _2.sourceString,
    modelAnnotationType:   (_1) => _1.sourceString,
    modelSpecifier:        (_1, specifier) => processModelSpecifier(specifier),

    modelValidation:          (_1, validation) => validation.parse(),
    modelValidationOp:        (op, _1, param, _2) => processModelValidation(op, param),
    modelValidationRegexOp:   (op, _1, param, _2) => processModelValidation(op, param),

    Relation:              (_1, _2, comment, fields, _3) => processRelation(comment, fields),

    RelationField:         (name, type, comment, _1) => processField(name, type, comment),
    RelationType:          (modelName, specifierSymbol, specifier) => processType(modelName, specifierSymbol, specifier),

    relationSpecifierSimple:     (_1, specifier) => processRelationSpecifier(specifier),
    relationDeleteUpdate:        (_1, specifier, _2, params, _3) => processRelationSpecifier(specifier, params),
    relationSpecifierWithParams: (_1, specifier, _2, params, _3) => processRelationSpecifier(specifier, params),

    Params:            (_1) => _1.sourceString.split(',').map(k => k.trim()),
    comment:           (comment) => processMany({comment}),
    multiLineComment:  (_1, comment, _2) => adjustComment(comment),
    singleLineComment: (_1, comment) => adjustComment(comment),
    fieldName:         (_1, _2) => _1.sourceString + _2.sourceString,

    _iter:             (...arr) => arr.map(k => k.parse()),
  });
}

// Parse the schema
export const parseSchema = (config: Config, schemaStr: string) => {
  const grammarPath = path.join(config.codePath, './grammar/grammar.ohm');
  const grammarStr  = fs.readFileSync(grammarPath, 'utf-8');
  // Define the grammar for schema files
  const grammar = ohm.grammar(grammarStr);
  const match = grammar.match(schemaStr);
  if (match.succeeded()) {
    const semantics = makeSemantics(grammar);
    const schemaInfo: Schema = semantics(match).parse();
    return schemaInfo;
  } else {
    throw new Error('Syntax error in schema');
  }
}

export const prepareSchema = (config: Config) => {
  const fileNames = fs.readdirSync(config.paths.interfaces);
  const contents = fileNames.map(fileName => {
    const filePath = path.join(config.paths.interfaces, fileName);
    return fs.readFileSync(filePath, 'utf-8');
  });

  const schemaStr = contents.join('\n\n');
  const schema = parseSchema(config, schemaStr);

  if(!schema) throw new Error('no schema');

  sortCompositions(schema);
  // TODO: make a function to apply annotations
  applyCompositions(schema);
  // TODO: make a function to apply composition relations
  sortFields(schema);
  addBasicFields(schema);

  return schema;
}

export const makeLinkedModels = (config: Config) => {
  const fileNames = fs.readdirSync(config.paths.interfaces);
  const schema: Schema = {
    models: [],
    relations: [],
  }
  fileNames.forEach(fileName => {
    const filePath = path.join(config.paths.interfaces, fileName);
    const fileData = fs.readFileSync(filePath, 'utf-8');
    const fileSchema = parseSchema(config, fileData);
    let interfaceData: Model | Relation = fileSchema.models[0];
    let isModel = !!interfaceData;
    if(!isModel) {
      interfaceData = fileSchema.relations[0];
    }
    interfaceData.id = crypto.createHash('sha256').update(fileData).digest('hex').toUpperCase();
    if(isModel) schema.models.push(interfaceData as Model);
    else schema.relations.push(interfaceData as Relation);
  });

  if(!schema) throw new Error('no schema');

  sortCompositions(schema);
  sortFields(schema);

  const linkedModels = schema.models.map(m => {
    const modelRelations = schema.relations.filter(r => r.fields.some(f => f.type === m.name));
    return {
      ...m,
      relations: modelRelations.map(r => (
        {
          ...r,
          fields: (
            r.fields.length === 1 ? r.fields : r.fields.filter(f => f.type !== m.name)
          ).map(f => ({
            ...f,
            id: schema.models.find(o => o.name === f.type)?.id,
          })),
        }
      )),
    } as LinkedModel;
  });

  linkedModels.forEach(m => {
    m.compositions = m.compositions.map(k => linkedModels.find(o => o.name === k.name) as LinkedModel).filter(k => k);
  });

  return Object.fromEntries(removeEmpty(linkedModels).map((k: LinkedModel) => [k.id, k])) as Record<string, LinkedModel>;
}