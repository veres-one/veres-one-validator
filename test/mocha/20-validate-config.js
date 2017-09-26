/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const voValidator = require('veres-one-validator');
const jsigs = require('jsonld-signatures');
jsigs.use('jsonld', bedrock.jsonld);

const mockData = require('./mock.data');

describe('validateConfiguration API', () => {
  it('validates a proper config', done => {
    const testConfig =
      mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0];
    voValidator.validateConfiguration(testConfig, err => {
      assertNoError(err);
      done();
    });
  });
});
