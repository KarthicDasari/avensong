CREATE TABLE IF NOT EXISTS Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'resident', 'tenant') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_name VARCHAR(50) UNIQUE NOT NULL,
    html_content TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    homeowner_name VARCHAR(150),
    property_address VARCHAR(200),
    resident_type VARCHAR(50),
    pdf_path LONGTEXT,
    submission_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS TenantInvites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_email VARCHAR(255) NOT NULL,
    property_address VARCHAR(200),
    homeowner_name VARCHAR(150),
    status ENUM('pending', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
