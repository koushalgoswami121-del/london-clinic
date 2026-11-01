const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

exports.notifyNewAppointment = onDocumentCreated(
  {
    document: "appointmentRequests/{requestId}",
    region: "europe-west2",
    secrets: [RESEND_API_KEY]
  },
  async (event) => {
    const booking = event.data?.data();
    if (!booking) return;

    const clinicEmail = process.env.CLINIC_NOTIFICATION_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!clinicEmail || !fromEmail) {
      console.error("Set CLINIC_NOTIFICATION_EMAIL and RESEND_FROM_EMAIL in functions environment.");
      return;
    }

    const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, c =>
      ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const preferred = escapeHtml(booking.appointmentDateTime || "Not supplied");
    const name = escapeHtml(booking.name || "");
    const phone = escapeHtml(booking.phone || "");
    const email = escapeHtml(booking.email || "Not supplied");
    const concern = escapeHtml(booking.concern || "");

    const clinicHtml = `
      <h2>New appointment request</h2>
      <p><b>Name:</b> ${name}</p>
      <p><b>Phone:</b> ${phone}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Reason:</b> ${concern}</p>
      <p><b>Preferred date &amp; time:</b> ${preferred}</p>
      <p><b>Status:</b> Pending clinic confirmation</p>
      <p>Open your staff dashboard to review and update this request.</p>`;

    const sendEmail = async (to, subject, html) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ from: fromEmail, to: [to], subject, html })
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Resend error ${response.status}: ${details}`);
      }
      return response.json();
    };

    await sendEmail(clinicEmail, `New appointment request — ${booking.name}`, clinicHtml);

    if (booking.email) {
      const patientHtml = `
        <p>Hello ${name},</p>
        <p>Thank you for contacting The London Clinic. We have received your appointment request.</p>
        <p><b>Preferred date &amp; time:</b> ${preferred}</p>
        <p>This is a request only, not a confirmed appointment. Our team will contact you to confirm availability.</p>
        <p>The London Clinic</p>`;
      await sendEmail(booking.email, "We received your appointment request", patientHtml);
    }
  }
);
