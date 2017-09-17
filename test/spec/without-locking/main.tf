resource "random_id" "server" {
  keepers = {
  }

  byte_length = 8
}

terraform {
  backend "http" {
    address = "http://localhost:3000/state"
  }
}

