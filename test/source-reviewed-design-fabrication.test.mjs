// Original Code-maker receiving of the upstream Specification Engineering
// HLD/LLD reader at one exact source cut. Synthetic records are unadmitted;
// structurally received candidates are not Stage Proof or effectful Work.
import test from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const originalRoot = process.env.SPEC_ARCHITECTURE_SOURCE_DIR;
const packed = process.env.CODE_PACKED_CONSUMER === '1';

async function providers() {
  assert.ok(originalRoot, 'original Specification checkout required for source receiving');
  const [{ planEngineeringDesign, receiveEngineeringDesign, readEngineeringCodeWork },
    { sourcesFixture, clausesSplitAcrossModels, sourceWithDeniedCondition },
    { renderJsonSchemaModule },
    { admit }, { projectEngineeringDesignCode }] = await Promise.all([
      import(pathToFileURL(join(originalRoot, 'src/engineering-design.mjs')).href),
      import(pathToFileURL(join(originalRoot, 'test/engineering-design-source-cut.fixture.mjs')).href),
      packed
        ? import('@red-cup-engineering/javascript-node-code-fabrication-services-section/transform-json-schema-to-typescript')
        : import('../scripts/transform-json-schema-to-typescript.mjs'),
      import('@red-cup-engineering/signcell/type-system'),
      packed
        ? import('@red-cup-engineering/javascript-node-code-fabrication-services-section/project-engineering-design-code')
        : import('../scripts/project-engineering-design-code.mjs'),
    ]);
  const ownerRequire = createRequire(pathToFileURL(join(originalRoot, 'package.json')));
  const { artifactId } = await import(pathToFileURL(ownerRequire.resolve(
    '@red-cup-engineering/semiotic-eavt-services-section/identity')).href);
  return { planEngineeringDesign, receiveEngineeringDesign,
    sourcesFixture, clausesSplitAcrossModels, sourceWithDeniedCondition, artifactId,
    renderJsonSchemaModule, admit,
    readEngineeringCodeWork, projectEngineeringDesignCode };
}

function highLevelDesign() {
  const component = id => ({
    id, owner: 'fixture-data-owner', layer: 'data',
    responsibility: 'Retain ' + id, dependencyIds: [],
    providedPorts: [], requiredPorts: [],
  });
  return {
    components: [component('comp-a'), component('comp-b')],
    connections: [],
    traceability: [
      { requirementCellId: 'source-req:a', specificationClauseIds: ['clause-a'],
        architectureModelIds: ['model-a'], designElementIds: ['comp-a'] },
      { requirementCellId: 'source-req:b', specificationClauseIds: ['clause-b'],
        architectureModelIds: ['model-b'], designElementIds: ['comp-b'] },
    ],
    openQuestions: [],
  };
}

function lowLevelDesign() {
  // The authored Design supplies validation contracts. The Code maker does
  // not choose payload requirements, derive user authority or invent behavior.
  const input = { type: 'object', additionalProperties: false,
    required: ['originalSource'], properties: {
      originalSource: { type: 'string', minLength: 1 },
    } };
  const output = { type: 'object', additionalProperties: false,
    required: ['retained'], properties: { retained: { const: true } } };
  const operation = (id, componentId) => ({
    id, componentId, module: 'src/' + id + '.mjs',
    exportName: id === 'op-a' ? 'retainA' : 'retainB',
    inputSchemaJson: JSON.stringify(input),
    outputSchemaJson: JSON.stringify(output),
    behavior: 'Retain original source ' + id,
    preconditions: [], postconditions: ['Original source remains attributable'],
    failureCases: ['Source unavailable'], resourceBounds: ['No unbounded allocations'],
    effectBoundaries: ['Pure candidate; effect not authorized'],
    acceptanceObligations: ['Independent source/design Proof required'],
  });
  return {
    operations: [operation('op-a', 'comp-a'), operation('op-b', 'comp-b')],
    traceability: [
      { requirementCellId: 'source-req:a', specificationClauseIds: ['clause-a'],
        architectureModelIds: ['model-a'], designElementIds: ['op-a'] },
      { requirementCellId: 'source-req:b', specificationClauseIds: ['clause-b'],
        architectureModelIds: ['model-b'], designElementIds: ['op-b'] },
    ],
    openQuestions: [],
  };
}

