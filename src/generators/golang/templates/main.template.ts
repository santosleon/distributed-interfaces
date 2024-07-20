export const makeMainFromTemplate = (definitionModels: Record<string, string>) =>
`package main

import (
	"backend/controllers"
	"backend/db"
	"backend/middlewares"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/swaggest/jsonschema-go"
	"github.com/swaggest/openapi-go/openapi3"
	"github.com/swaggest/rest/web"
)

func saveOpenAPISpec(s *web.Service) (err error) {
	j, err := json.Marshal(s.OpenAPISchema())
	if err != nil { return err }
	
	str := string(j)
	var replaced string
	replaced = strings.ReplaceAll(str, "\\"Di", "\\"") 
	replaced = strings.ReplaceAll(replaced, "/Di", "/") 
	replacedJson := []byte(replaced)

	file, err := os.Create("openapi.json")
	if err != nil { return err }
	defer file.Close()


	_, err = file.Write(replacedJson)
	if err != nil { return err }

	fmt.Println("JSON data written to file successfully.")
	return
}

func main() {
  db.Ctx = context.Background()
  if err := db.Open(); err != nil {
    panic(err)
  }
  defer db.Pool.Close()

  fmt.Println("Successfully connected!")

  r := web.NewService(openapi3.NewReflector())

	// Init API documentation schema.
	r.OpenAPISchema().SetTitle("Backend")
	r.OpenAPISchema().SetDescription("Backend")
	r.OpenAPISchema().SetVersion("1.0")

	// An example of global schema override to disable additionalProperties for all object schemas.
	r.OpenAPICollector.Reflector().DefaultOptions = append(r.OpenAPICollector.Reflector().DefaultOptions, jsonschema.InterceptSchema(
		func(params jsonschema.InterceptSchemaParams) (stop bool, err error) {
			schema := params.Schema
			if schema.HasType(jsonschema.Object) && len(schema.Properties) > 0 && schema.AdditionalProperties == nil {
				schema.AdditionalProperties = (&jsonschema.SchemaOrBool{}).WithTypeBoolean(false)
			}
			return false, nil
		}),
	)

	r.Use(middlewares.HandleOptions)
${Object.entries(definitionModels).map(([k, v]) => `\tr.Route("/${v}", controllers.${k}Routes)\n`).join('')}

	err := saveOpenAPISpec(r)
	if(err != nil) { fmt.Println(err) }

  http.ListenAndServe("localhost:3000", r)
}
`;
