// Configure the Worker URL here when Pages and Workers use different domains.
const bookingApiBase = window.BOOKING_API_BASE || (window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://lumiere-bridal.mishwanth19.workers.dev');

// Mobile menu toggle
const side = document.getElementById('side');
const mb = document.getElementById('mb');

mb.onclick = function() {
  const open = side.classList.toggle('open');
  mb.setAttribute('aria-expanded', open);
  mb.textContent = open ? 'Close' : 'Menu';
};

// Navigation modes: pages (one section at a time) vs scroll (single long page)
const MODE_KEY = 'lumiereNavMode';
let navMode = localStorage.getItem(MODE_KEY) || 'pages';

function setNavMode(mode) {
  navMode = mode === 'scroll' ? 'scroll' : 'pages';
  localStorage.setItem(MODE_KEY, navMode);
  document.body.classList.remove('mode-pages', 'mode-scroll');
  document.body.classList.add(navMode === 'scroll' ? 'mode-scroll' : 'mode-pages');

  document.querySelectorAll('.mode-btn').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.mode === navMode);
  });

  // Re-apply current route in the selected mode
  showPage({ preserveScroll: navMode === 'scroll' });
}

function showPage(options = {}) {
  const hash = location.hash || '#home';
  const pageId = hash.slice(1) || 'home';
  const pageEl = document.getElementById(pageId);
  const target = pageEl ? pageId : 'home';

  if (navMode === 'pages') {
    document.querySelectorAll('.page').forEach((p) => {
      p.classList.toggle('on', p.id === target);
    });
    if (!options.preserveScroll) scrollTo(0, 0);
  } else {
    // Scroll mode: all marketing pages visible; snap to target
    document.querySelectorAll('.page').forEach((p) => p.classList.add('on'));
    const el = document.getElementById(target);
    if (el) {
      // Wait a tick so layout is visible before scrolling
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: options.instant ? 'auto' : 'smooth', block: 'start' });
      });
    }
  }

  document.querySelectorAll('.side nav a').forEach((a) => {
    a.classList.toggle('on', a.getAttribute('href') === '#' + target);
  });

  if (side) side.classList.remove('open');
  if (mb) {
    mb.textContent = 'Menu';
    mb.setAttribute('aria-expanded', 'false');
  }

  if (target === 'admin-dashboard') {
    loadAdminDashboard('today');
  }
}

document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => setNavMode(btn.dataset.mode));
});

addEventListener('hashchange', () => showPage());
setNavMode(navMode);