function originalCodeWork(p, sources = p.sourcesFixture(), design = lowLevelDesign()) {
  const highLevel = p.receiveEngineeringDesign({ stage: 'high-level', sources,
    plan: p.planEngineeringDesign({ stage: 'high-level', sources }),
    deliveryText: JSON.stringify(highLevelDesign()) });
  assert.equal(highLevel.type, 'EngineeringDesignCandidate');
  const lowSources = [...sources, { kind: 'high-level', text: JSON.stringify(highLevel) }];
  const originalPlan = p.planEngineeringDesign({ stage: 'low-level', sources: lowSources });
  const originalDeliveryText = JSON.stringify(design);
  const designCandidate = p.receiveEngineeringDesign({ stage: 'low-level', sources: lowSources,
    plan: originalPlan, deliveryText: originalDeliveryText });
  assert.equal(designCandidate.type, 'EngineeringDesignCandidate');
  const sourceViews = designCandidate.design.operations.map(operation => {
    const text = 'export function ' + operation.exportName + '() { return {retained:true}; }\n';
    return { owner: 'fixture-data-owner', path: operation.module, text,
      expectedSha256: 'sha256:' + createHash('sha256').update(text).digest('hex') };
  });
  const codeWorkReadout = p.readEngineeringCodeWork({
    designCandidate, originalPlan, originalDeliveryText, sourceViews });
  assert.equal(codeWorkReadout.status, 'source-present-unassayed');
  const cases = ['a', 'b'].map(id => ({ operationId: 'op-' + id,
    requirementCellId: 'source-req:' + id, name: 'independently-authored-' + id,
    input: { originalSource: 'fixture' }, expectedOutput: { retained: true }, throws: null }));
  return { codeWorkReadout, cases };
}

