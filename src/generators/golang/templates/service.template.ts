import { Model } from '../../../grammar/base.interfaces.js'

export const makeServiceFromTemplate = (model: Model, modelRelations: string[]) =>
`package services

import (
	"backend/common"
	"backend/db"
	"backend/di"
	"context"
	"database/sql"
)

func ${model.name}List (ctx context.Context, input common.ListMethodParams, output *[]di.${model.name}) (res sql.Result, err error) {
	input.ReplaceNilWithDefault()
	err = db.Bun.NewSelect().Model(output).
		Limit(*input.Limit).
		Offset(*input.Offset).
		Scan(ctx)
	return
}

func ${model.name}FindOne (ctx context.Context, input di.${model.name}IdDto, output *di.${model.name}) (res sql.Result, err error) {
	output.ID_ = input.ID_
	err = db.Bun.NewSelect().Model(output).
${modelRelations.map(k => `\t\tRelation("${k}").`).join('\n')}
		WherePK().
		Scan(ctx)
	return
}

func ${model.name}Create (ctx context.Context, input di.${model.name}CreateDto, output *di.${model.name}) (res sql.Result, err error) {
	dest := di.${model.name}Dto{}
	res, err = db.Bun.NewInsert().Model(&input).Returning("*").Exec(ctx, &dest)
	output.${model.name}Dto = dest
	return
}

func ${model.name}Update (ctx context.Context, input di.${model.name}UpdateDto, output *di.${model.name}) (res sql.Result, err error) {
	dest := di.${model.name}Dto{}
	res, err = db.Bun.NewUpdate().Model(&input).
		Value("_updated_at", "extract(epoch from now()) * 1000").
		Value("_change", "_change + 1").
		OmitZero().WherePK().Returning("*").Exec(ctx, &dest)
	output.${model.name}Dto = dest
	return
}

func ${model.name}Delete (ctx context.Context, input di.${model.name}IdDto, output *di.${model.name}Dto) (res sql.Result, err error) {
	output.ID_ = input.ID_
	res, err = db.Bun.NewDelete().Model(output).WherePK().Returning("*").Exec(ctx)
	return
}
`;
