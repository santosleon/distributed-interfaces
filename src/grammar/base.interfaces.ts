export interface ConfigFile {
  paths: {
    schema: string
    definition: string
    interfaces: string
    search: string
    build: string
  }
  server: string
  database: {
    schema: string
    url:    string
  }
  blockchain: {
    privateKey?: string
  }
  generator: {
    go: {
      packageName: string
      outputPath:  string
    }
  }
  build:  {
    remoteIntefaces?:    Record<string, string>
    previousInterfaces?: Record<string, string | null>
    compositions?:       string[]
    ignore?:             string[]
  }
}

export interface Config extends ConfigFile {
  codePath:    string
  processPath: string
  command:     string
}

export interface Definition {
  server:       string
  models:       Record<string, string>
  compositions: Record<string, string>
  relations:    Record<string, string>
}

export interface InterfaceState {
  rootHash:      string
  prevHash:      string
  interfaceHash: string
  fileHash:      string
  exists:        boolean
}

export interface DefinitionState {
  definitionHash: string
  active:         boolean
  exists:         boolean
}

export interface SubmitItem {
  root: string
  prev: string
  file: string
}

export type SubmitJson = Record<string, SubmitItem>;

export interface Schema {
  models:    Model[]
  relations: Relation[]
}

export interface Model {
  id?:          string
  name:         string
  compositions: Composition[]
  fields:       ModelField[]
  annotations:  Annotation[]
  comment:      string
}

export interface Composition {
  name:    string
  comment: string
}

export interface LinkedModel extends Model {
  compositions: LinkedModel[]
  relations:    Relation[]
}

type ModelTypeBool   = 'bool';
type ModelTypeInt    = 'int' | 'int8' | 'int16' | 'int32' | 'int64';
type ModelTypeUint   = 'uint' | 'uint8' | 'uint16' | 'uint32' | 'uint64';
type ModelTypeFloat  = 'float' | 'float32' | 'float64';
type ModelTypeDate   = 'date';
type ModelTypeString = 'string';
type ModelTypeBytes  = 'bytes';

export type ModelType = ModelTypeBool | ModelTypeInt | ModelTypeUint | ModelTypeFloat | ModelTypeDate | ModelTypeString | ModelTypeBytes;

export interface ModelField {
  name:          string
  type:          ModelType
  isNullable?:   boolean
  doNotCreate?:  boolean
  doNotUpdate?:  boolean
  isPrivate?:    boolean
  isHidden?:     boolean
  isUnique?:     boolean
  isAutoGen?:    boolean
  isPrimaryKey?: boolean
  isBasicField?: boolean
  validation?:   ModelFieldValidation
}

export interface ModelFieldValidation {
  mul?:    number
  gte?:    number
  lte?:    number
  gt?:     number
  lt?:     number
  minlen?: number
  maxlen?: number
  regex?:  string
}

export interface Annotation {
  name:   string
  params: string[]
}

export interface Relation {
  id?:          string
  fields:       RelationField[]
  comment:      string
}

export type DeleteUpdateAction = "nothing" | "cascade" | "unlink";

export interface RelationField {
  id?:           string
  name:          string
  type:          string
  isNullable?:   boolean
  isArray?:      boolean
  isMutual?:     boolean
  isMutable?:    boolean
  onDelete?:     DeleteUpdateAction
  onUpdate?:     DeleteUpdateAction
  references?:   string[]
  isRelationId?: boolean
}

interface FieldOrCompositionBooleans {
  isField?:       boolean
  isComposition?: boolean
}

export type FieldOrComposition = (
  (Composition & FieldOrCompositionBooleans) |
  (ModelField & FieldOrCompositionBooleans)
);
