/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config: {constants}, util: {BedrockError}} = bedrock;
const {httpsAgent} = require('bedrock-https-agent');
const didv1 = new (require('did-veres-one')).VeresOne({httpsAgent});
const voValidator = require('veres-one-validator');
const jsonpatch = require('fast-json-patch');

const continuityServiceType = 'Continuity2017Peer';
const ldDocuments = new Map();

const ledgerNode = {
  records: {
    async get({/*maxBlockHeight, */recordId}) {
      if(ldDocuments.has(recordId)) {
        return {
          // clone the result to prevent JSONLD from mutating the contexts
          // as with a document loader
          record: bedrock.util.clone(ldDocuments.get(recordId)),
          meta: {sequence: 0}
        };
      }
      throw new BedrockError(
        'DID Document not found.', 'NotFoundError', {recordId});
    }
  }
};

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
        operation.proof = bedrock.util.clone(mockData.proof);

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
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);

        let err;
        let result;
        try {
          result = await voValidator.validate({
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
    }); // end create electorPool operation

    describe('update ValidatorParameterSet operation', () => {
      it('validates an operation with proper proof', async () => {
        const validatorParameterSetDoc = _generateValidatorParameterSetDoc();
        // the invocationTarget is the ledger ID
        // electorPoolDoc.electorPool[0].capability[0].invocationTarget =
        //   'urn:uuid:e9e63a07-15b1-4e8f-b725-a71a362cfd99';
        ldDocuments.set(
          validatorParameterSetDoc.id, bedrock.util.clone(validatorParameterSetDoc));
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
        operation.proof = bedrock.util.clone(mockData.proof);

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
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.electorSelectionMethod = {
          type: 'VeresOne',
        };
        let err;
        let result;
        try {
          result = await voValidator.validate({
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
    }); // end update electorPool operation
  });
});

function _generateValidatorParameterSetDoc() {
  const {id: maintainerDid} = maintainerDidDocumentFull.doc;
  const validatorParameterSetDoc = bedrock.util.clone(
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
