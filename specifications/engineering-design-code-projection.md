# Engineering Design to Code projection

Original Work: [Engineering #137](https://github.com/red-cup-engineering/engineering-services-section/issues/137)
and [Computer Code #74](https://github.com/red-cup-engineering/computer-code-engineering-services-section/issues/74).
This component implements the source/projection obligations of ENG-07, ENG-08,
ENG-18, ENG-21 and ENG-22. It does not settle the original Work or supply ENG-20
global compatibility evidence by merely projecting one Code target.

## Purpose and owner boundary

The Code maker must turn a current, source-present Specification-owned
`EngineeringDesignCodeWorkReadout` and separately authored behavioral cases into
reproducible candidate adapters and tests. Requirement, Specification,
Architecture, HLD and LLD interpretation remain owned by Specification's
`readEngineeringCodeWork`; Code does not reconstruct that derivation from an ID.
The machine guarantee is exact transport of that readout's identity, source
observations and normative obligations through candidate data and generated ESM.

The intended downstream outcome is that a Fabrication or MetroPlat consumer can
inspect what each operation must satisfy, what the source reader observed, and
which verification is still missing before selecting or executing any Code.
That outcome additionally requires the consumer's actual installed dependency,
operation discovery and receiving; exporting this function alone does not prove
downstream adoption.

## Input admission

The public operation remains `projectEngineeringDesignCode({codeWorkReadout,
cases})` at `./project-engineering-design-code`.

The original readout must be version 1, source-present-unassayed, with no source
discrepancies; it must retain `originalDesignAdmitted:false`, independent Proof
unreceived, and all execution/application/beneficiary flags false. Its semantic
`designCarrierId` must pass the URI owner's canonical NI admission. The obsolete
`designCarrierSha256` field is not accepted as an alias. NI syntax alone is no
proof that its named Design is available, authentic or accepted.

The source cut must retain one byte digest for each original Requirement,
Specification, Architecture and high-level source. Each Code target must retain
its component owner, materializable module path, named export, matching expected
and observed source-byte digests, authored input/output schemas, and distinct
Requirement/clause/model trace. Requirement polarity is `held` or `denied`;
`denied` is a legitimate desired condition, not evidence of failed admission.

Source binding observations may remain unknown when dependencies are outside
the supplied target views. Absent or contested bindings cannot be laundered into
an otherwise source-present target. All binding observations are syntax evidence,
not proof that an implementation satisfies its intention or complete import graph.

The original source-wide verification inventory must retain its counting scope,
clause count, declared count and missing clause IDs. Each target must carry an
unverified declaration or explicit undeclared-test gap for every traced clause.
Neither condition becomes executed evidence. Code does not recompute the original
clause inventory by counting operations; one original clause can feed several.

Cases must separately name an existing target and original Requirement cell,
with an expected output or supported thrown error, and cover every target's
traced Requirement cells. This is submitted test coverage, not independent
assurance authority or a substitute for the original source's verification plan.

Generated test inputs and expected outputs MUST preserve the admitted JSON
values exactly, including nested own `__proto__`, `constructor` and `prototype`
keys. Emit them as parsed, escaped JSON strings, never JavaScript object
literals whose `__proto__` spelling changes the object's prototype. The same
rule applies to inputs of expected-error cases. A successful generated assay
must test the submitted value, not a language-dependent reinterpretation of it.

The JSON owner admits detached immutable snapshots using its resource envelope:
at most 2 MiB of canonical JSON per readout/cases carrier, depth 64, 100,000
nodes, 4,096 members per object, 65,536 elements per array, and 1,024 UTF-8 bytes
per key. Strings are bounded by the same 2 MiB carrier maximum. Code additionally
limits targets to 64 and cases to 256. Accessors, cycles, sparse arrays, executable
values, non-finite numbers and malformed Unicode refuse through that owner.
Snapshotting must not freeze or mutate the caller's input.

## Preserved output relations

| Original source | Candidate | Generated `engineeringCodeSource` |
| --- | --- | --- |
| `designCarrierId` | `originalDesignId` | `designCarrierId` |
| `sourceCut` | `sourceCut` | `sourceCut` |
| `codeSnapshotScope` | same field | same field |
| `sourceVerification` | same complete inventory | same complete inventory |
| Target owner | package `originalComponentOwner` | same field |
| Complete original target | package `operations[]` | identical `operations[]` |

Each operation adds only its generated `checkedExport` name and byte-specific
`sourceSha256`; it retains the complete source-owned target, including original
trace/polarity, interface, binding observation and test obligations. Every nested
output value is immutable. Caller changes after projection cannot rewrite it.
Generated metadata uses the existing schema renderer's inert JSON parse and
recursive freezing, including exact own JSON keys.

Code files remain grouped by the actual HLD component owner, sorted by operation
identity. Canonical JSON member order and stable case ordering make equal source
data reproducible without replacing its original semantic name. A changed source
observation or obligation changes the generated bytes even if the Design name is
unchanged. The source reader remains responsible for naming changed Designs.

## Generated execution and authority

Adapters use the existing SignCell schema runtime to admit input and output,
verify the target module bytes immediately before loading, and require the
authored export to be callable. The host supplies the implementation module and
qualified execution environment. This is neither a race-proof filesystem loader
nor authentication of all transitive imports. The source reader explicitly limits
its observation to supplied target views.

The maker writes and executes no candidate files. Its return stays
`semanticProof:"unreceived"`, `executableWork:false`, `codeApplied:false`,
`beneficiaryReceived:false` and
`independentAssayAuthority:"unverified-submitted-cases"`. Generated metadata
retains unreceived semantic Proof, original Work authority and independent
customer acceptance. A successful native test cannot change these fields.

## Receiving

The existing native workflow selects the exact signed upstream Specification
source, reproduces its package checksum, verifies original builder/source/subject
attestation, and refuses a one-byte-modified archive. It runs Code source tests
and separately packs/installs Code into a clean consumer that calls the public
export. The same original Specification producer supplies that consumer.

Required observations include native semantic identity transport, both desired
polarities, zero/partial/complete source-test declarations remaining unverified,
mutation isolation, malformed/legacy identity refusal, lost trace/declaration
refusal, generated metadata immutability, actual positive/negative execution,
stale byte refusal, changed-output disagreement and repair against the same
submitted cases. Subprocess creation must succeed and real TAP cases must execute;
an exit status without executed assertions is insufficient.

## Optional JavaScript invocation annotations

The existing LLD input/output JSON Schema documents can explicitly describe
non-unary JavaScript interfaces. These are root-level Engineering annotations,
not JSON Schema validation keywords. Generic validators can ignore them; the
source-bound Code adapter implements them. They remain part of the exact source,
Design identity, readout and generated metadata, without a parallel API registry.

- Input `x-javascript-arguments: "positional"` requires `type: "array"` and a
  safe integer `maxItems` from 0 through 64. That schema validates the complete
  argument list, then the adapter calls the original function with its elements
  in order. Shorter arrays preserve omitted trailing arguments and JavaScript
  defaults. JSON null is passed as null, never converted to undefined.
- Output `x-javascript-result: "iterable-values"` requires `type: "array"` and
  a safe integer `maxItems` from 0 through 65,536. The adapter observes one
  synchronous iterable into an ordered array. Strings and async-only iterables
  refuse. An extra yielded value raises RangeError rather than truncating, and
  the language's iterator-close semantics run on overflow. Original iteration
  errors retain their meaning. At an exact bound the next completion check is
  necessary; a bound of zero accepts only an empty iterable.
- Output `x-javascript-result: "map-entries"` has the same bounded array schema.
  Require a genuine Map using native Map operations. Check its size before
  allocation, then preserve its insertion-ordered [key, value] entries. Custom
  iterator overrides do not replace the native entry traversal. No string-key
  coercion, Object.fromEntries, sorting or recursive conversion is permitted.

Argument and result annotations are independent. Output schemas validate the
observed array after collection. Invalid kind, missing bounds, wrong direction
or reserved annotations at nested schema positions refuse before generation.
Literal const/enum/example data and property names are not declarations.
Unrelated annotations remain accepted. These newly reserved names were absent
from the existing test and source corpus; prior use of those exact names with a
different meaning is deliberately refused rather than silently reinterpreted.

Absent annotations preserve the previous unary call, direct return observation
and generated bytes. The original derivation-plan schema and instructions are
unchanged, so existing saved plans remain replayable. An LLD author explicitly
selects annotations from its source specification; the generator does not infer
calling conventions from function length or source spelling. Tests remain
separately authored and original source digests are still checked before import.

Collection limits bound yielded counts and stored entries, not execution time,
item byte size or side effects. A nonreturning iterator needs the existing host's
time/resource isolation. Async iterables, callbacks, non-JSON arguments
and arbitrary normalization functions remain unsupported. Bounded own-method
factory sequences are specified below.

Positional invocation does not expand the installed JSON Schema supplier's
vocabulary. In particular, its current admission does not support prefixItems.
Use admitted bounded argument-array schemas and retain any per-position
preconditions in the source contract; do not claim tuple-schema validation.

## Bounded factory method sequences

A root input-schema annotation `x-javascript-factory` selects an in-memory
factory sequence instead of a unary operation. Its required fields are `methods`
(1–32 distinct JavaScript identifier names), `maxCalls` (integer 0–64) and
`maxArguments` (integer 0–64). The optional `resultReferences` field is defined below. The input schema must explicitly have object
type. Reserved method names constructor, prototype and __proto__ are refused.
The annotation cannot coexist with positional arguments or collection result
annotations. The original factory module/export and source digest remain the
sole executable target. Nested and output-side declarations refuse.

The request is exactly `{arguments: [...], calls: [...]}`. Each call is exactly
`{method, arguments}` with optional boolean `captureError`. Factory and method
arguments are ordinary JSON arrays, preserving omitted trailing defaults.
The complete request is admitted and detached by the existing JSON supplier
before schema validation, source import or construction. Every call's shape,
allowlisted name, argument count and total call count are checked before the
factory runs. No callback, getter, module selector or arbitrary property path
can be supplied. These declarations do not grant authority for effects.

One fresh instance is constructed per checked invocation. Each call resolves
an own data-property function and invokes it with the instance as its receiver.
Calls and native-Promise results are sequential. Arbitrary thenables are not
assimilated, so a synchronous result cannot activate a then getter during
observation. Each returned value becomes a
bounded detached canonical-JSON snapshot `{status: "returned", value}` before
the next call. Undefined has `{status: "returned"}` without a value, distinct
from null. Source objects and later mutations cannot rewrite earlier snapshots.
The original JSON supplier's RFC 8785 profile and resource envelope apply,
including numeric normalization and refusal of getters, cycles, unsupported
objects and nonfinite numbers. No `toJSON` hook or lossy stringify fallback is
used. Combined observation bytes are bounded by that same 1 MiB envelope.

Without captureError, a source-method exception propagates. With it, exact
native Error, TypeError, RangeError or SyntaxError prototypes with plain string
messages produce `{status: "threw", name, message}`, and execution continues.
Non-native thrown values, subclasses and accessor messages propagate unchanged.
Construction, lookup, schema and observation failures always propagate; the
method catch cannot turn adapter failures into apparently expected errors.
Capturing an error makes no claim of rollback: subsequent observations establish
whether the source's own recovery contract actually holds.

This version supports JSON-configured memory-only objects such as Crucible's
session over Gaming's replay controller. It does not support inherited methods,
getter reads or resource-owning sessions requiring guaranteed cleanup.
Explicit bounded prior-result references are specified below. It never probes for
implicit dispose/close methods. Counts and JSON bounds do not bound implementation
execution time, allocations or external effects; host isolation and the source's
effect contract remain separate requirements. The generated factory receiver
uses the existing `@red-cup-engineering/json-services-section` 0.4.0 supplier;
consumers must declare that dependency when adopting the generated module.

Absent this annotation, existing unary and positional generated bytes and saved
derivation-plan replay remain unchanged. These newly reserved names were absent
from the received source/test corpus; unknown use of this exact new annotation
is now refused instead of ignored. No new plan fields or parallel registry are
introduced. Requirement cases are authored separately from implementation, and
adapter generation is not game-rule synthesis or independent acceptance.

### Opt-in references to earlier factory results

`resultReferences: {maxPathLength: N}` is an optional fourth factory-policy
field, with N a safe integer from 0 to 16 and no other fields. Without it,
the original three-field contract and generated artifact bytes are unchanged.
With it, a call may additionally carry `references`, an array of exact
`{argument, result, path}` descriptors. For example,
`{method:"extend", arguments:[null, {kind:"play", move:"C3"}], references:[{argument:0, result:0, path:[]}]}`
passes the first call's successful raw return into the next declared method.
A subsequent Weiqi call can use `path:["state"]` to select its returned state.

A reference can replace only an existing explicitly null argument slot, once
per slot. The result index is the absolute index of an earlier call in this
invocation, including calls that threw. Failed and void returns cannot be
referenced; null, false and zero are valid returns. Every reference and call is
structurally preflighted before construction. Factory arguments never contain
references. Ordinary JSON objects resembling descriptors remain literal data.

An empty path selects the whole raw result. A path has at most N components,
each a nonempty string of at most 128 characters or a nonnegative safe integer
below the JSON array bound. Constructor, prototype and __proto__ keys are
forbidden. Each component must select an existing own enumerable data property.
There is no prototype lookup, getter execution, arbitrary module selection,
nested argument substitution or inferred method access.

The generated adapter keeps raw successful results separately from detached
JSON observations. It never clones or freezes a reference argument. Thus aliases,
source mutations and older branch points retain their actual identity, while
previous observations remain unchanged. Before reference use, the current raw
graph must still satisfy the original bounded JSON supplier. The opt-in adapter
refuses Proxies before reflective traversal and accessor descriptors before
reading their values, for inputs and results. Arrays must be dense, with null or
standard Array.prototype ancestry and no inherited index-zero property. This
explicit restriction prevents the JSON supplier's pair detector from inspecting
active inherited positions, including on empty arrays. It also refuses Proxy instances
and propagates Proxy exceptions without inspecting their prototypes. Raw result
validation and reference resolution occur outside source-error capture.
A captured source exception does not imply rollback of previously returned data.

The bounds remain finite calls, arguments, paths, JSON nodes and observation
bytes. They are not a sandbox or a CPU/heap/effects budget for source code.
Non-JSON state, inherited methods, async iterables, callbacks, references across
invocations and automatic resource cleanup remain unsupported. Actual Weiqi
receiving checks sequential moves, branches, ko and recovery against the session
owner, including exactly one rule application per accepted command and a
foreign-state reconstruction control. This generates the source-bound adapter
and requirement assays, not Weiqi's authored game rules or independent acceptance.
