import { describe, expect, it } from "@jest/globals";

import { evidenceSource, evidenceText } from "@/lib/evidence";

describe("evidence", () => {
  it("says where the file came from", () => {
    expect(evidenceSource("Camera")).toBe("From camera");
    expect(evidenceSource("File: Order 123.pdf")).toBe("From file: Order 123.pdf");
    expect(evidenceSource("Shared from another app")).toBe("Shared from another app");
  });

  it("describes a receipt's proof of purchase for its PDF page", () => {
    expect(evidenceText({})).toBe("None kept");
    expect(evidenceText({ photo: "r1.jpg" })).toBe("Photo of the receipt");
    expect(evidenceText({ photo: "r1.PDF", photoSource: "File: order.pdf" })).toBe(
      "Original PDF file, kept in Keepr, from file: order.pdf",
    );
  });
});
