/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config} = bedrock;
require('../lib/config');

const cfg = config['veres-one-validator'];

// TODO: improve regex for service IDs
const pattern = cfg.environment === 'test' ?
  '^(did\:v1\:test\:nym\:|did\:v1\:test\:uuid\:)([-_A-Za-z0-9.]+)' +
    ';service=(.*)$' :
  '^(did\:v1\:nym\:|did\:v1\:uuid\:)([-_A-Za-z0-9.]+);service=(.*)$';

const serviceId = {
  title: 'Service Identifier',
  description: 'A service identifier.',
  type: 'string',
  // FIXME: a service ID can be any type of URL, not just did: ??
  // pattern,
};

const serviceDescriptor = {
  title: 'Service Descriptor',
  description: 'A service descriptor.',
  required: [
    'id',
    'serviceEndpoint',
    'type',
  ],
  type: 'object',
  properties: {
    id: serviceId,
    type: {
      type: 'string',
    },
    serviceEndpoint: {
      // TODO: can this be improved? pattern starting with https://?
      type: 'string',
    }
  }
};

module.exports.serviceDescriptor = () => serviceDescriptor;
module.exports.serviceId = () => serviceId;
