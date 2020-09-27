const { join } = require('path');
const { mkdir, chmod, symlink, rmdir } = require('fs').promises;
const homedir = require('os').homedir();

const org = 'luke.kaal.im';
const namespace = 'plugins';
const type = 'elastic-beanstalk';
const version = '1.0.0';
const operatingSystem = 'darwin_amd64';

const pluginDirectory = join(homedir, '.terraform.d/plugins/', org, namespace, type, version, operatingSystem);
const pluginFilename = `terraform-provider-${type}_${version}`;

const main = async ( ) => {
  try {
    const binary = join(__dirname, '../main.js');
    const pluginPath = join(pluginDirectory, pluginFilename);
    await rmdir(pluginDirectory, { recursive: true });
    await mkdir(pluginDirectory, { recursive: true });
    await symlink(binary, pluginPath);
    await chmod(pluginPath, 0o775);
  } catch (error) {
    console.error(error);
  }
};

main();