// Existing contact form handler
const contactForm = document.getElementById('f');
if (contactForm) {
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = {
      name: formData.get('name') || this.querySelector('input[autocomplete="name"]').value,
      phone: formData.get('phone') || this.querySelectorAll('input[type="tel"]')[0].value,
      service: formData.get('service') || this.querySelector('#contact-service').value,
      event_date: formData.get('event_date') || this.querySelectorAll('input[type="date"]')[0].value,
      inputs_text: this.querySelector('textarea').value
    };

    const submitBtn = this.querySelector('button[type="submit"]');
    const ok = document.getElementById('ok');
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const res = await fetch(`${bookingApiBase}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      const result = await res.json();

      if (res.ok) {
        ok.textContent = result.message || 'Thank you. We will call you within 24 hours.';
        ok.style.display = 'block';
        this.reset();
        setTimeout(() => ok.style.display = 'none', 5000);
      } else {
        alert(`Error: ${result.error || 'Failed to send request'}`);
      }
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send request';
    }
  });
}

// --- Booking system JS ---
let servicesData = [];
const servicePrices = {};

// Load services from API
async function loadServices() {
  try {
    const res = await fetch(`${bookingApiBase}/api/services`);
    const data = await res.json();
    
    if (res.ok && data.ok) {
      servicesData = data.services;
      
      // Build service prices object
      servicesData.forEach(service => {
        servicePrices[service.name] = service.price;
      });
      
      // Populate service dropdowns
      const serviceSelects = document.querySelectorAll('#booking-service, select[name="service"]');
      serviceSelects.forEach(select => {
        // Save current selection
        const currentValue = select.value;
        
        // Clear existing options
        select.innerHTML = '';
        
        // Add new options
        servicesData.forEach(service => {
          const option = document.createElement('option');
          option.value = service.name;
          option.textContent = service.name;
          select.appendChild(option);
        });
        
        // Restore selection if possible
        if (currentValue) {
          select.value = currentValue;
        }
      });
      
      // Update services page pricing
      updateServicesPagePricing();
    }
  } catch (err) {
    console.error('Failed to load services:', err);
    // Fallback to hardcoded services if API fails
    servicesData = [
      { name: 'Bridal makeup', price: 20000 },
      { name: 'Hair and draping', price: 7000 },
      { name: 'Engagement and reception', price: 10000 },
      { name: 'Family and guests', price: 3500 },
      { name: 'Private lesson', price: 4500 }
    ];
    servicesData.forEach(service => {
      servicePrices[service.name] = service.price;
    });
  }
}

// Update services page pricing dynamically
function updateServicesPagePricing() {
  const serviceRows = document.querySelectorAll('#services .row');
  if (serviceRows.length > 0 && servicesData.length > 0) {
    serviceRows.forEach((row, index) => {
      if (servicesData[index]) {
        const priceEl = row.querySelector('.price');
        if (priceEl) {
          priceEl.textContent = `₹${servicesData[index].price.toLocaleString('en-IN')}`;
        }
      }
    });
  }
}

// Load services on page load
loadServices();

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
    const res = await fetch(`${bookingApiBase}/api/availability?service=${encodeURIComponent(service)}&date=${encodeURIComponent(date)}`);
    const data = await res.json();
    if (!res.ok) throw new Error('Availability request failed');
    if (!data || !Array.isArray(data.available)) throw new Error('Invalid availability response');

    if (data.available.length === 0) {
      const message = document.createElement('p');
      message.className = 'no-slots';
      message.textContent = 'No slots available for this date.';
      slotsContainerEl.replaceChildren(message);
    } else {
      const buttons = data.available.map(formatSlot).filter(Boolean);
      slotsContainerEl.replaceChildren(...buttons);
      attachSlotListeners();
    }
  } catch {
    const message = document.createElement('p');
    message.className = 'error';
    message.textContent = 'Unable to check availability. Please try again.';
    slotsContainerEl.replaceChildren(message);
  }
}

// Build slot buttons with DOM APIs; never interpolate API data into HTML.
function formatSlot(time) {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [h, m] = time.split(':').map(Number);
  const ampm = h < 12 ? 'AM' : 'PM';
  const hour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'slot-btn';
  button.dataset.slot = time;
  button.textContent = `${String(hour).padStart(2, '0')}.${String(m).padStart(2, '0')} ${ampm}`;
  return button;
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
      credentials: 'include',
      body: JSON.stringify({
        client_name: name,
        client_phone: phone,
        client_email: clientEmailEl.value,
        service: service,
        event_date: eventDate,
        appointment_date: eventDate,
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

// --- Client appointment access ---
const lookupPhoneEl = document.getElementById('client-lookup-phone');
const clientOtpEl = document.getElementById('client-otp');
const requestClientOtpBtn = document.getElementById('request-client-otp-btn');
const lookupBtn = document.getElementById('lookup-appointments-btn');
const clientAuthStatusEl = document.getElementById('client-auth-status');
const appointmentsLoadingEl = document.getElementById('appointments-loading');
const appointmentsResultsEl = document.getElementById('appointments-results');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setClientAuthStatus(message, type = '') {
  clientAuthStatusEl.textContent = message;
  clientAuthStatusEl.className = type;
}

requestClientOtpBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  const phone = lookupPhoneEl.value.trim();
  if (!phone) {
    setClientAuthStatus('Please enter your phone number.', 'error');
    return;
  }

  requestClientOtpBtn.disabled = true;
  requestClientOtpBtn.textContent = 'Sending...';
  try {
    const res = await fetch(`${bookingApiBase}/api/auth/customer/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (res.ok) {
      setClientAuthStatus(data.message || 'Verification code sent.', 'success');
    } else {
      setClientAuthStatus(data.error || 'Could not send verification code.', 'error');
    }
  } catch {
    setClientAuthStatus('Network error. Please try again.', 'error');
  } finally {
    requestClientOtpBtn.disabled = false;
    requestClientOtpBtn.textContent = 'Send verification code';
  }
});

