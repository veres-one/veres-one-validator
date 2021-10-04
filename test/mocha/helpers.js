/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {config: {constants}, util: {clone, BedrockError}} = bedrock;
const {jsonLdDocumentLoader} = require('bedrock-jsonld-document-loader');

exports.createMockLedgerNode = ({ldDocuments}) => {
  return {
    operations: {
      async exists({recordId}) {
        const doc = ldDocuments.get(recordId);
        return !!doc;
      }
    },
    records: {
      async get({/*maxBlockHeight, */recordId}) {
        const doc = ldDocuments.get(recordId);
        if(doc) {
          return {
            // clone the result to prevent JSONLD from mutating the contexts
            // as with a document loader
            record: clone(doc),
            meta: {sequence: 0}
          };
        }
        throw new BedrockError(
          'DID Document not found.', 'NotFoundError', {recordId});
      }
    }
  };
};

/**
 * Takes in an id and generates a urn for the root zcap dynamically.
 *
 * @param {object} options - Options to use.
 * @param {string} options.id - Either a UUID or a DiD.
 *
 * @returns {string} The resulting zcap id.
 */
exports.generatateRootZcapId = ({id}) => {
  const zcapId = `urn:zcap:root:${encodeURIComponent(id)}`;
  const zcap = {
    '@context': constants.ZCAP_CONTEXT_V1_URL,
    id: zcapId,
    controller: id,
    invocationTarget: id
  };
  jsonLdDocumentLoader.addStatic(zcapId, zcap);
  return zcapId;
};
