# Ignum CFO - Motor de Análisis Fiscal

Ignum CFO es un motor de análisis e inteligencia fiscal para empresas en México. Automatiza la conciliación de CFDIs, proyecta impuestos (ISR, IVA) y provee infraestructura de monitoreo continuo.

## Funciones Core

### Motor de Análisis Fiscal
- Resolución de consultas sobre LISR, LIVA, CFF
- Categorización estructurada de egresos
- Detección temprana de discrepancias fiscales
- Proyecciones de cierre mensual

### Motor de Impuestos Mexicano
- Soporta RESICO, RIF, Personas Morales, Sueldos
- CFDI 4.0 XML parsing y validación
- Cálculo automático ISR, IVA, IEPS
- Tracking de fechas límite SAT

### Gestión Empresarial
- Múltiples empresas por cuenta
- Subida masiva de CFDIs
- Cruce automático de ingresos/egresos
- Reportes mensuales y anuales

### Pagos (Stripe)
- Suscripciones recurrentes en MXN
- Niveles: Demo, Professional, Empresario, Sovereign
- Webhook handling
- Upgrade/downgrade

## Tech Stack

| Capa | Tecnología |
|------|------------|
| Backend | FastAPI (Python 3.11) |
| Frontend | Next.js 14 + Tailwind CSS |
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| AI/LLM | OpenAI GPT-4 / LangChain |
| Pagos | Stripe |
| Deploy | Docker + Docker Compose |

## Estructura de Acceso

| Nivel | Detalles | Límite |
|------|---------|--------|
| **Evaluación** | Sujeto a aprobación | 72 horas operativas |
| **Esencial** | $999 MXN / mes | 1 físico/moral (<$500K/mes) |
| **Empresarial** | $5,300 MXN / mes | 1 moral + 1 físico |
| **Sovereign** | Contacto directo | 5 morales + 10 físicos |

## Quick Start

### Prerrequisitos
- Docker + Docker Compose
- Git

### Instalación

```bash
# 1. Clonar repo
git clone <repo-url>
cd ignum-cfo

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales

# 3. Levantar servicios
docker-compose up --build

# 4. Acceder
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### Variables de Entorno

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:postgres@db:5432/ignum_cfo
SECRET_KEY=your-super-secret-key
OPENAI_API_KEY=sk-your-openai-key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Crear cuenta
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Perfil actual

### Companies
- `POST /api/companies` - Crear empresa
- `GET /api/companies` - Listar empresas
- `GET /api/companies/{id}` - Detalle empresa

### CFDIs
- `POST /api/cfdi/upload` - Subir CFDI XML
- `GET /api/cfdi` - Listar CFDIs

### Taxes
- `GET /api/tax/calculate/{company_id}` - Calcular impuestos
- `GET /api/tax/deadlines` - Fechas límite

### AI
- `POST /api/ai/chat` - Chat con asistente fiscal
- `GET /api/ai/recommendations/{company_id}` - Recomendaciones

### Subscription
- `GET /api/subscription` - Estado de suscripción
- `POST /api/subscription/create-checkout` - Crear checkout Stripe
- `POST /api/subscription/webhook` - Webhook Stripe

## Régimenes Fiscales Soportados

| Código | Nombre | Status |
|--------|--------|--------|
| 626 | RESICO | Activo |
| 605 | RIF | Activo |
| 601 | Personas Morales General | Activo |
| 603 | Personas Morales No Lucrativas | Activo |
| 605 | Sueldos | Activo |

## Desarrollo

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations
```bash
# Auto-generate migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head
```

## Roadmap 30 Días

### Semana 1: Fundamentos
- [x] Estructura proyecto
- [x] Auth JWT + registro/login
- [x] Modelos de base de datos
- [x] CRUD empresas

### Semana 2: Core Tax Engine
- [ ] CFDI 4.0 parser
- [ ] Cálculo ISR/IVA/IEPS
- [ ] CFDI upload/listado
- [ ] Dashboard básico

### Semana 3: AI Integration
- [ ] OpenAI integration
- [ ] Sistema de chat
- [ ] Categorización automática
- [ ] RAG setup

### Semana 4: Payments + Polish
- [ ] Stripe integration
- [ ] Demo timer + paywall
- [ ] Landing page
- [ ] Testing + deploy

## Seguridad

- JWT tokens con expiración
- Password hashing con bcrypt
- HTTPS en producción
- Validación de RFC/XML
- Rate limiting (implementar)

## Licencia

Propietario - Ignum CFO / TPWR Holdings
