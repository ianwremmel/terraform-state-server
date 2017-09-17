resource "random_id" "server" {
  keepers = {
  }

  byte_length = 8
}

terraform {
  backend "http" {
    username = "test"
    password = "test"
    address = "http://localhost:3000/state"
  }
}

