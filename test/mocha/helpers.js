/*!
 * Copyright (c) 2017-2019 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const bedrock = require('bedrock');
const {util: {clone, BedrockError}} = bedrock;

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
