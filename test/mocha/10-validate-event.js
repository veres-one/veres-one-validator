/*
 * Copyright (c) 2017 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const async = require('async');
const cfg = bedrock.config['veres-one-validator'];
const voValidator = require('veres-one-validator');
const equihashSigs = require('equihash-signature');
const jsigs = require('jsonld-signatures');
jsigs.use('jsonld', bedrock.jsonld);

const mockData = require('./mock.data');

describe('validateEvent API', () => {
  describe('WebLedgerEvent', () => {
    it('validates a properly signed event', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: mockData.events.alpha,
          n: cfg.equihash.equihashParameterN,
          k: cfg.equihash.equihashParameterK
        }, callback),
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          privateKeyPem: mockData.keys.alpha.privateKey,
          doc: mockData.events.alpha
        }, callback),
        check: ['proof', 'sign', (results, callback) => {
          const signedDoc = bedrock.util.clone(mockData.events.alpha);
          signedDoc.signature = [
            results.sign.signature,
            results.proof.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              assertNoError(err);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if Equihash signature is missing', done => {
      async.auto({
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          privateKeyPem: mockData.keys.alpha.privateKey,
          doc: mockData.events.alpha
        }, callback),
        check: ['sign', (results, callback) => {
          const signedDoc = bedrock.util.clone(mockData.events.alpha);
          signedDoc.signature = [
            results.sign.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.updateSignatureType);
              err.details.updateSignatureType.should.be.an('array');
              err.details.updateSignatureType.should.have.same.members([
                'LinkedDataSignature2015', 'EquihashProof2017']);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if jsonld-signature is missing', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: mockData.events.alpha,
          n: cfg.equihash.equihashParameterN,
          k: cfg.equihash.equihashParameterK
        }, callback),
        check: ['proof', (results, callback) => {
          const signedDoc = bedrock.util.clone(mockData.events.alpha);
          signedDoc.signature = [
            results.proof.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.updateSignatureType);
              err.details.updateSignatureType.should.be.an('array');
              err.details.updateSignatureType.should.have.same.members([
                'LinkedDataSignature2015', 'EquihashProof2017']);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it('validation fails if the ld-signature is not by the owner', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: mockData.events.alpha,
          n: cfg.equihash.equihashParameterN,
          k: cfg.equihash.equihashParameterK
        }, callback),
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          // NOTE: the wrong private key is used here to sign the document
          privateKeyPem: mockData.keys.beta.privateKey,
          doc: mockData.events.alpha
        }, callback),
        check: ['proof', 'sign', (results, callback) => {
          const signedDoc = bedrock.util.clone(mockData.events.alpha);
          signedDoc.signature = [
            results.sign.signature,
            results.proof.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.keyResults);
              const keyResults = err.details.keyResults;
              keyResults.should.be.an('array');
              keyResults.should.have.length(1);
              keyResults[0].should.be.an('object');
              keyResults[0].verified.should.be.false;
              keyResults[0].publicKey.should.equal(
                mockData.authorizedSigners.alpha);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
    it.skip('validation fails if incorrect equihash params were used', done => {
      async.auto({
        proof: callback => equihashSigs.sign({
          doc: mockData.events.alpha,
          // NOTE: incorrect N parameter is used here
          n: 4,
          k: cfg.equihash.equihashParameterK
        }, callback),
        sign: callback => signDocument({
          creator: mockData.authorizedSigners.alpha,
          privateKeyPem: mockData.keys.alpha.privateKey,
          doc: mockData.events.alpha
        }, callback),
        check: ['proof', 'sign', (results, callback) => {
          const signedDoc = bedrock.util.clone(mockData.events.alpha);
          signedDoc.signature = [
            results.sign.signature,
            results.proof.signature
          ];
          voValidator.validateEvent(
            signedDoc,
            mockData.ledgers.alpha.config.ledgerConfiguration.eventValidator[0],
            err => {
              assertNoError(err);
              callback();
            });
        }]
      }, err => {
        assertNoError(err);
        done();
      });
    });
  }); // end WebLedgerEvent

  describe.skip('WebLedgerConfigurationEvent', () => {
  }); // end WebLedgerConfigurationEvent
});

function signDocument(options, callback) {
  jsigs.sign(options.doc, {
    algorithm: 'LinkedDataSignature2015',
    privateKeyPem: options.privateKeyPem,
    creator: options.creator
  }, (err, result) => {
    if(err) {
      return callback(err);
    }
    callback(null, result);
  });
}
