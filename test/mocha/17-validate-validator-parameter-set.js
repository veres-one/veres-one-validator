/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config: {constants}, util: {clone}} = bedrock;
const helpers = require('./helpers');
const {httpsAgent} = require('bedrock-https-agent');
const didv1 = new (require('did-veres-one')).VeresOne({httpsAgent});
const voValidator = require('veres-one-validator');
const jsonpatch = require('fast-json-patch');

const continuityServiceType = 'Continuity2017Peer';

const ldDocuments = new Map();
const ledgerNode = helpers.createMockLedgerNode({ldDocuments});

const mockData = require('./mock.data');

let maintainerDidDocumentFull;
let electorDidDocumentFull;
let electorServiceId;
describe('validate API ValidatorParameterSet', () => {
  describe('operationValidator', () => {
    beforeEach(async () => {
      maintainerDidDocumentFull = await didv1.generate();
      const {doc: maintainerDidDocument} = maintainerDidDocumentFull;
      ldDocuments.set(maintainerDidDocument.id, maintainerDidDocument);
      electorDidDocumentFull = await didv1.generate();
      const {doc: electorDidDocument} = electorDidDocumentFull;
      electorServiceId = `${electorDidDocument.id};service=MyServiceName`;
      electorDidDocument.service = [{
        id: electorServiceId,
        type: continuityServiceType,
        serviceEndpoint: mockData.electorEndpoint[0],
      }];
      ldDocuments.set(electorDidDocument.id, electorDidDocument);
    });
    describe('create ValidatorParameterSet operation', () => {
      it('validates op with proper proof', async () => {
        const validatorParameterSetDoc = _generateValidatorParameterSetDoc();
        let operation = await _wrap(
          {didDocument: validatorParameterSetDoc, operationType: 'create'});
        const key = _getMaintainerKeys();

        // FIXME: add an AuthorizeRequest proof that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = clone(mockData.proof);

        operation = await didv1.attachInvocationProof({
          operation,
          // capability: maintainerDid,
          capability: validatorParameterSetDoc.id,
          capabilityAction: 'create',
          key,
        });

        // FIXME: attach proof instead of mock proof above
        // operation = await didv1.attachInvocationProof({
        //   operation,
        //   capability: maintainerDid,
        //   capabilityAction: 'AuthorizeRequest',
        //   key,
        // });
        const ledgerConfig = clone(mockData.ledgerConfigurations.alpha);

        let err;
        let result;
        try {
          result = await voValidator.validate({
            basisBlockHeight: 0,
            ledgerConfig,
            ledgerNode,
            validatorInput: operation,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0]
          });
        } catch(e) {
          err = e;
        }
        assertNoError(err);
        should.exist(result);
        result.should.be.an('object');
        should.exist(result.valid);
        result.valid.should.be.true;
      });
      it('rejects op with doc ID that does not match the config', async () => {
        const validatorParameterSetDoc = _generateValidatorParameterSetDoc();
        validatorParameterSetDoc.id =
          'did:v1:uuid:4da302e3-0fe0-49c6-a7c3-55ff4e1ef5fa';
        let operation = await _wrap(
          {didDocument: validatorParameterSetDoc, operationType: 'create'});
        const key = _getMaintainerKeys();

        // FIXME: add an AuthorizeRequest proof that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = clone(mockData.proof);

        operation = await didv1.attachInvocationProof({
          operation,
          // capability: maintainerDid,
          capability: validatorParameterSetDoc.id,
          capabilityAction: 'create',
          key,
        });

        // FIXME: attach proof instead of mock proof above
        // operation = await didv1.attachInvocationProof({
        //   operation,
        //   capability: maintainerDid,
        //   capabilityAction: 'AuthorizeRequest',
        //   key,
        // });
        const ledgerConfig = clone(mockData.ledgerConfigurations.alpha);

        let err;
        let result;
        try {
          result = await voValidator.validate({
            basisBlockHeight: 0,
            ledgerConfig,
            ledgerNode,
            validatorInput: operation,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0]
          });
        } catch(e) {
          err = e;
        }
        assertNoError(err);
        should.exist(result);
        result.should.be.an('object');
        should.exist(result.valid);
        result.valid.should.be.false;
        should.exist(result.error);
        result.error.name.should.equal('ValidationError');
        should.exist(result.error.details.actualValue);
        should.exist(result.error.details.expectedValue);
      });
      it('rejects op with base URL that ends with `/`', async () => {
        const validatorParameterSetDoc = _generateValidatorParameterSetDoc();

        // add invalid baseUrl that ends in slash
        validatorParameterSetDoc.allowedServiceBaseUrl.push(
          'https://example.com/api_v3/'
        );

        let operation = await _wrap(
          {didDocument: validatorParameterSetDoc, operationType: 'create'});
        const key = _getMaintainerKeys();

        // FIXME: add an AuthorizeRequest proof that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = clone(mockData.proof);

        operation = await didv1.attachInvocationProof({
          operation,
          // capability: maintainerDid,
          capability: validatorParameterSetDoc.id,
          capabilityAction: 'create',
          key,
        });

        // FIXME: attach proof instead of mock proof above
        // operation = await didv1.attachInvocationProof({
        //   operation,
        //   capability: maintainerDid,
        //   capabilityAction: 'AuthorizeRequest',
        //   key,
        // });
        const ledgerConfig = clone(mockData.ledgerConfigurations.alpha);

        let err;
        let result;
        try {
          result = await voValidator.validate({
            basisBlockHeight: 0,
            ledgerConfig,
            ledgerNode,
            validatorInput: operation,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0]
          });
        } catch(e) {
          err = e;
        }
        assertNoError(err);
        should.exist(result);
        result.should.be.an('object');
        should.exist(result.valid);
        result.valid.should.be.false;
        should.exist(result.error);
        result.error.name.should.equal('SyntaxError');
        should.exist(result.error.details.baseUrl);
        should.exist(result.error.details.allowedServiceBaseUrl);
      });
    }); // end create electorPool operation

    describe('update ValidatorParameterSet operation', () => {
      it('validates an operation with proper proof', async () => {
        const validatorParameterSetDoc = _generateValidatorParameterSetDoc();
        // the invocationTarget is the ledger ID
        // electorPoolDoc.electorPool[0].capability[0].invocationTarget =
        //   'urn:uuid:e9e63a07-15b1-4e8f-b725-a71a362cfd99';
        ldDocuments.set(
          validatorParameterSetDoc.id, clone(validatorParameterSetDoc));
        const observer = jsonpatch.observe(validatorParameterSetDoc);
        validatorParameterSetDoc.allowedServiceBaseUrl.push(
          'https://example.com/api2');
        const patch = jsonpatch.generate(observer);

        let operation = {
          '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
          creator: 'https://example.com/some/ledger/node',
          recordPatch: {
            '@context': mockData.patchContext,
            patch,
            sequence: 0,
            target: validatorParameterSetDoc.id,
          },
          type: 'UpdateWebLedgerRecord',
        };
        const key = _getMaintainerKeys();

        // FIXME: what are proper proofs for an update operation?

        // FIXME: add an AuthorizeRequest proof that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = clone(mockData.proof);

        operation = await didv1.attachInvocationProof({
          operation,
          capability: validatorParameterSetDoc.id,
          // capabilityAction: operation.type,
          capabilityAction: 'update',
          key,
        });
        // FIXME: replace mock proof above with legitimate proof
        // operation = await didv1.attachInvocationProof({
        //   operation,
        //   capability: maintainerDid,
        //   // capabilityAction: operation.type,
        //   capabilityAction: 'AuthorizeRequest',
        //   key,
        // });
        const ledgerConfig = clone(mockData.ledgerConfigurations.alpha);
        ledgerConfig.electorSelectionMethod = {
          type: 'VeresOne',
        };
        let err;
        let result;
        try {
          result = await voValidator.validate({
            basisBlockHeight: 0,
            ledgerConfig,
            ledgerNode,
            validatorInput: operation,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0]
          });
        } catch(e) {
          err = e;
        }
        assertNoError(err);
        assertNoError(result.error);
        result.valid.should.be.true;
      });
      it('rejects an operation removing allowedServiceBaseUrl', async () => {
        const validatorParameterSetDoc = _generateValidatorParameterSetDoc();
        // the invocationTarget is the ledger ID
        // electorPoolDoc.electorPool[0].capability[0].invocationTarget =
        //   'urn:uuid:e9e63a07-15b1-4e8f-b725-a71a362cfd99';
        ldDocuments.set(
          validatorParameterSetDoc.id, clone(validatorParameterSetDoc));
        const observer = jsonpatch.observe(validatorParameterSetDoc);

        delete validatorParameterSetDoc.allowedServiceBaseUrl;

        const patch = jsonpatch.generate(observer);

        let operation = {
          '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
          creator: 'https://example.com/some/ledger/node',
          recordPatch: {
            '@context': mockData.patchContext,
            patch,
            sequence: 0,
            target: validatorParameterSetDoc.id,
          },
          type: 'UpdateWebLedgerRecord',
        };
        const key = _getMaintainerKeys();

        // FIXME: what are proper proofs for an update operation?

        // FIXME: add an AuthorizeRequest proof that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = clone(mockData.proof);

        operation = await didv1.attachInvocationProof({
          operation,
          capability: validatorParameterSetDoc.id,
          // capabilityAction: operation.type,
          capabilityAction: 'update',
          key,
        });
        // FIXME: replace mock proof above with legitimate proof
        // operation = await didv1.attachInvocationProof({
        //   operation,
        //   capability: maintainerDid,
        //   // capabilityAction: operation.type,
        //   capabilityAction: 'AuthorizeRequest',
        //   key,
        // });
        const ledgerConfig = clone(mockData.ledgerConfigurations.alpha);
        ledgerConfig.electorSelectionMethod = {
          type: 'VeresOne',
        };
        let err;
        let result;
        try {
          result = await voValidator.validate({
            basisBlockHeight: 0,
            ledgerConfig,
            ledgerNode,
            validatorInput: operation,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0]
          });
        } catch(e) {
          err = e;
        }
        assertNoError(err);
        should.exist(result.valid);
        result.valid.should.be.false;
        should.exist(result.error);
        result.error.name.should.equal('ValidationError');
        result.error.message.should.contain('ValidatorParameterSet Document');
      });
      it('rejects an operation that attempts to change doc type', async () => {
        const validatorParameterSetDoc = _generateValidatorParameterSetDoc();
        // the invocationTarget is the ledger ID
        // electorPoolDoc.electorPool[0].capability[0].invocationTarget =
        //   'urn:uuid:e9e63a07-15b1-4e8f-b725-a71a362cfd99';
        ldDocuments.set(
          validatorParameterSetDoc.id, clone(validatorParameterSetDoc));
        const observer = jsonpatch.observe(validatorParameterSetDoc);

        // attempt to change document type
        validatorParameterSetDoc.type = 'SomeNewType';

        const patch = jsonpatch.generate(observer);

        let operation = {
          '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
          creator: 'https://example.com/some/ledger/node',
          recordPatch: {
            '@context': mockData.patchContext,
            patch,
            sequence: 0,
            target: validatorParameterSetDoc.id,
          },
          type: 'UpdateWebLedgerRecord',
        };
        const key = _getMaintainerKeys();

        // FIXME: what are proper proofs for an update operation?

        // FIXME: add an AuthorizeRequest proof that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = clone(mockData.proof);

        operation = await didv1.attachInvocationProof({
          operation,
          capability: validatorParameterSetDoc.id,
          // capabilityAction: operation.type,
          capabilityAction: 'update',
          key,
        });
        // FIXME: replace mock proof above with legitimate proof
        // operation = await didv1.attachInvocationProof({
        //   operation,
        //   capability: maintainerDid,
        //   // capabilityAction: operation.type,
        //   capabilityAction: 'AuthorizeRequest',
        //   key,
        // });
        const ledgerConfig = clone(mockData.ledgerConfigurations.alpha);
        ledgerConfig.electorSelectionMethod = {
          type: 'VeresOne',
        };
        let err;
        let result;
        try {
          result = await voValidator.validate({
            basisBlockHeight: 0,
            ledgerConfig,
            ledgerNode,
            validatorInput: operation,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0]
          });
        } catch(e) {
          err = e;
        }
        assertNoError(err);
        result.valid.should.be.false;
        should.exist(result.error);
        result.error.name.should.equal('ValidationError');
        result.error.message.should.contain('immutable');
      });
      it('rejects an operation that attempts to change doc ID', async () => {
        const validatorParameterSetDoc = _generateValidatorParameterSetDoc();
        // the invocationTarget is the ledger ID
        // electorPoolDoc.electorPool[0].capability[0].invocationTarget =
        //   'urn:uuid:e9e63a07-15b1-4e8f-b725-a71a362cfd99';
        ldDocuments.set(
          validatorParameterSetDoc.id, clone(validatorParameterSetDoc));
        const observer = jsonpatch.observe(validatorParameterSetDoc);

        // attempt to change document id
        validatorParameterSetDoc.type =
          'did:v1:uuid:f6648d4e-6e4c-4c35-b7b4-2e045f207c2d';

        const patch = jsonpatch.generate(observer);

        let operation = {
          '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
          creator: 'https://example.com/some/ledger/node',
          recordPatch: {
            '@context': mockData.patchContext,
            patch,
            sequence: 0,
            target: validatorParameterSetDoc.id,
          },
          type: 'UpdateWebLedgerRecord',
        };
        const key = _getMaintainerKeys();

        // FIXME: what are proper proofs for an update operation?

        // FIXME: add an AuthorizeRequest proof that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = clone(mockData.proof);

        operation = await didv1.attachInvocationProof({
          operation,
          capability: validatorParameterSetDoc.id,
          // capabilityAction: operation.type,
          capabilityAction: 'update',
          key,
        });
        // FIXME: replace mock proof above with legitimate proof
        // operation = await didv1.attachInvocationProof({
        //   operation,
        //   capability: maintainerDid,
        //   // capabilityAction: operation.type,
        //   capabilityAction: 'AuthorizeRequest',
        //   key,
        // });
        const ledgerConfig = clone(mockData.ledgerConfigurations.alpha);
        ledgerConfig.electorSelectionMethod = {
          type: 'VeresOne',
        };
        let err;
        let result;
        try {
          result = await voValidator.validate({
            basisBlockHeight: 0,
            ledgerConfig,
            ledgerNode,
            validatorInput: operation,
            validatorConfig: mockData.ledgerConfigurations.alpha
              .operationValidator[0]
          });
        } catch(e) {
          err = e;
        }
        assertNoError(err);
        result.valid.should.be.false;
        should.exist(result.error);
        result.error.name.should.equal('ValidationError');
        result.error.message.should.contain('immutable');
      });
    }); // end update electorPool operation
  });
});

