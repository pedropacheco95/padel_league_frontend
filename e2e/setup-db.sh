#!/bin/bash
# Fresh e2e database: ${TEST_DB_PREFIX}_e2e cloned from ${E2E_TEMPLATE} (default ${TEST_DB_PREFIX}_v2b_tpl, bootstrapped),
# with the password "e2e-pass" on the accounts the specs log in with.
set -euo pipefail
: "${TEST_DB_PREFIX:?set TEST_DB_PREFIX}"
DB="${TEST_DB_PREFIX}_e2e"; TPL="${E2E_TEMPLATE:-${TEST_DB_PREFIX}_v2b_tpl}"
PG=(-h localhost -U postgres)
psql "${PG[@]}" -d postgres -Atqc "select pg_terminate_backend(pid) from pg_stat_activity where datname='$DB'" >/dev/null
dropdb "${PG[@]}" --if-exists "$DB"
createdb "${PG[@]}" -T "$TPL" "$DB"
HASH=$("$BACKEND/.venv/bin/python" -c "from werkzeug.security import generate_password_hash as g; print(g('e2e-pass'))")
psql "${PG[@]}" -d "$DB" -qc "update users set password='$HASH' where username in ('diogomalafaya','bernardocastro','cucamagalhaes','talinhobritoefaro','pedropacheco')"
echo "$DB ready from $TPL"
