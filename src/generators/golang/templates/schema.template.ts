import { LinkedModel } from '../../../grammar/base.interfaces.js'

export const makeSchemaMapFromTemplate = (linkedModels: Record<string, LinkedModel>) =>
`package schema

import "encoding/json"

func GetSchemaMap (id string) (res []byte, err error) {
	schema := map[string] string {
${Object.entries(linkedModels).map(([k, v]) => `\t\t\"${k}\": ${JSON.stringify(JSON.stringify(v))},`).join('\n')}
	}
	if(id == "") {
		jsonMap := make(map[string]interface{})
		for key, value := range schema {
			var jsonObj interface{}
			err = json.Unmarshal([]byte(value), &jsonObj)
			if(err != nil) { return }
			jsonMap[key] = jsonObj
		}
		res, err = json.Marshal(jsonMap)
	} else {
		res = []byte(schema[id])
	}
	return
}
`;
