// @flow strict

/*::
declare module "@aws-sdk/client-elastic-beanstalk" {
  declare export type ApplicationVersionInput = {
    ApplicationName: string,
    Description: string,
    SourceBundle: {
      S3Bucket: string,
      S3Key: string,
    },
    Tags: { key: string, value: string }[],
    VersionLabel: string,
  };
  declare export type ApplicationVersionDescription = {
    ...ApplicationVersionInput,
    ApplicationVersionArn: string,
  };

  declare export class ElasticBeanstalk {
    constructor({ profile?: ?string, region?: ?string }): ElasticBeanstalk;
    createApplicationVersion(input: ApplicationVersionInput):
      Promise<{ ApplicationVersion: ApplicationVersionDescription }>,
    updateApplicationVersion(input: { Description: string }):
      Promise<{ ApplicationVersion: ApplicationVersionDescription }>,
    describeApplicationVersions(input: { VersionLabels: string[], ApplicationName: string }):
      Promise<{ ApplicationVersions: ApplicationVersionDescription[] }>,
    deleteApplicationVersion(input: { ApplicationName: string, VersionLabel: string, DeleteSourceBundle: boolean }):
      Promise<{}>,
  }
}
declare module "@aws-sdk/client-s3" {
  import type { ReadableStream } from 'stream';
  declare export class S3 {
    constructor({ profile?: ?string, region?: ?string }): S3;
    putObject(input: {
      Body: ReadableStream,
      Bucket: string,
      Key: string,
    }): Promise<{
      ETag: string,
    }>,
  }
}
*/