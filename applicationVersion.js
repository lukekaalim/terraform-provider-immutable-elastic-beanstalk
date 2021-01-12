// @flow strict
/*:: import type { ConfiguredProvider } from './elasticBeanstalkProvider'; */ 
/*:: import type { Resource } from '@lukekaalim/terraform-plugin'; */ 
const { createReadStream } = require('fs');
const { basename, extname } = require('path');
const { types: { string }, createSimpleResource, createSimplePlan, Unknown } = require('@lukekaalim/terraform-plugin');

class ImmutableVersionViolation extends Error {
  constructor() {
    super(`Attempted to create a new application version without updating the archive_path or application_name.`);
  }
}
class VersionLabelCollision extends Error {
  constructor(versionLabel/*: string*/) {
    super(`An Application Version with the label "${versionLabel}" already exists.`);
  }
}

/*::
export type Plan = {
  source_bucket: string,
  application_name: string,
  archive_path: string,
};

export type State = {
  ...Plan,
  source_key: string,
  version_label: string,
  application_version_arn: string,
};
*/

const calculateVersionLabel = (plan) =>
  basename(plan.archive_path, extname(plan.archive_path))

const createApplicationVersion = (eb, s3) => async (plan) => {
  const versionLabel = calculateVersionLabel(plan);
  const key = [plan.application_name, basename(plan.archive_path)].join('/');

  const { } = await s3.putObject({
    Body: createReadStream(plan.archive_path),
    Bucket: plan.source_bucket,
    Key: key,
  });
  const { ApplicationVersion } = await eb.createApplicationVersion({
    ApplicationName: plan.application_name,
    Description: '',
    SourceBundle: {
      S3Bucket: plan.source_bucket,
      S3Key: key,
    },
    Tags: [],
    VersionLabel: versionLabel,
  });
  return {
    ...plan,
    application_version_arn:  ApplicationVersion.ApplicationVersionArn,
    source_key:               ApplicationVersion.SourceBundle.S3Key,
    version_label:            ApplicationVersion.VersionLabel,
    source_bucket:            ApplicationVersion.SourceBundle.S3Bucket,
    application_name:         ApplicationVersion.ApplicationName,
  };
};

const readApplicationVersion = (eb) => async (state) => {
  const { ApplicationVersions } = await eb.describeApplicationVersions({
    ApplicationName: state.application_name,
    VersionLabels: [state.version_label],
  });
  if (ApplicationVersions.length < 1)
    return null;
  const ApplicationVersion = ApplicationVersions[0];
  return {
    ...state,
    application_version_arn:  ApplicationVersion.ApplicationVersionArn,
    source_key:               ApplicationVersion.SourceBundle.S3Key,
    version_label:            ApplicationVersion.VersionLabel,
    source_bucket:            ApplicationVersion.SourceBundle.S3Bucket,
    application_name:         ApplicationVersion.ApplicationName,
  };
};

const updateApplicationVersion = (eb, s3, create) => async (state, plan) => {
  const plannedVersionLabel = calculateVersionLabel(plan);
  const changedVersion = state.version_label !== plannedVersionLabel;
  const changedApplication = state.application_name !== plan.application_name;
  if (changedVersion || changedApplication)
    return await create(plan);
  else
    throw new ImmutableVersionViolation()
};

const simpleSchema = {
  required: {
    source_bucket: string,
    application_name: string,
    archive_path: string,
  },
  computed: {
    source_key: string,
    version_label: string,
    application_version_arn: string,
  }
};

const applicationVersionExists = async (eb, applicationName, applicationVersion) => {
  const { ApplicationVersions } = await eb.describeApplicationVersions({
    ApplicationName: applicationName,
    VersionLabels: [applicationVersion],
  });
  return ApplicationVersions.length > 0;
};

const applicationVersionResource/*: Resource*/ = {
  ...createSimpleResource/*:: <Plan, State, ConfiguredProvider>*/({
    name: 'application-version',
    simpleSchema,
    configure([eb, s3]) {
      const create = createApplicationVersion(eb, s3)
      const update = updateApplicationVersion(eb, s3, create);
      const read = readApplicationVersion(eb);
      const destroy = async () => {
        // Don't explicitly destroy any resources
        return;
      };

      return {
        create,
        update,
        // $FlowFixMe
        read,
        destroy,
      };
    }
  }),
  // override the plan to include custom logic
  async plan(state, config, [eb, s3]/*: ConfiguredProvider*/) {
    const versionLabel = calculateVersionLabel(config);
    if (!state) {
      if (await applicationVersionExists(eb, config.application_name, versionLabel))
        throw new VersionLabelCollision(versionLabel);
      return createSimplePlan(simpleSchema, state, config);
    }

    const changedVersion = state.version_label !== versionLabel;
    const changedApplication = state.application_name !== config.application_name;
    const changedSourceBucket = state.source_bucket !== config.source_bucket;

    if (changedVersion || changedApplication) {
      if (await applicationVersionExists(eb, config.application_name, versionLabel))
        throw new VersionLabelCollision(versionLabel);
      return {
        ...config,
        source_key: new Unknown(),
        application_version_arn: new Unknown(),
        version_label: new Unknown(),
      }
    } else if (changedSourceBucket) {
      throw new ImmutableVersionViolation();
    } else {
      // no changes?
      return config;
    }
  },
};

module.exports = {
  applicationVersionResource,
};
