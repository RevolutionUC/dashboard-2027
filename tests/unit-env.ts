// Unit tests only: these modules create a pool but never connect to it.
process.env.DATABASE_URL ??= "postgres://revuc:revuc_local@127.0.0.1:55437/revuc_forms_test";
