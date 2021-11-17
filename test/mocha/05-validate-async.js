/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {documentLoader} = require('bedrock-jsonld-document-loader');
const {Ed25519Signature2020} =
  require('@digitalbazaar/ed25519-signature-2020');
const {Ed25519VerificationKey2020} =
  require('@digitalbazaar/ed25519-verification-key-2020');
const jsigs = require('jsonld-signatures');
const jsonld = require('jsonld');
const jsonpatch = require('fast-json-patch');
const voValidator = require('veres-one-validator');
const {CapabilityInvocation} = require('@digitalbazaar/zcapld');
const mockData = require('./mock.data');
const {VeresOneDidDoc} = require('did-veres-one');
const helpers = require('./helpers');
const v1 = require('did-veres-one').driver({mode: 'test'});

const {util: {clone}} = bedrock;

describe('validate regular DIDs', () => {
  describe('validate API', () => {
    it('throws on missing ledgerNode parameter', async () => {
      let result;
      let err;
      try {
        result = await voValidator.validate();
      } catch(e) {
        err = e;
      }
      should.not.exist(result);
      should.exist(err);
      err.should.be.instanceOf(TypeError);
      err.message.should.contain('ledgerNode');
    });
  });
  describe('Create Operations', () => {
    it('validates a proper CreateWebLedgerRecord operation', async () => {
      const {mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.create);
      const capabilityAction = 'write';
      mockOperation.record = mockDoc;
      // FIXME: add a write proof for the ledger that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();
      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: mockDoc.id}),
          capabilityAction,
          invocationTarget: mockDoc.id
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 0,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.true;
    });
    it('throws on CreateWebLedgerRecord without basisBlockHeight', async () => {
      const {mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.create);
      const capabilityAction = 'write';
      mockOperation.record = mockDoc;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: mockDoc.id}),
          capabilityAction,
          invocationTarget: mockDoc.id
        })
      });
      let err;
      let result;
      try {
        result = await voValidator.validate({
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig: mockData.ledgerConfigurations.alpha
            .operationValidator[0],
        });
      } catch(e) {
        err = e;
      }
      should.not.exist(result);
      should.exist(err);
      err.should.be.instanceOf(TypeError);
      err.message.should.contain('basisBlockHeight');
    });
    it('throws when ledger proof invocationTarget is incorrect', async () => {
      const {mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.create);
      const capabilityAction = 'write';
      mockOperation.record = mockDoc;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof({
        invocationTargetPath: '/incorrect'
      });

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: mockDoc.id}),
          capabilityAction,
          invocationTarget: mockDoc.id
        })
      });
      let err;
      let result;
      try {
        result = await voValidator.validate({
          basisBlockHeight: 0,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig: mockData.ledgerConfigurations.alpha
            .operationValidator[0],
        });
      } catch(e) {
        err = e;
      }
      should.exist(result);
      should.not.exist(err);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      result.error.name.should.contain('ValidationError');
    });

    it('validates a DID generated by did-veres-one', async () => {
      const mockDoc = await v1.generate();
      const did = mockDoc.didDocument.id;
      const capabilityInvocationKey =
        mockDoc.methodFor({purpose: 'capabilityInvocation'});
      const mockOperation = clone(mockData.operations.create);
      const capabilityAction = 'write';
      mockOperation.record = mockDoc.didDocument;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 0,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.true;
    });
    it('rejects create operation without a capabilityInvocation', async () => {
      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.create);
      const capabilityAction = 'write';

      // delete all methods
      delete mockDoc.authentication;
      delete mockDoc.capabilityDelegation;
      delete mockDoc.capabilityInvocation;

      mockOperation.record = mockDoc;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: did,
          capabilityAction,
          invocationTarget: mockDoc.id
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 0,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      result.error.name.should.equal('ValidationError');
      result.error.message.should.contain('Veres One WebLedgerOperation');
      result.error.details.errors[0].message.should.contain(
        'capabilityInvocation');
    });
    it('rejects an improper CreateWebLedgerRecord operation', async () => {
      const {mockDoc, capabilityInvocationKey} = await _generateBadDid();
      const mockOperation = clone(mockData.operations.create);
      const capabilityAction = 'write';
      mockOperation.record = mockDoc;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: mockDoc.id}),
          capabilityAction,
          invocationTarget: mockDoc.id
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 0,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      result.error.name.should.equal('ValidationError');
      result.error.message.should.equal('Error validating DID.');
      result.error.cause.message.should.equal(
        'Invalid DID key ID; key ID does not match the DID.');
    });
    it('rejects a duplicate create operation', async () => {
      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.create);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger must clone this going into the document loader, otherwise it
      // will be mutated
      mockData.existingDids[did] = clone(mockDoc);
      mockOperation.record = mockDoc;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: mockDoc.id}),
          capabilityAction,
          invocationTarget: mockDoc.id
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });

      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      result.error.name.should.equal('DuplicateError');
    });

    describe('Create DID with a service', () => {
      const validatorParameterSet =
        'did:v1:test:uuid:b49fc147-5966-4407-a428-b597a77461ba';
      const validatorConfig = clone(mockData.ledgerConfigurations.alpha
        .operationValidator[0]);
      validatorConfig.validatorParameterSet = validatorParameterSet;

      before(() => {
        const validatorParameterSetDoc = clone(
          mockData.validatorParameterSet.alpha);
        validatorParameterSetDoc.id = validatorParameterSet;
        mockData.existingDids[validatorParameterSet] = validatorParameterSetDoc;
      });
      it('validates a DID with one proper service descriptor', async () => {
        const mockDoc = await v1.generate();
        const did = mockDoc.didDocument.id;

        _addService({
          updater: mockDoc,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://example.com/api/${encodeURIComponent(did)}`,
        });

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});
        const mockOperation = clone(mockData.operations.create);
        const capabilityAction = 'write';
        mockOperation.record = mockDoc.didDocument;
        // add a write proof for the accelerator that will pass json-schema
        // validation for
        // testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();

        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: mockOperation.record.id
          })
        });
        const result = await voValidator.validate({
          basisBlockHeight: 0,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig,
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.true;
      });
      it('rejects a DID if validatorParameterSet is missing', async () => {
        const mockDoc = await v1.generate();
        const did = mockDoc.didDocument.id;

        _addService({
          updater: mockDoc,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://example.com/api/${encodeURIComponent(did)}`,
        });

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});
        const mockOperation = clone(mockData.operations.create);
        const capabilityAction = 'write';
        mockOperation.record = mockDoc.didDocument;
        // add a write proof for the accelerator that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();

        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: mockOperation.record.id
          })
        });
        const configMissingValidatorParameterSet = clone(validatorConfig);
        // this DID triggers a TerribleValidatorParameterSetError
        configMissingValidatorParameterSet.validatorParameterSet =
          'did:v1:test:uuid:40aea416-73b2-436f-bb91-41175494d72b';
        const result = await voValidator.validate({
          basisBlockHeight: 0,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig: configMissingValidatorParameterSet,
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.false;
        should.exist(result.error);
        const {error} = result;
        error.name.should.equal('UnknownError');
        error.cause.name.should.equal('TerribleValidatorParameterSetError');
      });
      it('validates a DID with two proper service descriptors', async () => {
        const mockDoc = await v1.generate();
        const did = mockDoc.didDocument.id;

        _addService({
          updater: mockDoc,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://example.com/api/${encodeURIComponent(did)}`,
        });
        _addService({
          updater: mockDoc,
          fragment: 'bar',
          type: 'urn:bar',
          endpoint: `https://example.com/api_v2/${encodeURIComponent(did)}`,
        });

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});
        const mockOperation = clone(mockData.operations.create);
        const capabilityAction = 'write';
        mockOperation.record = mockDoc.didDocument;
        // add a write proof for the accelerator that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();

        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: mockOperation.record.id
          })
        });
        const result = await voValidator.validate({
          basisBlockHeight: 0,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig,
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.true;
      });
      it('rejects a DID with an invalid service baseUrl', async () => {
        const mockDoc = await v1.generate();
        const did = mockDoc.didDocument.id;

        _addService({
          updater: mockDoc,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://invalid.com/api/${encodeURIComponent(did)}`,
        });

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});
        const mockOperation = clone(mockData.operations.create);
        const capabilityAction = 'write';
        mockOperation.record = mockDoc.didDocument;
        // add a write proof for the accelerator that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();

        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: mockOperation.record.id
          })
        });
        const result = await voValidator.validate({
          basisBlockHeight: 0,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig,
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.false;
        should.exist(result.error);
        const {error} = result;
        error.name.should.equal('ValidationError');
        should.exist(error.details.allowedServiceBaseUrl);
      });
      it('rejects a DID with endpoint that is not URI encoded', async () => {
        const mockDoc = await v1.generate();
        const did = mockDoc.didDocument.id;

        _addService({
          updater: mockDoc,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://example.com/api/${did}`,
        });

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});
        const mockOperation = clone(mockData.operations.create);
        const capabilityAction = 'write';
        mockOperation.record = mockDoc.didDocument;
        // add a write proof for the accelerator that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();

        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: mockOperation.record.id
          })
        });
        const result = await voValidator.validate({
          basisBlockHeight: 0,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig,
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.false;
        should.exist(result.error);
        const {error} = result;
        error.name.should.equal('ValidationError');
        should.exist(error.details.allowedServiceBaseUrl);
      });
      it('rejects a DID with good and bad service descriptors', async () => {
        const mockDoc = await v1.generate();
        const did = mockDoc.didDocument.id;

        _addService({
          updater: mockDoc,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://example.com/api/${encodeURIComponent(did)}`,
        });
        _addService({
          updater: mockDoc,
          fragment: 'bar',
          type: 'urn:bar',
          endpoint:
            'https://invalid.com/api/836cf564-e86c-4428-9822-ad8ad788c124',
        });

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});
        const mockOperation = clone(mockData.operations.create);
        const capabilityAction = 'write';
        mockOperation.record = mockDoc.didDocument;
        // add a write proof for the accelerator that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();

        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: mockOperation.record.id
          })
        });
        const result = await voValidator.validate({
          basisBlockHeight: 0,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig,
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.false;
        should.exist(result.error);
        const {error} = result;
        error.name.should.equal('ValidationError');
        should.exist(error.details.allowedServiceBaseUrl);
      });
      it('rejects a DID if allowedServiceBaseUrl is not defined', async () => {
        const mockDoc = await v1.generate();

        _addService({
          updater: mockDoc,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint:
            'https://example.com/api/e61388cf-2464-4739-b37b-81f178db010b',
        });

        const did = mockDoc.didDocument.id;
        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});
        const mockOperation = clone(mockData.operations.create);
        const capabilityAction = 'write';
        mockOperation.record = mockDoc.didDocument;
        // add a write proof for the accelerator that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();
        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: mockOperation.record.id
          })
        });

        // this document does not exist on the ledger
        const badValidatorConfig = clone(validatorConfig);
        badValidatorConfig.validatorParameterSet =
          'did:v1:urn:347e7d85-5a36-44e4-9c7b-56a48809ae37';

        const result = await voValidator.validate({
          basisBlockHeight: 0,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig: badValidatorConfig,
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.false;
        should.exist(result.error);
        const {error} = result;
        error.name.should.equal('InvalidStateError');
        // should.exist(error.details.allowedServiceBaseUrl);
      });
    });
  }); // end create operations

  describe('Update Operations', () => {
    it('validates an update operation', async () => {
      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(mockDoc);
      const observer = jsonpatch.observe(mockDoc);
      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });
      newKey.id = _generateKeyId({did, key: newKey});

      mockDoc.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);
      mockOperation.recordPatch.target = did;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });

      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.true;
      should.not.exist(result.error);
    });
    it('rejects an update that changes the document ID', async () => {
      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(mockDoc);

      const observer = jsonpatch.observe(mockDoc);

      mockDoc.id =
        'did:v1:test:nym:z6MknY7qbTmVNPUC2xRyfSzcf3LxQGBx4t8uBVhGkKq7XXXX';

      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });
      newKey.id = _generateKeyId({did, key: newKey});
      mockDoc.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);
      mockOperation.recordPatch.target = did;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      result.error.name.should.equal('ValidationError');
    });
    it('rejects an update when the document does not exist', async () => {
      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      //mockData.existingDids[did] = clone(mockDoc);

      const observer = jsonpatch.observe(mockDoc);
      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });
      newKey.id = _generateKeyId({did, key: newKey});
      mockDoc.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);
      mockOperation.recordPatch.target = did;
      // add a write proof for the ledger that will pass json-schema
      // validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      should.exist(result.error.details);
      should.exist(result.error.details.proofVerifyResult);
      should.exist(result.error.details.proofVerifyResult.error);
      const verificationError = result.error.details.proofVerifyResult.error;
      verificationError.name.should.equal('VerificationError');
      should.exist(verificationError.errors);
      verificationError.errors[0].name.should.equal('NotFoundError');
    });
    it('rejects an update with an invalid sequence', async () => {
      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(mockDoc);

      const observer = jsonpatch.observe(mockDoc);

      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });
      newKey.id = _generateKeyId({did, key: newKey});
      mockDoc.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);
      mockOperation.recordPatch.target = did;
      // specify an invalid sequence
      mockOperation.recordPatch.sequence = 10;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      result.error.name.should.equal('ValidationError');
      result.error.message.should.contain('sequence number does not match');
    });
    it('rejects an update with an invalid patch', async () => {
      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(mockDoc);

      const observer = jsonpatch.observe(mockDoc);

      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });
      newKey.id = _generateKeyId({did, key: newKey});
      mockDoc.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);
      mockOperation.recordPatch.target = did;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();
      // specifiy an invalid path to create an invalid JSON patch
      mockOperation.recordPatch.patch[0].path = '/authentication/2';

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      result.error.name.should.equal('ValidationError');
      result.error.message.should.equal('The given JSON patch is invalid.');
    });
    // the operation is altered after the proof
    it('rejects an altered operation', async () => {
      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(mockDoc);

      const observer = jsonpatch.observe(mockDoc);
      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });
      newKey.id = _generateKeyId({did, key: newKey});
      mockDoc.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);
      mockOperation.recordPatch.target = did;
      // after proof, change the patch target
      const {did: did2} = await _generateDid();
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();
      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          // Set the invocation target to did2 here
          // in order to have the correct expectedTarget in the validator below.
          // This is purely to test that the validator throws if
          // the operation has been modified
          invocationTarget: did2
        })
      });
      mockOperation.recordPatch.target = did2;
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      result.valid.should.be.false;
      // fails because the signature is invalid
      result.error.name.should.equal('ValidationError');
      should.exist(result.error.details.proofVerifyResult);
      const {proofVerifyResult} = result.error.details;
      proofVerifyResult.verified.should.be.false;
      proofVerifyResult.error.errors[0].message
        .should.equal('Invalid signature.');
    });
    it('rejects update operation signed by an alternate DID', async () => {
      // create an alternate DID that will sign the operation
      const {
        did: did1, mockDoc: mockDoc1,
        capabilityInvocationKey: capabilityInvocationKey1
      } = await _generateDid();
      mockData.existingDids[did1] = clone(mockDoc1);

      const {did, mockDoc} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(mockDoc);

      const observer = jsonpatch.observe(mockDoc);
      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });
      newKey.id = _generateKeyId({did, key: newKey});
      mockDoc.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);

      mockOperation.recordPatch.target = did;

      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey1}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      result.valid.should.be.false;
      should.exist(result.error);
      should.exist(result.error.details.proofVerifyResult);
      const {proofVerifyResult} = result.error.details;
      proofVerifyResult.verified.should.be.false;
      proofVerifyResult.error.errors[0].message.should.equal(
        'The authorized invoker does not match the verification method or ' +
        'its controller.');
    });
    it('rejects update operation signed with incorrect target', async () => {
      // create an alternate DID that will sign the operation
      const {did: did1, mockDoc: mockDoc1} = await _generateDid();
      mockData.existingDids[did1] = clone(mockDoc1);

      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(mockDoc);

      // `did` generates a patch against `did1`
      const observer = jsonpatch.observe(mockDoc1);
      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });
      newKey.id = _generateKeyId({did, key: newKey});
      mockDoc1.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);

      // the operation is being submitted by `did` against `did1`
      mockOperation.recordPatch.target = did1;

      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();
      // signing with a key from another valid DID
      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did1
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      result.valid.should.be.false;
      should.exist(result.error);
      should.exist(result.error.details.proofVerifyResult);
      const {proofVerifyResult} = result.error.details;
      proofVerifyResult.verified.should.be.false;
      proofVerifyResult.error.errors[0].message.should.contain(
        'does not match capability target');
    });
    // proof has `capabilityAction` === `write`
    it('rejects update operation without proper capabilityAction', async () => {
      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      let capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(mockDoc);
      const observer = jsonpatch.observe(mockDoc);
      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });
      newKey.id = _generateKeyId({did, key: newKey});
      mockDoc.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);
      mockOperation.recordPatch.target = did;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      // update operations require `write` so it should reject `read`
      capabilityAction = 'read';

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      result.valid.should.be.false;
      should.exist(result.error);
      // schema validation ensures that proofs with the proper capabilityAction
      // are provided
      result.error.name.should.equal('ValidationError');
    });
    // proof is not signed with the existing capabilityInvocation key
    it('rejects operation when improper key used in proof 1', async () => {
      const {did, mockDoc} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      let capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(mockDoc);
      const observer = jsonpatch.observe(mockDoc);
      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });
      newKey.id = _generateKeyId({did, key: newKey});
      mockDoc.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);
      mockOperation.recordPatch.target = did;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();
      capabilityAction = 'write';

      // *must* use `capabilityInvocationKey`
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: newKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      result.valid.should.be.false;
      should.exist(result.error);
      // fails because the key in the proof is not found in the did document
      result.error.name.should.equal('ValidationError');
      should.exist(result.error.details.proofVerifyResult);
      const {proofVerifyResult} = result.error.details;
      proofVerifyResult.verified.should.be.false;
      proofVerifyResult.error.errors[0].httpStatusCode.should.equal(404);
    });
    // proof is signed with a malicious key
    it('rejects operation when improper key used in proof 2', async () => {
      const {did, mockDoc, capabilityInvocationKey} = await _generateDid();
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(mockDoc);
      const observer = jsonpatch.observe(mockDoc);
      const newKey = await Ed25519VerificationKey2020.generate({
        controller: did
      });

      // maliciously put the id from capabilityInvocationKey on new key
      newKey.id = capabilityInvocationKey.id;

      mockDoc.authentication.push({
        id: newKey.id,
        type: newKey.type,
        controller: newKey.controller,
        publicKeyMultibase: newKey.publicKeyMultibase
      });
      mockOperation.recordPatch.patch = jsonpatch.generate(observer);
      mockOperation.recordPatch.target = did;
      // FIXME: add a write proof for the accelerator that will pass
      // json-schema validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      // *must* use `capabilityInvocationKey`
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: newKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      result.valid.should.be.false;
      should.exist(result.error);
      // fails because the signature is invalid
      result.error.name.should.equal('ValidationError');
      should.exist(result.error.details.proofVerifyResult);
      const {proofVerifyResult} = result.error.details;
      proofVerifyResult.verified.should.be.false;
      proofVerifyResult.error.errors[0].message
        .should.equal('Invalid signature.');
    });
    it('rejects a DID with an invalid property', async () => {
      const mockDoc = await v1.generate();
      const {didDocument} = mockDoc;
      const did = didDocument.id;
      const updater = new VeresOneDidDoc({didDocument});
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(didDocument);

      updater.observe();
      // `type` is not an allowed property for a nym DID document
      updater.didDocument.type = 'SomeNewType';
      mockOperation.recordPatch = updater.commit();

      const capabilityInvocationKey =
        mockDoc.methodFor({purpose: 'capabilityInvocation'});

      // add a write proof for the ledger that will pass json-schema
      // validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      const {error} = result;
      error.name.should.equal('ValidationError');
      error.details.errors.should.be.an('array');
      error.details.errors.should.have.length(1);
      error.details.errors[0].message.should.equal(
        'should NOT have additional properties');
    });
    it('rejects a DID with an invalid key material', async () => {
      const mockDoc = await v1.generate();
      const {didDocument} = mockDoc;
      const did = didDocument.id;
      const updater = new VeresOneDidDoc({didDocument});
      const mockOperation = clone(mockData.operations.update);
      const capabilityAction = 'write';
      // add the new document to the mock document loader as if it were on
      // ledger
      // clone here so we can proceed with making changes to mockDoc
      mockData.existingDids[did] = clone(didDocument);

      updater.observe();

      // attempt to change the publicKeyMultibase
      mockDoc.didDocument.capabilityInvocation[0].publicKeyMultibase =
        'z6MkvTVoxyV4gRRU8EpzjxJrRPeKzUrSLdSRxFBY2zgaCq9w';

      mockOperation.recordPatch = updater.commit();

      const capabilityInvocationKey =
        mockDoc.methodFor({purpose: 'capabilityInvocation'});
      // add a write proof that will pass json-schema
      // validation for testnet v2 *not* a valid signature
      mockOperation.proof = mockData.proof();

      const s = await jsigs.sign(mockOperation, {
        documentLoader,
        suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
        purpose: new CapabilityInvocation({
          capability: helpers.generateRootZcapId({id: did}),
          capabilityAction,
          invocationTarget: did
        })
      });
      const result = await voValidator.validate({
        basisBlockHeight: 10,
        ledgerNode: mockData.ledgerNode,
        validatorInput: s,
        validatorConfig: mockData.ledgerConfigurations.alpha
          .operationValidator[0],
      });
      should.exist(result);
      result.valid.should.be.a('boolean');
      result.valid.should.be.false;
      should.exist(result.error);
      const {error} = result;
      error.name.should.equal('ValidationError');
      error.message.should.equal('Error validating DID.');
      error.cause.message.should.equal(
        'The fingerprint does not match the public key.');
    });

    describe('Updates involving services', () => {
      const validatorParameterSet =
        'did:v1:test:uuid:b49fc147-5966-4407-a428-b597a77461ba';
      const validatorConfig = clone(mockData.ledgerConfigurations.alpha
        .operationValidator[0]);
      validatorConfig.validatorParameterSet = validatorParameterSet;
      before(() => {
        const validatorParameterSetDoc = clone(
          mockData.validatorParameterSet.alpha);
        validatorParameterSetDoc.id = validatorParameterSet;
        mockData.existingDids[validatorParameterSet] = validatorParameterSetDoc;
      });
      it('validates a DID with one proper service descriptor', async () => {
        const mockDoc = await v1.generate();
        const {didDocument} = mockDoc;
        const did = didDocument.id;
        const updater = new VeresOneDidDoc({didDocument});
        const mockOperation = clone(mockData.operations.update);
        const capabilityAction = 'write';
        mockData.existingDids[did] = clone(didDocument);

        updater.observe();

        _addService({
          updater,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://example.com/api/${encodeURIComponent(did)}`,
        });

        mockOperation.recordPatch = updater.commit();

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});

        // add a write proof for the accelerator that will pass json-schema
        // validation for
        // testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();

        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: did
          })
        });
        const result = await voValidator.validate({
          basisBlockHeight: 10,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.true;
        should.not.exist(result.error);
      });
      it('validates a DID with two proper service descriptors', async () => {
        const mockDoc = await v1.generate();
        const {didDocument} = mockDoc;
        const did = didDocument.id;
        const updater = new VeresOneDidDoc({didDocument});
        const mockOperation = clone(mockData.operations.update);
        const capabilityAction = 'write';
        mockData.existingDids[did] = clone(didDocument);

        updater.observe();

        _addService({
          updater,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://example.com/api/${encodeURIComponent(did)}`,
        });
        _addService({
          updater,
          fragment: 'bar',
          type: 'urn:bar',
          endpoint: `https://example.com/api_v2/${encodeURIComponent(did)}`,
        });

        mockOperation.recordPatch = updater.commit();

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});

        // add a write proof for the accelerator that will pass json-schema
        // validation for
        // testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();
        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: did
          })
        });
        const result = await voValidator.validate({
          basisBlockHeight: 10,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.true;
        should.not.exist(result.error);
      });
      it('rejects a DID with an invalid service endpoint', async () => {
        const mockDoc = await v1.generate();
        const {didDocument} = mockDoc;
        const did = didDocument.id;
        const updater = new VeresOneDidDoc({didDocument});
        const mockOperation = clone(mockData.operations.update);
        const capabilityAction = 'write';
        mockData.existingDids[did] = clone(didDocument);
        updater.observe();

        _addService({
          updater,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://invalid.com/api/${encodeURIComponent(did)}`,
        });

        mockOperation.recordPatch = updater.commit();

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});

        // add a write proof for the accelerator that will pass json-schema
        // validation for
        // testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();

        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: did
          })
        });
        const result = await voValidator.validate({
          basisBlockHeight: 10,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.false;
        should.exist(result.error);
        const {error} = result;
        error.name.should.equal('ValidationError');
        should.exist(error.details.allowedServiceBaseUrl);
      });
      it('rejects a DID with endpoint that is not URI encoded', async () => {
        const mockDoc = await v1.generate();
        const {didDocument} = mockDoc;
        const did = didDocument.id;
        const updater = new VeresOneDidDoc({didDocument});
        const mockOperation = clone(mockData.operations.update);
        const capabilityAction = 'write';
        mockData.existingDids[did] = clone(didDocument);
        updater.observe();
        _addService({
          updater,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://example.com/api/${did}`,
        });

        mockOperation.recordPatch = updater.commit();

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});

        // add a write proof for the accelerator that will pass json-schema
        // validation for
        // testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();
        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: did
          })
        });
        const result = await voValidator.validate({
          basisBlockHeight: 10,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.false;
        should.exist(result.error);
        const {error} = result;
        error.name.should.equal('ValidationError');
        should.exist(error.details.allowedServiceBaseUrl);
      });
      it('rejects a DID with good and bad service descriptors', async () => {
        const mockDoc = await v1.generate();
        const {didDocument} = mockDoc;
        const did = didDocument.id;
        const updater = new VeresOneDidDoc({didDocument});
        const mockOperation = clone(mockData.operations.update);
        const capabilityAction = 'write';
        mockData.existingDids[did] = clone(didDocument);

        updater.observe();

        _addService({
          updater,
          fragment: 'foo',
          type: 'urn:foo',
          endpoint: `https://example.com/api/${encodeURIComponent(did)}`,
        });
        _addService({
          updater,
          fragment: 'bar',
          type: 'urn:bar',
          endpoint: `https://invalid.com/api/${encodeURIComponent(did)}`,
        });

        mockOperation.recordPatch = updater.commit();

        const capabilityInvocationKey =
          mockDoc.methodFor({purpose: 'capabilityInvocation'});

        // add a write proof for the accelerator that will pass json-schema
        // validation for
        // testnet v2 *not* a valid signature
        mockOperation.proof = mockData.proof();

        const s = await jsigs.sign(mockOperation, {
          documentLoader,
          suite: new Ed25519Signature2020({key: capabilityInvocationKey}),
          purpose: new CapabilityInvocation({
            capability: helpers.generateRootZcapId({id: did}),
            capabilityAction,
            invocationTarget: did
          })
        });
        const result = await voValidator.validate({
          basisBlockHeight: 10,
          ledgerNode: mockData.ledgerNode,
          validatorInput: s,
          validatorConfig
        });
        should.exist(result);
        result.valid.should.be.a('boolean');
        result.valid.should.be.false;
        should.exist(result.error);
        const {error} = result;
        error.name.should.equal('ValidationError');
        should.exist(error.details.allowedServiceBaseUrl);
      });
    });
  }); // end update operations
});

