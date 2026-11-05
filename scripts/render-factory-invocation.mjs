/** Render one bounded, source-selected factory lifecycle inside its wrapper.
 * No method paths, callbacks, result references, implicit cleanup or effects
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
  return { prelude, body };
}
