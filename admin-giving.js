// =======================
// FETCH DATA FROM JSONBIN
// =======================
async function fetchGivingData() {
  const binID = '6942c72f43b1c97be9f4b13d';
  const masterKey = '$2a$10$qtoZhFMZ4JANryBb2s7LpOrnC2KpW0MIGpSvWVJxp1t7ta94N9SSO';
  const url = `https://api.jsonbin.io/v3/b/${binID}/latest`;

  const res = await fetch(url, {
    headers: { 'X-Master-Key': masterKey }
  });
  const data = await res.json();
  return data.record || [];
}

// =======================
// RENDER DASHBOARD
// =======================
async function renderDashboard() {
  const records = await fetchGivingData();

  // Total today
  const today = new Date().toISOString().slice(0,10);
  const totalToday = records.filter(r => r.date.startsWith(today)).reduce((sum,r) => sum + r.amount, 0);
  document.getElementById('totalToday').innerText = `₦${totalToday.toLocaleString()}`;

  // Total this month
  const month = new Date().toISOString().slice(0,7);
  const totalMonth = records.filter(r => r.date.startsWith(month)).reduce((sum,r) => sum + r.amount, 0);
  document.getElementById('totalMonth').innerText = `₦${totalMonth.toLocaleString()}`;

  // Giving by type chart
  const types = {};
  records.forEach(r => {
    types[r.type] = (types[r.type] || 0) + r.amount;
  });

  const ctxType = document.getElementById('givingTypeChart').getContext('2d');
  new Chart(ctxType, {
    type: 'doughnut',
    data: {
      labels: Object.keys(types),
      datasets: [{ data: Object.values(types), backgroundColor: ['#000','#555','#c9a14a','#777','#333'] }]
    },
    options: { responsive:true, plugins:{legend:{position:'bottom'}} }
  });

  // Recent transactions
  const recentList = document.getElementById('recentTransactions');
  recentList.innerHTML = '';
  records.slice(-5).reverse().forEach(r => {
    const li = document.createElement('li');
    li.classList.add('list-group-item');
    li.innerHTML = `${r.name} gave ₦${r.amount.toLocaleString()} (${r.type})`;
    recentList.appendChild(li);
  });

  // Fundraising projects
  const projectDiv = document.getElementById('projectProgress');
  projectDiv.innerHTML = '';
  const projects = {}; // aggregate by project
  records.forEach(r => { if(r.project) projects[r.project] = (projects[r.project]||0)+r.amount; });

  for(const [proj, amt] of Object.entries(projects)) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('mb-2');
    wrapper.innerHTML = `
      <div class="d-flex justify-content-between">
        <span>${proj}</span>
        <span>₦${amt.toLocaleString()}</span>
      </div>
      <div class="progress">
        <div class="progress-bar" role="progressbar" style="width:${Math.min(amt/100000*100,100)}%" aria-valuenow="${amt}" aria-valuemin="0" aria-valuemax="100000"></div>
      </div>
    `;
    projectDiv.appendChild(wrapper);
  }

  // Giving heatmap (by day of week)
  const heat = [0,0,0,0,0,0,0]; // Sun-Sat
  records.forEach(r => { const d = new Date(r.date); heat[d.getDay()] += r.amount; });
  const ctxHeat = document.getElementById('heatmapChart').getContext('2d');
  new Chart(ctxHeat, {
    type:'bar',
    data:{
      labels:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
      datasets:[{label:'Giving ₦', data:heat, backgroundColor:'#000'}]
    },
    options:{responsive:true, plugins:{legend:{display:false}}}
  });
}

renderDashboard();