function _generateKeyId({did, key}) {
  return `${did}#${key.fingerprint()}`;
}

function _addService({updater, fragment, type, endpoint}) {
  if(fragment === undefined) {
    throw new Error('"fragment" is required.');
  }
  const serviceId = updater.didDocument.id + '#' + fragment;

  if(!type || !type.includes(':')) {
    throw new Error('Service `type` is required and must be a URI.');
  }
  if(!endpoint || !endpoint.includes(':')) {
    throw new Error('Service `endpoint` is required and must be a URI.');
  }

  const services = updater.didDocument.service || [];
  for(const service of services) {
    if(service.id && service.id === serviceId) {
      throw new Error('Service with that name or id already exists.');
    }
  }

  jsonld.addValue(updater.didDocument, 'service', {
    id: serviceId,
    serviceEndpoint: endpoint,
    type,
  }, {
    propertyIsArray: true
  });
}

// the keys for `authentication` and `capabilityDelegation` do not match the DID
async function _generateBadDid() {
  const mockDoc = clone(mockData.privateDidDocuments.alpha);
  const capabilityInvocationKey = await Ed25519VerificationKey2020.generate();
  const keyFingerprint = capabilityInvocationKey.fingerprint();

  const did = `did:v1:test:nym:${keyFingerprint}`;
  // cryptonym dids are based on fingerprint of capabilityInvokation key
  mockDoc.id = did;
  capabilityInvocationKey.id = _generateKeyId(
    {did, key: capabilityInvocationKey});
  const controller = did;
  capabilityInvocationKey.controller = controller;
  mockDoc.capabilityInvocation[0] = {
    id: capabilityInvocationKey.id,
    type: capabilityInvocationKey.type,
    controller: capabilityInvocationKey.controller,
    publicKeyMultibase: capabilityInvocationKey.publicKeyMultibase
  };
  return {did, mockDoc, capabilityInvocationKey};
}

