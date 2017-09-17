#!/usr/bin/env bash

set -e

function runTest() {
  npm start &
  PID=$!
  sleep 5
  curl -X DELETE http://localhost:3000/state

  terraform init
  terraform plan
  terraform apply

  kill $PID
  wait $PID
  unset PID
}

#
# Returns 0 if terraform fails
#
function runNegativeTest() {
  npm start &
  PID=$!
  sleep 5
  curl -X DELETE http://localhost:3000/state

  set +e
  terraform init
  local EXIT_CODE=$?
  set -e

  set +e
  kill $PID
  wait $PID
  unset PID
  set -e

  if [ "${EXIT_CODE}" == "0" ]; then
    return 1
  else
    return 0
  fi
}

trap 'set +e; [ -n "${PID}" ] && kill ${PID}' EXIT
export DATABASE_URL=postgres://postgres:password@localhost:5432/postgres

cd "$(dirname "$0")"
START_DIR=$(pwd)

npm run clean

echo
echo "/******************************************************************************\\"
echo "| Testing Without Locking"
echo "\\******************************************************************************/"

cd "${START_DIR}"
cd ./without-locking
runTest
echo "Success"

echo
echo "/******************************************************************************\\"
echo "| Testing With Locking"
echo "\\******************************************************************************/"

cd "${START_DIR}"
cd ./with-locking
runTest
echo "Success"

echo
echo "/******************************************************************************\\"
echo "| Testing Auth Without Locking"
echo "\\******************************************************************************/"

unset BASIC_AUTH_USER
unset BASIC_AUTH_PASSWORD
export BASIC_AUTH_USER=test
export BASIC_AUTH_PASSWORD=test
cd "${START_DIR}"
cd ./without-locking
runNegativeTest
EXIT_CODE=$?

if [ "${EXIT_CODE}" != "0" ]; then
  echo "Auth test failed to require credentials"
  exit 1
fi
cd "${START_DIR}"
cd ./without-locking-auth
runTest
echo "Success"
