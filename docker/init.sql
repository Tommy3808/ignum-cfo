-- Ignum CFO Database Schema
-- PostgreSQL 15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    tier VARCHAR(20) DEFAULT 'demo',
    demo_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    demo_expires_at TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rfc VARCHAR(13) UNIQUE NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    regimen_fiscal VARCHAR(50) NOT NULL,
    nombre_comercial VARCHAR(255),
    direccion JSONB,
    sat_certified BOOLEAN DEFAULT FALSE,
    sat_cert_data JSONB,
    max_monthly_income DECIMAL(15,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CFDIs table
CREATE TABLE cfdis (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    uuid VARCHAR(36) UNIQUE NOT NULL,
    folio VARCHAR(50),
    serie VARCHAR(50),
    tipo VARCHAR(10) NOT NULL,
    emisor_rfc VARCHAR(13) NOT NULL,
    emisor_nombre VARCHAR(255),
    receptor_rfc VARCHAR(13) NOT NULL,
    receptor_nombre VARCHAR(255),
    subtotal DECIMAL(15,2) NOT NULL,
    descuento DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    tipo_cambio DECIMAL(10,6) DEFAULT 1.0,
    iva_trasladado DECIMAL(15,2) DEFAULT 0,
    iva_retenido DECIMAL(15,2) DEFAULT 0,
    isr_retenido DECIMAL(15,2) DEFAULT 0,
    ieps_trasladado DECIMAL(15,2) DEFAULT 0,
    ieps_retenido DECIMAL(15,2) DEFAULT 0,
    xml_content TEXT,
    xml_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    fecha_emision TIMESTAMP NOT NULL,
    fecha_timbrado TIMESTAMP,
    category VARCHAR(100),
    ai_metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Declarations table
CREATE TABLE declarations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    period VARCHAR(7) NOT NULL, -- YYYY-MM format
    tipo VARCHAR(50) NOT NULL,
    ingresos DECIMAL(15,2) DEFAULT 0,
    egresos DECIMAL(15,2) DEFAULT 0,
    iva_cobrado DECIMAL(15,2) DEFAULT 0,
    iva_pagado DECIMAL(15,2) DEFAULT 0,
    isr_retenido DECIMAL(15,2) DEFAULT 0,
    isr_a_cargo DECIMAL(15,2) DEFAULT 0,
    isr_a_favor DECIMAL(15,2) DEFAULT 0,
    due_date TIMESTAMP NOT NULL,
    filed_at TIMESTAMP,
    filed_uuid VARCHAR(36),
    status VARCHAR(20) DEFAULT 'pending',
    ai_recommendations JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    status VARCHAR(20) DEFAULT 'trial',
    tier VARCHAR(20) DEFAULT 'demo',
    monthly_amount DECIMAL(10,2),
    setup_fee DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'MXN',
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    trial_end TIMESTAMP,
    stripe_subscription_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tax Documents table
CREATE TABLE tax_documents (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    processed BOOLEAN DEFAULT FALSE,
    extracted_data JSONB,
    ai_analysis JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Conversations table
CREATE TABLE ai_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    title VARCHAR(255),
    messages JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Logs table
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_rfc ON companies(rfc);
CREATE INDEX idx_cfdis_company ON cfdis(company_id);
CREATE INDEX idx_cfdis_uuid ON cfdis(uuid);
CREATE INDEX idx_cfdis_fecha ON cfdis(fecha_emision);
CREATE INDEX idx_cfdis_tipo ON cfdis(tipo);
CREATE INDEX idx_declarations_company ON declarations(company_id);
CREATE INDEX idx_declarations_period ON declarations(period);
CREATE INDEX idx_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at);

-- Update triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_declarations_updated_at BEFORE UPDATE ON declarations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
