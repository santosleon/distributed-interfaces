import { Config } from '../../../grammar/base.interfaces.js'

export const makeOpionsMiddlewareFromTemplate = (congif: Config) =>
`package middlewares

import (
	"backend/${congif.generator.go.packageName}/schema"
	"net/http"
)

func HandleOptions(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions {
			diHeader := r.Header.Get("X-Distributed-Interfaces")
			if(diHeader != "") {
				var id string
				pathLen := len(r.URL.Path)
				if(r.URL.Path == "/") {
					id = ""
				} else if ((pathLen == 65) || (pathLen == 66 && r.URL.Path[65] == '/')) {
					id = r.URL.Path[1:65]
				} else {
					w.WriteHeader(http.StatusNotFound)
					return
				}
				jsonData, err := schema.GetSchemaMap(id)
				if(err != nil) {
					w.WriteHeader(http.StatusInternalServerError)
					return
				}
				if(len(jsonData) == 0) {
					w.WriteHeader(http.StatusNotFound)
					return
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				w.Write(jsonData)
			}
			return
		}
		next.ServeHTTP(w, r)
	})
}
`;
