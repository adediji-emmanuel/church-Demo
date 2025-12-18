// =======================
// GLOBAL VARIABLES
// =======================
let selectedType = 'Tithe';
let selectedAmount = 1000;
let givingFrequency = 'once';

// =======================
// GIVING TYPE CARDS
// =======================
const giveCards = document.querySelectorAll('.give-card');
giveCards.forEach(card => {
  card.addEventListener('click', () => {
    giveCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    selectedType = card.dataset.type;
  });
});

// =======================
// AMOUNT BUTTONS
// =======================
const amtButtons = document.querySelectorAll('.amt-btn');
const amountInput = document.getElementById('amount');

amtButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    amtButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedAmount = parseInt(btn.dataset.amt);
    amountInput.value = selectedAmount;
  });
});

// Custom amount input
amountInput.addEventListener('input', () => {
  selectedAmount = parseInt(amountInput.value) || 0;
  amtButtons.forEach(b => b.classList.remove('active'));
});

// =======================
// FREQUENCY BUTTONS
// =======================
const freqButtons = document.querySelectorAll('.freq-btn');
freqButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    freqButtons.forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    givingFrequency = btn.dataset.value;
  });
});

// =======================
// GIVE BUTTON / PAYSTACK
// =======================
const giveBtn = document.getElementById('giveBtn');
giveBtn.addEventListener('click', () => {
  // Get donor info
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const anonymous = document.getElementById('anonymous').checked;
  const prayer = document.getElementById('prayer').value.trim();

  // Simple validation
  if (!name && !anonymous) {
    alert('Please enter your name or choose anonymous.');
    return;
  }
  if (!email) {
    alert('Please enter your email.');
    return;
  }
  if (!selectedAmount || selectedAmount <= 0) {
    alert('Please enter a valid amount.');
    return;
  }

  // Initialize Paystack
  const handler = PaystackPop.setup({
    key: 'pk_test_6d2cc70aa00a720ea1220d5ab5a7a9a24373cbff', // <-- replace with your Paystack public key
    email: email,
    amount: selectedAmount * 100, // in kobo
    currency: 'NGN',
    ref: 'PSK_' + Math.floor(Math.random() * 1000000000),
    metadata: {
      custom_fields: [
        { display_name: "Name", variable_name: "name", value: name },
        { display_name: "Phone", variable_name: "phone", value: phone },
        { display_name: "Giving Type", variable_name: "type", value: selectedType },
        { display_name: "Frequency", variable_name: "frequency", value: givingFrequency },
        { display_name: "Prayer Request", variable_name: "prayer", value: prayer },
        { display_name: "Anonymous", variable_name: "anonymous", value: anonymous }
      ]
    },
    callback: function(response) {
      // On successful payment, redirect to verify.php
      const ref = response.reference;
      const params = new URLSearchParams({
        reference: ref,
        name: name,
        email: email,
        phone: phone,
        type: selectedType,
        amount: selectedAmount,
        frequency: givingFrequency,
        prayer: prayer,
        anonymous: anonymous
      });
      window.location.href = `verify.php?${params.toString()}`;
    },
    onClose: function() {
      alert('Payment cancelled.');
    }
  });

  handler.openIframe();
});
