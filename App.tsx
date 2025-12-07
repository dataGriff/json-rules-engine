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
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '0 20px'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem'
          }}>🚫</div>
          <h1 style={{
            color: '#dc3545',
            marginBottom: '1rem',
            fontSize: '1.8rem',
            fontWeight: '600'
          }}>Application Blocked</h1>
          <p style={{
            color: '#6c757d',
            fontSize: '1.1rem',
            lineHeight: '1.5'
          }}>{blocked}</p>
        </div>
      </div>
    );
  }

  if (!step) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <div style={{
          background: 'white',
          padding: '3rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '0 20px'
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem'
          }}>🎉</div>
          <h1 style={{
            color: '#28a745',
            marginBottom: '1rem',
            fontSize: '1.8rem',
            fontWeight: '600'
          }}>Application Complete!</h1>
          <p style={{
            color: '#6c757d',
            fontSize: '1.1rem',
            lineHeight: '1.5',
            marginBottom: '2rem'
          }}>Thank you for completing the form. Your information has been processed.</p>
          <div style={{
            background: '#f8f9fa',
            padding: '1rem',
            borderRadius: '8px',
            textAlign: 'left'
          }}>
            <h3 style={{ marginBottom: '0.5rem', color: '#495057' }}>Summary:</h3>
            <pre style={{
              fontSize: '0.9rem',
              margin: 0,
              whiteSpace: 'pre-wrap',
              color: '#6c757d'
            }}>
              {JSON.stringify(answers, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem 1rem',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {/* Progress Header */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <h1 style={{
              color: 'white',
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>Insurance Application</h1>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Step {stepIndex + 1} of {flowConfig.steps.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            height: '6px',
            borderRadius: '3px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: 'linear-gradient(90deg, #00d4ff, #090979)',
              height: '100%',
              width: `${((stepIndex + 1) / flowConfig.steps.length) * 100}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Main Form Card */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
          overflow: 'hidden'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            padding: '2rem',
            color: 'white',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '2.5rem',
              marginBottom: '0.5rem'
            }}>
              {step.id === 'driver' ? '👤' : '🚗'}
            </div>
            <h2 style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>{step.title}</h2>
          </div>

          <div style={{
            padding: '2rem'
          }}>
            <Form
              schema={step.schema}
              uiSchema={{
                ...step.uiSchema,
                "ui:submitButtonOptions": {
                  submitText: stepIndex === steps.length - 1 ? "Complete Application" : "Continue",
                  norender: false,
                  props: {
                    style: {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      color: 'white',
                      padding: '12px 32px',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      width: '100%',
                      marginTop: '1rem',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    },
                    onMouseEnter: (e: any) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 10px 25px rgba(102, 126, 234, 0.4)';
                    },
                    onMouseLeave: (e: any) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }
                  }
                }
              }}
              formData={answers[step.id]}
              validator={validator}
              onSubmit={onSubmit}
            />
          </div>
        </div>

        {/* Debug Panel - Collapsible */}
        {Object.keys(answers).length > 0 && (
          <div style={{
            marginTop: '2rem',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
            overflow: 'hidden'
          }}>
            <details style={{ color: 'white' }}>
              <summary style={{
                padding: '1rem',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.9rem'
              }}>
                📊 Debug: View Form Data
              </summary>
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '1rem'
              }}>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  overflow: 'auto',
                  margin: 0
                }}>
                  {JSON.stringify(answers, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>
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
