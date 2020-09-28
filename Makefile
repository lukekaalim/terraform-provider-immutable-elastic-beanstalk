name=elastic-beanstalk
version=$(shell cat package.json | jq .version -r)
gpgPassphrase=bothways

linux=linux_amd64
mac=darwin_amd64

targets=$(mac) $(linux)
binaries=$(patsubst %, artifacts/%/terraform-provider-$(name)_v$(version), $(targets))
archives=$(patsubst %, artifacts/terraform-provider-$(name)_$(version)_%.zip, $(targets))

sigName=terraform-provider-$(name)_$(version)_SHA256SUMS.sig

artifacts:
	mkdir -p artifacts;

# Binaries
artifacts/$(mac)/terraform-provider-$(name)_v$(version):
	mkdir -p artifacts/$(mac);
	npx pkg main.js --targets latest-macos-x64 --output $@

artifacts/$(linux)/terraform-provider-$(name)_v$(version):
	mkdir -p artifacts/$(linux);
	npx pkg main.js --targets latest-linux-x64 --output $@

# Archives
artifacts/terraform-provider-$(name)_$(version)_%.zip: artifacts/%/terraform-provider-$(name)_v$(version)
	cd artifacts/$*; zip -r ../../$@ .

# SHASUMS
artifacts/terraform-provider-$(name)_$(version)_SHA256SUMS: $(archives)
	cd artifacts; shasum -a 256 *.zip > ../$@

# Signitures
artifacts/terraform-provider-$(name)_$(version)_SHA256SUMS.sig: artifacts/terraform-provider-$(name)_$(version)_SHA256SUMS
	gpg --detach-sig $<
	gpg --verify $@ $<

clean:
	rm -rf artifacts

all: \
	artifacts/terraform-provider-$(name)_$(version)_SHA256SUMS.sig \
  artifacts/terraform-provider-$(name)_$(version)_SHA256SUMS \
  $(binaries) $(archives)

.PHONY: all clean