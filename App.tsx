import { useState } from "react";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import { Engine } from "json-rules-engine";

/* ============================
   ✅ FULL FLOW CONFIG (API SIM)
============================ */

const flowConfig = {
  steps: [
    {
      id: "driver",
      title: "Driver Info",

      // ✅ JSON SCHEMA (DATA + VALIDATION)
      schema: {
        type: "object",
        properties: {
          age: { type: "number", minimum: 16 },
          dui: { type: "boolean" }
        },
        required: ["age"]
      },

      // ✅ UI SCHEMA (PRESENTATION)
      uiSchema: {
        age: {
          "ui:widget": "updown",
          "ui:title": "Your Age",
          "ui:placeholder": "Enter age"
        },
        dui: {
          "ui:widget": "radio",
          "ui:title": "Any DUI?",
          "ui:options": {
            enumOptions: [
              { label: "Yes", value: true },
              { label: "No", value: false }
            ]
          }
        }
      }
    },

    {
      id: "vehicle",
      title: "Vehicle Info",

      schema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["Personal", "Commercial"] },
                    year: { type: "number" }
        },
        required: ["type"]
      },

      uiSchema: {
          "ui:order": ["year", "type"],
        year: {
          "ui:placeholder": "e.g. 2022"
        },
        type: {
          "ui:widget": "radio",
          "ui:title": "Vehicle Type",
          "ui:options": {
            enumOptions: [
              { label: "Personal", value: "Personal" },
              { label: "Commercial", value: "Commercial" }
            ]
          }
        }
      }
    }
  ],

  // ✅ RULES (FLOW + UNDERWRITING)
  rules: [
    // ❌ BLOCK FLOW IF DUI === TRUE
    {
      conditions: {
        all: [{ fact: "driver.dui", operator: "equal", value: true }]
      },
      event: {
        type: "BLOCK_FLOW",
        params: { reason: "Driver has a DUI" }
      }
    },

    // ⏭️ SKIP VEHICLE IF AGE < 25
    {
      conditions: {
        all: [{ fact: "driver.age", operator: "lessThan", value: 25 }]
      },
      event: {
        type: "SKIP_STEP",
        params: { stepId: "vehicle" }
      }
    }
  ]
};

/* ============================
   ✅ APP
============================ */

export default function App() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [skippedSteps, setSkippedSteps] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string | null>(null);

  const steps = flowConfig.steps.filter(
    step => !skippedSteps.includes(step.id)
  );

  const step = steps[stepIndex];

  if (blocked) {
    return <h1>❌ BLOCKED: {blocked}</h1>;
  }

  if (!step) {
    return <h1>✅ Flow Complete</h1>;
  }

  async function onSubmit({ formData }: any) {
    const newAnswers = {
      ...answers,
      [step.id]: formData
    };

    // ✅ RUN RULES
    const engine = new Engine(flowConfig.rules);

    engine.on("BLOCK_FLOW", (event) => {
      setBlocked(event.params.reason);
    });

    engine.on("SKIP_STEP", (event) => {
      setSkippedSteps(prev => [...prev, event.params.stepId]);
    });

    await engine.run(flattenFacts(newAnswers));

    setAnswers(newAnswers);
    setStepIndex(prev => prev + 1);
  }

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>{step.title}</h2>

      <Form
        schema={step.schema}
        uiSchema={step.uiSchema}
        formData={answers[step.id]}
        validator={validator}
        onSubmit={onSubmit}
      />

      <pre style={{ background: "#f4f4f4", padding: 10 }}>
        {JSON.stringify(answers, null, 2)}
      </pre>
    </div>
  );
}

/* ============================
   ✅ FACT FLATTENER FOR RULES
============================ */

// { driver: { age: 20 }} → { "driver.age": 20 }
function flattenFacts(obj: any, prefix = "", res: any = {}) {
  for (const key in obj) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null) {
      flattenFacts(value, newKey, res);
    } else {
      res[newKey] = value;
    }
  }
  return res;
}
