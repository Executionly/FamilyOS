//
// Called from the client's "Delete Account" confirmation modal.
// Handles three cases:
//   1. Regular member deleting their own account -> tombstone + schedule purge
//   2. Founding admin deleting, with an eligible successor -> transfer + tombstone self
//   3. Founding admin deleting, with NO eligible successor -> cascade the whole family
//
// NOTE: column/table names (user_id, is_founding_admin, name, etc.) are still
// placeholders pending the real schema — grep for "SCHEMA:" comments below
// and adjust to match before deploying.

import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRACE_PERIOD_DAYS = 7;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError("Missing auth header", 401);
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) {
      return jsonError("Invalid session", 401);
    }
    const authUserId = userData.user.id;

    // SCHEMA: assumes `member.user_id` links to auth.users.id
    const { data: member, error: memberErr } = await supabaseAdmin
      .from("member")
      .select("id, family_id, is_founding_admin, email")
      .eq("user_id", authUserId)
      .single();

    if (memberErr || !member) {
      return jsonError("Member not found", 404);
    }

    const scheduledAt = new Date(
      Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    if (!member.is_founding_admin) {
      await tombstoneMember(member.id, authUserId, member.email, scheduledAt);
      return jsonOk({ outcome: "member_deleted", scheduledAt });
    }

    const { data: successorId, error: successorErr } = await supabaseAdmin.rpc(
      "find_successor_admin",
      { p_family_id: member.family_id, p_outgoing_member_id: member.id },
    );

    if (successorErr) {
      return jsonError(`Successor lookup failed: ${successorErr.message}`, 500);
    }

    if (successorId) {
      const { error: transferErr } = await supabaseAdmin
        .from("member")
        .update({ is_founding_admin: true })
        .eq("id", successorId);

      if (transferErr) {
        return jsonError(`Transfer failed: ${transferErr.message}`, 500);
      }

      await tombstoneMember(member.id, authUserId, member.email, scheduledAt);
      await notifySuccessor(successorId);

      return jsonOk({ outcome: "transferred", newAdminId: successorId, scheduledAt });
    }

    await cascadeDeleteFamily(member.family_id, scheduledAt);

    return jsonOk({ outcome: "family_cascade", scheduledAt });
  } catch (err) {
    console.error(err);
    return jsonError("Unexpected error", 500);
  }
});

async function tombstoneMember(
  memberId: string,
  authUserId: string,
  originalEmail: string,
  scheduledAt: string,
) {
  const tombstoneEmail = `deleted_${memberId}@familyos.internal`;

  await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    email: tombstoneEmail,
  });

  await supabaseAdmin
    .from("member")
    .update({
      account_status: "pending_deletion",
      deletion_requested_at: new Date().toISOString(),
      deletion_scheduled_at: scheduledAt,
      email: tombstoneEmail,
    })
    .eq("id", memberId);

    await supabaseAdmin
    .from('profiles')
    .update({ email: tombstoneEmail })
    .eq('id', authUserId);

  await supabaseAdmin.auth.admin.signOut(authUserId, "global");
}

async function cascadeDeleteFamily(familyId: string, scheduledAt: string) {
  // SCHEMA: added `name` here (beyond the original id/user_id/email) purely for
  // email personalization — drop it if that column doesn't exist.
  const { data: members } = await supabaseAdmin
    .from("member")
    .select("id, user_id, email, name")
    .eq("family_id", familyId)
    .not("user_id", "is", null);

  // Captured before tombstoning mutates each member's real email server-side —
  // this array keeps the original addresses for the notification below.
  const membersToNotify = members ?? [];

  for (const m of membersToNotify) {
    await tombstoneMember(m.id, m.user_id, m.email, scheduledAt);
  }

  await supabaseAdmin
    .from("family")
    .update({
      account_status: "pending_deletion",
      deletion_scheduled_at: scheduledAt,
      deletion_reason: membersToNotify.length > 1 ? "no_successor" : "last_member",
    })
    .eq("id", familyId);

  cancelPlayStoreSubscription(familyId)

  await notifyFamilyOfCascade(membersToNotify);
}

