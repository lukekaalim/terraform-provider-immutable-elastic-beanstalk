
const { version } = require('./package.json');
const { readFile } = require('fs').promises;
const { basename, join } = require('path');
const aws = require('aws-sdk');
const terraform = require('@lukekaalim/terraform-plugin-sdk');
const { read } = require('fs');

const provider = terraform.createProvider({
  name: 'elastic-beanstalk',
  version,
  schema: terraform.createSchema({
    aws_id:  { type: terraform.types.string },
    aws_secret: { type: terraform.types.string },
    aws_region: { type: terraform.types.string, optional: true },
  }),
  async configure({ aws_id, aws_secret, aws_region = 'ap-southeast-2' }) {
    const config = new aws.Config({
      accessKeyId: aws_id,
      secretAccessKey: aws_secret,
      region: aws_region
    });
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
    const key = join(config.prefix, config.fileHash, basename(config.file));
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
})

const applicationVersion = terraform.createResource({
  name: 'application_version',
  block: terraform.createSchema({
    applicationName: { type: terraform.types.string, required: true },
    name: { type: terraform.types.string, required: true },
    version: { type: terraform.types.string, required: true },
  }),
  async create({ version, applicationName }) {
    const params = {
      ApplicationName: "my-app", 
      AutoCreateApplication: false, 
      Description: "my-app-v1", 
      Process: false, 
      SourceBundle: {
       S3Bucket: "my-bucket", 
       S3Key: "sample.war"
      }, 
      VersionLabel: "v1"
     };
  },
  async update() {

  },
  async delete() {

  }
});

const plugin = terraform.createPlugin(provider, [applicationVersion, bundle]);

plugin.run();
