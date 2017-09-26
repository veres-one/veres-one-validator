/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const voValidator = require('veres-one-validator');
const mockData = require('./mock.data');

describe('mustValidateEvent API', () => {
  describe('WebLedgerEvent validator', () => {
    it('should return true on a WebLedgerEvent event', done => {
      const event = mockData.events.alpha;
      const testConfig =
        mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0];
      voValidator.mustValidateEvent(event, testConfig, (err, result) => {
        assertNoError(err);
        should.exist(result);
        result.should.be.a('boolean');
        result.should.be.true;
        done();
      });
    });
    it('should return false on a WebLedgerConfigurationEvent event', done => {
      const event = mockData.ledgers.alpha.config;
      const testConfig =
        mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0];
      voValidator.mustValidateEvent(event, testConfig, (err, result) => {
        assertNoError(err);
        should.exist(result);
        result.should.be.a('boolean');
        result.should.be.false;
        done();
      });
    });
  });
});
