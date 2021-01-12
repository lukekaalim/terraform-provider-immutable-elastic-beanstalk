// @flow strict
/*::
import type { Cast } from '@lukekaalim/cast';
import type { Provider } from '@lukekaalim/terraform-plugin';
*/
const { toObject, toString } = require('@lukekaalim/cast');

const { ElasticBeanstalk } = require('@aws-sdk/client-elastic-beanstalk');
const { S3 } = require('@aws-sdk/client-s3');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');

const {
  createProvider, createSchema, createBlock,
  createAttribute, types: { string }, marshal
} = require('@lukekaalim/terraform-plugin');
const { applicationVersionResource } = require('./applicationVersion');

/*::
export type ConfiguredProvider = [ElasticBeanstalk, S3];

export type ProviderConfig = {
  region: ?string,
  profile: ?string,
}
*/
const toProviderConfig/*: Cast<ProviderConfig>*/ = (value) => {
  const object = toObject(value);
  return {
    region: object.region ? toString(object.region) : null,
    profile: object.profile ? toString(object.profile) : null,
  }
};

const elasticBeanstalkProvider/*: Provider*/ = createProvider({
  name: 'immutable-elastic-beanstalk',
  resources: [applicationVersionResource],
  schema: createSchema({
    block: createBlock({
      attributes: [
        createAttribute({
          name: 'region',
          required: false,
          optional: true,
          type: marshal(string),
        }),
        createAttribute({
          name: 'profile',
          required: false,
          optional: true,
          type: marshal(string),
        }),
      ]
    }),
  }),
  async configure(config) {
    const { region, profile } = toProviderConfig(config);
    const credentials = defaultProvider({ profile });
    const eb = new ElasticBeanstalk({ region, credentials });
    const s3 = new S3({ region, credentials });
    return [eb, s3];
  },
});

module.exports = {
  elasticBeanstalkProvider,
};
