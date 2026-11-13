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
        ? import('@red-cup-engineering/javascript-node-code-fabrication-engineering-services-section/transform-json-schema-to-typescript')
        : import('../scripts/transform-json-schema-to-typescript.mjs'),
      import('@red-cup-engineering/signcell/type-system'),
      packed
        ? import('@red-cup-engineering/javascript-node-code-fabrication-engineering-services-section/project-engineering-design-code')
        : import('../scripts/project-engineering-design-code.mjs'),
    ]);
  const ownerRequire = createRequire(pathToFileURL(join(originalRoot, 'package.json')));
  const { artifactId } = await import(pathToFileURL(ownerRequire.resolve(
    '@red-cup-engineering/semiotic-eavt-engineering-services-section/identity')).href);
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

test('generated assays preserve JSON own keys in input, expected output and refusal cases', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p = await providers(), sources = p.sourcesFixture();
  const highLevel = p.receiveEngineeringDesign({ stage: 'high-level', sources,
    plan: p.planEngineeringDesign({ stage: 'high-level', sources }),
    deliveryText: JSON.stringify(highLevelDesign()) });
  const lowSources = [...sources, { kind: 'high-level', text: JSON.stringify(highLevel) }];
  const design = lowLevelDesign();
  for (const op of design.operations) {
    op.inputSchemaJson = JSON.stringify({ type: 'object' });
    op.outputSchemaJson = JSON.stringify({ type: 'object' });
  }
  const originalPlan = p.planEngineeringDesign({ stage: 'low-level', sources: lowSources });
  const originalDeliveryText = JSON.stringify(design);
  const designCandidate = p.receiveEngineeringDesign({ stage: 'low-level', sources: lowSources,
    plan: originalPlan, deliveryText: originalDeliveryText });
  const implementations = [
    'export function retainA(value) { return JSON.parse(JSON.stringify(value)); }\n',
    'export function retainB(value) { if (Object.hasOwn(value, "__proto__")) throw new RangeError("own key"); return {}; }\n',
  ];
  const sourceViews = design.operations.map((op, index) => ({ owner: 'fixture-data-owner',
    path: op.module, text: implementations[index],
    expectedSha256: 'sha256:' + createHash('sha256').update(implementations[index]).digest('hex') }));
  const payload = JSON.parse('{"__proto__":{"webgpu":true},"nested":{"__proto__":{"marker":"own-data"}},"constructor":"data","prototype":"data","quotes":"\\\"\\\\\\n"}');
  const cases = [
    { operationId: 'op-a', requirementCellId: 'source-req:a', name: 'preserve-complete-json',
      input: payload, expectedOutput: payload, throws: null },
    { operationId: 'op-b', requirementCellId: 'source-req:b', name: 'preserve-refusal-input',
      input: payload, expectedOutput: null, throws: 'RangeError' },
  ];
  const codeWorkReadout = p.readEngineeringCodeWork({ designCandidate, originalPlan,
    originalDeliveryText, sourceViews });
  const candidate = p.projectEngineeringDesignCode({ codeWorkReadout, cases });
  assert.deepEqual(candidate, p.projectEngineeringDesignCode({ codeWorkReadout, cases }));
  const workspace = await mkdtemp(join(process.cwd(), '.generated-json-assay-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await mkdir(join(workspace, 'src'));
  await mkdir(join(workspace, 'test'));
  for (const view of sourceViews) await writeFile(join(workspace, view.path), view.text);
  for (const file of candidate.packages[0].files) await writeFile(join(workspace, file.path), file.text);
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap',
    'test/engineering-code-contracts.test.mjs'], { cwd: workspace, env,
    encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + '\n' + result.stderr);
  assert.match(result.stdout, /# pass 2\b/u);
});

function originalInvocationWork(p, contracts) {
  const sources = p.sourcesFixture();
  const high = p.receiveEngineeringDesign({ stage:'high-level',sources,
    plan:p.planEngineeringDesign({stage:'high-level',sources}),
    deliveryText:JSON.stringify(highLevelDesign()) });
  const lowSources = [...sources,{kind:'high-level',text:JSON.stringify(high)}];
  const design = lowLevelDesign();
  design.operations.forEach((op,i)=>{
    op.inputSchemaJson=JSON.stringify(contracts[i].inputSchema);
    op.outputSchemaJson=JSON.stringify(contracts[i].outputSchema);
  });
  const originalPlan=p.planEngineeringDesign({stage:'low-level',sources:lowSources});
  const originalDeliveryText=JSON.stringify(design);
  const candidate=p.receiveEngineeringDesign({stage:'low-level',sources:lowSources,
    plan:originalPlan,deliveryText:originalDeliveryText});
  assert.equal(candidate.type,'EngineeringDesignCandidate',JSON.stringify(candidate));
  const sourceViews=design.operations.map((op,i)=>({owner:'fixture-data-owner',
    path:op.module,text:contracts[i].source,
    expectedSha256:'sha256:'+createHash('sha256').update(contracts[i].source).digest('hex')}));
  const codeWorkReadout=p.readEngineeringCodeWork({designCandidate:candidate,originalPlan,
    originalDeliveryText,sourceViews});
  const cases=contracts.map((c,i)=>({operationId:'op-'+(i?'b':'a'),
    requirementCellId:'source-req:'+(i?'b':'a'),name:'original-invocation-case',
    input:c.input,expectedOutput:c.expectedOutput,throws:null}));
  return {codeWorkReadout,cases,sourceViews};
}
const positionalSchema = {type:'array',maxItems:2,'x-javascript-arguments':'positional'};
const iterableSchema = {type:'array',maxItems:3,'x-javascript-result':'iterable-values'};
const mapSchema = {type:'array',maxItems:2,'x-javascript-result':'map-entries'};
const factorySchema = {type:'object','x-javascript-factory':{
  methods:['current','add','refuse','empty','nil'],maxCalls:8,maxArguments:1,
}};

async function factoryFixture(t, p, source, schema=factorySchema, input={arguments:[2],calls:[]}) {
  const original=originalInvocationWork(p,[
    {inputSchema:schema,outputSchema:{type:'array'},source,input,expectedOutput:[]},
    {inputSchema:{},outputSchema:{},source:'export function retainB(x) { return x; }',input:null,expectedOutput:null},
  ]);
  const projection=p.projectEngineeringDesignCode(original);
  const workspace=await mkdtemp(join(process.cwd(),'.generated-factory-'));
  t.after(()=>rm(workspace,{recursive:true,force:true}));
  await mkdir(join(workspace,'src'));await mkdir(join(workspace,'test'));
  for(const file of [...original.sourceViews,...projection.packages[0].files])
    await writeFile(join(workspace,file.path),file.text);
  const generated=await import(pathToFileURL(join(workspace,'src/engineering-code-contracts.mjs')).href);
  return {run:generated.checkedOperation0,original,projection,workspace};
}

test('factory contracts generate isolated ordered method lifecycles and detached JSON observations', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers();
  const source='export function retainA(start=0) { return {value:{count:start}, current(){return this.value;}, async add(n=1){await Promise.resolve();this.value.count+=n;return this.value;}, refuse(){throw new RangeError("unchanged");}, empty(){}, nil(){return null;} }; }';
  const {run,original,projection,workspace}=await factoryFixture(t,p,source);
  const call=(method,args=[],captureError=false)=>({method,arguments:args,...(captureError?{captureError}: {})});
  const input={arguments:[2],calls:[call('current'),call('add',[3]),call('refuse',[],true),call('current'),call('empty'),call('nil')]};
  const expected=[{status:'returned',value:{count:2}},{status:'returned',value:{count:5}},
    {status:'threw',name:'RangeError',message:'unchanged'},{status:'returned',value:{count:5}},
    {status:'returned'},{status:'returned',value:null}];
  assert.deepEqual(await run(input),expected);
  assert.deepEqual(await Promise.all([run(input),run(input)]),[expected,expected]);
  assert.deepEqual(await run({arguments:[],calls:[call('add')]}),[{status:'returned',value:{count:1}}]);
  await assert.rejects(()=>run({arguments:[],calls:[call('refuse')]}),RangeError);
  original.cases[0]={...original.cases[0],input,expectedOutput:expected};
  const product=p.projectEngineeringDesignCode(original);
  assert.deepEqual(product,p.projectEngineeringDesignCode(original));
  for(const file of product.packages[0].files)await writeFile(join(workspace,file.path),file.text);
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const result=spawnSync(process.execPath,['--test','--test-reporter=tap','test/engineering-code-contracts.test.mjs'],{cwd:workspace,env,encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/# pass 2\b/u);
  assert.equal(projection.packages[0].operations[0].interface.inputSchema['x-javascript-factory'].maxCalls,8);
});

test('factory input, method access and observation boundaries refuse without hidden calls or getters', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers();
  const schema={type:'object','x-javascript-factory':{methods:['current'],maxCalls:2,maxArguments:1}};
  const source=`export function retainA(kind='plain') {
    globalThis.__factoryConstructed=(globalThis.__factoryConstructed??0)+1;
    if(kind==='factory-error')throw new SyntaxError('construction');
    if(kind==='null')return null;
    if(kind==='inherited')return Object.create({current(){return 1;}});
    if(kind==='accessor')return {get current(){globalThis.__factoryGetter=true;return ()=>1;}};
    if(kind==='instance-then-getter')return {get then(){globalThis.__factoryGetter=true;},current(){return 1;}};
    return {current(){
      if(kind==='nonjson')return new Map();
      if(kind==='cycle'){const x={};x.x=x;return x;}
      if(kind==='getter')return {get value(){globalThis.__factoryGetter=true;return 1;}};
      if(kind==='then-getter')return {get then(){globalThis.__factoryGetter=true;}};
      if(kind==='raw-error')throw 'source-error';
      if(kind==='large')return 'x'.repeat(1048577);
      if(kind==='error-message'){const e=new Error();Object.defineProperty(e,'message',{get(){globalThis.__factoryGetter=true;return 'bad';}});throw e;}
      return 1;
    }};
  }`;
  const {run}=await factoryFixture(t,p,source,schema);
  globalThis.__factoryConstructed=0;globalThis.__factoryGetter=false;
  for(const input of [null,{}, {arguments:[],calls:[],extra:true},
    {arguments:[1,2],calls:[]},{arguments:[],calls:Array(3).fill({method:'current',arguments:[]})},
    ...['constructor','__proto__','prototype','current.call','absent'].map(method=>({arguments:[],calls:[{method,arguments:[]}]})),
    {arguments:[],calls:[{method:'current',arguments:[],captureError:'yes'}]},
    {arguments:[],calls:[{method:'current',arguments:[1,2]}]},
  ]) await assert.rejects(()=>run(input),TypeError);
  const getter={get arguments(){globalThis.__factoryGetter=true;return [];},calls:[]};
  await assert.rejects(()=>run(getter),TypeError);
  assert.equal(globalThis.__factoryConstructed,0,'complete input preflight precedes construction');
  assert.equal(globalThis.__factoryGetter,false);
  const input=kind=>({arguments:[kind],calls:[{method:'current',arguments:[],captureError:true}]});
  for(const kind of ['null','inherited','accessor','nonjson','cycle','getter','then-getter','large'])
    await assert.rejects(()=>run(input(kind)),TypeError,kind);
  assert.deepEqual(await run(input('instance-then-getter')),[{status:'returned',value:1}]);
  await assert.rejects(()=>run(input('factory-error')),SyntaxError);
  await assert.rejects(()=>run(input('raw-error')),e=>e==='source-error');
  await assert.rejects(()=>run(input('error-message')),e=>e instanceof Error);
  assert.equal(globalThis.__factoryGetter,false,'method/error/value accessors remain inert');
  delete globalThis.__factoryGetter;delete globalThis.__factoryConstructed;
});

test('Code independently validates factory contracts and refuses collection observation combinations', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async () => {
  const p=await providers();
  for(const change of [{methods:[]},{methods:['constructor']},{maxCalls:65},{maxArguments:-1},{extra:true}, ...[null,{},[],{maxPathLength:-1},{maxPathLength:17},{maxPathLength:0.5},{maxPathLength:1,extra:true}].map(resultReferences=>({resultReferences}))]) {
    const input=structuredClone(originalCodeWork(p));
    input.codeWorkReadout.targets[0].interface.inputSchema={...factorySchema,'x-javascript-factory':{...factorySchema['x-javascript-factory'],...change}};
    assert.throws(()=>p.projectEngineeringDesignCode(input),{code:'CODE_INVOCATION_UNQUALIFIED'});
  }
  const input=structuredClone(originalCodeWork(p));
  input.codeWorkReadout.targets[0].interface.inputSchema=factorySchema;
  input.codeWorkReadout.targets[0].interface.outputSchema=mapSchema;
  assert.throws(()=>p.projectEngineeringDesignCode(input),{code:'CODE_INVOCATION_UNQUALIFIED'});
});

test('factory zero-call and cumulative JSON bounds remain distinct from source refusal capture', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers();
  const zero={type:'object','x-javascript-factory':{methods:['current'],maxCalls:0,maxArguments:0}};
  const empty=await factoryFixture(t,p,'export function retainA(){return {current(){return 1;}};}',zero,{arguments:[],calls:[]});
  assert.deepEqual(await empty.run({arguments:[],calls:[]}),[]);
  await assert.rejects(()=>empty.run({arguments:[],calls:[{method:'current',arguments:[]}]}),TypeError);
  const source='export function retainA(value){return {current(){return value;},add(n){n.changed=true;return n;}};}';
  const {run}=await factoryFixture(t,p,source);
  const value=JSON.parse('{"__proto__":{"own":true},"constructor":"data","prototype":"data"}');
  const request={arguments:[value],calls:[{method:'current',arguments:[]},{method:'add',arguments:[value]}]};
  const before=JSON.stringify(request),output=await run(request);
  assert.equal(JSON.stringify(request),before,'source method cannot mutate the caller request');
  assert.equal(Object.hasOwn(output[0].value,'__proto__'),true);
  assert.equal(Object.hasOwn(output[0].value,'changed'),false);
  assert.equal(output[1].value.changed,true);
  const large='x'.repeat(200000);
  await assert.rejects(()=>run({arguments:[large],calls:Array.from({length:6},()=>({method:'current',arguments:[],captureError:true}))}),
    /observation byte bound/,'aggregate observation failure is not a source-method error');
});

