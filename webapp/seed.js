const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 4000,
    ssl: { rejectUnauthorized: true }
});

const seedData = async () => {
    try {
        console.log("Starting DB Seed Process...");

        // 1. Seed Users (1 Admin, 4 Residents, 4 Tenants)
        const passwordHash = await bcrypt.hash('Avensong2026!', 10);

        const users = [
            ['admin', passwordHash, 'admin'],
            ['resident1', passwordHash, 'resident'],
            ['resident2', passwordHash, 'resident'],
            ['resident3', passwordHash, 'resident'],
            ['resident4', passwordHash, 'resident'],
            ['tenant1', passwordHash, 'tenant'],
            ['tenant2', passwordHash, 'tenant'],
            ['tenant3', passwordHash, 'tenant'],
            ['tenant4', passwordHash, 'tenant']
        ];

        // Clear existing users for clean seed (Optional, careful in prod)
        await pool.query('DELETE FROM Users');

        for (const user of users) {
            await pool.query(
                `INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)`,
                user
            );
        }
        console.log("Users seeded successfully.");

        // 2. Seed Content
        const contentBlocks = [
            {
                section_name: "introduction",
                html_content: `
                    <p><strong>December 01, 2025</strong></p>
                    <p>Dear Avensong Community Homeowners:</p>
                    <p>Your access to the gated amenities will be turned off January 16, 2026, unless you have submitted
                        the 2026 Amenity Access Packet and have made at least the minimum amount of the required 2026
                        HOA assessment payments.</p>
                    <p>Please read the following information, complete the attached forms, and submit the entire packet
                        as instructed. Unless you complete this process for 2026 your amenity card will not be
                        activated.</p>
                    <p>Once your packet is received, your HOA account(s) will be checked for eligibility. If you have
                        not voted on the Covenant Amendment you will be asked to do so. You can find a copy of the
                        proposed Amendment at <a href="http://www.avensong.org/ownerinfo"
                            target="_blank">www.avensong.org/ownerinfo</a>. The passing of this Amendment is critical to
                        the future well-being of Avensong.</p>
                    <p><strong>IMPORTANT:</strong> If you want access to the pool for Memorial Day weekend, you must
                        submit the packet and have your homeowner account(s) in good standing BEFORE Friday, May 1,
                        2026. Due to the summer rush backlog, packets received after this date and/or delinquent
                        accounts are not guaranteed pool access in time for the holiday weekend.</p>
                `
            },
            {
                section_name: "waiver",
                html_content: `
                    <p><strong>Effective: December 1, 2025</strong></p>
                    <p>Any person entering the premises waives all civil liability against this premises owner and
                        operator for any injuries caused by the inherent risk associated with contracting COVID-19, or
                        other infectious disease at public gatherings, except for gross negligence, willful and wanton
                        misconduct, reckless infliction of harm, or intentional infliction of harm, by the individual or
                        entity of the premises.</p>

                    <h3 style="text-align: center; margin: 20px 0;">WAIVER AND RELEASE OF LIABILITY,<br>ASSUMPTION OF
                        RISK AND INDEMNITY AGREEMENT</h3>

                    <p style="text-align: center; font-weight: bold; text-decoration: underline;">BY SIGNING THIS
                        DOCUMENT YOU WILL WAIVE CERTAIN LEGAL RIGHTS, INCLUDING THE RIGHT TO SUE AVENSONG COMMUNITY
                        ASSOCIATION, INC.</p>
                    <p style="color: red; font-weight: bold; text-align: center;">Investors DO NOT SIGN THIS – it is for
                        people using the amenities only.<br>Residents fill in and sign ALL Yellow Highlighted items.</p>
                `
            },
            {
                section_name: "rules",
                html_content: `
                    <p><strong>Effective: December 1, 2025</strong></p>
                    <p>The following rules apply to all Avensong residents and their guests.<br>
                        (These rules are also posted at www.avensong.org/docs)<br>
                        All Avensong homeowner accounts must be in good standing (no balances, no violations) for
                        amenity access.<br>
                        Common areas and gated amenities are for Avensong residents and their guests to enjoy.<br>
                        Avensong residents are responsible for their guests.<br>
                        Anyone violating these rules will be asked to leave and may be subject to fines.<br>
                    </p>
                `
            }
        ];

        await pool.query('DELETE FROM Content');

        for (const block of contentBlocks) {
            await pool.query(
                `INSERT INTO Content (section_name, html_content) VALUES (?, ?)`,
                [block.section_name, block.html_content]
            );
        }
        console.log("Content seeded successfully.");

        process.exit(0);
    } catch (err) {
        console.error("Error Seeding DB:", err);
        process.exit(1);
    }
};

seedData();