function _generateValidatorParameterSetDoc() {
  const {id: maintainerDid} = maintainerDidDocumentFull.doc;
  const validatorParameterSetDoc = clone(
    mockData.validatorParameterSet.alpha);
  validatorParameterSetDoc.controller = maintainerDid;
  return validatorParameterSetDoc;
}

function _getMaintainerKeys() {
  const invokePublicKey = maintainerDidDocumentFull.doc
    .capabilityInvocation[0];
  return maintainerDidDocumentFull.keys[invokePublicKey.id];
}

// this is a modified version of the wrap API found in did-veres-one and
// web-ledger-client
async function _wrap({didDocument, operationType = 'create'}) {
  const operation = {'@context': constants.WEB_LEDGER_CONTEXT_V1_URL};

  // normally this is set basted on the targetNode value provided by the
  // ledger-agent HTTP API
  operation.creator = 'https://example.com/some/ledger/node';

  switch(operationType) {
    case 'create':
      operation.type = 'CreateWebLedgerRecord';
      operation.record = didDocument;
      break;
    case 'update':
      operation.type = 'UpdateWebLedgerRecord';
      operation.recordPatch = didDocument;
      break;
    default:
      throw new Error(
        'Unknown operation type.', 'SyntaxError', {operationType});
  }

  return operation;
}
