package common

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/swaggest/rest/nethttp"
	"github.com/swaggest/usecase"
	"github.com/swaggest/usecase/status"
)

func convertToInteractFunc [i, o any](interact func(ctx context.Context, input i, output *o) (sql.Result, error)) (func(ctx context.Context, input i, output *o) error) {
	return func(ctx context.Context, input i, output *o) (err error) {
		_, err = interact(ctx, input, output)
		return err
	}
}

func Route[i, o any](interact func(ctx context.Context, input i, output *o) (sql.Result, error), tag string, options ...func(i *usecase.IOInteractor)) *nethttp.Handler {
	var n *nethttp.Handler
	u := usecase.IOInteractorOf[i, o]{}
	u.Input = *new(i)
	u.Output = new(o)
	u.SetTags(tag)
	u.SetExpectedErrors(status.AlreadyExists)
	u.SetExpectedErrors(status.NotFound)
	u.InteractFunc = convertToInteractFunc(interact)
	u.Interactor = usecase.Interact(func(ctx context.Context, input, output any) error {
		inp, ok := input.(i)
		if !ok {
			return fmt.Errorf("%w of input: %T, expected: %T", usecase.ErrInvalidType, input, u.Input)
		}
		out, ok := output.(*o)
		if !ok {
			return fmt.Errorf("%w f output: %T, expected: %T", usecase.ErrInvalidType, output, u.Output)
		}
		*out = *new(o)
		sqlResult, err := interact(ctx, inp, out)
		if err != nil && err.Error() == "sql: no rows in result set" {
			err = status.NotFound
		}
		if(sqlResult != nil) {
			rowsAffected, _ := sqlResult.RowsAffected()
			if(rowsAffected == 0) {
				err = status.NotFound
			}
		}
		// err = status.Aborted
		return err
	})

	for _, o := range options {
		o(&u.IOInteractor)
	}

	n = nethttp.NewHandler(u)
	return n
}
