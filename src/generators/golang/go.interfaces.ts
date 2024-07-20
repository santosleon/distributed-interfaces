import { Model, ModelField, Relation, RelationField } from '../../grammar/base.interfaces.js';

export interface GoModel extends Model {
  fields: GoModelField[]
}

export interface GoModelField extends ModelField {
  complement: GoModelFieldComplement
}

export interface GoModelFieldComplement {
  goType:       string
  goFieldName:  string
  tags?:        string[]
}

export interface GoRelation extends Relation {
  fields: GoRelationField[]
}

export interface GoRelationField extends RelationField {
  complement: GoRelationFieldComplement
}

export interface GoRelationFieldComplement {
  goType:       string
  goFieldName:  string
  bunRelation:  string
  nullableTag:  string
  tags?:        string[]
}