async function verifyCustomerOtp() {
  const phone = lookupPhoneEl.value.trim();
  const code = clientOtpEl.value.trim();
  if (!phone || !code) return false;

  const res = await fetch(`${bookingApiBase}/api/auth/customer/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ phone, code })
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    setClientAuthStatus(data.error || 'Invalid verification code.', 'error');
    return false;
  }
  setClientAuthStatus('Verified.', 'success');
  return true;
}

lookupBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  const phone = lookupPhoneEl.value.trim();
  const code = clientOtpEl.value.trim();
  if (!phone || !code) {
    setClientAuthStatus('Enter your phone number and verification code.', 'error');
    return;
  }

  lookupBtn.disabled = true;
  lookupBtn.textContent = 'Loading...';
  appointmentsLoadingEl.style.display = 'block';
  appointmentsResultsEl.textContent = '';

  try {
    const verified = await verifyCustomerOtp();
    if (!verified) return;

    const res = await fetch(`${bookingApiBase}/api/client-view`, {
      credentials: 'include'
    });
    const data = await res.json();

    if (res.ok && data.ok) {
      if (data.count === 0) {
        appointmentsResultsEl.textContent = 'No appointments found.';
      } else {
        appointmentsResultsEl.innerHTML = `
          <h3>Your Appointments (${data.count})</h3>
          <div class="appointments-list">
            ${data.bookings.map(appt => `
              <div class="appointment-card" style="border:1px solid #ddd; padding:15px; margin:10px 0; border-radius:8px;">
                <h4>${escapeHtml(appt.serviceId)}</h4>
                <p><strong>Event Date:</strong> ${escapeHtml(appt.eventDate || '—')}</p>
                <p><strong>Appointment:</strong> ${escapeHtml(appt.appointmentDate)} at ${escapeHtml(appt.appointmentTime)}</p>
                <p><strong>Status:</strong> <span class="status-${escapeHtml(appt.status)}">${escapeHtml(appt.status.toUpperCase())}</span></p>
                ${appt.notes ? `<p><strong>Notes:</strong> ${escapeHtml(appt.notes)}</p>` : ''}
              </div>
            `).join('')}
          </div>
        `;
      }
    } else {
      appointmentsResultsEl.textContent = data.error || 'Failed to fetch appointments.';
    }
  } catch {
    appointmentsResultsEl.textContent = 'Network error. Please try again.';
  } finally {
    lookupBtn.disabled = false;
    lookupBtn.textContent = 'View My Appointments';
    appointmentsLoadingEl.style.display = 'none';
  }
});

// --- Admin authentication and dashboard ---
let adminAuthenticated = false;

const adminUsernameEl = document.getElementById('admin-username');
const adminPasswordEl = document.getElementById('admin-password');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLoginStatusEl = document.getElementById('admin-login-status');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const adminLoadingEl = document.getElementById('admin-loading');
const adminResultsEl = document.getElementById('admin-results');

async function checkAdminAuth() {
  try {
    const res = await fetch(`${bookingApiBase}/api/auth/verify`, { credentials: 'include' });
    adminAuthenticated = res.ok;
  } catch {
    adminAuthenticated = false;
  }
  if (adminAuthenticated && location.hash === '#admin-login') {
    location.hash = '#admin-dashboard';
  }
}

adminLoginBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  const username = adminUsernameEl.value.trim();
  const password = adminPasswordEl.value;

  if (!username || !password) {
    adminLoginStatusEl.textContent = 'Please enter username and password';
    adminLoginStatusEl.className = 'error';
    return;
  }

  adminLoginBtn.disabled = true;
  adminLoginBtn.textContent = 'Logging in...';

  try {
    const res = await fetch(`${bookingApiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (res.ok && data.ok) {
      adminAuthenticated = true;
      adminLoginStatusEl.textContent = 'Login successful! Redirecting...';
      adminLoginStatusEl.className = 'success';
      setTimeout(() => { location.hash = '#admin-dashboard'; }, 500);
    } else {
      adminLoginStatusEl.textContent = data.error || 'Login failed';
      adminLoginStatusEl.className = 'error';
    }
  } catch {
    adminLoginStatusEl.textContent = 'Network error. Please try again.';
    adminLoginStatusEl.className = 'error';
  } finally {
    adminLoginBtn.disabled = false;
    adminLoginBtn.textContent = 'Login';
  }
});

