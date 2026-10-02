// Mobile menu toggle
const side = document.getElementById('side');
const mb = document.getElementById('mb');

mb.onclick = function() {
  const open = side.classList.toggle('open');
  mb.setAttribute('aria-expanded', open);
  mb.textContent = open ? 'Close' : 'Menu';
};

// Page navigation (hash-based routing)
function showPage() {
  const hash = location.hash || '#home';
  const pageId = hash.slice(1);
  const pageEl = document.getElementById(pageId);
  const target = pageEl ? pageId : 'home';

  // Toggle page visibility
  document.querySelectorAll('.page').forEach((p) => {
    p.classList.toggle('on', p.id === target);
  });

  // Update nav links
  document.querySelectorAll('.side nav a').forEach((a) => {
    a.classList.toggle('on', a.getAttribute('href') === '#' + target);
  });

  // Close mobile menu
  if (side) side.classList.remove('open');
  if (mb) mb.textContent = 'Menu';
  scrollTo(0, 0);
}

addEventListener('hashchange', showPage);
showPage();

// Existing contact form handler
const contactForm = document.getElementById('f');
if (contactForm) {
  contactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const ok = document.getElementById('ok');
    ok.style.display = 'block';
    this.reset();
    setTimeout(() => ok.style.display = 'none', 5000);
  });
}

// --- Booking system JS ---
const bookingApiBase = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://lumiere-bridal.mishwanth19.workers.dev';  // On Pages, same origin

const servicePrices = {
  'Bridal makeup': 20000,
  'Hair and draping': 7000,
  'Engagement and reception': 10000,
  'Family and guests': 3500,
  'Private lesson': 4500
};

const clientNameEl = document.getElementById('client-name');
const clientPhoneEl = document.getElementById('client-phone');
const clientEmailEl = document.getElementById('client-email');
const serviceEl = document.getElementById('booking-service');
const weddingDateEl = document.getElementById('wedding-date');
const slotPicker = document.getElementById('slot-picker');
const slotsContainerEl = document.querySelector('.slots-container');
const selectedSlotEl = document.getElementById('selected-slot');
const bookBtn = document.getElementById('book-btn');
const bookingStatusEl = document.getElementById('booking-status');
const quotePriceEl = document.querySelector('.quote-price');

// Update price when service changes
function updateQuote() {
  const service = serviceEl?.value || 'Bridal makeup';
  const price = servicePrices[service] || 0;
  if (quotePriceEl) quotePriceEl.textContent = `₹${price.toLocaleString('en-IN')} + GST`;
}

serviceEl?.addEventListener('change', updateQuote);
weddingDateEl?.addEventListener('change', fetchSlots);

// Fetch available slots from API
async function fetchSlots() {
  const date = weddingDateEl.value;
  const service = serviceEl.value;
  if (!date) return;

  slotsContainerEl.innerHTML = '<p class="loading">Checking availability...</p>';
  selectedSlotEl.value = '';

  try {
    const res = await fetch(`${bookingApiBase}/api/availability?service=${encodeURIComponent(service)}&date=${date}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch');

    if (data.available.length === 0) {
      slotsContainerEl.innerHTML = '<p class="no-slots">No slots available for this date.</p>';
    } else {
      slotsContainerEl.innerHTML = data.available.map(formatSlot).join('');
      attachSlotListeners();
    }
  } catch (err) {
    slotsContainerEl.innerHTML = `<p class="error">Error: ${err.message}</p>`;
  }
}

// Format a time slot button
function formatSlot(time) {
  return `<button type="button" class="slot-btn" data-slot="${time}">
    ${time.replace(':', '.00 ')}
  </button>`;
}

// Format "09:00" → "09.00 AM" or "14:00" → "02.00 PM"
function formatSlot(time) {
  let [h, m] = time.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `<button type="button" class="slot-btn" data-slot="${time}">
    ${String(hour).padStart(2, '0')}.${String(m).padStart(2, '0')} ${ampm}
  </button>`;
}

// Attach click listeners to slot buttons
function attachSlotListeners() {
  document.querySelectorAll('.slot-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.slot-btn').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedSlotEl.value = btn.dataset.slot;
    });
  });
}

// Book appointment
bookBtn?.addEventListener('click', async (e) => {
  e.preventDefault();

  const name = clientNameEl.value;
  const phone = clientPhoneEl.value;
  const service = serviceEl.value;
  const eventDate = weddingDateEl.value;
  const slot = selectedSlotEl.value;
  const inputs = document.getElementById('client-inputs').value;

  if (!name || !phone || !service || !eventDate || !slot) {
    showBookingStatus('Please fill all fields and select a time slot.', 'error');
    return;
  }

  bookBtn.disabled = true;
  bookBtn.textContent = 'Booking…';

  try {
    const res = await fetch(`${bookingApiBase}/api/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: name,
        client_phone: phone,
        client_email: clientEmailEl.value,
        service: service,
        event_date: eventDate,
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: slot,
        inputs_text: inputs,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showBookingStatus(`✅ ${data.message}`, 'success');
      // Reset form
      clientNameEl.value = '';
      clientPhoneEl.value = '';
      clientEmailEl.value = '';
      weddingDateEl.value = '';
      document.getElementById('client-inputs').value = '';
      slotsContainerEl.innerHTML = '';
      selectedSlotEl.value = '';
    } else {
      showBookingStatus(`❌ ${data.error || 'Booking failed'}`, 'error');
    }
  } catch (err) {
    showBookingStatus(`❌ Network error. Please try again.`, 'error');
  } finally {
    bookBtn.disabled = false;
    bookBtn.textContent = 'Check Availability & Book';
  }
});

function showBookingStatus(message, className) {
  bookingStatusEl.textContent = message;
  bookingStatusEl.className = className;
  bookingStatusEl.style.display = 'block';
  setTimeout(() => { bookingStatusEl.style.display = 'none'; }, 5000);
}