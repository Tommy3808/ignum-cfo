# 30-Day Roadmap - Ignum CFO MVP

## Semana 1: Fundamentos (Días 1-7)

### Días 1-2: Setup & Estructura
- [x] Crear estructura de proyecto
- [x] Setup Docker + Docker Compose
- [x] Configurar PostgreSQL
- [x] Setup FastAPI con SQLAlchemy
- [x] Setup Next.js con Tailwind

### Días 3-4: Autenticación
- [x] Modelo de usuarios
- [x] Registro de usuarios
- [x] Login con JWT
- [x] Middleware de autenticación
- [x] Frontend: páginas de login/register

### Días 5-7: Gestión de Empresas
- [x] CRUD empresas
- [x] Validación de RFC
- [x] Selección de régimen fiscal
- [x] Frontend: listado y creación
- [x] Límites por tier de suscripción

**Deliverable Semana 1:** Usuario puede registrarse, loguear y crear empresas.

---

## Semana 2: Tax Engine Core (Días 8-14)

### Días 8-10: CFDI Parser
- [ ] Modelo de CFDIs en DB
- [ ] Parser XML CFDI 4.0
- [ ] Validación SAT (mock)
- [ ] API upload CFDI
- [ ] Frontend: upload de archivos

### Días 11-12: Cálculo de Impuestos
- [ ] Motor ISR por régimen
  - [ ] RESICO (tasa variable)
  - [ ] RIF
  - [ ] Personas Morales (30%)
  - [ ] Sueldos
- [ ] Motor IVA (16%)
- [ ] API cálculo mensual
- [ ] Frontend: dashboard de impuestos

### Días 13-14: CFDI Management
- [ ] Listado de CFDIs
- [ ] Filtros por tipo/fecha
- [ ] Cruce ingresos vs egresos
- [ ] Categorización básica

**Deliverable Semana 2:** Usuario puede subir CFDIs y ver cálculo de impuestos.

---

## Semana 3: AI Integration (Días 15-21)

### Días 15-17: OpenAI Integration
- [ ] Setup LangChain/OpenAI
- [ ] System prompts fiscales
- [ ] Endpoint de chat
- [ ] Frontend: interfaz de chat

### Días 18-19: Categorización IA
- [ ] Prompt de categorización
- [ ] Procesamiento automático de CFDIs
- [ ] Mejora de metadata

### Días 20-21: Recomendaciones
- [ ] Análisis de patrones fiscales
- [ ] Generación de recomendaciones
- [ ] Alertas de riesgo
- [ ] Dashboard de insights

**Deliverable Semana 3:** Asistente IA funcional con chat y categorización.

---

## Semana 4: Payments & Polish (Días 22-30)

### Días 22-24: Stripe Integration
- [ ] Setup Stripe
- [ ] Productos y prices en Stripe
- [ ] Checkout session
- [ ] Webhook handling
- [ ] Cambio de tier

### Días 25-26: Demo Timer & Paywall
- [ ] Cron job para expirar demos
- [ ] Middleware de paywall
- [ ] Página de upgrade
- [ ] Restricciones por tier

### Días 27-28: Landing & UX
- [ ] Landing page completa
- [ ] Pricing cards
- [ ] Mejoras de UI/UX
- [ ] Responsive design

### Días 29-30: Testing & Deploy
- [ ] Testing end-to-end
- [ ] Bug fixes
- [ ] Documentación
- [ ] Preparar para producción

**Deliverable Semana 4:** Sistema completo con pagos y paywall.

---

## Milestones

| Fecha | Milestone | Criterios de Éxito |
|-------|-----------|-------------------|
| Día 7 | Auth + Empresas | 100% usuarios pueden crear cuenta y empresa |
| Día 14 | Tax Engine | Cálculos coinciden con ejemplos SAT |
| Día 21 | AI Assistant | Respuestas útiles en 80% de consultas |
| Día 30 | MVP Launch | First paying customer |

## Post-MVP (Mes 2+)

- [ ] Integración real con SAT (validación CFDIs)
- [ ] Descarga automática de CFDIs del SAT
- [ ] Reportes PDF
- [ ] App móvil
- [ ] Multi-moneda
- [ ] Integración con bancos
- [ ] Contabilidad electrónica (XML de contabilidad)
- [ ] Declaraciones automáticas

## Métricas a Trackear

- **Activación:** % que sube primer CFDI
- **Retención:** Uso a los 7, 30 días
- **Conversión:** % demo → pagado
- **NPS:** Satisfacción cliente
- **CAC:** Costo de adquisición
- **LTV:** Valor de vida del cliente

---

**Estado Actual:** Semana 1 completada (estructura + auth)
**Próximo Focus:** Semana 2 - Tax Engine + CFDI Parser
