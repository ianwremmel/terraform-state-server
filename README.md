# terraform-state-server

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
[![CircleCI](https://circleci.com/gh/ianwremmel/terraform-state-server.svg?style=svg)](https://circleci.com/gh/ianwremmel/terraform-state-server)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

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

Just click this button: [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

### Manually

You'll need access to a postgres server somewhere (docker is probably your friend here). Make sure you set DATABASE_URL so that the server can access your database.

```bash
git clone git@github.com:ianwremmel/terraform-state-server.git
cd terraform-state-server
npm install
npm start
```

### Usage

Put the following directive in your project's terraform config.

```hcl
terraform {
  backend "http" {
    username = "${var.BASIC_AUTH_USER}"
    password = "${var.BASIC_AUTH_PASSWORD"
    address = "${var.STATE_URI"
  }
}
```

Then run `terraform init`.

## Maintainer

[Ian Remme](https://github.com/ianwremmel)

## Contribute

PRs welcome. I had to reverse engineer this from the command line client since the docs a re a bit sparse on how the API works; there may well be bugs as a result.

- [Bugs?](https://github.com/ianwremmel/terraform-state-server/issues)

## License

[MIT](LICENSE) &copy; Ian Remmel
