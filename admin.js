import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const bookingsEl = document.getElementById("bookings");
const countEl = document.getElementById("count");
const filterEl = document.getElementById("statusFilter");
const notice = document.getElementById("notice");

function showNotice(message, isError=false) {
  notice.textContent = message;
  notice.className = isError ? "notice error" : "notice";
  notice.style.display = "block";
}
function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function prettyDate(value) {
  if (!value) return "Not supplied";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-GB", {dateStyle:"medium",timeStyle:"short",timeZone:"Europe/London"});
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  document.getElementById("loginError").textContent = "";
  try {
    await signInWithEmailAndPassword(auth, document.getElementById("loginEmail").value.trim(), document.getElementById("loginPassword").value);
  } catch (error) {
    document.getElementById("loginError").textContent = "Sign-in failed. Check your details and staff access.";
  } finally { button.disabled = false; }
});
document.getElementById("signOut").addEventListener("click", () => signOut(auth));
document.getElementById("refresh").addEventListener("click", loadBookings);
filterEl.addEventListener("change", loadBookings);

onAuthStateChanged(auth, async user => {
  loginView.hidden = !!user;
  dashboardView.hidden = !user;
  if (user) {
    try {
     if (user.email !== "koushalgoswami111@gmail.com") {
        await signOut(auth);
        document.getElementById("loginError").textContent = "This account is not authorised for the staff dashboard.";
        return;
      }
      await loadBookings();
    } catch (error) {
      showNotice("Could not load dashboard. Check Firestore rules and admin access.", true);
    }
  }
});

async function loadBookings() {
  bookingsEl.innerHTML = '<div class="empty">Loading appointment requests…</div>';
  try {
    const q = query(collection(db, "appointmentRequests"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const statusFilter = filterEl.value;
    const records = snapshot.docs.map(item => ({id:item.id,...item.data()}))
      .filter(item => statusFilter === "all" || item.status === statusFilter);
    countEl.textContent = `${records.length} request${records.length === 1 ? "" : "s"}`;
    if (!records.length) {
      bookingsEl.innerHTML = '<div class="empty">No appointment requests in this view.</div>';
      return;
    }
    bookingsEl.innerHTML = records.map(item => `
      <article class="booking">
        <div>
          <h3>${escapeHtml(item.name || "Unnamed patient")}</h3>
          <div class="meta">
            <span>☎ ${escapeHtml(item.phone || "No phone")}</span>
            ${item.email ? `<span>✉ ${escapeHtml(item.email)}</span>` : ""}
            <span>Reason: ${escapeHtml(item.concern || "Not specified")}</span>
            <span>Preferred: ${escapeHtml(prettyDate(item.appointmentDateTime))}</span>
            <span>Received: ${escapeHtml(item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString("en-GB",{timeZone:"Europe/London"}) : "Just received")}</span>
          </div>
          <p><span class="pill">${escapeHtml(item.status || "pending")}</span></p>
        </div>
        <div class="actions">
          <select aria-label="Update booking status" data-status-id="${escapeHtml(item.id)}">
            <option value="pending" ${item.status==="pending"?"selected":""}>Pending</option>
            <option value="contacted" ${item.status==="contacted"?"selected":""}>Contacted</option>
            <option value="confirmed" ${item.status==="confirmed"?"selected":""}>Confirmed</option>
            <option value="declined" ${item.status==="declined"?"selected":""}>Declined</option>
          </select>
          <button class="btn secondary" data-save-id="${escapeHtml(item.id)}">Save</button>
        </div>
      </article>`).join("");

    bookingsEl.querySelectorAll("[data-save-id]").forEach(button => {
      button.addEventListener("click", async () => {
        const id = button.dataset.saveId;
        const select = bookingsEl.querySelector(`[data-status-id="${CSS.escape(id)}"]`);
        button.disabled = true;
        try {
          await updateDoc(doc(db, "appointmentRequests", id), {
            status: select.value,
            updatedAt: serverTimestamp(),
            updatedBy: auth.currentUser.uid
          });
          showNotice("Booking status updated.");
          await loadBookings();
        } catch (error) {
          showNotice("Could not update status. Check your admin permissions.", true);
          button.disabled = false;
        }
      });
    });
  } catch (error) {
    console.error(error);
    bookingsEl.innerHTML = '<div class="empty">Unable to load bookings. Verify the Firestore database and admin permissions.</div>';
    countEl.textContent = "Could not load";
  }
}
