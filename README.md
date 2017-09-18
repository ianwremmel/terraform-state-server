# terraform-state-server

[![CircleCI](https://circleci.com/gh/ianwremmel/terraform-state-server.svg?style=svg)](https://circleci.com/gh/ianwremmel/terraform-state-server)
[![NSP Status](https://nodesecurity.io/orgs/ianwremmel/projects/fd87feb8-514b-43de-9275-470318a78bde/badge)](https://nodesecurity.io/orgs/ianwremmel/projects/fd87feb8-514b-43de-9275-470318a78bde)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

> Lightweight Terraform state server (with locking support)

This is an [http backend](https://www.terraform.io/docs/backends/types/http.html) for storing Terraform state. You should be able to run it anywhere you can run a node app, but to get you going as quickly as possible, you can click the purple button to deply straight to Heroku.

## Security

No security is configured when running locally. You should set `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` before starting the server.

When deployed via the Heroku button, `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` are set for you, but you'll probably want to change them

## Background

Terraform is great for declaratively defining your infrastructure, but it relies on cached previous state to determine what changes to make. By default, it writes to a file, but there aren't great ways to share that file or prevent collisions if other if other folks are also making changes to infrastructure.

Alternatively, Terraform can be configured to point at a number of different [backend types](https://www.terraform.io/docs/backends/types/index.html). Outside of the Hashicorp's paid offering, most of the backends have a fair bit of ops overhead and only about half of them support locking.

## Install

### On Heroku

Just click this button:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

This'll configure a [free dyno](https://devcenter.heroku.com/articles/free-dyno-hours) and a [heroku postgres](https://www.heroku.com/postgres) dev plan, so won't sign you to pay for anything (though you may need a credit card on file to install addons). The dev plan should be more than adequate. At least for this iteration, the server only needs one table with one row. As long as you can tollerate a few extra seconds of latency from time to time, a free dyno should be more than adequate for this purpose.

### Manually

You'll need access to a postgres server somewhere (docker is probably your friend here). Make sure you set `DATABASE_URL` so that the server can access your database.

```bash
git clone git@github.com:ianwremmel/terraform-state-server.git
cd terraform-state-server
npm install
npm start
```

### Usage

Put the following directive in your project's terraform config.

```hcl
variable "BASIC_AUTH_USER" {}

variable "BASIC_AUTH_PASSWORD" {}

terraform {
  backend "http" {
    username = "${var.BASIC_AUTH_USER}"
    password = "${var.BASIC_AUTH_PASSWORD}"
    address = "${var.STATE_URI}"
  }
}
```

> If you deployed via the heroku button, you can use `heroku config --app YOUR_APP_NAME` to get `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD`.
> `STATE_URI` is going to be the heroku app base url plus `/state`. Something like `https://duplicate-snowflake-12345.herokuapp.com/state`

Then run `terraform init`.

#### Access Control

It's a little weird, but deploying to heroku actually gives you the ability to control access to your terraform state by way of the heroku dashboard. If you're comfortable with anyone who can issue terraform commands also having access to configure the state server, then the following is a rudimentary but reasonable secure way to keep secrets out of your repo:

```bash
export BASIC_AUTH_USER=$(heroku config:get BASIC_AUTH_USER --app YOUR_APP_NAME)
export BASIC_AUTH_PASSWORD=$(heroku config:get BASIC_AUTH_PASSWORD --app YOUR_APP_NAME)
terraform show
unset BASIC_AUTH_USER
unset BASIC_AUTH_PASSWORD
```

If you have `heroku config` access to that app, this lets you delegate to `heroku auth` for updating state.

## API

API docs are hosted at [apiary](http://docs.terraformstateserver.apiary.io/#). The api is based on a mix of reverse engineering the command line terraform client and on the [limited documentation](https://www.terraform.io/docs/backends/types/http.html).

## Maintainer

[Ian Remmel](https://github.com/ianwremmel)

## Contribute

PRs welcome. I had to reverse engineer this from the command line client since the docs a re a bit sparse on how the API works; there may well be bugs as a result.

- [Bugs?](https://github.com/ianwremmel/terraform-state-server/issues)

## License

[MIT](LICENSE) &copy; Ian Remmel
