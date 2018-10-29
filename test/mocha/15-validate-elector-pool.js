/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {constants} = bedrock.config;
const didv1 = require('did-veres-one');
const dids = require('did-io');
const voValidator = require('veres-one-validator');
const equihashSigs = require('equihash-signature');
const jsigs = require('jsonld-signatures');
const jsonpatch = require('fast-json-patch');
const uuid = require('uuid/v4');
const {BedrockError} = bedrock.util;

jsigs.use('jsonld', bedrock.jsonld);
equihashSigs.install(jsigs);
didv1.use('jsonld', bedrock.jsonld);
didv1.use('jsonld-signatures', jsigs);

dids.use('jsonld', bedrock.jsonld);

const continuityServiceType = 'Continuity2017Peer';
const ldDocuments = new Map();

const ledgerNode = {
  records: {
    async get({maxBlockHeight, recordId}) {
      if(ldDocuments.has(recordId)) {
        return {
          record: ldDocuments.get(recordId),
          meta: {sequence: 0}
        };
      }
      throw new BedrockError(
        'DID Document not found.', 'NotFoundError', {recordId});
    }
  }
};

const mockData = require('./mock.data');

const capabilityActions = {
  authorize: 'AuthorizeRequest',
  register: 'RegisterDid',
  update: 'UpdateDidDocument'
};

let maintainerDidDocumentFull;
let electorDidDocumentFull;
let electorServiceId;
const v1 = dids.methods.veres();
describe('validate API ElectorPool', () => {
  describe('operationValidator', () => {
    beforeEach(async () => {
      maintainerDidDocumentFull = await v1.generate();
      const {doc: maintainerDidDocument} = maintainerDidDocumentFull;
      ldDocuments.set(maintainerDidDocument.id, maintainerDidDocument);
      electorDidDocumentFull = await v1.generate();
      const {doc: electorDidDocument} = electorDidDocumentFull;
      electorServiceId = _generateUrnUuid();
      electorDidDocument.service = [{
        id: electorServiceId,
        type: continuityServiceType,
        serviceEndpoint: mockData.electorEndpoint[0],
      }];
      ldDocuments.set(electorDidDocument.id, electorDidDocument);
    });
    describe('create electorPool operation', () => {
      it('validates an operation with proper proof', async () => {
        const {id: electorDid} = electorDidDocumentFull.doc;
        const {id: maintainerDid} = maintainerDidDocumentFull.doc;
        const electorPoolDoc = bedrock.util.clone(
          mockData.electorPoolDocument.alpha);
        electorPoolDoc.electorPool[0].elector = electorDid;
        electorPoolDoc.electorPool[0].service = electorServiceId;
        electorPoolDoc.electorPool[0].capability[0].id = maintainerDid;
        // the invocationTarget is the ledger ID
        electorPoolDoc.electorPool[0].capability[0].invocationTarget =
          'urn:uuid:e9e63a07-15b1-4e8f-b725-a71a362cfd99';
        electorPoolDoc.invoker = maintainerDid;
        let operation = v1.client.wrap({didDocument: electorPoolDoc});
        const invokePublicKey = maintainerDidDocumentFull.doc
          .capabilityInvocation[0].publicKey[0];
        const creator = invokePublicKey.id;
        const {privateKey: privateKeyBase58} =
          maintainerDidDocumentFull.keys[invokePublicKey.id];

        operation = await v1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          // capabilityAction: operation.type,
          capabilityAction: 'RegisterDid',
          creator,
          privateKeyBase58
        });
        operation = await v1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          // capabilityAction: operation.type,
          capabilityAction: 'AuthorizeRequest',
          creator,
          privateKeyBase58
        });
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.electorSelectionMethod = {
          type: 'VeresOne',
          // corresponds to electorPoolDocument.alpha
          electorPool: electorPoolDoc.id,
        };
        let err;
        try {
          await voValidator.validate({
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
      });
      it('fails fails to validate an operation without proper proofs');
    });

    describe('update electorPool operation', () => {
      it('validates an operation with proper proof', async () => {
        const {id: electorDid} = electorDidDocumentFull.doc;
        const {id: maintainerDid} = maintainerDidDocumentFull.doc;
        const electorPoolDoc = bedrock.util.clone(
          mockData.electorPoolDocument.alpha);
        electorPoolDoc.electorPool[0].elector = electorDid;
        electorPoolDoc.electorPool[0].service = electorServiceId;
        electorPoolDoc.electorPool[0].capability[0].id = maintainerDid;
        // the invocationTarget is the ledger ID
        electorPoolDoc.electorPool[0].capability[0].invocationTarget =
          'urn:uuid:e9e63a07-15b1-4e8f-b725-a71a362cfd99';
        electorPoolDoc.invoker = maintainerDid;
        ldDocuments.set(electorPoolDoc.id, bedrock.util.clone(electorPoolDoc));
        const observer = jsonpatch.observe(electorPoolDoc);
        const newServiceId = _generateUrnUuid();
        const newServiceEndpoint = mockData.electorEndpoint[1];
        const {capability} = electorPoolDoc.electorPool[0];
        // using an inline service descriptor
        electorPoolDoc.electorPool.push({
          // elector DID is not dereferenced in this case
          elector:
            'did:v1:test:nym:z279squ73dJ3q21jAEk3FRrr37UdX5xo8FXWA74anmPnvzfx',
          capability,
          id: _generateUrnUuid(),
          service: {
            id: newServiceId,
            serviceEndpoint: newServiceEndpoint,
            type: continuityServiceType,
          },
        });
        const patch = jsonpatch.generate(observer);

        let operation = {
          '@context': constants.WEB_LEDGER_CONTEXT_V1_URL,
          recordPatch: {
            '@context': constants.VERES_ONE_CONTEXT_URL,
            patch,
            sequence: 0,
            target: electorPoolDoc.id,
          },
          type: 'UpdateWebLedgerRecord',
        };

        const invokePublicKey = maintainerDidDocumentFull.doc
          .capabilityInvocation[0].publicKey[0];
        const creator = invokePublicKey.id;
        const {privateKey: privateKeyBase58} =
          maintainerDidDocumentFull.keys[invokePublicKey.id];

        operation = await v1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          // capabilityAction: operation.type,
          capabilityAction: 'UpdateDidDocument',
          creator,
          privateKeyBase58
        });
        operation = await v1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          // capabilityAction: operation.type,
          capabilityAction: 'AuthorizeRequest',
          creator,
          privateKeyBase58
        });
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.electorSelectionMethod = {
          type: 'VeresOne',
          // corresponds to electorPoolDocument.alpha
          electorPool: electorPoolDoc.id,
        };
        let err;
        try {
          await voValidator.validate({
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
      });
    });
  });
});

function _generateUrnUuid() {
  return `urn:uuid:${uuid()}`;
}
