import { createServerFn } from "@tanstack/react-start";
import { inquirySchema } from "./inquiry.schema";

/**
 * Receives a project inquiry, validates it server-side and forwards it to a
 * confidential endpoint (n8n webhook or internal API) configured via the
 * INQUIRY_WEBHOOK_URL secret. The secret never reaches the browser.
 */
export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inquirySchema.parse(data))
  .handler(async ({ data }) => {
    const webhookUrl = process.env["INQUIRY_WEBHOOK_URL"];
    const payload = {
      source: "vzg-consult.website",
      receivedAt: new Date().toISOString(),
      ...data,
    };

    if (!webhookUrl) {
      // Delivery endpoint not configured yet – accept the request so the UI
      // flow works; wire INQUIRY_WEBHOOK_URL to forward to n8n / CRM.
      console.info("[inquiry] received (no delivery endpoint configured)", {
        company: data.company,
        projectType: data.projectType,
      });
      return { ok: true as const, delivered: false as const };
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("[inquiry] delivery failed", res.status);
      throw new Error("Die Anfrage konnte nicht übermittelt werden.");
    }

    return { ok: true as const, delivered: true as const };
  });
