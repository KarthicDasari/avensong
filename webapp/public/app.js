// Global signature pad references
let waiverPad, rulesPad;

// Fetch Content on Load
async function fetchCMSContent() {
    try {
        const response = await fetch('/api/content');
        if (!response.ok) throw new Error("Failed to load CMS content");

        const content = await response.json();

        // Populate specific areas based on DB output
        if (content.introduction) {
            document.getElementById('cms-introduction').innerHTML = content.introduction;
        }
        if (content.waiver) {
            document.getElementById('cms-waiver').innerHTML = content.waiver;
        }
        if (content.rules) {
            document.getElementById('cms-rules').innerHTML = content.rules;
        }
    } catch (err) {
        console.error(err);
        document.getElementById('cms-introduction').innerHTML = "<p class='error'>Failed to load text. Please refresh.</p>";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchCMSContent();

    const waiverCanvas = document.getElementById('waiverSignature');
    const rulesCanvas = document.getElementById('rulesSignature');

    // Resize canvases to be responsive
    function resizeCanvas(canvas) {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        // Save drawing data if any
        let data = null;
        if (canvas.signaturePad) {
            data = canvas.signaturePad.toData();
        }

        // This is a CSS width approach. Signature pad needs explicit dimensions.
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = 200 * ratio; // Fixed height in CSS, scaled here
        canvas.getContext("2d").scale(ratio, ratio);

        if (data && canvas.signaturePad) {
            canvas.signaturePad.fromData(data);
        }
    }

    // Assign standard height via css before init
    waiverCanvas.style.height = '200px';
    rulesCanvas.style.height = '200px';

    waiverPad = new SignaturePad(waiverCanvas, { penColor: "rgb(0, 0, 0)" });
    rulesPad = new SignaturePad(rulesCanvas, { penColor: "rgb(0, 0, 0)" });

    // Store references on the elements for resize logic
    waiverCanvas.signaturePad = waiverPad;
    rulesCanvas.signaturePad = rulesPad;

    window.addEventListener("resize", () => {
        resizeCanvas(waiverCanvas);
        resizeCanvas(rulesCanvas);
    });

    // Initial sizing
    resizeCanvas(waiverCanvas);
    resizeCanvas(rulesCanvas);
});

// Clear Signature Logic
function clearWaiverSignature() {
    waiverPad.clear();
}

function clearRulesSignature() {
    rulesPad.clear();
}

// Toggle Tenant Specific Fields
function toggleTenantFields() {
    const isTenant = document.querySelector('input[name="residentType"]:checked').value === "tenant";
    const tenantFields = document.querySelectorAll('.tenant-field');
    const homeownerDelegation = document.querySelector('.homeowner-only');

    tenantFields.forEach(field => {
        if (isTenant) {
            field.classList.remove('hidden');
        } else {
            field.classList.add('hidden');
        }
    });

    if (isTenant) {
        homeownerDelegation.style.display = 'none';
    } else {
        homeownerDelegation.style.display = 'block';
    }
}

// Dummy invite function
function inviteTenant() {
    const email = document.getElementById('tenantInviteEmail').value;
    if (!email) {
        alert('Please enter a valid tenant email.');
        return;
    }

    const btn = document.querySelector('.btn-secondary');
    btn.textContent = 'Sending...';
    btn.disabled = true;

    // Simulate API call
    setTimeout(() => {
        alert(`Tenant invite successfully sent to ${email}. They will receive a secure link to complete their portion.`);
        btn.textContent = 'Sent Successfully';
        document.getElementById('tenantInviteEmail').value = '';
        setTimeout(() => {
            btn.textContent = 'Send Invite Link';
            btn.disabled = false;
        }, 3000);
    }, 1000);
}

