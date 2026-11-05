/** Render one bounded, source-selected factory lifecycle inside its wrapper.
 * No method paths, callbacks, implicit cleanup or effects
 * are inferred. The original JSON supplier owns inert snapshots and bounds.
 */
export function renderFactoryInvocation(policy) {
  const prelude = `  const policy = JSON.parse(${JSON.stringify(JSON.stringify(policy))});
  const request = JSON.parse(__factoryCanonicalize(input, __factoryJsonBounds).text);
  const exact = (value, keys) => value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
  const args = value => Array.isArray(value) && value.length <= policy.maxArguments;
  if (!exact(request, ["arguments", "calls"]) || !args(request.arguments) ||
      !Array.isArray(request.calls) || request.calls.length > policy.maxCalls)
    throw new TypeError("Design factory sequence input disagreement");
  for (const call of request.calls) {
    if (!(exact(call, ["method", "arguments"]) || exact(call, ["method", "arguments", "captureError"])) ||
        !policy.methods.includes(call.method) || !args(call.arguments) ||
        Object.hasOwn(call, "captureError") && typeof call.captureError !== "boolean")
      throw new TypeError("Design factory method input disagreement");
  }`;
  const body = `  const created = implementation(...request.arguments);
  const instance = __factoryIsPromise(created) ? await created : created;
  if (instance === null || typeof instance !== "object")
    throw new TypeError("Design factory must return an object instance");
  const output = [];
  let observationBytes = 2;
  for (const call of request.calls) {
    const descriptor = Object.getOwnPropertyDescriptor(instance, call.method);
    if (!descriptor || !Object.hasOwn(descriptor, "value") || typeof descriptor.value !== "function")
      throw new TypeError("Design factory requires an own data-property method");
    let value, failure;
    try {
      value = Reflect.apply(descriptor.value, instance, call.arguments);
      if (__factoryIsPromise(value)) value = await value;
    } catch (error) {
      if (!call.captureError) throw error;
      const type = error !== null && typeof error === "object" &&
        [Error, TypeError, RangeError, SyntaxError].find(Type => Object.getPrototypeOf(error) === Type.prototype);
      const message = type && Object.getOwnPropertyDescriptor(error, "message");
      if (!type || message && (!Object.hasOwn(message, "value") || typeof message.value !== "string")) throw error;
      failure = {status: "threw", name: type.name, message: message ? message.value : ""};
    }
    // Keep observation outside the source-method catch: malformed output and
    // exhausted JSON budgets must never masquerade as an expected source error.
    const observation = failure ?? (value === undefined ? {status: "returned"} : {status: "returned", value});
    const snapshot = __factoryCanonicalize(observation, __factoryJsonBounds);
    observationBytes += snapshot.byteLength + (output.length ? 1 : 0);
    if (observationBytes > __factoryJsonBounds.maxCanonicalBytes)
      throw new TypeError("Design factory observation byte bound exceeded");
    output.push(snapshot.value);
  }`;
  if (!policy.resultReferences) return { prelude, body };
  return renderResultReferences({ prelude, body });
}

