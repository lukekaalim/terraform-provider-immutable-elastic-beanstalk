
const { version } = require('./package.json');
const { readFile } = require('fs').promises;
const { basename, join } = require('path');
const aws = require('aws-sdk');
const terraform = require('@lukekaalim/terraform-plugin-sdk');
const crypto = require('crypto');

const createAWSConfig = (aws_profile, aws_id, aws_secret, aws_region) => {
  if (aws_profile) {
    const credentials = new aws.SharedIniFileCredentials({ profile: aws_profile });
    return {
      credentials,
      region: aws_region
    };
  }
  if (!aws_id && !aws_secret) {
    return {
      region: aws_region
    };
  }
  return {
    accessKeyId: aws_id,
    secretAccessKey: aws_secret,
    region: aws_region
  };
};

const provider = terraform.createProvider({
  name: 'elastic-beanstalk',
  version,
  schema: terraform.createSchema({
    aws_id:  { type: terraform.types.string, optional: true },
    aws_secret: { type: terraform.types.string, optional: true },
    aws_region: { type: terraform.types.string, optional: true },
    aws_profile: { type: terraform.types.string, optional: true },
  }),
  async configure({ aws_profile, aws_id, aws_secret, aws_region = 'ap-southeast-2' }) {
    const config = new aws.Config(createAWSConfig(aws_profile, aws_id, aws_secret, aws_region));
    console.log(config);
    const eb = new aws.ElasticBeanstalk(config);
    const s3 = new aws.S3(config);
    return { eb, s3 };
  }
});

const bundle = terraform.createResource({
  name: 'bundle',
  block: terraform.createSchema({
    bucket: { type: terraform.types.string, required: true },
    prefix: { type: terraform.types.string, optional: true },
    file: { type: terraform.types.string, required: true },
    fileHash: { type: terraform.types.string, required: true },
    key: { type: terraform.types.string, computed: true }
  }),
  async plan(provider, state, config, plan) {
    const key = join(config.prefix || '.', config.fileHash, basename(config.file));
    return {
      ...config,
      key,
    };
  },
  async create(providers, config) {
    const { s3 } = providers;
    const key = join(config.prefix, config.fileHash, basename(config.file));
    
    const params = {
      Body: await readFile(config.file),
      Bucket: config.bucket,
      Key: key,
    }
    await s3.putObject(params).promise();
    
    return {
      ...config,
      key,
    };
  },
  async read(providers, state) {
    const { s3 } = providers;
    const key = join(state.prefix, state.fileHash, basename(state.file));
    
    const params = {
      Bucket: state.bucket,
      Key: key,
    }
    try {
      await s3.getObject(params).promise();
      return {
        ...state,
        key,
      };
    } catch (error) {
      return {
        ...state,
        key,
        fileHash: '',
      };
    }
  },
  async update(providers, state, config) {
    return await this.create(providers, config);
  },
});

const createVersionHash = (config) => {
  const versionHash = crypto.createHash('sha256');
  versionHash.write(config.applicationName);
  versionHash.write(config.sourceBundle.bucket);
  versionHash.write(config.sourceBundle.key);
  versionHash.end();
  return versionHash.read().toString('hex').slice(0, 31);
};

const applicationVersion = terraform.createResource({
  name: 'application_version',
  block: terraform.createSchema({
    applicationName: { type: terraform.types.string, required: true },
    sourceBundle: { type: terraform.types.object({
      bucket: terraform.types.string,
      key: terraform.types.string
    }), required: true },
    version: { type: terraform.types.string, computed: true },
  }),
  async plan(provider, state, config, plan) {
    const version = createVersionHash(config);
    return {
      ...config,
      version,
    }
  },
  async create(providers, config) {
    const { eb } = providers;
    const version = createVersionHash(config);
    const params = {
      ApplicationName: config.applicationName,
      Description: "My App", 
      SourceBundle: {
       S3Bucket: config.sourceBundle.bucket, 
       S3Key: config.sourceBundle.key
      }, 
      VersionLabel: version,
    };

    await eb.createApplicationVersion(params).promise();

    return {
      ...config,
      version,
    };
  },
  async update(provider, state, config) {
    return await this.create(provider, config);
  },
});

const plugin = terraform.createPlugin(provider, [applicationVersion, bundle]);

plugin.run();
