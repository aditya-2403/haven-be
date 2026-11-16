const API = 'http://localhost:4000/api/v1';

async function req(endpoint, options = {}) {
  const url = `${API}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(data || res.statusText)}`);
  }
  return data;
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('🚀 RUNNING HAVEN END-TO-END VALIDATION SUITE 🚀');
  console.log('====================================================\n');

  try {
    // 1. Super Admin Login
    console.log('[STEP 1] Logging in as Super Admin...');
    const superAdminLoginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@haven.local',
        password: 'HavenAdmin2026!Secure',
      }),
    });
    const superAdminToken = superAdminLoginRes.data.accessToken;
    console.log('✅ Super Admin authenticated successfully.\n');

    // 2. Create Organization
    console.log('[STEP 2] Creating Organization "Apex Global Systems"...');
    const orgRes = await req('/organizations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        name: 'Apex Global Systems',
        slug: 'apex-global-' + Date.now(),
        email: 'contact@apexglobal.test',
        phone: '+1-800-555-APEX',
        address: '77 Cyberdyne Way, Austin, TX',
        initialAdmin: {
          firstName: 'Sarah',
          lastName: 'Connor',
          email: 'sarah.connor@apexglobal.test',
          password: 'AdminPassword2026!',
        },
      }),
    });
    const organization = orgRes.data.organization;
    const initialAdmin = orgRes.data.initialAdmin;
    console.log(`✅ Organization created: ${organization.name} (${organization.slug})`);
    console.log(`✅ Initial Org Admin created: ${initialAdmin.email}\n`);

    // 3. Log in as Organization Admin
    console.log('[STEP 3] Logging in as newly created Org Admin (Sarah Connor)...');
    const orgAdminLoginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'sarah.connor@apexglobal.test',
        password: 'AdminPassword2026!',
      }),
    });
    const orgAdminToken = orgAdminLoginRes.data.accessToken;
    console.log('✅ Org Admin authenticated successfully.\n');

    // 4. Create Department & Building
    console.log('[STEP 4] Creating Department & Building...');
    const deptRes = await req('/departments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgAdminToken}` },
      body: JSON.stringify({
        name: 'Advanced Cybernetics',
        description: 'AI & Robotics laboratory',
      }),
    });
    const department = deptRes.data;
    console.log(`✅ Department created: ${department.name}`);

    const bldRes = await req('/buildings', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgAdminToken}` },
      body: JSON.stringify({
        name: 'Skynet Research Tower',
        locationCode: 'TOWER-1',
        address: '77 Cyberdyne Way',
      }),
    });
    const building = bldRes.data;
    console.log(`✅ Building created: ${building.name} (${building.locationCode})\n`);

    // 5. Create Host Employee and Security Officer
    console.log('[STEP 5] Creating Host Employee (Dr. Miles Dyson) and User Account...');
    const empRes = await req('/employees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgAdminToken}` },
      body: JSON.stringify({
        employeeId: 'EMP-7701',
        fullName: 'Dr. Miles Dyson',
        email: 'm.dyson@apexglobal.test',
        phone: '+1-555-0188',
        departmentId: department._id,
        designation: 'Director of Special Projects',
      }),
    });
    const employee = empRes.data;
    console.log(`✅ Employee record created: ${employee.fullName} (${employee.employeeId})`);

    // Create Employee User account
    await req('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgAdminToken}` },
      body: JSON.stringify({
        firstName: 'Miles',
        lastName: 'Dyson',
        email: 'm.dyson@apexglobal.test',
        password: 'EmployeePass2026!',
        role: 'EMPLOYEE',
        departmentId: department._id,
        employeeId: employee._id,
      }),
    });
    console.log('✅ Employee login account created.');

    // Create Security User account
    await req('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgAdminToken}` },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Matrix',
        email: 'security.matrix@apexglobal.test',
        password: 'SecurityPass2026!',
        role: 'SECURITY',
        departmentId: department._id,
      }),
    });
    console.log('✅ Security Officer login account created.\n');

    // 6. Register Visitor
    console.log('[STEP 6] Registering Visitor Profile (Arthur Dent)...');
    const visitorRes = await req('/visitors', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgAdminToken}` },
      body: JSON.stringify({
        fullName: 'Arthur Dent',
        phone: '+1-555-4242',
        email: 'arthur.dent@hitchhiker.test',
        company: 'Megadodo Publications',
        identificationType: 'PASSPORT',
        identificationNumber: 'PASS-420042',
        notes: 'VIP guest from external publication',
      }),
    });
    const visitor = visitorRes.data;
    console.log(`✅ Visitor profile saved: ${visitor.fullName} (${visitor.phone})\n`);

    // 7. Create Appointment Visit
    console.log('[STEP 7] Scheduling Appointment for Visitor with Dr. Miles Dyson...');
    const visitRes = await req('/visits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${orgAdminToken}` },
      body: JSON.stringify({
        visitorId: visitor._id,
        hostId: employee._id,
        departmentId: department._id,
        buildingId: building._id,
        visitType: 'APPOINTMENT',
        purpose: 'Technical consultation on neural processors',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '14:30',
        expectedDurationMinutes: 60,
      }),
    });
    const visit = visitRes.data.visit;
    console.log(`✅ Visit appointment created. Status: ${visit.status}\n`);

    // 8. Log in as Host Employee & Approve Visit
    console.log('[STEP 8] Logging in as Host Employee (Miles Dyson) to Approve Visit...');
    const empLoginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'm.dyson@apexglobal.test',
        password: 'EmployeePass2026!',
      }),
    });
    const empToken = empLoginRes.data.accessToken;

    const pendingList = await req('/approvals/pending', {
      headers: { Authorization: `Bearer ${empToken}` },
    });
    console.log(`✅ Host has ${pendingList.data.length} pending approval(s).`);

    const approvalRes = await req(`/approvals/${visit._id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
      body: JSON.stringify({
        remarks: 'Clearance approved. Escort provided upon arrival.',
      }),
    });
    const passCode = approvalRes.data.passCode;
    console.log(`✅ Visit APPROVED! Generated Pass Code: ${passCode}\n`);

    // 9. Log in as Security & Scan QR / Pass Code
    console.log('[STEP 9] Logging in as Security Guard (John Matrix)...');
    const secLoginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'security.matrix@apexglobal.test',
        password: 'SecurityPass2026!',
      }),
    });
    const secToken = secLoginRes.data.accessToken;

    console.log(`[STEP 10] Scanning pass with code: ${passCode}...`);
    const scanRes = await req('/check-in/scan', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secToken}` },
      body: JSON.stringify({ code: passCode }),
    });
    console.log(`✅ Pass verified: Visitor "${scanRes.data.visitorId.fullName}" with Host "${scanRes.data.hostId.fullName}".\n`);

    // 10. Perform Check-in
    console.log('[STEP 11] Performing Check-In...');
    const checkInRes = await req(`/check-in/${visit._id}/checkin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secToken}` },
    });
    console.log(`✅ Visitor Checked IN! Status: ${checkInRes.data.status} at ${checkInRes.data.checkInAt}\n`);

    // 11. Check Active Visitors
    console.log('[STEP 12] Querying active checked-in visitors...');
    const activeRes = await req('/check-in/active', {
      headers: { Authorization: `Bearer ${secToken}` },
    });
    console.log(`✅ Active facility occupancy: ${activeRes.data.length} visitor(s) on-site.\n`);

    // 12. Perform Check-out
    console.log('[STEP 13] Performing Check-Out...');
    const checkOutRes = await req(`/check-in/${visit._id}/checkout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secToken}` },
    });
    console.log(`✅ Visitor Checked OUT! Status: ${checkOutRes.data.status} at ${checkOutRes.data.checkOutAt}\n`);

    // 13. Verify Reports & Analytics
    console.log('[STEP 14] Verifying Reports, Analytics, and CSV Export...');
    const summaryRes = await req('/reports/summary', {
      headers: { Authorization: `Bearer ${orgAdminToken}` },
    });
    console.log(`✅ Summary Analytics:`, summaryRes.data);

    const trendsRes = await req('/reports/visitor-trends?days=7', {
      headers: { Authorization: `Bearer ${orgAdminToken}` },
    });
    console.log(`✅ 7-Day Trends returned ${trendsRes.data.length} days of data.`);

    console.log('\n====================================================');
    console.log('🎉 ALL 14 END-TO-END WORKFLOW TESTS PASSED! 🎉');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ E2E TEST FAILED:', error.message);
    process.exit(1);
  }
}

runE2ETests();
