/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const async = require('async');
const {callbackify} = require('util');
const config = bedrock.config;
const cfg = config['veres-one-validator'];
const didv1 = new (require('did-veres-one')).VeresOne();
const voValidator = require('veres-one-validator');
const jsigs = require('jsonld-signatures');

// FIXME: update these test to async/await
const attachInvocationProof = callbackify(didv1.attachInvocationProof)
  .bind(didv1);

const mockData = require('./mock.data');

const capabilityActions = {
  authorize: 'AuthorizeRequest',
  register: 'RegisterDid',
  update: 'UpdateDidDocument'
};

const voValidate = callbackify(voValidator.validate);

// TODO: add an extra identity that is an accelerator (separate from alpha
// and beta)

// FIXME: this set of tests has been superceeded by 05-validate-async.js
// this file should be removed
describe.skip('validate API - OBSOLETE', () => {
  describe('operationValidator', () => {
    describe('create operation', () => {
      it('validates an operation with proper capability', done => {
        async.auto({
          capability: callback => attachInvocationProof({
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, (err, result) => {
            assertNoError(err);
            callback(err, result);
          }),
          check: ['capability', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.capability,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, (err, result) => {
            assertNoError(err);
            should.not.exist(result.error);
            result.valid.should.be.true;
            callback();
          })]
        }, err => {
          assertNoError(err);
          done();
        });
      });
      it('validates an operation with extra LD proof', done => {
        async.auto({
          capability: callback => attachInvocationProof({
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          // add a random additional LD signature
          extraSign: ['capability', (results, callback) => signDocument({
            creator: mockData.authorizedSigners.beta,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .authentication[0].publicKey[0].privateKey.privateKeyBase58,
            doc: results.capability
          }, callback)],
          check: ['extraSign', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.extraSign,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, (err, result) => {
            assertNoError(err);
            should.not.exist(result.error);
            result.valid.should.be.true;
            callback();
          })]
        }, done);
      });
      it('validates an operation w/two proper capabilities', done => {
        async.auto({
          registerCapability: callback => attachInvocationProof({
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          authorizeCapability: ['registerCapability', (results, callback) =>
            attachInvocationProof({
              operation: results.registerCapability,
              capability: mockData.capabilities.authorizeRequest,
              capabilityAction: capabilityActions.authorize,
              creator: mockData.didDocuments.alpha
                .capabilityInvocation[0].publicKey[0].id,
              privateKeyBase58: mockData.privateDidDocuments.alpha
                .capabilityInvocation[0].publicKey[0]
                .privateKey.privateKeyBase58
            }, callback)],
          check: ['authorizeCapability', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.authorizeCapability,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, (err, result) => {
            assertNoError(err);
            should.not.exist(result.error);
            result.valid.should.be.true;
            callback();
          })]
        }, done);
      });
      it.skip('validation fails if the capability invocation proof is not by ' +
        'an authorized invocation key', done => {
        async.auto({
          capability: callback => attachInvocationProof({
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            // use `authentication` key instead
            creator: mockData.didDocuments.alpha
              .authentication[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .authentication[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          pow: ['capability', (results, callback) => attachEquihashProof({
            operation: results.capability,
            parameters: {
              n: cfg.equihash.equihashParameterN,
              k: cfg.equihash.equihashParameterK
            }
          }, callback)],
          check: ['pow', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.pow,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, err => {
            should.exist(err);
            err.name.should.equal('ValidationError');
            should.exist(err.details.keyResults);
            const keyResults = err.details.keyResults;
            keyResults.should.be.an('array');
            keyResults.should.have.length(1);
            keyResults[0].should.be.an('object');
            keyResults[0].verified.should.be.false;
            keyResults[0].publicKey.should.equal(
              mockData.didDocuments.alpha.capabilityInvocation[0]
                .publicKey[0].id);
            callback();
          })]
        }, done);
      });
      it.skip('fails if the capability invocation proof is not valid', done => {
        async.auto({
          capability: callback => attachInvocationProof({
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, (err, result) => {
            if(err) {
              return callback(err);
            }
            result.proof['bogus:stuff'] = 'injection';
            callback(null, result);
          }),
          pow: ['capability', (results, callback) => attachEquihashProof({
            operation: results.capability,
            parameters: {
              n: cfg.equihash.equihashParameterN,
              k: cfg.equihash.equihashParameterK
            }
          }, callback)],
          check: ['pow', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.pow,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, err => {
            console.log('err', err);
            should.exist(err);
            err.name.should.equal('ValidationError');
            should.exist(err.details.keyResults);
            const keyResults = err.details.keyResults;
            keyResults.should.be.an('array');
            keyResults.should.have.length(1);
            keyResults[0].should.be.an('object');
            keyResults[0].verified.should.be.false;
            keyResults[0].publicKey.should.equal(
              mockData.didDocuments.alpha.capabilityInvocation[0]
                .publicKey[0].id);
            callback();
          })]
        }, done);
      });
      it.skip('fails if incorrect Equihash params were used', done => {
        async.auto({
          capability: callback => attachInvocationProof({
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          pow: ['capability', (results, callback) => attachEquihashProof({
            operation: results.capability,
            parameters: {
              // NOTE: incorrect parameters are used here
              n: 60,
              k: 4
            }
          }, callback)],
          check: ['pow', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.pow,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, err => {
            should.exist(err);
            err.name.should.equal('ValidationError');
            should.exist(err.details.event);
            should.exist(err.details.requiredEquihashParams);
            const p = err.details.requiredEquihashParams;
            p.should.be.an('object');
            p.equihashParameterN.should.equal(
              cfg.equihash.equihashParameterN);
            p.equihashParameterK.should.equal(
              cfg.equihash.equihashParameterK);
            callback();
          })]
        }, done);
      });
      it.skip('validation fails if the Equihash proof is not valid', done => {
        async.auto({
          capability: callback => attachInvocationProof({
            operation: mockData.operations.create,
            capability: mockData.didDocuments.alpha,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          pow: ['capability', (results, callback) => attachEquihashProof({
            operation: Object.assign(
              {'bogus:stuff': 'invalid'}, results.capability),
            parameters: {
              n: cfg.equihash.equihashParameterN,
              k: cfg.equihash.equihashParameterK
            }
          }, callback)],
          check: ['pow', (results, callback) => {
            delete results.pow['bogus:stuff'];
            voValidate({
              ledgerNode: mockData.ledgerNode,
              validatorInput: results.pow,
              validatorConfig: mockData.ledgerConfigurations.alpha
                .operationValidator[0],
            }, err => {
              should.exist(err);
              err.name.should.equal('ValidationError');
              should.exist(err.details.event);
              callback();
            });
          }]
        }, done);
      });
      it('validation fails if the operation type is not supported', done => {
        const operation = bedrock.util.clone(mockData.operations.create);
        operation.type = 'UnknownOperation';
        async.auto({
          capability: callback => attachInvocationProof({
            operation,
            capability: operation,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          check: ['capability', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.capability,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, (err, result) => {
            assertNoError(err);
            should.exist(result.error);
            result.valid.should.be.false;
            result.error.name.should.equal('ValidationError');
            callback();
          })]
        }, done);
      });
      it('fails if `record.id` is not a valid veres one DID', done => {
        const operation = bedrock.util.clone(mockData.operations.create);
        operation.record.id = 'bogus';
        async.auto({
          capability: callback => attachInvocationProof({
            operation,
            capability: operation,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          check: ['capability', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.capability,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, (err, result) => {
            should.not.exist(err);
            result.valid.should.be.false;
            result.error.name.should.equal('ValidationError');
            callback();
          })]
        }, done);
      });
      it('validation fails if `record.id` is a `nym` with a fingerprint that ' +
        'does not match `record.authentication[0].publicKey`', done => {
        const operation = bedrock.util.clone(mockData.operations.create);
        operation.record.id = 'did:v1:test:nym:bogus';
        async.auto({
          capability: callback => attachInvocationProof({
            operation,
            capability: operation,
            capabilityAction: capabilityActions.register,
            creator: mockData.didDocuments.alpha
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          check: ['capability', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.capability,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, (err, result) => {
            should.not.exist(err);
            result.valid.should.be.false;
            result.error.name.should.equal('ValidationError');
            callback();
          })]
        }, done);
      });
    });

    describe('update operation', () => {
      let storeExistingDids;
      before(() => {
        // the mock records.get needs to return document for alpha so that the
        // signature can be verified. alpha is the extra signer in tests.
        storeExistingDids = bedrock.util.clone(mockData.existingDids);
        const alphaId = mockData.didDocuments.alpha.id;
        mockData.existingDids[alphaId] = mockData.ldDocuments[alphaId];
      });
      after(() => {
        mockData.existingDids = storeExistingDids;
      });
      it('validates an operation with capability proof', done => {
        async.auto({
          capability: callback => attachInvocationProof({
            operation: mockData.operations.update,
            capability: mockData.didDocuments.beta,
            capabilityAction: capabilityActions.update,
            creator: mockData.didDocuments.beta
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          check: ['capability', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.capability,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, (err, result) => {
            assertNoError(err);
            should.not.exist(result.error);
            result.valid.should.be.true;
            callback();
          })]
        }, done);
      });
      it('validates an operation with extra LD proof', done => {
        async.auto({
          capability: callback => attachInvocationProof({
            operation: mockData.operations.update,
            capability: mockData.didDocuments.beta,
            capabilityAction: capabilityActions.update,
            creator: mockData.didDocuments.beta
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          // add a random additional LD signature
          extraSign: ['capability', (results, callback) => signDocument({
            creator: mockData.authorizedSigners.alpha,
            privateKeyBase58: mockData.privateDidDocuments.alpha
              .authentication[0].publicKey[0].privateKey.privateKeyBase58,
            doc: results.capability
          }, callback)],
          check: ['extraSign', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.extraSign,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, (err, result) => {
            assertNoError(err);
            should.not.exist(result.error);
            result.valid.should.be.true;
            callback();
          })]
        }, done);
      });
      it('should fail to validate an operation with an invalid patch', done => {
        async.auto({
          capability: callback => attachInvocationProof({
            operation: mockData.operations.updateInvalidPatch,
            capability: mockData.didDocuments.beta,
            capabilityAction: capabilityActions.update,
            creator: mockData.didDocuments.beta
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          check: ['capability', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.capability,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, (err, result) => {
            should.not.exist(err);
            result.valid.should.be.false;
            result.error.name.should.equal('ValidationError');
            callback();
          })]
        }, done);
      });
      it('fails to validate an operation with an invalid change', done => {
        async.auto({
          capability: callback => attachInvocationProof({
            operation: mockData.operations.updateInvalidChange,
            capability: mockData.didDocuments.beta,
            capabilityAction: capabilityActions.update,
            creator: mockData.didDocuments.beta
              .capabilityInvocation[0].publicKey[0].id,
            privateKeyBase58: mockData.privateDidDocuments.beta
              .capabilityInvocation[0].publicKey[0].privateKey.privateKeyBase58
          }, callback),
          check: ['capability', (results, callback) => voValidate({
            ledgerNode: mockData.ledgerNode,
            validatorInput: results.capability,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0],
          }, (err, result) => {
            should.not.exist(err);
            result.valid.should.be.false;
            result.error.name.should.equal('ValidationError');
            callback();
          })]
        }, done);
      });
    });
  });
});

function signDocument(options, callback) {
  jsigs.sign(options.doc, {
    algorithm: 'Ed25519Signature2018',
    privateKeyBase58: options.privateKeyBase58,
    creator: options.creator
  }, (err, result) => {
    if(err) {
      return callback(err);
    }
    callback(null, result);
  });
}
