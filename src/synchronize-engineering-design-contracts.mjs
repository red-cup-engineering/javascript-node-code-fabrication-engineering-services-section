import { sha256Digest } from "@red-cup-engineering/semiotic-content-address-system";
import { deepStrictEqual } from 'node:assert';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { writeTextAtomically } from '@red-cup-engineering/computer-file-engineering-services-section/atomic-text';
import { readEngineeringCodeWork } from '@red-cup-engineering/engineering-content-engineering-services-section/engineering-design';
import {
  renderSpecificationMarkdown, validateSpecificationRecord,
} from '@red-cup-engineering/engineering-content-engineering-services-section/specification';
import { projectEngineeringDesignCode } from '../scripts/project-engineering-design-code.mjs';

function inside(root, path) {
  const rel = relative(root, path);
  if (rel && !isAbsolute(rel) && rel !== '..' && !rel.startsWith('..' + sep)) return path;
  throw new Error(`Design file escapes its owning package: ${path}`);
}

/**
 * Reproduce one package's source-bound contract, acceptance cases and readable specification.
 * Titles with independent executable oracles can retain those tests via generateTests.
 * Checking returns the stale package-relative paths and leaves the checkout untouched.
 */
export async function synchronizeEngineeringDesignContracts({
  root, carrier, designFile = carrier, generateTests = true, check = false,
  readDesign = readEngineeringCodeWork, projectCode = projectEngineeringDesignCode,
}) {
  if (isAbsolute(designFile)) throw new TypeError('The design file path must be package-relative');
  root = await realpath(root);
  const designPath = inside(root, await realpath(resolve(root, designFile)));
  const design = JSON.parse(await readFile(designPath, 'utf8'));
  for (const kind of ['requirement', 'specification', 'architecture']) {
    const source = design.plan.sources.find(source => source.kind === kind);
    if (!source) throw new TypeError(`Design plan lacks its ${kind} source`);
    deepStrictEqual(design[kind], JSON.parse(source.text), `Rebuild the design record after changing its ${kind}`);
  }
  const validation = validateSpecificationRecord(design.specification);
  if (!validation.valid) throw new TypeError(JSON.stringify(validation.issues));
  const { seat: owner, carrier: path } = design.specification.identity;
  const text = await readFile(inside(root, await realpath(resolve(root, path))), 'utf8');
  const codeWorkReadout = readDesign({
    designCandidate: design.low, originalPlan: design.plan, originalDeliveryText: design.delivery,
    sourceViews: [{ owner, path, text, expectedSha256: sha256Digest(text) }],
  });
  if (codeWorkReadout.status !== 'source-present-unassayed') throw new Error(JSON.stringify(codeWorkReadout));
  const { packages } = projectCode({ codeWorkReadout, cases: design.cases });
  if (packages.length !== 1 || packages[0].originalComponentOwner !== owner) {
    throw new Error(`Expected the generated contract for ${owner}`);
  }

  const files = packages[0].files.filter(file => generateTests || file.path === 'src/engineering-code-contracts.mjs');
  if (!files.some(file => file.path === 'src/engineering-code-contracts.mjs')) throw new Error('Missing generated contract module');
  const specPath = designFile.replace(/(?:-design)?\.json$/u, '.md');
  if (specPath === designFile) throw new TypeError('The design file path must name a JSON file');
  files.push({ path: specPath, text: renderSpecificationMarkdown(design.specification) },
    { path: designFile, text: JSON.stringify({ ...design, codeWorkReadout }, null, 2) });
  const stale = [];
  for (const file of files) {
    const target = inside(root, resolve(root, file.path));
    // A new design may project tests into a directory that does not exist yet.
    // Inspect its existing ancestors before the atomic file writer creates it.
    for (let dir = dirname(target); dir !== root; dir = dirname(dir)) {
      try {
        if (!(await lstat(dir)).isDirectory()) throw new Error(`Redirected output directory: ${file.path}`);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    let previous;
    try {
      if (!(await lstat(target)).isFile()) throw new Error(`Expected a regular output file: ${file.path}`);
      previous = await readFile(target, 'utf8');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (previous !== file.text) stale.push(file);
  }
  if (!check) for (const file of stale) await writeTextAtomically(join(root, file.path), file.text);
  return stale.map(file => file.path);
}
