import { Engine } from 'json-rules-engine';

// Test the rules logic independently
const rules = [
  // 🏠 SHOW HOMEOWNER FIELD IF AGE > 30
  {
    conditions: {
      all: [{ fact: "driver.age", operator: "greaterThan", value: 30 }]
    },
    event: {
      type: "SHOW_FIELD",
      params: { stepId: "driver", fieldId: "homeowner" }
    }
  },

  // 🏠 HIDE HOMEOWNER FIELD IF AGE <= 30
  {
    conditions: {
      all: [{ fact: "driver.age", operator: "lessThanInclusive", value: 30 }]
    },
    event: {
      type: "HIDE_FIELD",
      params: { stepId: "driver", fieldId: "homeowner" }
    }
  }
];

async function testRules(age) {
  const engine = new Engine(rules);
  
  let events = [];
  
  engine.on("SHOW_FIELD", (event) => {
    events.push({ type: "SHOW_FIELD", ...event });
  });
  
  engine.on("HIDE_FIELD", (event) => {
    events.push({ type: "HIDE_FIELD", ...event });
  });
  
  const facts = { "driver.age": age };
  console.log(`\nTesting age: ${age}`);
  console.log('Facts:', facts);
  
  await engine.run(facts);
  
  console.log('Events fired:', events);
  return events;
}

// Test different ages
testRules(25);   // Should fire HIDE_FIELD
testRules(30);   // Should fire HIDE_FIELD  
testRules(31);   // Should fire SHOW_FIELD
testRules(41);   // Should fire SHOW_FIELD
testRules(undefined); // Test undefined age