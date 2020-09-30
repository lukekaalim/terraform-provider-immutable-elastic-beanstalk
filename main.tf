terraform {
  required_providers {
    elastic-beanstalk = {
      source = "luke.kaal.im/plugins/elastic-beanstalk"
      version = "1.0.0"
    }
  }
}

provider "elastic-beanstalk" {
  aws_region = "ap-southeast-2"
}

resource "elastic-beanstalk_bundle" "source" {
  bucket = "tome-beanstalk-sources"
  prefix = "Wildspace"
  file = abspath("./text.demo.txt")
  fileHash = filemd5(abspath("./text.demo.txt"))
}

resource "elastic-beanstalk_application_version" "version" {
  applicationName = "astral-atlas-wildspace-api"
  sourceBundle = {
    bucket = elastic-beanstalk_bundle.source.bucket
    key = elastic-beanstalk_bundle.source.key
  }
}
