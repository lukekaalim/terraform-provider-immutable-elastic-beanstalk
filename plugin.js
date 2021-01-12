// @flow strict
const { createPlugin } = require('@lukekaalim/terraform-plugin');
const { elasticBeanstalkProvider } = require('./elasticBeanstalkProvider');

const plugin = createPlugin(elasticBeanstalkProvider);

plugin.start();