const referenceSchema={type:'object','x-javascript-factory':{
  methods:['make','same','mutate','echo','fail','empty','corrupt'],maxCalls:16,maxArguments:2,
  resultReferences:{maxPathLength:2},
}};
const ref=(argument,result,path=[])=>({argument,result,path});
const step=(method,args=[],references=[],captureError=false)=>({method,arguments:args,references,...(captureError?{captureError}:{})});
const referenceSource=`export function retainA() {
  globalThis.__referenceFactories=(globalThis.__referenceFactories??0)+1;
  return {
    make(n=0){return {count:n,nested:{value:n}};},
    same(a,b){return a===b;},
    mutate(value){value.count++;return value;},
    echo(value){return value;},
    fail(){throw new RangeError('source refusal');},empty(){},
    corrupt(value,kind){
      if(kind==='getter')Object.defineProperty(value,'nested',{enumerable:true,get(){globalThis.__referenceTrap=true;return {};}});
      if(kind==='prototype')Object.setPrototypeOf(value,{hidden:1});
      if(kind==='proxy')value.nested=new Proxy({value:1},{ownKeys(){globalThis.__referenceTrap=true;return ['value'];}});
      if(kind==='delete')delete value.nested;
      if(kind==='mutate-throw'){value.count++;throw new RangeError('after mutation');}
      return null;
    }
  };
}`;