test('original HLD → LLD → generated runnable source-pinned schema types, without Proof promotion', {
  skip: !originalRoot && 'requires exact original Specification checkout',
}, async () => {
  const p = await providers();
  const sources = p.sourcesFixture();
  const hldPlan = p.planEngineeringDesign({ stage: 'high-level', sources });
  const highLevel = p.receiveEngineeringDesign({ stage: 'high-level', sources,
    plan: hldPlan, deliveryText: JSON.stringify(highLevelDesign()) });
  assert.equal(highLevel.type, 'EngineeringDesignCandidate');
  assert.equal(highLevel.admitted, false);
  assert.equal(highLevel.proof, 'unreceived');

  const lowSources = [...sources,
    { kind: 'high-level', text: JSON.stringify(highLevel) }];
  const lowPlan = p.planEngineeringDesign({ stage: 'low-level', sources: lowSources });
  const lowLevel = p.receiveEngineeringDesign({ stage: 'low-level', sources: lowSources,
    plan: lowPlan, deliveryText: JSON.stringify(lowLevelDesign()) });
  assert.equal(lowLevel.type, 'EngineeringDesignCandidate');
  assert.equal(lowLevel.admitted, false);
  assert.equal(lowLevel.proof, 'unreceived');
  assert.deepEqual(lowLevel.sources.slice(0, 3), highLevel.sources);

  // Fabricate actual executable SignCell runtime schema guards from the
  // original LLD's typed operation inputs/outputs, with an immutable original
  // candidate/source lineage. No operation bodies or Proof are fabricated.
  // SignCell's incumbent executable schema reader requires stable $id/title/
  // description. Derive defaults deterministically from the *entire* exact
  // source/design candidate, never from a new clock or fabricated authority.
  // Preserve any metadata explicitly authored in the LLD schema itself.
  const candidateDigest = createHash('sha256')
    .update(JSON.stringify(lowLevel), 'utf8').digest('hex');
  const runtimeSchema = (operation, side) => ({
    $id: 'https://schemas.example.test/unadmitted/' + candidateDigest + '/' +
      operation.id + '/' + side,
    title: 'Unadmitted ' + operation.id + ' ' + side,
    description: 'Source-derived ' + side + ' contract for ' +
      operation.module + '#' + operation.exportName +
      '; semantic Proof and Work admission not received',
    ...JSON.parse(side === 'input'
      ? operation.inputSchemaJson : operation.outputSchemaJson),
  });
  const entries = [
    { exportName: 'designSource', typeName: 'DesignSource',
      schema: { const: { highLevel, lowLevel } } },
    ...lowLevel.design.operations.flatMap((operation, i) => [
      { exportName: 'inputSchema' + i, typeName: 'Input' + i,
        runtimeName: 'inputType' + i, schema: runtimeSchema(operation, 'input') },
      { exportName: 'outputSchema' + i, typeName: 'Output' + i,
        runtimeName: 'outputType' + i, schema: runtimeSchema(operation, 'output') },
    ]),
  ];
  const binding = { name: 'defineSchemaType',
    from: import.meta.resolve('@red-cup-engineering/signcell/type-system/schema-type') };
  const render = () => p.renderJsonSchemaModule(entries,
    { format: 'javascript', runtimeBinding: binding });
  const javascript = render();
  assert.equal(javascript, render(), 'same exact source and Design must yield identical Code');
  const generated = await import('data:text/javascript;base64,' +
    Buffer.from(javascript).toString('base64'));
  assert.deepEqual(generated.designSource.const.highLevel, highLevel);
  assert.deepEqual(generated.designSource.const.lowLevel, lowLevel);
  assert.equal(Object.isFrozen(generated.designSource.const.lowLevel.design.operations[0]), true);
  assert.throws(() => {
    generated.designSource.const.lowLevel.proof = 'accepted';
  }, TypeError);
  assert.equal(p.admit(generated.inputType0, { originalSource: 'from buyer' }).ok, true);
  assert.equal(p.admit(generated.inputType0, { originalSource: '' }).ok, false);
  assert.equal(p.admit(generated.inputType0, { originalSource: 'a', extra: true }).ok, false);
  assert.equal(p.admit(generated.outputType0, { retained: true }).ok, true);
  assert.equal(p.admit(generated.outputType0, { retained: false }).ok, false);
  assert.equal(generated.designSource.const.lowLevel.proof, 'unreceived');
});

test('Code source-bound Design receiving rejects stale ancestry and HLD/LLD allocation drift', {
  skip: !originalRoot && 'requires exact original Specification checkout',
}, async () => {
  const p = await providers();
  const sources = p.sourcesFixture();
  const changedSources = structuredClone(sources);
  const changedRequirement = JSON.parse(changedSources[0].text);
  changedRequirement['met-when'][0].says = 'An independent buyer changed the source.';
  changedSources[0].text = JSON.stringify(changedRequirement);
  assert.throws(() => p.planEngineeringDesign({
    stage: 'high-level', sources: changedSources,
  }), TypeError, 'reusing a stale Specification/Architecture must refuse');

  const hldPlan = p.planEngineeringDesign({ stage: 'high-level', sources });
  const highLevel = p.receiveEngineeringDesign({
    stage: 'high-level', sources, plan: hldPlan,
    deliveryText: JSON.stringify(highLevelDesign()),
  });
  assert.equal(highLevel.type, 'EngineeringDesignCandidate');
  const lowSources = [...sources, { kind: 'high-level', text: JSON.stringify(highLevel) }];
  const lowPlan = p.planEngineeringDesign({ stage: 'low-level', sources: lowSources });
  const switched = lowLevelDesign();
  switched.traceability[0].architectureModelIds = ['model-a-alt'];
  assert.deepEqual(p.receiveEngineeringDesign({
    stage: 'low-level', sources: lowSources, plan: lowPlan,
    deliveryText: JSON.stringify(switched),
  }), { type: 'EngineeringDesignDerivationRefusal', reason: 'invalid-design' },
  'an individually valid model from a different HLD allocation must refuse');
});

