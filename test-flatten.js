// Test flattenFacts function
function flattenFacts(obj, prefix = "", res = {}) {
  // Always ensure all facts exist to prevent "Undefined fact" errors
  const allPossibleFacts = {
    "driver.age": undefined,
    "driver.dui": undefined,
    "driver.homeowner": undefined,
    "vehicle.type": undefined,
    "vehicle.year": undefined
  };
  
  // Start with all facts as undefined
  Object.assign(res, allPossibleFacts);
  
  // Then override with actual values
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

// Test cases
console.log('Empty object:', flattenFacts({}));
console.log('With age 41:', flattenFacts({ driver: { age: 41 } }));
console.log('With age and DUI:', flattenFacts({ driver: { age: 41, dui: false } }));