test('declared result references preserve raw aliases without rewriting earlier observations or literal JSON', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers(),{run,original,workspace}=await factoryFixture(t,p,referenceSource,referenceSchema,{arguments:[],calls:[]});
  const marker={argument:0,result:0,path:['nested']};
  const input={arguments:[],calls:[
    step('make',[1]),step('echo',[marker]),step('same',[null,null],[ref(0,0),ref(1,0)]),
    step('make',[1]),step('same',[null,null],[ref(0,0),ref(1,3)]),
    step('mutate',[null],[ref(0,0)]),step('echo',[null],[ref(0,0,['nested','value'])]),
    step('echo',[null],[ref(0,0)]),
  ]};
  const returned=value=>({status:'returned',value});
  const expected=[returned({count:1,nested:{value:1}}),returned(marker),returned(true),
    returned({count:1,nested:{value:1}}),returned(false),returned({count:2,nested:{value:1}}),
    returned(1),returned({count:2,nested:{value:1}})];
  const before=JSON.stringify(input);
  assert.deepEqual(await run(input),expected);
  assert.equal(JSON.stringify(input),before);
  assert.deepEqual(await Promise.all([run(input),run(input)]),[expected,expected]);
  original.cases[0]={...original.cases[0],input,expectedOutput:expected};
  const projected=p.projectEngineeringDesignCode(original);
  assert.deepEqual(projected,p.projectEngineeringDesignCode(original));
  for(const file of projected.packages[0].files)await writeFile(join(workspace,file.path),file.text);
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const result=spawnSync(process.execPath,['--test','--test-reporter=tap','test/engineering-code-contracts.test.mjs'],{cwd:workspace,env,encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/# pass 2\b/u);
});

test('reference static admission precedes construction and never expands or silently overwrites arguments', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers(),{run}=await factoryFixture(t,p,referenceSource,referenceSchema,{arguments:[],calls:[]});
  globalThis.__referenceFactories=0;
  const invalid=[
    ...[-1,0.5,Number.MAX_SAFE_INTEGER+1,1,2].map(result=>[ref(0,result)]),
    [ref(1,0)],[ref(-1,0)],[ref(0.5,0)],[ref(0,0),ref(0,0)],
    ...[['constructor'],['__proto__'],['prototype'],['nested','value','extra'],[-1],[0.5],[''],['x'.repeat(129)]].map(path=>[ref(0,0,path)]),
    [{argument:0,result:0,path:[],extra:true}],
  ];
  for(const references of invalid)
    await assert.rejects(()=>run({arguments:[],calls:[step('make'),step('echo',[null],references,true)]}),TypeError);
  await assert.rejects(()=>run({arguments:[],calls:[step('make'),step('echo',['must-not-disappear'],[ref(0,0)],true)]}),TypeError);
  assert.equal(globalThis.__referenceFactories,0);
  // A current or future reference is refused even when it appears only later.
  await assert.rejects(()=>run({arguments:[],calls:[step('echo',[null],[ref(0,0)],true)]}),TypeError);
  assert.equal(globalThis.__referenceFactories,0);
  delete globalThis.__referenceFactories;
});