test('Code cannot receive partially modeled specification clauses as valid Design', {
  skip: !originalRoot && 'requires exact original Specification checkout',
}, async () => {
  const p = await providers();
  const unmodeled = p.clausesSplitAcrossModels();
  assert.throws(() => p.planEngineeringDesign({
    stage: 'high-level', sources: unmodeled,
  }), TypeError, 'a normative clause without any source-authored model must refuse before inference');

  const sources = p.clausesSplitAcrossModels({ completeArchitecture: true });
  const plan = p.planEngineeringDesign({ stage: 'high-level', sources });
  const partial = highLevelDesign();
  partial.traceability[0].specificationClauseIds.push('clause-a2');
  assert.deepEqual(p.receiveEngineeringDesign({
    stage: 'high-level', sources, plan, deliveryText: JSON.stringify(partial),
  }), { type: 'EngineeringDesignDerivationRefusal', reason: 'invalid-design' },
  'one model that covers only clause-a cannot falsely receive clause-a2');
  partial.traceability[0].architectureModelIds.push('model-a2');
  const complete = p.receiveEngineeringDesign({
    stage: 'high-level', sources, plan, deliveryText: JSON.stringify(partial),
  });
  assert.equal(complete.type, 'EngineeringDesignCandidate');
  assert.equal(complete.admitted, false);
  assert.equal(complete.proof, 'unreceived');
});


test('Code receives only byte-materializable LLD module paths from the current Specification source', {
  skip: !originalRoot && 'requires exact original Specification checkout',
}, async () => {
  const p = await providers();
  const sources = p.sourcesFixture();
  const hldPlan = p.planEngineeringDesign({ stage: 'high-level', sources });
  const highLevel = p.receiveEngineeringDesign({
    stage: 'high-level', sources, plan: hldPlan,
    deliveryText: JSON.stringify(highLevelDesign()),
  });
  assert.equal(highLevel.type, 'EngineeringDesignCandidate');
  const lowSources = [...sources, { kind: 'high-level', text: JSON.stringify(highLevel) }];
  const lowPlan = p.planEngineeringDesign({ stage: 'low-level', sources: lowSources });

  // The actual upstream receiver—not a copied Code validation function—
  // must refuse names that cannot retain original filesystem byte identity.
  // Run these checks in both source tests and the separately installed package
  // consumer before ever rendering generated Code from an invalid candidate.
  const refusal = { type: 'EngineeringDesignDerivationRefusal', reason: 'invalid-design' };
  for (const [name, module] of [
    ['embedded NUL', 'src/op-' + String.fromCharCode(0) + '-a.mjs'],
    ['unpaired high surrogate', 'src/op-' + String.fromCharCode(0xD800) + '-a.mjs'],
    ['unpaired low surrogate', 'src/op-' + String.fromCharCode(0xDC00) + '-a.mjs'],
  ]) {
    const bad = lowLevelDesign();
    bad.operations[0].module = module;
    assert.deepEqual(p.receiveEngineeringDesign({
      stage: 'low-level', sources: lowSources, plan: lowPlan,
      deliveryText: JSON.stringify(bad),
    }), refusal, name + ' must refuse before Code generation');
  }

  // A valid astral Unicode scalar is NOT refused as a supposed byte hazard.
  // Preserve that exact authored path into the incumbent executable Code
  // maker; do not normalize, replace or invent a path independently.
  const valid = lowLevelDesign();
  valid.operations[0].module = 'src/op-🧵-a.mjs';
  const received = p.receiveEngineeringDesign({
    stage: 'low-level', sources: lowSources, plan: lowPlan,
    deliveryText: JSON.stringify(valid),
  });
  assert.equal(received.type, 'EngineeringDesignCandidate');
  assert.equal(received.admitted, false);
  assert.equal(received.proof, 'unreceived');
  const emitted = p.renderJsonSchemaModule([
    { exportName: 'modulePath', typeName: 'ModulePath',
      schema: { const: received.design.operations[0].module } },
  ], {
    format: 'javascript',
    runtimeBinding: { name: 'defineSchemaType',
      from: import.meta.resolve('@red-cup-engineering/signcell/type-system/schema-type') },
  });
  const executable = await import('data:text/javascript;base64,' +
    Buffer.from(emitted).toString('base64'));
  assert.equal(executable.modulePath.const, 'src/op-🧵-a.mjs');
});