adminLogoutBtn?.addEventListener('click', async () => {
  try {
    await fetch(`${bookingApiBase}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  } finally {
    adminAuthenticated = false;
    location.hash = '#admin-login';
  }
});

async function loadAdminDashboard(view = 'today') {
  if (!adminAuthenticated) {
    await checkAdminAuth();
    if (!adminAuthenticated) {
      location.hash = '#admin-login';
      return;
    }
  }

  adminLoadingEl.style.display = 'block';
  adminResultsEl.textContent = '';

  try {
    const res = await fetch(`${bookingApiBase}/api/admin-view?view=${encodeURIComponent(view)}&limit=50`, {
      credentials: 'include'
    });
    const data = await res.json();

    if (res.ok && data.ok) {
      if (data.count === 0) {
        adminResultsEl.textContent = 'No appointments found.';
      } else {
        adminResultsEl.innerHTML = `
          <h3>${escapeHtml(view.charAt(0).toUpperCase() + view.slice(1))} Appointments (${data.count})</h3>
          <div class="admin-appointments-list">
            ${data.appointments.map(appt => `
              <div class="admin-appointment-card" style="border:1px solid #ddd; padding:15px; margin:10px 0; border-radius:8px;">
                <h4>${escapeHtml(appt.service)}</h4>
                <p><strong>Client:</strong> ${escapeHtml(appt.client_name)} (${escapeHtml(appt.client_phone)})</p>
                <p><strong>Event Date:</strong> ${escapeHtml(appt.event_date || '—')}</p>
                <p><strong>Appointment:</strong> ${escapeHtml(appt.appointment_date)} at ${escapeHtml(appt.appointment_time)}</p>
                <p><strong>Status:</strong>
                  <select class="status-select" data-id="${escapeHtml(appt.id)}" style="padding:5px; margin-left:10px;">
                    <option value="pending" ${appt.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${appt.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="completed" ${appt.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${appt.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                  </select>
                </p>
                ${appt.inputs_text ? `<p><strong>Notes:</strong> ${escapeHtml(appt.inputs_text)}</p>` : ''}
                <button class="btn o update-status-btn" data-id="${escapeHtml(appt.id)}" style="margin-top:10px; font-size:12px;">Update Status</button>
              </div>
            `).join('')}
          </div>
        `;
        attachStatusUpdateListeners();
      }
    } else {
      adminResultsEl.textContent = data.error || 'Failed to fetch appointments';
      if (res.status === 401 || res.status === 403) {
        adminAuthenticated = false;
        location.hash = '#admin-login';
      }
    }
  } catch {
    adminResultsEl.textContent = 'Network error. Please try again.';
  } finally {
    adminLoadingEl.style.display = 'none';
  }
}

document.querySelectorAll('.admin-filters button').forEach(btn => {
  btn.addEventListener('click', () => loadAdminDashboard(btn.dataset.view));
});

function attachStatusUpdateListeners() {
  document.querySelectorAll('.update-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const statusSelect = document.querySelector(`.status-select[data-id="${CSS.escape(id)}"]`);
      const newStatus = statusSelect?.value;
      if (!id || !newStatus) return;

      btn.disabled = true;
      btn.textContent = 'Updating...';
      try {
        const res = await fetch(`${bookingApiBase}/api/appointments/${encodeURIComponent(id)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          btn.textContent = 'Updated!';
          setTimeout(() => loadAdminDashboard('today'), 500);
        } else {
          btn.textContent = 'Failed';
          alert(data.error || 'Failed to update status');
        }
      } catch {
        btn.textContent = 'Error';
        alert('Network error. Please try again.');
      } finally {
        btn.disabled = false;
      }
    });
  });
}

checkAdminAuth();