test('failed, void, missing and mutated active references refuse outside source-error capture', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers(),{run}=await factoryFixture(t,p,referenceSource,referenceSchema,{arguments:[],calls:[]});
  for(const first of [step('fail',[],[],true),step('empty')])
    await assert.rejects(()=>run({arguments:[],calls:[first,step('echo',[null],[ref(0,0)],true)]}),TypeError);
  for(const path of [['absent'],['toString'],['nested','toString'],['count','toString']])
    await assert.rejects(()=>run({arguments:[],calls:[step('make'),step('echo',[null],[ref(0,0,path)],true)]}),TypeError);
  for(const kind of ['getter','prototype','proxy','delete']) {
    globalThis.__referenceTrap=false;
    await assert.rejects(()=>run({arguments:[],calls:[step('make'),step('corrupt',[null,kind],[ref(0,0)]),step('echo',[null],[ref(0,0,['nested'])],true)]}),TypeError);
    assert.equal(globalThis.__referenceTrap,false,kind+' must not activate reflective traps');
  }
  assert.deepEqual(await run({arguments:[],calls:[step('make'),step('corrupt',[null,'mutate-throw'],[ref(0,0)],true),step('echo',[null],[ref(0,0)])]}),
    [{status:'returned',value:{count:0,nested:{value:0}}},{status:'threw',name:'RangeError',message:'after mutation'},
     {status:'returned',value:{count:1,nested:{value:0}}}], 'captured source errors do not promise rollback');
  assert.deepEqual(await run({arguments:[],calls:[step('echo',[[{n:7}]]),step('echo',[null],[ref(0,0,[0,'n'])])]}),
    [{status:'returned',value:[{n:7}]},{status:'returned',value:7}]);
  delete globalThis.__referenceTrap;
  for(const value of [0,false,null,[]])
    assert.deepEqual(await run({arguments:[],calls:[step('echo',[value]),step('echo',[null],[ref(0,0)])]}),
      [{status:'returned',value},{status:'returned',value}]);
  assert.deepEqual(await run({arguments:[],calls:[step('make'),step('fail',[],[],true),step('echo',[null],[ref(0,0,['count'])])]}),
    [{status:'returned',value:{count:0,nested:{value:0}}},{status:'threw',name:'RangeError',message:'source refusal'},{status:'returned',value:0}]);
  await assert.rejects(()=>run({arguments:[],calls:[step('echo',[null],[ref(0,0)])]}),TypeError,'no previous invocation result can leak');
});

