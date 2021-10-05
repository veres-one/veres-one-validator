/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';
const {attachInvocationProof} = require('did-veres-one');
const bedrock = require('bedrock');
const {config: {constants}, util: {BedrockError}} = bedrock;
const helpers = require('./helpers');
const {httpsAgent} = require('bedrock-https-agent');
const v1 = require('did-veres-one').driver({httpsAgent});
const voValidator = require('veres-one-validator');
const jsonpatch = require('fast-json-patch');

const ldDocuments = new Map();
const ledgerNode = helpers.createMockLedgerNode({ldDocuments});
const mockData = require('./mock.data');

let maintainerDidDocumentFull;
let witnessDidDocumentFull;
describe('validate API WitnessPool', () => {
  describe('operationValidator', () => {
    beforeEach(async () => {
      maintainerDidDocumentFull = await v1.generate();
      const {didDocument: maintainerDidDocument} = maintainerDidDocumentFull;
      ldDocuments.set(maintainerDidDocument.id, maintainerDidDocument);
      witnessDidDocumentFull = await v1.generate();
      const {didDocument: witnessDidDocument} = witnessDidDocumentFull;
      ldDocuments.set(witnessDidDocument.id, witnessDidDocument);
    });
    describe('create witnessPool operation', () => {
      it('validates op with proper proof', async () => {
        const witnessPoolDoc = _generateWitnessPoolDoc();
        let operation = await _wrap(
          {didDocument: witnessPoolDoc, operationType: 'create'});
        const key = _getMaintainerKeys();

        // FIXME: add a write proof for the ledger that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = bedrock.util.clone(mockData.proof);

        operation = await attachInvocationProof({
          operation,
          // capability: maintainerDid,
          capability: helpers.generatateRootZcapId({id: witnessPoolDoc.id}),
          capabilityAction: 'write',
          invocationTarget: witnessPoolDoc.id,
          key,
        });
        // FIXME: attach proof instead of mock proof above
        // operation = await attachInvocationProof(operation, {
        //   capability: maintainerDid,
        //   capabilityAction: 'write',
        //   key,
        // });
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.witnessSelectionMethod = {
          type: 'VeresOne',
          // corresponds to witnessPoolDocument.alpha
          witnessPool: witnessPoolDoc.id,
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
        should.exist(result);
        result.should.be.an('object');
        should.exist(result.valid);
        result.valid.should.be.true;
      });
      it('fails on empty primary witness array', async () => {
        const witnessPoolDoc = _generateWitnessPoolDoc();

        witnessPoolDoc.primaryWitnessCandidate = [];

        let operation = await _wrap(
          {didDocument: witnessPoolDoc, operationType: 'create'});
        const key = _getMaintainerKeys();
        // FIXME: add a write proof for the ledger that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = bedrock.util.clone(mockData.proof);

        operation = await attachInvocationProof({
          operation,
          // capability: maintainerDid,
          capability: witnessPoolDoc.id,
          capabilityAction: 'write',
          invocationTarget: operation.record.id,
          key,
          signer: key.signer()
        });
        // FIXME: attach proof instead of mock proof above
        // operation = await attachInvocationProof(operation, {
        //   capability: maintainerDid,
        //   capabilityAction: 'write',
        //   key,
        // });
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.witnessSelectionMethod = {
          type: 'VeresOne',
          // corresponds to witnessPoolDocument.alpha
          witnessPool: witnessPoolDoc.id,
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
        result.error.name.should.equal('ValidationError');
      });
      it('fails on op if proof is not an array', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.didDocument;
        const witnessPoolDoc = _generateWitnessPoolDoc();
        let operation = await _wrap(
          {didDocument: witnessPoolDoc, operationType: 'create'});
        const key = _getMaintainerKeys();
        // no create proof added
        operation = await attachInvocationProof({
          operation,
          capability: maintainerDid,
          capabilityAction: 'write',
          invocationTarget: operation.record.id,
          key,
          signer: key.signer()
        });

        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.witnessSelectionMethod = {
          type: 'VeresOne',
          // corresponds to witnessPoolDocument.alpha
          witnessPool: witnessPoolDoc.id,
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
        // schema validation detects the missing proof
        result.error.name.should.equal('ValidationError');
      });

      it('fails on op w/only one write capability', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.didDocument;
        const witnessPoolDoc = _generateWitnessPoolDoc();
        let operation = await _wrap(
          {didDocument: witnessPoolDoc, operationType: 'create'});
        const key = _getMaintainerKeys();
        // no ledger write proof added
        // this proof is for writing to a single did
        operation = await attachInvocationProof({
          operation,
          capability: maintainerDid,
          capabilityAction: 'write',
          invocationTarget: operation.record.id,
          key,
          signer: key.signer()
        });

        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.witnessSelectionMethod = {
          type: 'VeresOne',
          // corresponds to witnessPoolDocument.alpha
          witnessPool: witnessPoolDoc.id,
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
        result.error.name.should.equal('ValidationError');
      });
      // FIXME add validation to ensure one of the proof's invocationTarget
      // is the ledger itself.
      it.skip('fails on op w/ two write capability proofs', async () => {
        const witnessPoolDoc = _generateWitnessPoolDoc();
        let operation = await _wrap(
          {didDocument: witnessPoolDoc, operationType: 'create'});
        const key = _getMaintainerKeys();

        // no ledger write proof added
        // this operation has 2 write proofs with dids, but no
        // proof for writing to the ledger itself
        operation = await attachInvocationProof({
          operation,
          capability: witnessPoolDoc.id,
          capabilityAction: 'write',
          invocationTarget: witnessPoolDoc.id,
          key,
        });
        operation = await attachInvocationProof({
          operation,
          capability: witnessPoolDoc.id,
          capabilityAction: 'write',
          invocationTarget: witnessPoolDoc.id,
          key,
        });
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.witnessSelectionMethod = {
          type: 'VeresOne',
          // corresponds to witnessPoolDocument.alpha
          witnessPool: witnessPoolDoc.id,
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
        result.error.name.should.equal('ValidationError');
      });
      // FIXME false negative here
      it('fails on op w/two ledger write capability proofs', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.didDocument;
        const witnessPoolDoc = _generateWitnessPoolDoc();
        let operation = await _wrap(
          {didDocument: witnessPoolDoc, operationType: 'create'});
        const key = _getMaintainerKeys();

        // we have 2 ledger write proofs, but no did specific
        // write proof
        operation = await attachInvocationProof({
          operation,
          algorithm: 'Ed25519Signature2020',
          capability: maintainerDid,
          capabilityAction: 'write',
          invocationTarget: maintainerDid,
          key,
        });
        operation = await attachInvocationProof({
          operation,
          algorithm: 'Ed25519Signature2020',
          capability: maintainerDid,
          capabilityAction: 'write',
          invocationTarget: operation.record.id,
          key,
        });
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.witnessSelectionMethod = {
          type: 'VeresOne',
          // corresponds to witnessPoolDocument.alpha
          witnessPool: witnessPoolDoc.id,
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
        result.error.name.should.equal('ValidationError');
      });
      it('fails on op w/ incorrect capability DID', async () => {
        const witnessPoolDoc = _generateWitnessPoolDoc();
        let operation = await _wrap(
          {didDocument: witnessPoolDoc, operationType: 'create'});
        const key = _getMaintainerKeys();

        // FIXME: add a write proof for the ledger that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = bedrock.util.clone(mockData.proof);

        // replacing witnessDid with maintainerDid
        operation = await attachInvocationProof({
          operation,
          // this DID document does not exist
          capability: 'did:v1:test:uuid:e798d4cf-f4f5-40cb-9f06-7fa56cf55d95',
          capabilityAction: 'write',
          invocationTarget: operation.record.id,
          key,
        });

        // FIXME: attach proof instead of mock proof above
        // operation = await attachInvocationProof(operation, {
        //   capability: maintainerDid,
        //   capabilityAction: 'write',
        //   key,
        // });
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.witnessSelectionMethod = {
          type: 'VeresOne',
          // corresponds to witnessPoolDocument.alpha
          witnessPool: witnessPoolDoc.id,
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
        result.error.details.proofVerifyResult.verified.should.be.false;
        // the fictitious DID specified in the capability does not match the
        // this new document and is also not found on the ledger resulting in
        // a NotFoundError from the document loader.
        result.error.details.proofVerifyResult.results[0].error.name
          .should.equal('NotFoundError');
        result.error.name.should.equal('ValidationError');
      });
    }); // end create witnessPool operation

    describe('update witness pool operation', () => {
      it('validates an operation with proper proof', async () => {
        const {id: witnessDid} = witnessDidDocumentFull.didDocument;
        const {id: maintainerDid} = maintainerDidDocumentFull.didDocument;
        const witnessPoolDoc = bedrock.util.clone(
          mockData.witnessPoolDocument.alpha);

        // the invocationTarget is the ledger ID
        witnessPoolDoc.controller = maintainerDid;
        ldDocuments.set(witnessPoolDoc.id, bedrock.util.clone(witnessPoolDoc));
        const observer = jsonpatch.observe(witnessPoolDoc);

        // upgrade the witness pool to 4 witnesses
        witnessPoolDoc.primaryWitnessCandidate.push(witnessDid);
        witnessPoolDoc.primaryWitnessCandidate.push(
          (await v1.generate()).didDocument.id);
        witnessPoolDoc.primaryWitnessCandidate.push(
          (await v1.generate()).didDocument.id);
        witnessPoolDoc.secondaryWitnessCandidate = [
          (await v1.generate()).didDocument.id];
        witnessPoolDoc.maximumWitnessCount = 4;

        const patch = jsonpatch.generate(observer);

        let operation = {
          '@context': [
            constants.WEB_LEDGER_CONTEXT_V1_URL,
            constants.ZCAP_CONTEXT_V1_URL,
            constants.ED25519_2020_CONTEXT_V1_URL
          ],
          creator: 'https://example.com/some/ledger/node',
          recordPatch: {
            '@context': mockData.patchContext,
            patch,
            sequence: 0,
            target: witnessPoolDoc.id,
          },
          type: 'UpdateWebLedgerRecord',
        };

        const key = _getMaintainerKeys();

        // FIXME: what are proper proofs for an update operation?

        // FIXME: add a write proof for the ledger that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = bedrock.util.clone(mockData.proof);

        operation = await attachInvocationProof({
          operation,
          capability: witnessPoolDoc.id,
          // capabilityAction: operation.type,
          capabilityAction: 'write',
          invocationTarget: operation.recordPatch.target,
          key,
        });

        // FIXME: replace mock proof above with legitimate proof
        // operation = await attachInvocationProof(operation, {
        //   capability: maintainerDid,
        //   // capabilityAction: operation.type,
        //   capabilityAction: 'write',
        //   key,
        // });
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.witnessSelectionMethod = {
          type: 'VeresOne',
          // corresponds to witnessPoolDocument.alpha
          witnessPool: witnessPoolDoc.id,
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
      it('rejects an operation removing witnessPool', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.didDocument;
        const witnessPoolDoc = bedrock.util.clone(
          mockData.witnessPoolDocument.alpha);

        // the invocationTarget is the ledger ID
        witnessPoolDoc.controller = maintainerDid;
        ldDocuments.set(witnessPoolDoc.id, bedrock.util.clone(witnessPoolDoc));
        const observer = jsonpatch.observe(witnessPoolDoc);

        delete witnessPoolDoc.primaryWitnessCandidate;

        const patch = jsonpatch.generate(observer);

        let operation = {
          '@context': [
            constants.WEB_LEDGER_CONTEXT_V1_URL,
            constants.ZCAP_CONTEXT_V1_URL,
            constants.ED25519_2020_CONTEXT_V1_URL
          ],
          creator: 'https://example.com/some/ledger/node',
          recordPatch: {
            '@context': mockData.patchContext,
            patch,
            sequence: 0,
            target: witnessPoolDoc.id,
          },
          type: 'UpdateWebLedgerRecord',
        };

        const key = _getMaintainerKeys();

        // FIXME: what are proper proofs for an update operation?

        // FIXME: add a write proof for the ledger that will pass json-schema
        // validation for testnet v2 *not* a valid signature
        operation.proof = bedrock.util.clone(mockData.proof);

        operation = await attachInvocationProof({
          operation,
          capability: witnessPoolDoc.id,
          // capabilityAction: operation.type,
          capabilityAction: 'write',
          invocationTarget: operation.recordPatch.target,
          key,
        });
        // FIXME: replace mock proof above with legitimate proof
        // operation = await attachInvocationProof(operation, {
        //   capability: maintainerDid,
        //   // capabilityAction: operation.type,
        //   capabilityAction: 'write',
        //   key,
        // });
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.witnessSelectionMethod = {
          type: 'VeresOne',
          // corresponds to witnessPoolDocument.alpha
          witnessPool: witnessPoolDoc.id,
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
        result.error.message.should.contain('WitnessPool Document');
      });
    }); // end update witnessPool operation
  });
});

function _generateWitnessPoolDoc() {
  const {id: witnessDid} = witnessDidDocumentFull.didDocument;
  const {id: maintainerDid} = maintainerDidDocumentFull.didDocument;
  const witnessPoolDoc = bedrock.util.clone(
    mockData.witnessPoolDocument.alpha);
  witnessPoolDoc.controller = maintainerDid;
  witnessPoolDoc.maximumWitnessCount = 1;
  witnessPoolDoc.primaryWitnessCandidate = [witnessDid];
  return witnessPoolDoc;
}

function _getMaintainerKeys() {
  const invokePublicKey =
    maintainerDidDocumentFull.didDocument.capabilityInvocation[0];
  return maintainerDidDocumentFull.keyPairs.get(invokePublicKey.id);
}

// this is a modified version of the wrap API found in did-veres-one and
// web-ledger-client
async function _wrap({didDocument, operationType = 'create'}) {
  const operation = {
    '@context': [
      constants.WEB_LEDGER_CONTEXT_V1_URL,
      constants.ZCAP_CONTEXT_V1_URL
    ]
  };

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
      throw new BedrockError(
        'Unknown operation type.', 'SyntaxError', {operationType});
  }

  return operation;
}
