/**
 * Project the original Specification owner's re-received LLD-to-Code readout
 * into executable, source-pinned Code adapters and independently authored tests.
 *
 * This is a candidate CODE PRODUCT. It performs no source writes or execution,
 * issues no Work/Proof/Sign authority, and cannot treat prose as an algorithm.
 * The original Design reader owns source-cut and HLD/LLD correspondence.
 * The original operating host owns isolated execution and final acceptance.
 */
import { createHash } from "node:crypto";
import { posix } from "node:path";
import { isNiUri, niUriDigest } from "@red-cup-engineering/uri-engineering-services-section/ni-uri";
import { canonicalizeJson, JSON_RESOURCE_ENVELOPE } from "@red-cup-engineering/json-engineering-services-section/canonical-json";
import { renderJsonSchemaModule } from "./transform-json-schema-to-typescript.mjs";
import { renderFactoryInvocation } from "./render-factory-invocation.mjs";

const SHA = /^sha256:[a-f0-9]{64}$/u;
const OP_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/u;
const EXPORT_NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
const ALLOWED_ERRORS = new Set(["TypeError", "Error", "RangeError", "SyntaxError"]);
const reservedPath = "src/engineering-code-contracts.mjs";
const reservedTests = "test/engineering-code-contracts.test.mjs";
const object = x => x !== null && typeof x === "object" && !Array.isArray(x);
const fail = (code, message) => { const error = new TypeError(message); error.code = code; throw error; };
const sha = text => "sha256:" + createHash("sha256").update(text, "utf8").digest("hex");
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length &&
  keys.every(key => Object.hasOwn(value, key));
// The JSON owner admits a bounded, detached, deeply frozen snapshot. A caller's
// later edits, accessors or toJSON hook cannot rewrite the source we projected.
const envelope = Object.freeze({ ...JSON_RESOURCE_ENVELOPE,
  maxSourceBytes: 2 * 1024 * 1024, maxCanonicalBytes: 2 * 1024 * 1024,
  maxStringBytes: 2 * 1024 * 1024 });
const sourceKinds = new Set(["requirement", "specification", "architecture", "high-level"]);
const nonemptyStrings = value => Array.isArray(value) && value.length > 0 &&
  value.every(item => typeof item === "string" && item.length > 0) &&
  new Set(value).size === value.length;
function sourceVerificationInventory(value) {
  return exact(value, ["scope", "status", "clauseCount", "declaredTestCount", "missingClauseIds"]) &&
    value.scope === "original-specification-clauses" &&
    Number.isSafeInteger(value.clauseCount) && value.clauseCount > 0 &&
    Number.isSafeInteger(value.declaredTestCount) && value.declaredTestCount >= 0 &&
    Array.isArray(value.missingClauseIds) &&
    (value.missingClauseIds.length === 0 || nonemptyStrings(value.missingClauseIds)) &&
    value.declaredTestCount + value.missingClauseIds.length === value.clauseCount &&
    value.status === (value.missingClauseIds.length === 0
      ? "source-tests-declared-unverified" : "source-tests-missing");
}
const schemaAnnotation = (value, key) => object(value) && Object.hasOwn(value, key) ? value[key] : undefined;
const nodeSchema = value => value === true ? {} : value === false ? { not: {} } : value;
function targetPath(value) {
  return typeof value === "string" && value.startsWith("src/") && value.endsWith(".mjs") &&
    !value.includes("\\") && !value.includes("\0") && value.isWellFormed() &&
    value.normalize("NFC") === value && value.split("/").every(segment =>
      segment !== "" && segment !== "." && segment !== "..");
}
function importLocation(from, to) {
  const relative = posix.relative(posix.dirname(from), to);
  const path = relative.startsWith(".") ? relative : "./" + relative;
  return path.split("/").map(part => part === "." || part === ".." ?
    part : encodeURIComponent(part)).join("/");
}
const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
// JSON data is not a JavaScript object literal: an own __proto__ key in
// a literal changes its prototype instead of reaching the implementation.
// Parse an escaped JSON string for every case value, including error cases.
const jsonExpression = value => "JSON.parse(" + JSON.stringify(JSON.stringify(value)) + ")";