test('original annotated LLD fabricates positional calls and bounded iterable and Map observations', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers();
  const sourceA='export function* retainA(count=0, value="default") { try { for(let i=0;i<count;i++) yield value; } finally { globalThis.__codeIteratorClosed = true; } }\n';
  const sourceB='export function retainB(first="default", second="tail") { return new Map([["first",first],["second",second]]); }\n';
  const input=originalInvocationWork(p,[
    {inputSchema:positionalSchema,outputSchema:iterableSchema,source:sourceA,input:[2,'x'],expectedOutput:['x','x']},
    {inputSchema:positionalSchema,outputSchema:mapSchema,source:sourceB,input:['x'],expectedOutput:[['first','x'],['second','tail']]},
  ]);
  const projection=p.projectEngineeringDesignCode(input);
  assert.deepEqual(projection,p.projectEngineeringDesignCode(input));
  const workspace=await mkdtemp(join(process.cwd(),'.generated-invocation-'));
  t.after(()=>rm(workspace,{recursive:true,force:true}));
  await mkdir(join(workspace,'src'));await mkdir(join(workspace,'test'));
  for(const file of [...input.sourceViews,...projection.packages[0].files])
    await writeFile(join(workspace,file.path),file.text);
  const generated=await import(pathToFileURL(join(workspace,'src/engineering-code-contracts.mjs')).href);
  assert.deepEqual(await generated.checkedOperation0([3,'limit']),['limit','limit','limit']);
  assert.deepEqual(await generated.checkedOperation0([]),[]);
  assert.deepEqual(await generated.checkedOperation1([]),[['first','default'],['second','tail']]);
  await assert.rejects(()=>generated.checkedOperation0({}),TypeError);
  await assert.rejects(()=>generated.checkedOperation0([1,2,3]),TypeError);
  globalThis.__codeIteratorClosed=false;
  await assert.rejects(()=>generated.checkedOperation0([4,'overflow']),RangeError);
  assert.equal(globalThis.__codeIteratorClosed,true,'overflow closes the generator');
  delete globalThis.__codeIteratorClosed;
  assert.equal(generated.engineeringCodeSource.operations[0].interface.inputSchema['x-javascript-arguments'],'positional');
  assert.equal(generated.engineeringCodeSource.operations[1].interface.outputSchema['x-javascript-result'],'map-entries');
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const run=spawnSync(process.execPath,['--test','--test-reporter=tap','test/engineering-code-contracts.test.mjs'],
    {cwd:workspace,env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(run.error,undefined);assert.equal(run.status,0,run.stdout+'\n'+run.stderr);
  assert.match(run.stdout,/# pass 2\b/u);
});

test('Code independently refuses forged invocation annotations before generating adapters', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async () => {
  const p=await providers();
  const original=originalCodeWork(p);
  for(const [side,schema] of [
    ['input',{...positionalSchema,maxItems:65}],
    ['input',{...positionalSchema,maxItems:-1}],
    ['input',{type:'array','x-javascript-arguments':'positional'}],
    ['input',{...positionalSchema,'x-javascript-arguments':'eval'}],
    ['input',mapSchema],['output',positionalSchema],
    ['output',{...mapSchema,maxItems:65537}],
    ['output',{...mapSchema,'x-javascript-result':'async-iterable'}],
    ['output',{type:'object',properties:{nested:mapSchema}}],
  ]) {
    const input=structuredClone(original);
    input.codeWorkReadout.targets[0].interface[side+'Schema']=schema;
    assert.throws(()=>p.projectEngineeringDesignCode(input),{code:'CODE_INVOCATION_UNQUALIFIED'});
  }
});

test('collection observations preserve errors and refuse overflow, fake Maps and asynchronous iterables', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers();
  const combinations=[
    {name:'zero-bound',a:'export function* retainA(count) { for(let i=0;i<count;i++) yield i; }',b:'export function retainB() { return new Map(); }',limit:0,input:0,output:[],errorInput:1,error:RangeError},
    {name:'iterator-error',a:'export function* retainA(count) { if(count) throw new SyntaxError("iteration"); }',b:'export function retainB() { return new Map(); }',limit:1,input:0,output:[],errorInput:1,error:SyntaxError},
    {name:'close-error',a:'export function* retainA(count) { if(count) { try { yield 1; yield 2; } finally { throw new SyntaxError("cleanup"); } } }',b:'export function retainB() { return new Map(); }',limit:1,input:0,output:[],errorInput:1,error:RangeError},
    {name:'async-only',a:'export function retainA(count) { return count ? {async *[Symbol.asyncIterator]() { yield 1; }} : []; }',b:'export function retainB() { return new Map(); }',limit:1,input:0,output:[],errorInput:1,error:TypeError},
    {name:'string-not-collection',a:'export function retainA(count) { return count ? "value" : []; }',b:'export function retainB() { return new Map(); }',limit:1,input:0,output:[],errorInput:1,error:TypeError},
  ];
  for(const c of combinations) {
    const work=originalInvocationWork(p,[
      {inputSchema:{type:'integer'},outputSchema:{...iterableSchema,maxItems:c.limit},source:c.a,input:c.input,expectedOutput:c.output},
      {inputSchema:{type:'integer'},outputSchema:{...mapSchema,maxItems:0},source:c.b,input:0,expectedOutput:[]},
    ]);
    const projection=p.projectEngineeringDesignCode(work);
    const directory=await mkdtemp(join(process.cwd(),'.collection-'+c.name+'-'));
    t.after(()=>rm(directory,{recursive:true,force:true}));
    await mkdir(join(directory,'src'));
    for(const file of [...work.sourceViews,projection.packages[0].files[0]])await writeFile(join(directory,file.path),file.text);
    const generated=await import(pathToFileURL(join(directory,'src/engineering-code-contracts.mjs')).href);
    assert.deepEqual(await generated.checkedOperation0(c.input),c.output);
    assert.deepEqual(await generated.checkedOperation1(0),[]);
    await assert.rejects(()=>generated.checkedOperation0(c.errorInput),c.error);
  }
  const work=originalInvocationWork(p,[
    {inputSchema:{type:'integer'},outputSchema:mapSchema,
      source:'export function retainA(mode) { if(mode===1) return {size:1,*entries(){yield ["a",1]}}; const map=new Map(mode===2 ? [["a",1],["b",2],["c",3]] : [["__proto__",7]]); map[Symbol.iterator]=()=>{throw new Error("custom iterator must not run")}; return map; }',input:0,expectedOutput:[['__proto__',7]]},
    {inputSchema:{type:'integer'},outputSchema:{...iterableSchema,items:{type:'integer'}},
      source:'export function* retainB(mode) { yield mode ? "wrong-type" : 1; }',input:0,expectedOutput:[1]},
  ]);
  const projection=p.projectEngineeringDesignCode(work);
  const directory=await mkdtemp(join(process.cwd(),'.map-observation-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));await mkdir(join(directory,'src'));
  for(const file of [...work.sourceViews,projection.packages[0].files[0]])await writeFile(join(directory,file.path),file.text);
  const generated=await import(pathToFileURL(join(directory,'src/engineering-code-contracts.mjs')).href);
  assert.deepEqual(await generated.checkedOperation0(0),[['__proto__',7]]);
  await assert.rejects(()=>generated.checkedOperation0(1),TypeError);
  await assert.rejects(()=>generated.checkedOperation0(2),RangeError);
  await assert.rejects(()=>generated.checkedOperation1(1),TypeError);
});

test('reference input, instances, returned values and thrown errors refuse Proxies without traps', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers();
  const source=`export function retainA(kind) {
    const proxy = value => new Proxy(value, {getPrototypeOf(){globalThis.__proxyTrap=true;return Object.prototype;},ownKeys(){globalThis.__proxyTrap=true;return [];},getOwnPropertyDescriptor(){globalThis.__proxyTrap=true;return undefined;}});
    if(kind==='instance')return proxy({echo(){return 1;}});
    return {echo(){if(kind==='error')throw proxy(new TypeError('refused'));return proxy({value:1});}};
  }`;
  const {run}=await factoryFixture(t,p,source,referenceSchema,{arguments:[],calls:[]});
  globalThis.__proxyTrap=false;
  const request={arguments:[],calls:[]};
  const proxy=new Proxy(request,{ownKeys(){globalThis.__proxyTrap=true;return [];},getPrototypeOf(){globalThis.__proxyTrap=true;return Object.prototype;}});
  await assert.rejects(()=>run(proxy));
  await assert.rejects(()=>run({arguments:[proxy],calls:[]}));
  for(const kind of ['instance','value','error'])
    await assert.rejects(()=>run({arguments:[kind],calls:[step('echo',[],[],true)]}));
  assert.equal(globalThis.__proxyTrap,false);
  delete globalThis.__proxyTrap;
});

test('reference inert preflight preserves JSON array budgets and refuses inherited pair-spine access', {
  skip: !originalRoot && 'requires exact original Specification owner',
}, async t => {
  const p=await providers();
  const source=`export function retainA() { return {echo(value){
    if(value==='sparse' || value==='empty-active') { const tail=new Array(value==='sparse' ? 1 : 0);Object.setPrototypeOf(tail,new Proxy({}, {get(){globalThis.__spineTrap=true;return 1;}}));return ['pair',1,tail]; }
    return value;
  }}; }`;
  const {run}=await factoryFixture(t,p,source,referenceSchema,{arguments:[],calls:[]});
  const value=Array.from({length:50000},()=>[]);
  assert.deepEqual(await run({arguments:[],calls:[step('echo',[value])]}),[{status:'returned',value}]);
  globalThis.__spineTrap=false;
  const tail=new Array(1);Object.setPrototypeOf(tail,{get 0(){globalThis.__spineTrap=true;return 'pair';}});
  await assert.rejects(()=>run({arguments:['pair',1,tail],calls:[]}),TypeError);
  await assert.rejects(()=>run({arguments:[],calls:[step('echo',['sparse'],[],true)]}),TypeError);
  await assert.rejects(()=>run({arguments:[],calls:[step('echo',['empty-active'],[],true)]}),TypeError);
  const empty=[];Object.setPrototypeOf(empty,{get 0(){globalThis.__spineTrap=true;return 'pair';}});
  await assert.rejects(()=>run({arguments:[],calls:[step('echo',[['pair',1,empty]])]}),TypeError);
  assert.equal(globalThis.__spineTrap,false);
  delete globalThis.__spineTrap;
});
