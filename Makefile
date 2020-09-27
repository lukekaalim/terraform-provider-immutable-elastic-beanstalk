name=elastic-beanstalk
version=1.0.1

macBinaryName=darwin_amd64/terraform-provider-$(name)_v$(version)
linuxBinaryName=linux_amd64/terraform-provider-$(name)_v$(version)

macZipName=terraform-provider-$(name)_$(version)_darwin_amd64.zip
linuxZipName=terraform-provider-$(name)_$(version)_linux_amd64.zip

shasumName=terraform-provider-$(name)_$(version)_SHA256SUMS
sigName=terraform-provider-$(name)_$(version)_SHA256SUMS.sig

artifacts:
	mkdir -p artifacts;

# MACOS
artifacts/$(macBinaryName):
	pkg main.js --targets latest-macos-x64 --output $@

artifacts/$(macZipName): artifacts/$(macBinaryName)
	mkdir -p artifacts/darwin_amd64;
	cd artifacts/darwin_amd64; zip -r ../$(macZipName) .

# Linux
artifacts/$(linuxBinaryName):
	pkg main.js --targets latest-linux-x64 --output $@

artifacts/$(linuxZipName): artifacts/$(linuxBinaryName)
	mkdir -p artifacts/linux_amd64;
	cd artifacts/linux_amd64; zip -r ../$(linuxZipName) .
	
# SHASUMS
artifacts/$(shasumName): artifacts/$(linuxZipName) artifacts/$(macZipName)
	cd artifacts; shasum -a 256 *.zip > ../$@

artifacts/$(sigName): artifacts/$(shasumName)
	gpg --detach-sig artifacts/$(shasumName)

all: artifacts/$(linuxZipName) artifacts/$(macZipName) artifacts/$(shasumName) artifacts/$(sigName)

.PHONY: all