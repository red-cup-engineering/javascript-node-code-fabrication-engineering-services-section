import assert from "node:assert/strict";
import test from "node:test";
import {
  renderJsonSchemaModule, transformJsonSchemaToTypescript,
} from "../scripts/transform-json-schema-to-typescript.mjs";

const runtimeBinding = { name: "defineSchemaType", from: "./schema-type.mjs" };
const evidence = {
  exportName: "evidenceSchema", typeName: "EvidenceEnvelope",
  schema: {
    $id: "https://schemas.561.group/process/evidence.json",
    $defs: {
      Evidence: {
        type: "object",
        required: ["digest"],
        properties: { digest: { type: "string", minLength: 1 } },
      },
    },
    type: "object",
  },
};
const design = (pointer = "evidence.json#/$defs/Evidence") => ({
  exportName: "designSchema", typeName: "Design",
  runtimeName: "designType",
  schema: {
    $id: "https://schemas.561.group/process/design.json",
    type: "object",
    required: ["evidence"],
    properties: {
      evidence: { $ref: pointer },
    },
  },
});

test("generated runtime carriers retain resolved external design evidence", () => {
  const entries = [design(), evidence];
  const output = renderJsonSchemaModule(entries, {
    format: "javascript", runtimeBinding,
  });
  assert.match(output, /designType = defineSchemaType\(designSchema, \[evidenceSchema\]\)/u);
  assert.equal(output, renderJsonSchemaModule([...entries].reverse(), {
    format: "javascript", runtimeBinding,
  }), "stable output under reordering");
});

test("executable generation refuses an unresolved external design reference", () => {
  const missing = [design("absent.json#/$defs/Proof"), evidence];
  for (const format of ["javascript", "typescript", "declaration"]) {
    assert.throws(() => renderJsonSchemaModule(missing, {
      format, runtimeBinding,
    }), /unresolved runtime JSON Schema reference: absent\.json/u);
  }
  const legacy = transformJsonSchemaToTypescript(missing[0].schema, {
    typeName: "Design",
  });
  assert.match(legacy, /"evidence": unknown;/u,
    "standalone declaration is explicitly lossy, not falsely certified");
});

test("a known document with an absent internal pointer still refuses", () => {
  assert.throws(() => renderJsonSchemaModule([
    design("evidence.json#/$defs/Missing"), evidence,
  ], { format: "javascript", runtimeBinding }),
  /unresolved runtime JSON Schema reference/u);
});

test("nested specification choices and transitive references are checked", () => {
  const root = design();
  root.schema.if = { properties: {
    privileged: { $ref: "absent.json#/$defs/Permission" },
  } };
  assert.throws(() => renderJsonSchemaModule([root, evidence], {
    format: "javascript", runtimeBinding,
  }), /unresolved runtime JSON Schema reference/u);
  const indirect = {
    ...evidence,
    schema: {
      ...evidence.schema,
      $defs: {
        Evidence: { $ref: "other.json#/$defs/Signature" },
      },
    },
  };
  assert.throws(() => renderJsonSchemaModule([design(), indirect], {
    format: "javascript", runtimeBinding,
  }), /unresolved runtime JSON Schema reference/u);
});

test("example content is not confused with a reference constraint", () => {
  const source = design();
  source.schema.examples = [{ $ref: "this-is-data.json" }];
  const output = renderJsonSchemaModule([source, evidence], {
    format: "javascript", runtimeBinding,
  });
  assert.match(output, /designType = defineSchemaType/u);
});

test("changed design deterministically regenerates different executable source", () => {
  const before = renderJsonSchemaModule([design(), evidence], {
    format: "javascript", runtimeBinding,
  });
  const revised = design();
  revised.schema.properties.extra = { type: "boolean" };
  const after = renderJsonSchemaModule([revised, evidence], {
    format: "javascript", runtimeBinding,
  });
  assert.notEqual(after, before);
  assert.equal(after, renderJsonSchemaModule([revised, evidence], {
    format: "javascript", runtimeBinding,
  }));
});

test("runtime generation rejects references to present but nonschema source values", () => {
  for (const malformed of [null, 17, "not a schema", [], ["object"]]) {
    const input = design("#/$defs/not-a-schema");
    input.schema.$defs = { "not-a-schema": malformed };
    assert.throws(() => renderJsonSchemaModule([input], {
      format: "javascript", runtimeBinding,
    }), /unresolved runtime JSON Schema reference: .*target is not a schema/u);
  }
});

test("boolean true and false remain legitimate referenced JSON Schemas", () => {
  for (const [value, declared] of [[true, "unknown"], [false, "never"]]) {
    const input = design("#/$defs/boolean-schema");
    input.schema.$defs = { "boolean-schema": value };
    // Type declarations expose the projected alias; JS-only output has none.
    const result = renderJsonSchemaModule([input], {
      format: "typescript", runtimeBinding,
    });
    assert.match(result, new RegExp('"evidence": ' + declared + ';', "u"));
  }
});
