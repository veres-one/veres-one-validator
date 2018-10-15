/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const {callbackify} = require('util');
const voValidator = require('veres-one-validator');

const mockData = require('./mock.data');

const voValidateConfiguration = callbackify(voValidator.validateConfiguration);

describe('validateConfiguration API', () => {
  it('validates a proper config', done => {
    const testConfig =
      mockData.ledgerConfigurations.alpha.operationValidator[0];
    voValidateConfiguration(
      testConfig, {ledgerNode: mockData.ledgerNode}, err => {
        assertNoError(err);
        done();
      });
  });
});
