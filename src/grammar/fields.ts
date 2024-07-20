import { Model, Schema } from './base.interfaces.js'

const recursiveComposition = (model: Model, models: Model[], prevModels: string[] = []): Model => {
  if(!model.compositions.length) return model;
  const prev = [...prevModels, model.name];
  const composed = model.compositions.map(c => {
    const compositionModel = models.filter(m => !prev.includes(m.name)).find(m => m.name === c.name);
    if(!compositionModel) throw new Error(`Invalid Composition ${c.name}`);
    return recursiveComposition(compositionModel, models, prev);
  });
  return {
    name:         model.name,
    fields:       [...composed.map(c => c.fields).flat(), ...model.fields],
    annotations:  [...composed.map(c => c.annotations).flat(), ...model.annotations],
    comment:      model.comment,
    compositions: [],
  }
}

export const applyCompositions = (schema: Schema) => {
  schema.models = schema.models.map(m => recursiveComposition(m, schema.models))
}

export const sortCompositions = (schema: Schema) => {
  schema.models.forEach(m => {
    m.compositions.sort((a, b) => a.name.localeCompare(b.name))
  });
}

export const sortFields = (schema: Schema) => {
  schema.models.forEach(m => {
    m.fields.sort((a, b) => a.name.localeCompare(b.name))
  });
}

export const addBasicFields = (schema: Schema) => {
  schema.models.forEach(m => {
    // m.fields.unshift({
    //   name: '_signature',
    //   type: 'string',
    //   isBasicField: true,
    // });
    m.fields.unshift({
      name: '_change',
      type: 'int64',
      isBasicField: true,
    });
    m.fields.unshift({
      name: '_updated_at',
      type: 'int64',
      isBasicField: true,
    });
    m.fields.unshift({
      name: '_created_at',
      type: 'int64',
      isBasicField: true,
      doNotUpdate: true,
    });
    m.fields.unshift({
      name: '_id',
      type: 'string',
      isPrimaryKey: true,
      isBasicField: true,
    });
  })
}