// --- Email sending (Resend, same pattern as send-welcome-email) ---

async function sendEmail(to: string, subject: string, html: string) {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fambound <info@fambound.com>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[request-account-deletion] Resend error sending to ${to}: ${error}`);
    }
  } catch (err) {
    // A failed notification email should never block/undo the deletion flow itself
    console.error(`[request-account-deletion] Failed to send email to ${to}:`, err);
  }
}

function emailShell(headline: string, subheadline: string, bodyHtml: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:32px 16px;">
    <tr>
      <td>
        <table width="600" align="center" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #FDE68A;max-width:100%;">
          <tr>
            <td style="background:#0F172A;padding:40px 32px;text-align:center;">
              <p style="color:#F59E0B;font-size:13px;font-weight:700;letter-spacing:2px;margin:0 0 8px;">FAMBOUND</p>
              <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">${headline}</h1>
              <p style="color:#94A3B8;font-size:15px;margin:0;">${subheadline}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFC;padding:20px 32px;text-align:center;border-top:1px solid #E2E8F0;">
              <p style="color:#94A3B8;font-size:12px;margin:0;">Fambound™ · kinos.family</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function notifySuccessor(successorMemberId: string) {
  const { data: successor, error } = await supabaseAdmin
    .from("member")
    .select("email, name") // SCHEMA: adjust if the display-name column differs
    .eq("id", successorMemberId)
    .single();

  if (error || !successor?.email) {
    console.error("[request-account-deletion] Could not load successor for notification:", error);
    return;
  }

  const html = emailShell(
    "You're the founding admin now 👑",
    "The previous account owner has left your family on Fambound.",
    `
      <p style="color:#0F172A;font-size:16px;line-height:1.7;margin:0 0 20px;">
        Hi${successor.name ? ` ${successor.name}` : ""}, the founding admin of your family recently
        deleted their Fambound account. Since you've been with the family the longest, ownership has
        automatically transferred to you.
      </p>
      <p style="color:#0F172A;font-size:16px;line-height:1.7;margin:0 0 20px;">
        As founding admin, you can now manage members, subscriptions, and family settings. Nothing else
        about your family's data has changed — everyone's history, chores, calendar, and memories are
        exactly as they were.
      </p>
    `,
  );

  await sendEmail(successor.email, "You're now the founding admin on Fambound", html);
}

async function notifyFamilyOfCascade(members: { id: string; email: string; name?: string }[]) {
  const html = emailShell(
    "Your family's account is being deleted",
    "This family's account owner has deleted their Fambound account.",
    `
      <p style="color:#0F172A;font-size:16px;line-height:1.7;margin:0 0 20px;">
        The founding admin for your family recently deleted their Fambound account, and there wasn't
        another eligible member to take over as admin. As a result, your entire family's account —
        including chores, calendar events, chat history, and memories — will be permanently deleted in
        7 days.
      </p>
      <p style="color:#0F172A;font-size:16px;line-height:1.7;margin:0 0 20px;">
        If this was unexpected, reach out to the family's previous admin, or contact support if you
        believe this was a mistake.
      </p>
    `,
  );

  await Promise.all(
    members
      .filter((m) => !!m.email)
      .map((m) => sendEmail(m.email, "Your family's Fambound account is being deleted", html)),
  );
}

function jsonOk(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

async function cancelPlayStoreSubscription(familyId: string) {
  const { data: family } = await supabaseAdmin
    .from("family")
    .select("subscription_platform, revenuecat_store_transaction_id")
    .eq("id", familyId)
    .single();

  if (family?.subscription_platform !== "android" || !family.revenuecat_store_transaction_id) {
    return; // iOS has no equivalent API — handled client-side via the manual-cancel deep link instead
  }

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${familyId}/subscriptions/${family.revenuecat_store_transaction_id}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("REVENUECAT_SECRET_API_KEY")}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    console.error(`[request-account-deletion] Failed to cancel Play subscription for ${familyId}: ${await response.text()}`);
  }
}