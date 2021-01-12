terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
    immutable-elastic-beanstalk = {
      source = "local/lukekaalim/immutable-elastic-beanstalk"
      version = "0.1.0"
    }
    archive = {
      source = "hashicorp/archive"
      version = "2.0.0"
    }
  }
}

provider "aws" {
  profile = "personal"
  region = "ap-southeast-2"
}
provider "immutable-elastic-beanstalk" {
  profile = "personal"
  region = "ap-southeast-2"
}

resource "aws_s3_bucket" "b" {
  bucket_prefix = "luke-test"
}

data "aws_iam_role" "beanstalk_service" {
  name = "aws-elasticbeanstalk-service-role"
}

data "archive_file" "example_app" {
  type        = "zip"
  source_dir = "./example_app"
  output_path = "./2.0.0.zip"
}

resource "immutable-elastic-beanstalk_application-version" "latest_version" {
  application_name = aws_elastic_beanstalk_application.test.name
  source_bucket = aws_s3_bucket.b.bucket
  archive_path = data.archive_file.example_app.output_path
}

resource "aws_elastic_beanstalk_application" "test" {
  name        = "tf-test-name"
  description = "tf-test-desc"

  appversion_lifecycle {
    service_role          = data.aws_iam_role.beanstalk_service.arn
    max_count             = 128
    delete_source_from_s3 = true
  }
}
