export const diConfigFileStr = (`{
  "paths": {
    "schema": "./schema.di",
    "definition": "./di_definition.json",
    "interfaces": "./interfaces",
    "search": "./search",
    "build": "./build"
  },
  "server": "http://localhost:3000",
  "database": {
    "schema": "project",
    "url": "driver://user:password@host:port/database_name"
  },
  "blockchain": {
    "privateKey": ""
  },
  "generator": {
    "go": {
      "packageName": "di",
      "outputPath": "./go_gen"
    }
  },
  "build": {
    "remoteIntefaces": {
      
    },
    "previousInterfaces": {
      
    },
    "compositions": [
      
    ]
  }
}`);