// Compose the explicitly selected extension onto the original template. The
// original branch above remains byte-identical for every existing factory.
function renderResultReferences({ prelude, body }) {
  const shapes='["method", "arguments"]';
  const originalShape=`!(exact(call, ${shapes}) || exact(call, ["method", "arguments", "captureError"]))`;
  const referenceShape=`!([${shapes}, ["method", "arguments", "captureError"],
          ["method", "arguments", "references"], ["method", "arguments", "references", "captureError"]].some(keys => exact(call, keys)))`;
  const validation=`
    const references = Object.hasOwn(call, "references") ? call.references : [];
    if (!Array.isArray(references) || references.length > policy.maxArguments)
      throw new TypeError("Design result-reference input disagreement");
    const replaced = new Set();
    for (const reference of references) {
      if (!exact(reference, ["argument", "result", "path"]) ||
          !Number.isSafeInteger(reference.argument) || reference.argument < 0 || reference.argument >= call.arguments.length ||
          call.arguments[reference.argument] !== null || replaced.has(reference.argument) ||
          !Number.isSafeInteger(reference.result) || reference.result < 0 || reference.result >= callIndex ||
          !Array.isArray(reference.path) || reference.path.length > policy.resultReferences.maxPathLength ||
          reference.path.some(key => !(typeof key === "string" && key.length > 0 && key.length <= 128 &&
              !["constructor", "prototype", "__proto__"].includes(key) ||
            Number.isSafeInteger(key) && key >= 0 && key < __factoryJsonBounds.maxArrayLength)))
        throw new TypeError("Design result-reference input disagreement");
      replaced.add(reference.argument);
    }`;
  const guard=`  const admitReferenceData = value => {
    // Detect active carriers before any reflective traversal can activate a
    // Proxy trap. The original JSON supplier still owns JSON semantics/bounds.
    const pending = [value], seen = new WeakSet();
    let visited = 0;
    while (pending.length) {
      const current = pending.pop();
      if (++visited > __factoryJsonBounds.maxNodes) throw new TypeError("Design result-reference node bound exceeded");
      if (current === null || typeof current !== "object") continue;
      if (__factoryIsProxy(current)) throw new TypeError("Design result-reference Proxy refused");
      if (seen.has(current)) continue;
      seen.add(current);
      const descriptors = Object.getOwnPropertyDescriptors(current);
      if (Array.isArray(current)) {
        const prototype = Object.getPrototypeOf(current);
        if (prototype !== null && (prototype !== Array.prototype ||
            Object.getPrototypeOf(Array.prototype) !== Object.prototype ||
            Object.getOwnPropertyDescriptor(Array.prototype, "0") ||
            Object.getOwnPropertyDescriptor(Object.prototype, "0")))
          throw new TypeError("Design result-reference active array prototype refused");
        const length = descriptors.length.value;
        if (length > __factoryJsonBounds.maxArrayLength) throw new TypeError("Design result-reference array bound exceeded");
        // The supplier's pair-spine detector can inspect array positions before
        // rejecting holes. Prove all positions are inert own data first.
        for (let index = 0; index < length; index++) {
          const part = Object.hasOwn(descriptors, index) ? descriptors[index] : null;
          if (!part || !part.enumerable || !Object.hasOwn(part, "value"))
            throw new TypeError("Design result-reference sparse or accessor array refused");
        }
      }
      for (const key of Reflect.ownKeys(descriptors)) {
        if (Array.isArray(current) && key === "length") continue;
        const descriptor = descriptors[key];
        if (!Object.hasOwn(descriptor, "value")) throw new TypeError("Design result-reference accessor refused");
        if (pending.length + visited >= __factoryJsonBounds.maxNodes) throw new TypeError("Design result-reference node bound exceeded");
        pending.push(descriptor.value);
      }
    }
    return __factoryCanonicalize(value, __factoryJsonBounds);
  };
`;
  const resolution=`    const methodArguments = call.arguments.slice(), validated = new Set();
    for (const reference of call.references ?? []) {
      const record = results[reference.result];
      if (!record?.ok || record.value === undefined) throw new TypeError("Design result-reference target unavailable");
      if (!validated.has(reference.result)) {
        admitReferenceData(record.value);
        validated.add(reference.result);
      }
      let selected = record.value;
      for (const key of reference.path) {
        if (selected === null || typeof selected !== "object") throw new TypeError("Design result-reference path disagreement");
        const part = Object.getOwnPropertyDescriptor(selected, key);
        if (!part || !part.enumerable || !Object.hasOwn(part, "value")) throw new TypeError("Design result-reference path disagreement");
        selected = part.value;
      }
      // Never use the detached JSON observation here. Raw identity is the
      // source factory's state/session key, including aliases and older forks.
      methodArguments[reference.argument] = selected;
    }
`;
  return {
    prelude: guard + prelude.replace('__factoryCanonicalize(input, __factoryJsonBounds)', 'admitReferenceData(input)')
      .replace('for (const call of request.calls)', 'for (const [callIndex, call] of request.calls.entries())')
      .replace(originalShape, referenceShape)
      .replace('throw new TypeError("Design factory method input disagreement");', 'throw new TypeError("Design factory method input disagreement");'+validation),
    body: body.replace('  const output = [];', '  if (__factoryIsProxy(instance)) throw new TypeError("Design factory Proxy instance refused");\n  const results = [];\n  const output = [];')
      .replace('      if (!call.captureError) throw error;', '      if (!call.captureError || __factoryIsProxy(error)) throw error;')
      .replace('    let value, failure;', resolution+'    let value, failure;')
      .replace('Reflect.apply(descriptor.value, instance, call.arguments)', 'Reflect.apply(descriptor.value, instance, methodArguments)')
      .replace('__factoryCanonicalize(observation, __factoryJsonBounds)', 'admitReferenceData(observation)')
      .replace('    output.push(snapshot.value);', '    output.push(snapshot.value);\n    results.push({ok: !failure, value});'),
  };
}
