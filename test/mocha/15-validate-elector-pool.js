/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const async = require('async');
const {callbackify} = require('util');
const config = bedrock.config;
const cfg = config['veres-one-validator'];
const didv1 = require('did-veres-one');
const voValidator = require('veres-one-validator');
const equihashSigs = require('equihash-signature');
const jsigs = require('jsonld-signatures');
jsigs.use('jsonld', bedrock.jsonld);
equihashSigs.install(jsigs);
didv1.use('jsonld', bedrock.jsonld);
didv1.use('jsonld-signatures', jsigs);

const mockData = require('./mock.data');

const capabilityActions = {
  authorize: 'AuthorizeRequest',
  register: 'RegisterDid',
  update: 'UpdateDidDocument'
};

describe.only('validate API ElectorPool', () => {
  describe('operationValidator', () => {
    describe('create electorPool operation', () => {
      it('validates an operation with proper proof', async () => {

      });
    });
  });
});
