import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CandidateIdCardData,
  renderIdCard,
  generateFrontCardHtml,
  generateBackCardHtml,
  maskSensitiveValue
} from "./idCardRenderer";

describe("Candidate ID Card Renderer (CR80 Standard)", () => {
  const sampleDoctorData: CandidateIdCardData = {
    fullName: "د. أحمد خليل المنصوري",
    jobTitle: "طبيب استشاري باطنية",
    photoUrl: "https://example.com/photos/dr-ahmed.jpg",
    idCardNumber: "DOC-2026-0042",
    passportNumber: "N12345678",
    cocNumber: "COC-98765432",
    medicalExamStatus: "مكتمل",
    organizationName: "مستشفى الأمل التخصصي",
    logoUrl: "",
    issueDate: "2026-01-15",
    expiryDate: "2028-01-15"
  };

  it("conforms strictly to CandidateIdCardData schema with all 7 required fields", () => {
    assert.equal(typeof sampleDoctorData.fullName, "string");
    assert.equal(typeof sampleDoctorData.jobTitle, "string");
    assert.equal(typeof sampleDoctorData.photoUrl, "string");
    assert.equal(typeof sampleDoctorData.idCardNumber, "string");
    assert.equal(typeof sampleDoctorData.passportNumber, "string");
    assert.equal(typeof sampleDoctorData.cocNumber, "string");
    assert.equal(typeof sampleDoctorData.medicalExamStatus, "string");

    // Optional fields
    assert.equal(typeof sampleDoctorData.organizationName, "string");
    assert.equal(typeof sampleDoctorData.logoUrl, "string");
    assert.equal(typeof sampleDoctorData.issueDate, "string");
    assert.equal(typeof sampleDoctorData.expiryDate, "string");
  });

  it("masks sensitive passport and COC numbers correctly", () => {
    assert.equal(maskSensitiveValue("N12345678"), "•••• 5678");
    assert.equal(maskSensitiveValue("COC-98765432"), "•••• 5432");
    assert.equal(maskSensitiveValue("1234"), "1234");
    assert.equal(maskSensitiveValue(""), "----");
  });

  it("renders front card with full name, job title, and ID card number", () => {
    const frontHtml = generateFrontCardHtml(sampleDoctorData);
    assert.ok(frontHtml.includes("د. أحمد خليل المنصوري"));
    assert.ok(frontHtml.includes("طبيب استشاري باطنية"));
    assert.ok(frontHtml.includes("DOC-2026-0042"));
    assert.ok(frontHtml.includes("بطاقة تعريف مهنية"));
    assert.ok(frontHtml.includes("cr80-card-front"));
  });

  it("renders back card with passport, COC, medical badge, and ID repetition", () => {
    const backHtml = generateBackCardHtml(sampleDoctorData, { maskSensitiveData: false });
    assert.ok(backHtml.includes("N12345678"));
    assert.ok(backHtml.includes("COC-98765432"));
    assert.ok(backHtml.includes("DOC-2026-0042"));
    assert.ok(backHtml.includes("مكتمل (لائق طبياً)"));
    assert.ok(backHtml.includes("cr80-badge-success"));
    assert.ok(backHtml.includes("cr80-card-back"));
  });

  it("renders back card with masked data when maskSensitiveData is true", () => {
    const maskedBackHtml = generateBackCardHtml(sampleDoctorData, { maskSensitiveData: true });
    assert.ok(maskedBackHtml.includes("•••• 5678"));
    assert.ok(maskedBackHtml.includes("•••• 5432"));
    assert.ok(!maskedBackHtml.includes("N12345678"));
    assert.ok(!maskedBackHtml.includes("COC-98765432"));
  });

  it("renders correct badges for different medical exam statuses", () => {
    const completedHtml = generateBackCardHtml({
      ...sampleDoctorData,
      medicalExamStatus: "مكتمل"
    });
    assert.ok(completedHtml.includes("cr80-badge-success"));

    const pendingHtml = generateBackCardHtml({
      ...sampleDoctorData,
      medicalExamStatus: "قيد المراجعة"
    });
    assert.ok(pendingHtml.includes("cr80-badge-warning"));

    const incompleteHtml = generateBackCardHtml({
      ...sampleDoctorData,
      medicalExamStatus: "غير مكتمل"
    });
    assert.ok(incompleteHtml.includes("cr80-badge-danger"));
  });

  it("escapes user-controlled HTML and rejects unsafe image URLs", () => {
    const maliciousHtml = generateFrontCardHtml({
      ...sampleDoctorData,
      fullName: '<img src=x onerror="alert(1)">',
      jobTitle: '"><script>alert(1)</script>',
      photoUrl: 'javascript:alert(1)',
      organizationName: '<svg onload="alert(1)">'
    });
    assert.ok(!maliciousHtml.includes('<script>alert(1)</script>'));
    assert.ok(!maliciousHtml.includes('<img src=x onerror='));
    assert.ok(!maliciousHtml.includes('javascript:alert(1)'));
    assert.ok(!generateFrontCardHtml({
      ...sampleDoctorData,
      photoUrl: 'data:image/svg+xml,<svg onload="alert(1)"></svg>'
    }).includes('data:image/svg+xml'));
    assert.ok(maliciousHtml.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'));
    assert.ok(maliciousHtml.includes('&lt;svg onload=&quot;alert(1)&quot;&gt;'));
  });

  it("renderIdCard injects standard CR80 styles and container into DOM element", () => {
    // Mock DOM root
    const mockElement = { innerHTML: "" } as unknown as HTMLElement;
    renderIdCard(mockElement, sampleDoctorData, { side: "both" });

    assert.ok(mockElement.innerHTML.includes("cr80-wrapper"));
    assert.ok(mockElement.innerHTML.includes("85.6mm"));
    assert.ok(mockElement.innerHTML.includes("54mm"));
    assert.ok(mockElement.innerHTML.includes("cr80-card-front"));
    assert.ok(mockElement.innerHTML.includes("cr80-card-back"));
  });
});