// Form Submission & PDF Generation
function validateForm() {
    const initials = document.querySelectorAll('.check-initial');
    for (let i = 0; i < initials.length; i++) {
        if (!initials[i].value.trim()) {
            alert("Please provide all required initials in the Checklist (Section 1).");
            return false;
        }
    }

    const name = document.getElementById('homeownerName').value;
    const address = document.getElementById('propertyAddress').value;
    if (!name || !address) {
        alert("Please complete the Name and Address fields.");
        return false;
    }

    if (waiverPad.isEmpty() || rulesPad.isEmpty()) {
        alert("Please provide both required signatures.");
        return false;
    }

    return true;
}

// Helper to convert blob to b64
function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
    });
}

function submitForm() {
    if (!validateForm()) return;

    const btn = document.getElementById('submitBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-text">Generating & Submitting...</span>';
    btn.disabled = true;

    generatePDF()
        .then(async (pdfBlob) => {
            const pdfBase64 = await blobToBase64(pdfBlob);

            const payload = {
                homeownerName: document.getElementById('homeownerName').value,
                propertyAddress: document.getElementById('propertyAddress').value,
                residentType: document.querySelector('input[name="residentType"]:checked').value,
                pdfBase64: pdfBase64,
                fullData: {
                    email: document.getElementById('email').value,
                    phone: document.getElementById('emergencyPhone').value,
                    tenant: document.getElementById('tenantName').value,
                    lease: document.getElementById('leaseExpiration').value
                }
            };

            const req = await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!req.ok) throw new Error("Failed connecting to submission endpoint.");

            btn.innerHTML = '<span class="btn-text">Submitted Successfully! ✓</span>';
            btn.style.backgroundColor = '#1f7a68'; // Green
            alert("Your digital amenity packet has been successfully submitted and saved.");
        })
        .catch(err => {
            console.error(err);
            alert("Error submitting the packet. Please try again.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        });
}

function generatePDF() {
    return new Promise((resolve) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ format: 'letter' });

        // Branding
        doc.setFillColor(15, 48, 87); // #0f3057 Primary Color
        doc.rect(0, 0, 216, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text('Avensong Amenity Access Packet 2026', 15, 15);

        doc.setTextColor(50, 50, 50);
        doc.setFontSize(14);

        // Data Extraction
        const role = document.querySelector('input[name="residentType"]:checked').value;
        const name = document.getElementById('homeownerName').value;
        const address = document.getElementById('propertyAddress').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('emergencyPhone').value;
        const tenant = document.getElementById('tenantName').value;
        const lease = document.getElementById('leaseExpiration').value;

        let cursorY = 40;
        doc.text(`Resident Role: ${role.toUpperCase()}`, 15, cursorY);
        cursorY += 10;
        doc.text(`Name: ${name}`, 15, cursorY);
        cursorY += 10;
        doc.text(`Property Address: ${address}`, 15, cursorY);
        cursorY += 10;
        doc.text(`Email: ${email}`, 15, cursorY);
        cursorY += 10;
        doc.text(`Emergency Phone: ${phone}`, 15, cursorY);

        if (role === 'tenant' && tenant) {
            cursorY += 10;
            doc.text(`Tenant Name: ${tenant}`, 15, cursorY);
            cursorY += 10;
            doc.text(`Lease Expiration: ${lease}`, 15, cursorY);
        }

        cursorY += 20;

        // Signatures
        doc.setLineWidth(0.5);
        doc.line(15, cursorY, 200, cursorY); // divider
        cursorY += 10;

        doc.text('COVID-19 Waiver Acceptance', 15, cursorY);
        cursorY += 5;
        const waiverData = waiverPad.toDataURL();
        doc.addImage(waiverData, 'PNG', 15, cursorY, 150, 40);

        cursorY += 45;
        doc.line(15, cursorY, 200, cursorY); // divider
        cursorY += 10;

        doc.text('Amenity Rules Agreement', 15, cursorY);
        cursorY += 5;
        const rulesData = rulesPad.toDataURL();
        doc.addImage(rulesData, 'PNG', 15, cursorY, 150, 40);

        // Export as Blob
        const pdfBlob = doc.output('blob');
        resolve(pdfBlob);
    });
}
