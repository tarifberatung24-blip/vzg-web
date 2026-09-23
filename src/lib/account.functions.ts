import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { analysisSchema, FREE_ANALYSES } from "./account.schema";

export type AnalysisRow = {
  id: string;
  title: string;
  idea: string;
  targetGroup: string;
  assumptions: string;
  status: string;
  billingKind: string;
  paymentStatus: string;
  amountCents: number;
  createdAt: string;
};

export type AccountOverview = {
  email: string;
  verified: boolean;
  fullName: string;
  company: string;
  country: string;
  freeTotal: number;
  freeUsed: number;
  freeRemaining: number;
  openAmountCents: number;
  analyses: AnalysisRow[];
};

type DbAnalysis = {
  id: string;
  title: string;
  idea: string;
  target_group: string;
  assumptions: string;
  status: string;
  billing_kind: string;
  payment_status: string;
  amount_cents: number;
  created_at: string;
};

function mapAnalysis(row: DbAnalysis): AnalysisRow {
  return {
    id: row.id,
    title: row.title,
    idea: row.idea,
    targetGroup: row.target_group,
    assumptions: row.assumptions,
    status: row.status,
    billingKind: row.billing_kind,
    paymentStatus: row.payment_status,
    amountCents: row.amount_cents,
    createdAt: row.created_at,
  };
}

/**
 * Loads (and on first call creates) the business account profile of the signed
 * in user together with free-credit usage and the status of every analysis.
 */
export const getAccountOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountOverview> => {
    const { supabase, userId } = context;
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const email = user?.email ?? "";
    const verified = Boolean(user?.email_confirmed_at);

    let { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, company, country, free_credits_granted")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      const insert = await supabase
        .from("profiles")
        .insert({
          id: userId,
          email,
          full_name: typeof meta["full_name"] === "string" ? meta["full_name"] : "",
          company: typeof meta["company"] === "string" ? meta["company"] : "",
          country: typeof meta["country"] === "string" ? meta["country"] : "",
        })
        .select("email, full_name, company, country, free_credits_granted")
        .single();
      if (insert.error) throw new Error(insert.error.message);
      profile = insert.data;
    }

    const { data: rows, error } = await supabase
      .from("analyses")
      .select("id, title, idea, target_group, assumptions, status, billing_kind, payment_status, amount_cents, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const analyses = (rows ?? []).map((r) => mapAnalysis(r as DbAnalysis));
    const freeTotal = profile?.free_credits_granted ?? FREE_ANALYSES;
    const freeUsed = analyses.filter((a) => a.billingKind === "frei" && a.status !== "storniert").length;
    const openAmountCents = analyses
      .filter((a) => a.paymentStatus === "offen")
      .reduce((sum, a) => sum + a.amountCents, 0);

    return {
      email,
      verified,
      fullName: profile?.full_name ?? "",
      company: profile?.company ?? "",
      country: profile?.country ?? "",
      freeTotal,
      freeUsed,
      freeRemaining: Math.max(freeTotal - freeUsed, 0),
      openAmountCents,
      analyses,
    };
  });

/**
 * Creates an analysis request. The database decides whether it consumes one of
 * the free credits or is billed at 49,00 € (payment status "offen").
 */
export const createAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => analysisSchema.parse(data))
  .handler(async ({ data, context }): Promise<AnalysisRow> => {
    const { supabase, userId } = context;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.email_confirmed_at) {
      throw new Error("Bitte bestätigen Sie zuerst Ihre geschäftliche E-Mail-Adresse.");
    }

    const { data: row, error } = await supabase
      .from("analyses")
      .insert({
        user_id: userId,
        title: data.title,
        idea: data.idea,
        target_group: data.targetGroup ?? "",
        assumptions: data.assumptions ?? "",
      })
      .select("id, title, idea, target_group, assumptions, status, billing_kind, payment_status, amount_cents, created_at")
      .single();

    if (error) throw new Error(error.message);
    return mapAnalysis(row as DbAnalysis);
  });
