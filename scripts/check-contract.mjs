import SwaggerParser from '@apidevtools/swagger-parser';
const api = await SwaggerParser.validate('contracts/openapi.json');
console.log(`Valid OpenAPI ${api.openapi}: ${Object.keys(api.paths).length} paths. This checks the contract, not endpoint implementation.`);
