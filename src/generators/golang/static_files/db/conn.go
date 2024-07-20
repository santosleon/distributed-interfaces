package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"
)

var Pool *sql.DB // Database connection Pool.
var Bun *bun.DB
var Ctx context.Context

func Open() error {
  var host     = os.Getenv("WINDOWS_HOST")
  var port     = 5432
  var driver   = "postgres"
  var user     = "postgres"
  var password = "password"
  var dbname   = "di"
  if (host == "") { host = "localhost" }
  dsn := fmt.Sprintf("%s://%s:%s@%s:%d/%s?sslmode=disable", driver, user, password, host, port, dbname)

  Pool = sql.OpenDB(pgdriver.NewConnector(pgdriver.WithDSN(dsn)))
  Bun = bun.NewDB(Pool, pgdialect.New())

  // maxOpenConns := 4 * runtime.GOMAXPROCS(0)
  Pool.SetConnMaxLifetime(0)
  Pool.SetMaxIdleConns(0)
  Pool.SetMaxOpenConns(3)

  return nil
}
