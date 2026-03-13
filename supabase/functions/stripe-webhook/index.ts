import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Service-role client (bypasses RLS for webhook writes)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, webhookSecret);
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;

        if (session.mode === "payment") {
          // Lifetime purchase
          await upsertSubscription(userId, {
            stripe_customer_id: session.customer as string,
            plan: "lifetime",
            status: "active",
            stripe_subscription_id: null,
            current_period_end: null,
          });
        }
        // Subscription mode handled by customer.subscription.created
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
        const userId = customer.metadata?.supabase_user_id;
        if (!userId) break;

        await upsertSubscription(userId, {
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          plan: sub.status === "active" || sub.status === "trialing" ? "pro" : "free",
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
        const userId = customer.metadata?.supabase_user_id;
        if (!userId) break;

        await upsertSubscription(userId, {
          stripe_customer_id: sub.customer as string,
          stripe_subscription_id: sub.id,
          plan: "free",
          status: "cancelled",
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;
        const sub = await stripe.subscriptions.retrieve(invoice.subscription as string);
        const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
        const userId = customer.metadata?.supabase_user_id;
        if (!userId) break;

        await supabase
          .from("user_subscriptions")
          .update({ status: "past_due" })
          .eq("user_id", userId);
        break;
      }
    }
  } catch (e) {
    console.error("Webhook handler error:", e);
    return new Response("Handler error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
});

async function upsertSubscription(userId: string, data: Record<string, unknown>) {
  const { error } = await supabase
    .from("user_subscriptions")
    .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });
  if (error) console.error("upsert error:", error);
}