test('the ORIGINAL Requirement → Specification → Architecture → HLD → LLD produces executable source-checked Code, detects disagreement and receives a corrected revision', {
  skip: !originalRoot && 'requires exact original Specification/Code source owner',
}, async t => {
  const p = await providers(), sources = p.sourcesFixture();
  const hldPlan = p.planEngineeringDesign({stage:'high-level', sources});
  const highLevel = p.receiveEngineeringDesign({
    stage:'high-level', sources, plan:hldPlan,
    deliveryText:JSON.stringify(highLevelDesign()),
  });
  assert.equal(highLevel.type,'EngineeringDesignCandidate');
  const lowSources = [...sources,{kind:'high-level',text:JSON.stringify(highLevel)}];
  const lowPlan = p.planEngineeringDesign({stage:'low-level',sources:lowSources});
  const designText=JSON.stringify(lowLevelDesign());
  const lowLevel = p.receiveEngineeringDesign({
    stage:'low-level',sources:lowSources,plan:lowPlan,deliveryText:designText,
  });
  assert.equal(lowLevel.type,'EngineeringDesignCandidate');

  const goodA='export function retainA(value) { return {retained:true}; }\n';
  const badA='export function retainA(value) { return {retained:false}; }\n';
  const goodB='export async function retainB(value) { return {retained:true}; }\n';
  const digest = text => 'sha256:'+createHash('sha256').update(text,'utf8').digest('hex');
  const selected=(a=goodA,b=goodB,expectedA=digest(a)) => p.readEngineeringCodeWork({
    designCandidate:lowLevel,originalPlan:lowPlan,originalDeliveryText:designText,
    sourceViews:[
      {owner:'fixture-data-owner',path:'src/op-a.mjs',text:a,expectedSha256:expectedA},
      {owner:'fixture-data-owner',path:'src/op-b.mjs',text:b,expectedSha256:digest(b)},
    ],
  });
  const cases=[
    {operationId:'op-a', requirementCellId:'source-req:a',name:'retains-source-a',
      input:{originalSource:'owned-source'},expectedOutput:{retained:true},throws:null},
    {operationId:'op-a', requirementCellId:'source-req:a',name:'rejects-invalid-input-a',
      input:{originalSource:''},expectedOutput:null,throws:'TypeError'},
    {operationId:'op-b', requirementCellId:'source-req:b',name:'retains-source-b',
      input:{originalSource:'another-source'},expectedOutput:{retained:true},throws:null},
    {operationId:'op-b', requirementCellId:'source-req:b',name:'rejects-invalid-input-b',
      input:{originalSource:''},expectedOutput:null,throws:'TypeError'},
  ];
  const receive = (a=goodA,b=goodB,expectedA=digest(a)) =>
    p.projectEngineeringDesignCode({codeWorkReadout:selected(a,b,expectedA),cases});
  const initial=receive();
  const original=selected();
  assert.equal(initial.type,'EngineeringDesignCodeCandidate');
  assert.equal(initial.originalDesignId,original.designCarrierId);
  assert.match(initial.originalDesignId,/^ni:\/\/\/sha-256;/u);
  assert.equal(Object.hasOwn(initial,'originalDesignSha256'),false);
  assert.deepEqual(initial.sourceCut,original.sourceCut);
  assert.equal(initial.codeSnapshotScope,original.codeSnapshotScope);
  assert.deepEqual(initial.sourceVerification,original.sourceVerification);
  assert.equal(initial.status,'source-observed-code-projected');
  assert.equal(initial.semanticProof,'unreceived');
  assert.equal(initial.executableWork,false);
  assert.equal(initial.codeApplied,false);
  assert.equal(initial.beneficiaryReceived,false);
  assert.equal(initial.independentAssayAuthority,'unverified-submitted-cases');
  assert.equal(initial.packages.length,1,'same original HLD source owner gets one Code package');
  assert.deepEqual(initial.packages[0].operations.map(x=>x.operationId),['op-a','op-b']);
  assert.equal(initial.packages[0].files.length,2);
  assert.equal(JSON.stringify(initial),JSON.stringify(receive()),
    'unchanged source/LLD and submitted assays must produce identical Code');

  const workspace=await mkdtemp(join(process.cwd(),'.generated-design-operation-'));
  t.after(()=>rm(workspace,{recursive:true,force:true}));
  await mkdir(join(workspace,'src'),{recursive:true});
  await mkdir(join(workspace,'test'),{recursive:true});
  const writeProjection=async (projection,sourceA=goodA,sourceB=goodB) => {
    await writeFile(join(workspace,'src/op-a.mjs'),sourceA,'utf8');
    await writeFile(join(workspace,'src/op-b.mjs'),sourceB,'utf8');
    for(const file of projection.packages[0].files)
      await writeFile(join(workspace,file.path),file.text,'utf8');
  };
  const run=()=>{
    const env={...process.env};delete env.NODE_TEST_CONTEXT;
    const result=spawnSync(process.execPath,[
      '--test','--test-reporter=tap','test/engineering-code-contracts.test.mjs'
    ],{cwd:workspace,env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
    assert.equal(result.error,undefined,'native generated tests must actually execute');
    return result;
  };

  await writeProjection(initial);
  const generated=await import(pathToFileURL(join(workspace,
    'src/engineering-code-contracts.mjs')).href);
  const metadata=generated.engineeringCodeSource;
  assert.equal(metadata.designCarrierId,original.designCarrierId);
  assert.equal(Object.hasOwn(metadata,'designCarrierSha256'),false);
  assert.deepEqual(metadata.sourceCut,original.sourceCut);
  assert.equal(metadata.codeSnapshotScope,original.codeSnapshotScope);
  assert.deepEqual(metadata.sourceVerification,original.sourceVerification);
  assert.deepEqual(metadata.operations,initial.packages[0].operations);
  assert.throws(()=>{metadata.operations[0].originalTrace[0].sourceTarget='denied';},TypeError);
  assert.throws(()=>{metadata.sourceVerification.missingClauseIds.length=0;},TypeError);
  assert.throws(()=>{metadata.operations[0].testObligations.status='received';},TypeError);
  const passing=run();
  assert.equal(passing.status,0,passing.stdout+'\n'+passing.stderr);
  assert.match(passing.stdout,/# pass 4\b/u,'all original independent cases executed');

  // The old Code candidate must not execute a materially changed source.
  await writeFile(join(workspace,'src/op-a.mjs'),badA,'utf8');
  const stale=run();
  assert.notEqual(stale.status,0,'source mutation must refute the old Code artifact');
  assert.match(stale.stdout,/Design source revision disagreement: op-a/u);
  // Re-receiving the same LLD against changed source bytes produces a new
  // executable Code candidate, but the behavioral contract itself still
  // detects the wrong implementation output. No self-awarded Proof.
  const incorrect=receive(badA);
  assert.notEqual(incorrect.packages[0].files[0].digest,
    initial.packages[0].files[0].digest);
  await writeProjection(incorrect,badA);
  const failing=run();
  assert.notEqual(failing.status,0);
  assert.match(failing.stdout,/Design output disagreement: op-a/u);

  // Repair the actual implementation source and re-project from current
  // owned bytes; the *same* independently authored assays must all pass.
  const repaired=receive(goodA);
  await writeProjection(repaired,goodA);
  const received=run();
  assert.equal(received.status,0,received.stdout+'\n'+received.stderr);
  assert.match(received.stdout,/# pass 4\b/u);
  assert.equal(repaired.semanticProof,'unreceived',
    'a passing Code test is not the distinct Engineering Stage Proof');

  const staleView=selected(badA,goodB,digest(goodA));
  assert.equal(staleView.status,'source-disagreement');
  assert.throws(()=>p.projectEngineeringDesignCode({codeWorkReadout:staleView,cases}),
    {code:'CODE_SOURCE_NOT_RECEIVED'});
  assert.throws(()=>p.projectEngineeringDesignCode({
    codeWorkReadout:{...selected(),independentProof:'received'},cases,
  }),{code:'CODE_SOURCE_NOT_RECEIVED'},'caller cannot invent Stage Proof');
  assert.throws(()=>p.projectEngineeringDesignCode({
    codeWorkReadout:selected(),cases:cases.filter(c=>c.operationId==='op-a'),
  }),{code:'ASSAY_COVERAGE_INCOMPLETE'},'a requirement cell without tests is not accepted');
});

test('native semantic Design identity carries required and prohibited conditions and the original verification inventory into Code', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async () => {
  const p=await providers();
  for (const declared of [0,1,2]) {
    const sources=p.sourceWithDeniedCondition();
    const specification=JSON.parse(sources[1].text);
    for (let index=0;index<declared;index++)
      specification.topics[0].clauses[index].test='node --test test/original-'+index+'.test.mjs';
    sources[1].text=JSON.stringify(specification);
    const architecture=JSON.parse(sources[2].text);
    architecture.sources.find(row=>row.id==='specification').revision=p.artifactId(specification);
    sources[2].text=JSON.stringify(architecture);
    const input=originalCodeWork(p,sources), original=input.codeWorkReadout;
    const candidate=p.projectEngineeringDesignCode(input);
    assert.equal(candidate.originalDesignId,original.designCarrierId);
    assert.deepEqual(candidate.sourceVerification,original.sourceVerification);
    assert.equal(candidate.sourceVerification.clauseCount,2,
      'source clauses are counted by their original owner, not by Code operations');
    assert.equal(candidate.sourceVerification.declaredTestCount,declared);
    assert.deepEqual(candidate.sourceVerification.missingClauseIds,['clause-a','clause-b'].slice(declared));
    const operations=candidate.packages[0].operations;
    assert.deepEqual(operations.map(row=>row.originalTrace[0].sourceTarget),['held','denied']);
    for (let index=0;index<operations.length;index++) {
      assert.deepEqual(operations[index].testObligations,original.targets[index].testObligations);
      assert.deepEqual(operations[index].bindingObservation,original.targets[index].bindingObservation);
      assert.equal(operations[index].testObligations.status,'unreceived');
    }
    assert.equal(candidate.semanticProof,'unreceived');
    assert.equal(candidate.codeApplied,false);
    assert.equal(candidate.beneficiaryReceived,false);
  }
});

test('projection takes immutable JSON snapshots without freezing or retaining a mutable caller source', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async () => {
  const p=await providers(), input=structuredClone(originalCodeWork(p));
  const candidate=p.projectEngineeringDesignCode(input);
  const before=JSON.stringify(candidate);
  input.codeWorkReadout.sourceCut[0].digest='sha256:'+'0'.repeat(64);
  input.codeWorkReadout.sourceVerification.missingClauseIds.length=0;
  input.codeWorkReadout.targets[0].originalTrace[0].sourceTarget='denied';
  input.codeWorkReadout.targets[0].bindingObservation.status='contested';
  input.codeWorkReadout.targets[0].testObligations.sourceVerification[0].status='received';
  input.cases[0].expectedOutput.retained=false;
  assert.equal(JSON.stringify(candidate),before,'later worker changes cannot rewrite projected evidence');
  assert.throws(()=>{candidate.packages[0].operations[0].originalTrace[0].sourceTarget='denied';},TypeError);
  assert.throws(()=>{candidate.packages[0].operations[0].bindingObservation.status='contested';},TypeError);
  assert.throws(()=>{candidate.packages[0].operations[0].testObligations.sourceVerification.length=0;},TypeError);
  assert.throws(()=>{candidate.sourceCut[0].digest='changed';},TypeError);
  const reverseKeys=value=>Array.isArray(value)?value.map(reverseKeys):
    value!==null&&typeof value==='object'
      ?Object.fromEntries(Object.entries(value).reverse().map(([key,child])=>[key,reverseKeys(child)])):value;
  const original=originalCodeWork(p);
  assert.deepEqual(p.projectEngineeringDesignCode(original),
    p.projectEngineeringDesignCode(reverseKeys(original)),
    'property insertion order is not a new semantic source revision or Code change');
});

test('legacy byte-shaped Design IDs, dropped polarity and manufactured verification standing refuse before Code generation', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async () => {
  const p=await providers(), original=originalCodeWork(p);
  const reject=(change,code)=>{
    const input=structuredClone(original);change(input.codeWorkReadout);
    assert.throws(()=>p.projectEngineeringDesignCode(input),{code});
  };
  reject(row=>{row.designCarrierSha256='sha256:'+'0'.repeat(64);delete row.designCarrierId;},'CODE_SOURCE_NOT_RECEIVED');
  reject(row=>{row.designCarrierId=row.designCarrierId.slice(0,-1)+'B';},'CODE_SOURCE_NOT_RECEIVED');
  reject(row=>{delete row.targets[0].originalTrace[0].sourceTarget;},'CODE_TRACE_UNQUALIFIED');
  reject(row=>{row.targets[0].testObligations.sourceVerification=[];},'CODE_TRACE_UNQUALIFIED');
  reject(row=>{row.targets[0].testObligations.sourceVerification[0].status='passed';},'CODE_TRACE_UNQUALIFIED');
  reject(row=>{row.sourceVerification.status='passed';},'CODE_SOURCE_NOT_RECEIVED');
  reject(row=>{row.targets[0].bindingObservation.status='contested';},'CODE_TARGET_UNQUALIFIED');
});

test('JSON owner refuses lossy and executable source carriers before projection reads them', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async () => {
  const p=await providers(), original=originalCodeWork(p);
  for (const value of [NaN,undefined,()=>true,1n]) {
    const input=structuredClone(original);input.cases[0].input=value;
    assert.throws(()=>p.projectEngineeringDesignCode(input),{code:'CODE_WORK_UNBOUNDED'});
  }
  const input=structuredClone(original);let invoked=false;
  Object.defineProperty(input.codeWorkReadout,'sourceVerification',{
    enumerable:true,get(){invoked=true;throw new Error('source accessor must stay inert');},
  });
  assert.throws(()=>p.projectEngineeringDesignCode(input),{code:'CODE_WORK_UNBOUNDED'});
  assert.equal(invoked,false);
});

test('generated metadata cannot reserve an original operation schema definition name', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers(), design=lowLevelDesign();
  const schema=JSON.parse(design.operations[0].inputSchemaJson);
  schema.$defs={EngineeringCodeSource:schema.properties.originalSource};
  schema.properties.originalSource={$ref:'#/$defs/EngineeringCodeSource'};
  design.operations[0].inputSchemaJson=JSON.stringify(schema);
  const original=originalCodeWork(p,p.sourcesFixture(),design);
  const candidate=p.projectEngineeringDesignCode(original);
  const workspace=await mkdtemp(join(process.cwd(),'.generated-metadata-scope-'));
  t.after(()=>rm(workspace,{recursive:true,force:true}));
  const file=join(workspace,'contracts.mjs');
  await writeFile(file,candidate.packages[0].files[0].text,'utf8');
  const generated=await import(pathToFileURL(file).href);
  assert.equal(generated.engineeringCodeSource.designCarrierId,original.codeWorkReadout.designCarrierId);
  assert.equal(p.admit(generated.__inputType0,{originalSource:'source-owned'}).ok,true);
  assert.equal(p.admit(generated.__inputType0,{originalSource:''}).ok,false);
  assert.deepEqual(generated.__inputSchema0.$defs,schema.$defs);
});