// Independently receive the original LLD interface annotations before emitting code.
function validateInvocationAnnotations(schema, direction) {
  const argumentKey = 'x-javascript-arguments', resultKey = 'x-javascript-result';
  const factoryKey = 'x-javascript-factory';
  const pending = [{ schema, root: true }];
  while (pending.length) {
    const { schema: current, root } = pending.pop();
    if (!object(current)) continue;
    const argumentsPresent = Object.hasOwn(current, argumentKey);
    const resultPresent = Object.hasOwn(current, resultKey);
    const factoryPresent = Object.hasOwn(current, factoryKey);
    if ((argumentsPresent || resultPresent || factoryPresent) && !root)
      fail('CODE_INVOCATION_UNQUALIFIED', 'JavaScript invocation annotations require an interface schema root');
    if (argumentsPresent && (direction === 'output' || current[argumentKey] !== 'positional') ||
        resultPresent && (direction === 'input' || !['iterable-values', 'map-entries'].includes(current[resultKey])) ||
        argumentsPresent && resultPresent)
      fail('CODE_INVOCATION_UNQUALIFIED', 'Invalid or misplaced JavaScript invocation annotation');
    if (factoryPresent) {
      const policy = current[factoryKey];
      if (direction === 'output' || argumentsPresent || resultPresent || current.type !== 'object' ||
          !object(policy) || Object.keys(policy).length !== (Object.hasOwn(policy, 'resultReferences') ? 4 : 3) ||
          !['methods', 'maxCalls', 'maxArguments'].every(key => Object.hasOwn(policy, key)) ||
          !Array.isArray(policy.methods) || policy.methods.length < 1 || policy.methods.length > 32 ||
          new Set(policy.methods).size !== policy.methods.length ||
          policy.methods.some(name => typeof name !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name) ||
            ['constructor', 'prototype', '__proto__'].includes(name)) ||
          !Number.isSafeInteger(policy.maxCalls) || policy.maxCalls < 0 || policy.maxCalls > 64 ||
          !Number.isSafeInteger(policy.maxArguments) || policy.maxArguments < 0 || policy.maxArguments > 64)
        fail('CODE_INVOCATION_UNQUALIFIED', 'Invalid bounded JavaScript factory contract');
      if (Object.hasOwn(policy, 'resultReferences')) {
        const references = policy.resultReferences;
        if (!object(references) || Object.keys(references).length !== 1 ||
            !Object.hasOwn(references, 'maxPathLength') ||
            !Number.isSafeInteger(references.maxPathLength) || references.maxPathLength < 0 || references.maxPathLength > 16)
          fail('CODE_INVOCATION_UNQUALIFIED', 'Invalid bounded result-reference policy');
      }
    }
    if (argumentsPresent || resultPresent) {
      const ceiling = argumentsPresent ? 64 : 65_536;
      if (current.type !== 'array' || !Number.isSafeInteger(current.maxItems) ||
          current.maxItems < 0 || current.maxItems > ceiling)
        fail('CODE_INVOCATION_UNQUALIFIED', 'JavaScript invocation requires an explicit bounded array schema');
    }
    // Visit schema positions only. const/enum/examples and property names
    // remain ordinary instance data, even when they contain reserved words.
    const add = child => pending.push({ schema: child, root: false });
    for (const key of ['additionalProperties', 'unevaluatedProperties', 'unevaluatedItems',
      'contains', 'propertyNames', 'not', 'if', 'then', 'else', 'additionalItems'])
      if (Object.hasOwn(current, key)) add(current[key]);
    if (Object.hasOwn(current, 'items')) {
      if (Array.isArray(current.items)) current.items.forEach(add); else add(current.items);
    }
    for (const key of ['allOf', 'anyOf', 'oneOf', 'prefixItems'])
      if (Array.isArray(current[key])) current[key].forEach(add);
    for (const key of ['properties', 'patternProperties', '$defs', 'definitions', 'dependentSchemas'])
      if (object(current[key])) Object.values(current[key]).forEach(add);
  }
}


