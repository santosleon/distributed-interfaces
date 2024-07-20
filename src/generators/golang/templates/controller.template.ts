import { Model } from '../../../grammar/base.interfaces.js'

export const makeControllerFromTemplate = (model: Model) =>
`package controllers
	
import (
	"backend/common"
	"backend/services"
	"net/http"

	chi "github.com/go-chi/chi/v5"
)

func ${model.name}Routes(r chi.Router) {
	const tag string = "${model.name}"
	r.Method(http.MethodGet,    "/",      common.Route(services.${model.name}List, tag))
	r.Method(http.MethodGet,    "/{_id}", common.Route(services.${model.name}FindOne, tag))
	r.Method(http.MethodPatch,  "/",      common.Route(services.${model.name}Create, tag))
	r.Method(http.MethodPatch,  "/{_id}", common.Route(services.${model.name}Update, tag))
	r.Method(http.MethodDelete, "/{_id}", common.Route(services.${model.name}Delete, tag))
}
`;

