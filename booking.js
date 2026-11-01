import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById("bookingForm");
const submitButton = form?.querySelector('button[type="submit"]');
const success = document.getElementById("success");
const errorBox = document.getElementById("bookingError");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  success.style.display = "none";
  errorBox.style.display = "none";

  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const phone = String(data.get("phone") || "").trim();
  const email = String(data.get("email") || "").trim();
  const concern = String(data.get("concern") || "").trim();
  const appointmentDateTime = String(data.get("appointmentDateTime") || "").trim();

  if (!name || !phone || !concern || !appointmentDateTime) {
    errorBox.textContent = "Please complete all required fields.";
    errorBox.style.display = "block";
    return;
  }

  // Keep this form limited to appointment logistics. Do not collect symptoms or clinical history here.
  const booking = {
    name,
    phone,
    email: email || null,
    concern,
    appointmentDateTime,
    status: "pending",
    source: "website",
    createdAt: serverTimestamp()
  };

  submitButton.disabled = true;
  submitButton.textContent = "Sending request…";

try {
  // First save the booking to Firebase
  const bookingRef = await addDoc(
    collection(db, "appointmentRequests"),
    booking
  );

  console.log("Booking saved:", bookingRef.id);

  // Then send email notification through Vercel API
  try {
    const emailResponse = await fetch("/api/send-booking-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(booking)
    });

    if (!emailResponse.ok) {
      console.error("Booking saved, but email notification failed.");
    } else {
      console.log("Email notification sent.");
    }
  } catch (emailError) {
    console.error("Email notification error:", emailError);
  }

  // Reset the form
  form.reset();

  const dateTimeWrap = document.querySelector(".datetime-picker");
  dateTimeWrap?.classList.remove("has-value");

  success.textContent =
    "Your request has been sent to the clinic. The team will contact you to confirm the appointment.";

  success.style.display = "block";

} catch (error) {
  console.error("Appointment request failed:", error);

  errorBox.textContent =
    "We couldn't send your request. Please try again in a moment or contact the clinic through its website.";

  errorBox.style.display = "block";

} finally {
  submitButton.disabled = false;
  submitButton.textContent = "Send appointment request ↗";
}

  } catch (error) {
    console.error("Appointment request failed:", error);
    errorBox.textContent = "We couldn't send your request just now. Please call the clinic directly on 020 7946 0821.";
    errorBox.style.display = "block";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Send appointment request ↗";
  }
});
