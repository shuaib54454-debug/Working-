import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateTD3MRZ } from "./passportValidation";

const validLine1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<";
const validLine2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";

test("accepts a valid TD3 MRZ with valid check digits", () => {
  const result = validateTD3MRZ(validLine1, validLine2);
  assert.equal(result.isValid, true);
  assert.equal(result.passportNumber, "L898902C3");
  assert.equal(result.nationalityCode, "UTO");
  assert.equal(result.birthDateRaw, "740812");
  assert.equal(result.expiryDateRaw, "120415");
  assert.equal(result.gender, "female");
});

test("rejects a TD3 MRZ when the passport-number check digit is wrong", () => {
  const invalid = "L898902C46UTO7408122F1204159ZE184226B<<<<<10";
  const result = validateTD3MRZ(validLine1, invalid);
  assert.equal(result.isValid, false);
  assert.equal(result.errors.includes("passportNumber"), true);
});

test("rejects malformed TD3 lines instead of inventing data", () => {
  const result = validateTD3MRZ("P<UTO", "P0000000");
  assert.equal(result.isValid, false);
  assert.equal(result.passportNumber, "");
  assert.equal(result.errors.length > 0, true);
});