async function _generateDid() {
  const mockDoc = clone(mockData.privateDidDocuments.alpha);
  const capabilityInvocationKey = await Ed25519VerificationKey2020.generate();
  const keyFingerprint = capabilityInvocationKey.fingerprint();

  const did = `did:v1:test:nym:${keyFingerprint}`;
  // cryptonym dids are based on fingerprint of capabilityInvokation key
  mockDoc.id = did;
  capabilityInvocationKey.id = _generateKeyId(
    {did, key: capabilityInvocationKey});
  const controller = did;
  const capabilityDelegationKey = await Ed25519VerificationKey2020.generate({
    controller
  });
  capabilityDelegationKey.id = _generateKeyId(
    {did, key: capabilityDelegationKey});
  const authenticationKey = await Ed25519VerificationKey2020.generate({
    controller
  });
  authenticationKey.id = _generateKeyId({did, key: authenticationKey});
  capabilityInvocationKey.controller = controller;
  mockDoc.capabilityInvocation[0] = {
    id: capabilityInvocationKey.id,
    type: capabilityInvocationKey.type,
    controller: capabilityInvocationKey.controller,
    publicKeyMultibase: capabilityInvocationKey.publicKeyMultibase
  };
  mockDoc.capabilityDelegation[0] = {
    id: capabilityDelegationKey.id,
    type: capabilityDelegationKey.type,
    controller: capabilityDelegationKey.controller,
    publicKeyMultibase: capabilityDelegationKey.publicKeyMultibase
  };
  mockDoc.authentication[0] = {
    id: authenticationKey.id,
    type: authenticationKey.type,
    controller: authenticationKey.controller,
    publicKeyMultibase: authenticationKey.publicKeyMultibase
  };
  return {did, mockDoc, capabilityInvocationKey};
}
