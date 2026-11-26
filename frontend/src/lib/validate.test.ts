import { describe, expect, it } from "vitest";
import { checkEstimate, MSG, profileProblem, responsibilitiesProblem, validateNewProject, validateRegistration, validEmail } from "./validate";

describe("registration", () => {
  it("marks each wrong field and uses the exact consent message", () => {
    const e = validateRegistration({ full_name: "A", email: "nope", password: "short", consent: false });
    expect(Object.keys(e).sort()).toEqual(["consent", "email", "full_name", "password"]);
    expect(e.consent).toBe("Please accept personal-data processing to continue");
  });
  it("accepts a valid form", () => {
    expect(validateRegistration({ full_name: "Dana Bekova", email: "dana@stu.sdu.edu.kz", password: "studyspace26", consent: true })).toEqual({});
  });
  it("validates email format", () => {
    expect(validEmail("a@b.kz")).toBe(true);
    expect(validEmail("a@b")).toBe(false);
    expect(validEmail("a b@c.kz")).toBe(false);
  });
});

describe("new project", () => {
  const now = new Date("2026-10-22T12:00:00");
  const desc = "x".repeat(100);
  it("checks title, description and deadline in design order", () => {
    expect(validateNewProject({ title: "", description: "", deadline: "" }, now)).toBe(MSG.title);
    expect(validateNewProject({ title: "T", description: "short", deadline: "" }, now)).toBe(MSG.descShort);
    expect(validateNewProject({ title: "T", description: desc, deadline: "2026-10-28" }, now)).toBe(MSG.deadlineMin);
    expect(validateNewProject({ title: "T", description: desc, deadline: "2026-10-29" }, now)).toBeNull();
  });
});

describe("profile", () => {
  it("needs 30 + 10 characters in the respective fields", () => {
    expect(profileProblem("x".repeat(29), "y".repeat(80))).toBe(MSG.profileShort);
    expect(profileProblem("x".repeat(90), "y".repeat(9))).toBe(MSG.profileShort);
    expect(profileProblem("x".repeat(30), "y".repeat(10))).toBeNull();
  });
});

describe("estimate", () => {
  it("uses the exact messages", () => {
    expect(checkEstimate("")[1]).toBe("Enter an estimate greater than 0 hours");
    expect(checkEstimate("0")[1]).toBe("Enter an estimate greater than 0 hours");
    expect(checkEstimate("-1")[1]).toBe("Enter an estimate greater than 0 hours");
    expect(checkEstimate("41")[1]).toBe("Estimate must be between 0.5 and 40 hours.");
    expect(checkEstimate("0.25")[1]).toBe("Estimate must be between 0.5 and 40 hours.");
    expect(checkEstimate("2.3")).toEqual([2.5, null]);
    expect(checkEstimate("40")).toEqual([40, null]);
  });
});

describe("responsibilities", () => {
  it("accepts 3–5 unique items up to 80 characters", () => {
    expect(responsibilitiesProblem(["Plan sprints", "Review work", "Ship releases"])).toBeNull();
    expect(responsibilitiesProblem(["a", "b", "c", "d", "e"])).toBeNull();
  });
  it("rejects wrong counts, blanks, long and duplicate items", () => {
    expect(responsibilitiesProblem(["a", "b"])).toBe(MSG.seatResp);
    expect(responsibilitiesProblem(["a", "b", "c", "d", "e", "f"])).toBe(MSG.seatResp);
    expect(responsibilitiesProblem(["a", "  ", "c"])).toBe(MSG.seatResp);
    expect(responsibilitiesProblem(["a", "b", "x".repeat(81)])).toBe(MSG.seatResp);
    expect(responsibilitiesProblem(["Review", "review ", "c"])).toBe(MSG.seatResp);
  });
});
