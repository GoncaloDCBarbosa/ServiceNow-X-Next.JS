import { snTableGet } from "@/lib/servicenow";

const TABLE = "x_trhrt_trh_plus_challenge_instance";

export type ChoiceOption = { value: string; label: string };

export type FieldSchema = {
  element: string;
  label: string;
  type: string;
  reference?: string;
  mandatory: boolean;
  choices?: ChoiceOption[];
};

// Some instances resolve reference-ish fields to { value, display_value }
// objects even when sysparm_display_value isn't requested — coerce
// defensively so a stray object can never leak downstream (e.g. into a
// lookup URL as "[object Object]").
function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "value" in (v as Record<string, unknown>)) {
    return String((v as { value: unknown }).value ?? "");
  }
  return v == null ? "" : String(v);
}

export async function GET() {
  try {
    // internal_type is itself a reference (to sys_glide_object), so it's
    // dot-walked straight to its technical type name ("reference",
    // "boolean", "glide_date_time"...) rather than resolved through
    // sysparm_display_value — that would return the human label ("Reference")
    // instead, which silently breaks every type comparison downstream.
    // sysparm_display_value is forced to false so every other field comes
    // back as a plain value regardless of the instance's own defaults.
    const dictResult = await snTableGet<Record<string, unknown>>("sys_dictionary", {
      sysparm_query: `name=${TABLE}^elementISNOTEMPTY^ORDERBYelement`,
      sysparm_fields: "element,column_label,internal_type,internal_type.name,reference,mandatory,choice",
      sysparm_display_value: "false",
      sysparm_limit: "200",
    });

    const dictRows = dictResult.result ?? [];
    const fields: FieldSchema[] = [];

    for (const row of dictRows) {
      const element = asString(row.element);
      if (!element || element.startsWith("sys_")) continue;

      const type = asString(row["internal_type.name"]) || asString(row.internal_type) || "string";
      const choiceFlag = asString(row.choice);
      const isChoice = !!choiceFlag && choiceFlag !== "0";
      const referenceTable = asString(row.reference);

      fields.push({
        element,
        label: asString(row.column_label) || element,
        type,
        reference: type === "reference" && referenceTable ? referenceTable : undefined,
        mandatory: asString(row.mandatory) === "true",
        choices: isChoice ? [] : undefined,
      });
    }

    const choiceElements = fields.filter((f) => f.choices).map((f) => f.element);

    if (choiceElements.length > 0) {
      const choiceResult = await snTableGet<Record<string, unknown>>("sys_choice", {
        sysparm_query: `name=${TABLE}^elementIN${choiceElements.join(",")}^inactive=false^ORDERBYsequence`,
        sysparm_fields: "element,value,label",
        sysparm_display_value: "false",
        sysparm_limit: "300",
      });

      const choiceRows = choiceResult.result ?? [];
      for (const field of fields) {
        if (!field.choices) continue;
        field.choices = choiceRows
          .filter((r) => asString(r.element) === field.element)
          .map((r) => ({ value: asString(r.value), label: asString(r.label) || asString(r.value) }));
      }
    }

    return Response.json({ result: fields });
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Unknown error contacting ServiceNow.",
      },
      { status: 502 }
    );
  }
}
