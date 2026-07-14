const RESEND_ENDPOINT = "https://api.resend.com/emails";
const MAX_FIELD_LENGTH = 4000;

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });

const clean = (value) => String(value ?? "").trim().slice(0, MAX_FIELD_LENGTH);

const buildEmailBody = (fields) =>
  [
    "신앤 F&B 상담 신청이 접수되었습니다.",
    "",
    `상담 유형: ${fields.type}`,
    `성함/회사명: ${fields.name}`,
    `연락처: ${fields.phone || "-"}`,
    `이메일: ${fields.email || "-"}`,
    `희망 지역/매장: ${fields.region || "-"}`,
    "",
    "문의 내용:",
    fields.message
  ].join("\n");

export async function onRequestPost({ request, env }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  // Honeypot: bots tend to fill every field, real users never see or fill this one.
  if (clean(payload.company_website)) {
    return jsonResponse({ ok: true });
  }

  const fields = {
    type: clean(payload.type),
    name: clean(payload.name),
    phone: clean(payload.phone),
    email: clean(payload.email),
    region: clean(payload.region),
    message: clean(payload.message)
  };

  if (!fields.type || !fields.name || !fields.message || !payload.consent) {
    return jsonResponse({ ok: false, error: "missing_required_fields" }, 400);
  }
  if (!fields.phone && !fields.email) {
    return jsonResponse({ ok: false, error: "missing_contact_channel" }, 400);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL || !env.CONTACT_FROM_EMAIL) {
    return jsonResponse({ ok: false, error: "email_not_configured" }, 500);
  }

  const resendResponse = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `신앤 F&B 홈페이지 <${env.CONTACT_FROM_EMAIL}>`,
      to: [env.CONTACT_TO_EMAIL],
      reply_to: fields.email || undefined,
      subject: `[신앤 F&B 상담] ${fields.type} - ${fields.name}`,
      text: buildEmailBody(fields)
    })
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text();
    console.error("Resend send failed", resendResponse.status, detail);
    return jsonResponse({ ok: false, error: "send_failed" }, 502);
  }

  return jsonResponse({ ok: true });
}

export async function onRequestGet() {
  return jsonResponse({ ok: false, error: "method_not_allowed" }, 405);
}