/**
 * @param {{codeWorkReadout: object, cases: object[]}} options A source reader's
 * exact original Code-work readout and *separately authored* behavioral cases.
 * Each case names an original requirement cell carried by its Code target.
 * @returns {object} Frozen candidate source/test files grouped by HLD owner.
 * @throws {TypeError} Before producing files on mismatched source, missing
 * normative coverage, unsupported carrier or fabricated Proof/Work standing.
 */
export function projectEngineeringDesignCode({ codeWorkReadout, cases } = {}) {
  if (!object(codeWorkReadout))
    fail("CODE_SOURCE_NOT_RECEIVED", "an original LLD Code readout is required");
  let readout, assays;
  try {
    readout = canonicalizeJson(codeWorkReadout, envelope).value;
    assays = canonicalizeJson(cases, envelope).value;
  } catch {
    fail("CODE_WORK_UNBOUNDED", "bounded inert JSON source targets and independent assay cases are required");
  }
  // NI syntax is not authentication of the Design: only its original owner
  // re-receives that source. Its semantic name must never become a byte digest.
  if (readout.type !== "EngineeringDesignCodeWorkReadout" ||
      readout.version !== 1 || !isNiUri(readout.designCarrierId) ||
      Object.hasOwn(readout, "designCarrierSha256") ||
      readout.codeSnapshotScope !== "supplied-target-views-only" ||
      readout.status !== "source-present-unassayed" ||
      !Array.isArray(readout.discrepancies) || readout.discrepancies.length !== 0 ||
      readout.originalDesignAdmitted !== false || readout.independentProof !== "unreceived" ||
      readout.executableWork !== false || readout.codeApplied !== false ||
      readout.beneficiaryReceived !== false ||
      !Array.isArray(readout.sourceCut) || readout.sourceCut.length !== 4 ||
      readout.sourceCut.some(source => !exact(source, ["kind", "digest"]) ||
        !sourceKinds.has(source.kind) || !SHA.test(source.digest)) ||
      new Set(readout.sourceCut.map(source => source.kind)).size !== 4 ||
      !sourceVerificationInventory(readout.sourceVerification)) {
    fail("CODE_SOURCE_NOT_RECEIVED", "a source-present original LLD Code readout is required, without fabricated Proof");
  }
  if (!Array.isArray(readout.targets) || readout.targets.length === 0 ||
      readout.targets.length > 64 ||
      !Array.isArray(assays) || assays.length === 0 || assays.length > 256) {
    fail("CODE_WORK_UNBOUNDED", "bounded source targets and independent JSON assay cases are required");
  }
  const byId = new Map(), owners = new Map();
  for (const target of readout.targets) {
    if (!object(target) || !OP_ID.test(target.operationId) ||
        !OP_ID.test(target.componentId) ||
        typeof target.originalComponentOwner !== "string" ||
        !target.originalComponentOwner.trim() || !targetPath(target.module) ||
        !EXPORT_NAME.test(target.exportName) ||
        target.sourceStatus !== "source-present-unassayed" ||
        !SHA.test(target.observedSha256) ||
        target.observedSha256 !== target.expectedSha256 ||
        !object(target.interface) ||
        ![true, false].includes(target.interface.inputSchema) && !object(target.interface.inputSchema) ||
        ![true, false].includes(target.interface.outputSchema) && !object(target.interface.outputSchema) ||
        !object(target.bindingObservation) ||
        !["observed", "unknown"].includes(target.bindingObservation.status) ||
        !Array.isArray(target.originalTrace) || target.originalTrace.length === 0 ||
        !object(target.testObligations) || target.testObligations.status !== "unreceived" ||
        !Array.isArray(target.testObligations.sourceVerification) ||
        byId.has(target.operationId) || target.module === reservedPath) {
      fail("CODE_TARGET_UNQUALIFIED", "every Code operation requires an exact source-bound target and unreceived normative obligations");
    }
    validateInvocationAnnotations(target.interface.inputSchema, 'input');
    validateInvocationAnnotations(target.interface.outputSchema, 'output');
    if (schemaAnnotation(target.interface.inputSchema, 'x-javascript-factory') &&
        schemaAnnotation(target.interface.outputSchema, 'x-javascript-result'))
      fail('CODE_INVOCATION_UNQUALIFIED', 'Factory sequences already produce ordered JSON observations');
    const traced = new Set();
    for (const trace of target.originalTrace) {
      if (!object(trace) || typeof trace.requirementCellId !== "string" ||
          !trace.requirementCellId || traced.has(trace.requirementCellId) ||
          !["held", "denied"].includes(trace.sourceTarget) ||
          !nonemptyStrings(trace.specificationClauseIds) ||
          !nonemptyStrings(trace.architectureModelIds)) {
        fail("CODE_TRACE_UNQUALIFIED", "every Code target must retain distinct original Requirement/Specification/Architecture trace");
      }
      traced.add(trace.requirementCellId);
    }
    const declarations = new Map();
    for (const row of target.testObligations.sourceVerification) {
      const trace = target.originalTrace.find(t => t.requirementCellId === row?.requirementCellId);
      const key = JSON.stringify([row?.requirementCellId, row?.specificationClauseId]);
      if (!exact(row, ["requirementCellId", "specificationClauseId", "test", "status"]) ||
          !trace?.specificationClauseIds.includes(row.specificationClauseId) ||
          declarations.has(key) ||
          !(row.status === "verification-test-not-declared" && row.test === null ||
            row.status === "declared-unverified" && typeof row.test === "string" && row.test.trim())) {
        fail("CODE_TRACE_UNQUALIFIED", "source-authored verification declarations must retain their original clauses and unverified standing");
      }
      declarations.set(key, row);
    }
    for (const trace of target.originalTrace) for (const clause of trace.specificationClauseIds) {
      if (!declarations.has(JSON.stringify([trace.requirementCellId, clause])))
        fail("CODE_TRACE_UNQUALIFIED", "an original clause's verification gap must not disappear from Code");
    }
    byId.set(target.operationId, target);
    const group = owners.get(target.originalComponentOwner) ?? [];
    group.push(target);
    owners.set(target.originalComponentOwner, group);
  }
  const names = new Set(), covered = new Map([...byId.keys()].map(id => [id, new Set()]));
  for (const item of assays) {
    if (!exact(item, ["operationId", "requirementCellId", "name", "input", "expectedOutput", "throws"]) ||
        !OP_ID.test(item.operationId) || !OP_ID.test(item.requirementCellId) ||
        typeof item.name !== "string" || !item.name.trim() ||
        item.name.length > 160 || /[\u0000-\u001f\u007f]/u.test(item.name) ||
        !byId.has(item.operationId) ||
        !byId.get(item.operationId).originalTrace.some(t => t.requirementCellId === item.requirementCellId) ||
        !(item.throws === null || ALLOWED_ERRORS.has(item.throws)) ||
        item.throws !== null && item.expectedOutput !== null) {
      fail("ASSAY_NOT_SOURCE_TRACED", "an assay must name an original Code operation, Requirement cell and exact output or error");
    }
    const key = JSON.stringify([item.operationId, item.name]);
    if (names.has(key)) fail("DUPLICATE_ASSAY", "independent Code assays must have distinct operation/name pairs");
    names.add(key); covered.get(item.operationId).add(item.requirementCellId);
  }
  for (const target of byId.values()) for (const trace of target.originalTrace) {
    if (!covered.get(target.operationId).has(trace.requirementCellId))
      fail("ASSAY_COVERAGE_INCOMPLETE", "Code must not manufacture acceptance for an unassayed original Requirement cell");
  }

  const projected = [];
  for (const [owner, group] of [...owners].sort(([a], [b]) => order(a, b))) {
    const targets = [...group].sort((a, b) => order(a.operationId, b.operationId));
    const entries = [], wrappers = [];
    const operations = Object.freeze(targets.map((target, index) => Object.freeze({
      ...target, checkedExport: "checkedOperation" + index,
      sourceSha256: target.observedSha256,
    })));
    const metadata = { kind: "engineering.code-source-contract-candidate.v1",
      originalComponentOwner: owner,
      designCarrierId: readout.designCarrierId,
      sourceCut: readout.sourceCut, codeSnapshotScope: readout.codeSnapshotScope,
      sourceVerification: readout.sourceVerification, operations,
      semanticProof: "unreceived", originalWorkAuthority: "unreceived",
      independentCustomerAcceptance: "unreceived" };
    targets.forEach((target, index) => {
      for (const side of ["input", "output"]) {
        // Invocation annotations are interpreted and checked by this Code owner,
        // not by SignCell's structural shape vocabulary. Preserve the authored
        // schema in source metadata; derive only its validation view here.
        const schema = Object.fromEntries(Object.entries(nodeSchema(target.interface[side + "Schema"]))
          .filter(([key]) => !["x-javascript-arguments", "x-javascript-result", "x-javascript-factory"].includes(key)));
        const $id = "https://schemas.561.group/engineering/unadmitted/" +
          niUriDigest(readout.designCarrierId) + "/" +
          encodeURIComponent(target.operationId) + "/" + side;
        entries.push({ exportName: "__" + side + "Schema" + index,
          typeName: (side === "input" ? "Input" : "Output") + index,
          runtimeName: "__" + side + "Type" + index,
          schema: { $id, title: target.operationId + " " + side,
            description: "Source-observed LLD candidate; semantic Proof unreceived",
            ...schema } });
      }
      const location = importLocation(reservedPath, target.module);
      const label = target.operationId;
      const symbol = "checkedOperation" + index;
      const positional = schemaAnnotation(target.interface.inputSchema, "x-javascript-arguments") === "positional";
      const observation = schemaAnnotation(target.interface.outputSchema, "x-javascript-result");
      const factoryPolicy = schemaAnnotation(target.interface.inputSchema, "x-javascript-factory");
      const factory = factoryPolicy ? renderFactoryInvocation(factoryPolicy) : null;
      const argumentCheck = factory ? [factory.prelude] : positional ? [
        "  if (!Array.isArray(input) || input.length > " + target.interface.inputSchema.maxItems + ") throw new TypeError(" +
          JSON.stringify("Design positional arguments disagreement: " + label) + ");",
      ] : [];
      const resultLines = factory ? [factory.body] : observation ? [
        "  const result = await implementation(" + (positional ? "...input" : "input") + ");",
        ...(observation === "map-entries" ? [
          "  let size, entries;",
          "  try {",
          "    size = Object.getOwnPropertyDescriptor(Map.prototype, \"size\").get.call(result);",
          "    entries = Map.prototype.entries.call(result);",
          "  } catch { throw new TypeError(" + JSON.stringify("Design Map result disagreement: " + label) + "); }",
          "  if (size > " + target.interface.outputSchema.maxItems + ") throw new RangeError(" +
            JSON.stringify("Design result bound exceeded: " + label) + ");",
          "  const output = Array.from(entries);",
        ] : [
          "  if (result == null || typeof result === \"string\" || typeof result[Symbol.iterator] !== \"function\") throw new TypeError(" +
            JSON.stringify("Design iterable result disagreement: " + label) + ");",
          "  const output = [];",
          "  for (const value of result) {",
          "    if (output.length === " + target.interface.outputSchema.maxItems + ") throw new RangeError(" +
            JSON.stringify("Design result bound exceeded: " + label) + ");",
          "    output.push(value);",
          "  }",
        ]),
      ] : ["  const output = await implementation(" + (positional ? "...input" : "input") + ");"];
      wrappers.push([
        "export async function " + symbol + "(input) {",
        ...argumentCheck,
        "  if (!admit(__inputType" + index + ", " + (factory ? "request" : "input") + ").ok) throw new TypeError(" +
          JSON.stringify("Design input disagreement: " + label) + ");",
        "  const location = new URL(" + JSON.stringify(location) + ", import.meta.url);",
        "  const bytes = await readFile(location);",
        "  const actual = \"sha256:\" + createHash(\"sha256\").update(bytes).digest(\"hex\");",
        "  if (actual !== " + JSON.stringify(target.observedSha256) + ") throw new Error(" +
          JSON.stringify("Design source revision disagreement: " + label) + ");",
        "  const module = await import(location.href + \"?source=\" + actual.slice(7));",
        "  const implementation = module[" + JSON.stringify(target.exportName) + "];",
        "  if (typeof implementation !== \"function\") throw new TypeError(" +
          JSON.stringify("Design export disagreement: " + label) + ");",
        ...resultLines,
        "  if (!admit(__outputType" + index + ", output).ok) throw new TypeError(" +
          JSON.stringify("Design output disagreement: " + label) + ");",
        "  return output;",
        "}",
      ].join("\n"));
    });
    let runtime;
    try {
      runtime = [
        "import { admit } from \"@red-cup-engineering/signcell/type-system\";",
        "import { readFile } from \"node:fs/promises\";",
        "import { createHash } from \"node:crypto\";",
        ...(targets.some(target => schemaAnnotation(target.interface.inputSchema, "x-javascript-factory"))
          ? ['import { canonicalizeJson as __factoryCanonicalize, JSON_RESOURCE_ENVELOPE as __factoryJsonBounds } from "@red-cup-engineering/json-engineering-services-section/canonical-json";',
            'import { isPromise as __factoryIsPromise } from "node:util/types";'] : []),
        ...(targets.some(target => schemaAnnotation(target.interface.inputSchema, "x-javascript-factory")?.resultReferences)
          ? ['import { isProxy as __factoryIsProxy } from "node:util/types";'] : []),
        renderJsonSchemaModule(entries, { format: "javascript",
          runtimeBinding: { name: "defineSchemaType",
            from: "@red-cup-engineering/signcell/type-system/schema-type" } }),
        // Keep metadata in its own lexical/schema scope. Its private type name
        // must not collide with a perfectly valid authored operation $defs key.
        "export const engineeringCodeSource = (() => {",
        renderJsonSchemaModule([{ exportName: "__engineeringCodeSourceSchema",
          typeName: "EngineeringCodeSource", schema: { const: metadata }, internal: true }],
        { format: "javascript" }),
        "  return __engineeringCodeSourceSchema.const;",
        "})();",
        ...wrappers,
        "",
      ].join("\n");
    } catch (error) {
      fail("SCHEMA_CODEGEN_REFUSED", "original runtime schema generator refused the LLD: " + error.message);
    }
    const tests = [
      "import test from \"node:test\";",
      "import assert from \"node:assert/strict\";",
      "import * as contracts from \"../" + reservedPath + "\";",
    ];
    const indexById = new Map(targets.map((t, i) => [t.operationId, i]));
    for (const c of [...assays].filter(c => indexById.has(c.operationId))
      .sort((a, b) => order(a.operationId, b.operationId) || order(a.name, b.name))) {
      const fn = "contracts.checkedOperation" + indexById.get(c.operationId);
      const title = c.operationId + ": " + c.requirementCellId + ": " + c.name;
      tests.push("test(" + JSON.stringify(title) + ", async () => {");
      if (c.throws === null) {
        tests.push("  assert.deepStrictEqual(await " + fn + "(" + jsonExpression(c.input) + "), " +
          jsonExpression(c.expectedOutput) + ");");
      } else {
        tests.push("  await assert.rejects(() => " + fn + "(" + jsonExpression(c.input) +
          "), { name: " + JSON.stringify(c.throws) + " });");
      }
      tests.push("});");
    }
    const files = [
      { path: reservedPath, text: runtime },
      { path: reservedTests, text: tests.join("\n") + "\n" },
    ].map(item => Object.freeze({ ...item, digest: sha(item.text) }));
    projected.push(Object.freeze({
      originalComponentOwner: owner,
      operations,
      files: Object.freeze(files),
    }));
  }
  return Object.freeze({
    type: "EngineeringDesignCodeCandidate", version: 1,
    originalDesignId: readout.designCarrierId,
    sourceCut: readout.sourceCut, codeSnapshotScope: readout.codeSnapshotScope,
    sourceVerification: readout.sourceVerification,
    status: "source-observed-code-projected", semanticProof: "unreceived",
    executableWork: false, codeApplied: false, beneficiaryReceived: false,
    independentAssayAuthority: "unverified-submitted-cases",
    packages: Object.freeze(projected),
  });
}
