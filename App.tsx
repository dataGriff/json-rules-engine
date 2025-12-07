import React, { useState, useEffect } from "react";
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
      defaultHiddenFields: ["homeowner"], // Fields hidden by default

      schema: {
        type: "object",
        properties: {
          age: { type: "number", minimum: 16 },
          dui: { type: "boolean" },
          homeowner: { type: "boolean" }
        },
        required: ["age"]
      },

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
        },
        homeowner: {
          "ui:widget": "radio",
          "ui:title": "Do you own a home?",
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
        year: { "ui:placeholder": "e.g. 2022" },
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

  rules: [
    {
      conditions: {
        all: [{ fact: "driver.dui", operator: "equal", value: true }]
      },
      event: {
        type: "BLOCK_FLOW",
        params: { reason: "Driver has a DUI" }
      }
    },

    {
      conditions: {
        all: [{ fact: "driver.age", operator: "lessThan", value: 25 }]
      },
      event: {
        type: "SKIP_STEP",
        params: { stepId: "vehicle" }
      }
    },
    {
      conditions: {
        all: [{ fact: "driver.age", operator: "greaterThanInclusive", value: 30 }]
      },
      event: {
        type: "SHOW_FIELD",
        params: { stepId: "driver", fieldId: "homeowner" }
      }
    },
    {
      conditions: {
        all: [{ fact: "driver.age", operator: "lessThan", value: 30 }]
      },
      event: {
        type: "HIDE_FIELD",
        params: { stepId: "driver", fieldId: "homeowner" }
      }
    } 
  ]
};

/* ============================
   ✅ INITIALIZE HIDDEN FIELDS
============================ */

function getInitialHiddenFields() {
  const hiddenFields: { [stepId: string]: string[] } = {};
  
  flowConfig.steps.forEach(step => {
    if (step.defaultHiddenFields && step.defaultHiddenFields.length > 0) {
      hiddenFields[step.id] = [...step.defaultHiddenFields];
    }
  });
  
  return hiddenFields;
}

/* ============================
   ✅ APP
============================ */

export default function App() {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [skippedSteps, setSkippedSteps] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [hiddenFields, setHiddenFields] = useState<{ [stepId: string]: string[] }>(getInitialHiddenFields());

  const steps = flowConfig.steps.filter(
    step => !skippedSteps.includes(step.id)
  );

  const step = steps[stepIndex];

  /* ============================
     ✅ RUN RULES
  ============================ */

  const runRules = async (currentAnswers: any) => {
    const engine = new Engine(flowConfig.rules);

    let newBlocked = null;
    let newSkippedSteps: string[] = [];
    let newHiddenFields = { ...hiddenFields }; // ✅ FIXED

    engine.on("BLOCK_FLOW", (event: any) => {
      newBlocked = event.reason;
    });

    engine.on("SKIP_STEP", (event: any) => {
      newSkippedSteps.push(event.stepId);
    });

    engine.on("SHOW_FIELD", (event: any) => {
      const { stepId, fieldId } = event;
      newHiddenFields = {
        ...newHiddenFields,
        [stepId]: (newHiddenFields[stepId] || []).filter(f => f !== fieldId)
      };
    });

    engine.on("HIDE_FIELD", (event: any) => {
      const { stepId, fieldId } = event;
      newHiddenFields = {
        ...newHiddenFields,
        [stepId]: [...(newHiddenFields[stepId] || []), fieldId]
      };
    });

    const facts = flattenFacts(currentAnswers);
    await engine.run(facts);

    setBlocked(newBlocked);
    setSkippedSteps(newSkippedSteps);
    setHiddenFields(newHiddenFields);
  };

  /* ============================
     ✅ RE-RUN RULES ON CHANGE
  ============================ */

  useEffect(() => {
    runRules(answers);
  }, [answers]);

  if (blocked) {
    return <h1 style={{ padding: 40 }}>❌ BLOCKED: {blocked}</h1>;
  }

  if (!step) {
    return (
      <div style={{ padding: 40 }}>
        <h1>✅ Complete</h1>
        <pre>{JSON.stringify(answers, null, 2)}</pre>
      </div>
    );
  }

  async function onSubmit({ formData }: any) {
    const newAnswers = {
      ...answers,
      [step.id]: formData
    };

    setAnswers(newAnswers);
    setStepIndex(prev => prev + 1);
  }

  function onChange({ formData }: any) {
    const newAnswers = {
      ...answers,
      [step.id]: formData
    };
    setAnswers(newAnswers);
  }

  /* ============================
     ✅ APPLY FIELD HIDING
  ============================ */

  const getFilteredStep = (stepConfig: any) => {
    const fieldsToHide = hiddenFields[stepConfig.id] || [];

    if (fieldsToHide.length === 0) return stepConfig;

    const filteredProperties = Object.fromEntries(
      Object.entries(stepConfig.schema.properties).filter(
        ([field]) => !fieldsToHide.includes(field)
      )
    );

    const filteredUISchema = Object.fromEntries(
      Object.entries(stepConfig.uiSchema).filter(
        ([field]) => !fieldsToHide.includes(field)
      )
    );

    return {
      ...stepConfig,
      schema: {
        ...stepConfig.schema,
        properties: filteredProperties
      },
      uiSchema: filteredUISchema
    };
  };

  const filteredStep = getFilteredStep(step);

  return (
    <div style={{ padding: 40 }}>
      <h2>{filteredStep.title}</h2>

      <Form
        schema={filteredStep.schema}
        uiSchema={filteredStep.uiSchema}
        formData={answers[step.id]}
        validator={validator}
        onChange={onChange}
        onSubmit={onSubmit}
      />

      <pre style={{ marginTop: 30 }}>{JSON.stringify(answers, null, 2)}</pre>
    </div>
  );
}

/* ============================
   ✅ ✅ ✅ FIXED FACT FLATTENER
============================ */

function flattenFacts(obj: any, prefix = "", res: any = {}) {
  // ✅ Initialize fact keys dynamically from schema (always run this for the root call)
  if (!prefix) {
    // Generate all possible fact keys from the flow configuration
    flowConfig.steps.forEach(step => {
      Object.keys(step.schema.properties).forEach(fieldKey => {
        res[`${step.id}.${fieldKey}`] = undefined;
      });
    });
    
    // Now process the actual object
    for (const key in obj) {
      const value = obj[key];
      
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        flattenFacts(value, key, res);
      } else {
        res[key] = value;
      }
    }
  } else {
    // For nested calls, just process the object
    for (const key in obj) {
      const value = obj[key];
      const newKey = `${prefix}.${key}`;

      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        flattenFacts(value, newKey, res);
      } else {
        res[newKey] = value;
      }
    }
  }

  return res;
}
