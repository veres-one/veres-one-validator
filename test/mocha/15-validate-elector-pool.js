/*!
 * Copyright (c) 2017-2018 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {constants} = bedrock.config;
const didv1 = new (require('did-veres-one')).VeresOne({
  httpsAgent: new require('https').Agent({rejectUnauthorized: false})
});
const voValidator = require('veres-one-validator');
const jsigs = require('jsonld-signatures');
const jsonpatch = require('fast-json-patch');
const uuid = require('uuid/v4');
const {BedrockError} = bedrock.util;

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
describe.only('validate API ElectorPool', () => {
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
    describe('create electorPool operation', () => {
      it.only('validates op with proper proof', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.doc;
        const electorPoolDoc = _generateElectorPoolDoc();
        // TODO: this wrap API requires contact with a veres one ledger node
        // in order to include the `creator` on the operation which corresponds
        // to the targetNode value from the ledgerAgentStatusService endpoint
        // on the node. The default hostname for the ledger node is
        // https://genesis.veres.one.localhost:42443
        // therefore, one must be running a local veres one node in dev mode
        // in order to run this test suite
        let operation = await didv1.client.wrap(
          {didDocument: electorPoolDoc, operationType: 'create'});
        const key = _getMaintainerKeys();
        operation = await didv1.attachInvocationProof({
          operation,
          // capability: maintainerDid,
          capability: electorPoolDoc.id,
          // FIXME: seems weird to use `RegisterDid` on the elector pool doc
          capabilityAction: 'RegisterDid',
          key,
        });
        operation = await didv1.attachInvocationProof({
          operation,
          capability: maintainerDid,
          capabilityAction: 'AuthorizeRequest',
          key,
        });
        const ledgerConfig = bedrock.util.clone(
          mockData.ledgerConfigurations.alpha);
        ledgerConfig.electorSelectionMethod = {
          type: 'VeresOne',
          // corresponds to electorPoolDocument.alpha
          electorPool: electorPoolDoc.id,
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
        should.exist(result);
        result.should.be.an('object');
        should.exist(result.valid);
        result.valid.should.be.true;
      });
      it('fails on op with serviceId mismatch', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.doc;
        const electorPoolDoc = _generateElectorPoolDoc();

        const incorrectServiceId = `${maintainerDid};service=Unknown`;
        electorPoolDoc.electorPool[0].service = incorrectServiceId;

        let operation = didv1.client.wrap({didDocument: electorPoolDoc});
        const {creator, privateKeyBase58} = _getMaintainerKeys();

        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          // FIXME: seems weird to use `RegisterDid` on the elector pool doc
          capabilityAction: 'RegisterDid',
          creator,
          privateKeyBase58
        });
        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
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
        result.valid.should.be.false;
        result.error.name.should.equal('NotFoundError');
      });
      it('fails on op w/missing RegisterDid capability', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.doc;
        const electorPoolDoc = _generateElectorPoolDoc();
        let operation = didv1.client.wrap({didDocument: electorPoolDoc});
        const {creator, privateKeyBase58} = _getMaintainerKeys();

        // no RegisterDid proof added

        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
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
        result.valid.should.be.false;
        result.error.name.should.equal('NotAllowedError');
      });

      // FIXME: this test is known to be failing due to issues related to
      // _checkProofCombination in index.js. See FIXME there.
      it('fails on op w/missing AuthorizeRequest capability', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.doc;
        const electorPoolDoc = _generateElectorPoolDoc();
        let operation = didv1.client.wrap({didDocument: electorPoolDoc});
        const {creator, privateKeyBase58} = _getMaintainerKeys();

        // no AuthorizeRequest proof added

        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          capabilityAction: 'RegisterDid',
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
        result.valid.should.be.false;
        result.error.name.should.equal('ValidationError');
      });
      // FIXME: this test is known to be failing due to issues related to
      // _checkProofCombination in index.js. See FIXME there.
      it('fails on op w/two RegisterDid capability proofs', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.doc;
        const electorPoolDoc = _generateElectorPoolDoc();
        let operation = didv1.client.wrap({didDocument: electorPoolDoc});
        const {creator, privateKeyBase58} = _getMaintainerKeys();

        // no AuthorizeRequest proof added

        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          capabilityAction: 'RegisterDid',
          creator,
          privateKeyBase58
        });
        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          capabilityAction: 'RegisterDid',
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
        result.valid.should.be.false;
        result.error.name.should.equal('NotAllowedError');
      });
      it('fails on op w/two AuthorizeRequest capability proofs', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.doc;
        const electorPoolDoc = _generateElectorPoolDoc();
        let operation = didv1.client.wrap({didDocument: electorPoolDoc});
        const {creator, privateKeyBase58} = _getMaintainerKeys();

        // no RegisterDid proof added

        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          capabilityAction: 'AuthorizeRequest',
          creator,
          privateKeyBase58
        });
        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
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
        result.valid.should.be.false;
        result.error.name.should.equal('NotAllowedError');
      });
      // FIXME: enable when ocapld integration is complete
      // test should be failing, but currently passes
      it.skip('fails on op w/incorrect capability DID', async () => {
        const {id: maintainerDid} = maintainerDidDocumentFull.doc;
        const {id: electorDid} = electorDidDocumentFull.doc;
        const electorPoolDoc = _generateElectorPoolDoc();
        let operation = didv1.client.wrap({didDocument: electorPoolDoc});
        const {creator, privateKeyBase58} = _getMaintainerKeys();

        // replacing electorDid with maintainerDid
        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: electorDid,
          capabilityAction: 'RegisterDid',
          creator,
          privateKeyBase58
        });
        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
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
        should.exist(err);
        err.name.should.equal('NotAllowedError');
      });
    }); // end create electorPool operation

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
        const elector =
          'did:v1:test:nym:z279squ73dJ3q21jAEk3FRrr37UdX5xo8FXWA74anmPnvzfx';

        // FIXME: should inline serviceIds be did: URI's?
        const newServiceId = `${elector};service=TheServiceId`;

        const newServiceEndpoint = mockData.electorEndpoint[1];
        const {capability} = electorPoolDoc.electorPool[0];
        // using an inline service descriptor
        electorPoolDoc.electorPool.push({
          // elector DID is not dereferenced in this case
          elector,
          capability,
          id: _generateUrnUuid(),
          type: ['Continuity2017GuarantorElector', 'Continuity2017Elector'],
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
            // FIXME: use constant and cached version when available
            "@context": [
              'https://w3id.org/did/v0.11',
              constants.VERES_ONE_CONTEXT_V1_URL
            ],
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

        // FIXME: what are proper proofs for an update operation?

        operation = await didv1.attachInvocationProof({
          algorithm: 'Ed25519Signature2018',
          operation,
          capability: maintainerDid,
          // capabilityAction: operation.type,
          capabilityAction: 'UpdateDidDocument',
          creator,
          privateKeyBase58
        });
        operation = await didv1.attachInvocationProof({
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

function _generateElectorPoolDoc() {
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
  electorPoolDoc.controller = maintainerDid;
  // TODO: adding toJSON method for parity with VeresOneDidDoc class in
  // did-veres-one
  electorPoolDoc.toJSON = () => {
    const epd = bedrock.util.clone(electorPoolDoc);
    delete epd.toJSON;
    return epd;
  };
  return electorPoolDoc;
}

function _generateUrnUuid() {
  return `urn:uuid:${uuid()}`;
}

function _getMaintainerKeys() {
  const invokePublicKey = maintainerDidDocumentFull.doc
    .capabilityInvocation[0];
  return maintainerDidDocumentFull.keys[invokePublicKey.id];
}
