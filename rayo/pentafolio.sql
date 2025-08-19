CREATE DATABASE IF NOT EXISTS pentafolio;
USE pentafolio;

CREATE TABLE users (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
	username VARCHAR(20) NOT NULL UNIQUE,
    mail VARCHAR(100) NOT NULL UNIQUE,
    password_user VARCHAR(12) NOT NULL,
	first_name VARCHAR(10) NOT NULL,
    last_name VARCHAR(20) NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_password DATETIME
);


CREATE TABLE investments (
    id_inv INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT NOT NULL,
    simbol VARCHAR(10) NOT NULL,
    name_inv VARCHAR(100) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    buy_price DECIMAL(15,4) NOT NULL,
    total_price DECIMAL(20,4) AS (quantity * buy_price) STORED,
    date_inv DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES users(id_user)
);

CREATE TABLE valores (
    id_user INT NOT NULL,
    simbol VARCHAR(10) NOT NULL,
    id_val VARCHAR(50) AS (CONCAT(id_user, simbol)) STORED,
    val DECIMAL(20,4),
    PRIMARY KEY (id_val),
    FOREIGN KEY (id_user) REFERENCES users(id_user)
);


