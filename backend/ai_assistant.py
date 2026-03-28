import os
from typing import List, Dict, Optional
from datetime import datetime
from openai import OpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter

# Initialize OpenAI
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

class AIAssistant:
    """AI Fiscal Assistant for Mexican Tax Law"""
    
    SYSTEM_PROMPT = """Eres Ignum CFO, un asesor fiscal experto en legislación mexicana.

TU EXPERTICIA:
- Ley del Impuesto Sobre la Renta (LISR)
- Ley del Impuesto al Valor Agregado (LIVA)
- Código Fiscal de la Federación
- Resoluciones Misceláneas SAT
- CFDI 4.0 y facturación electrónica
- Regímenes fiscales: RESICO, RIF, Personas Morales

ESTILO DE RESPUESTA:
- Directo, claro y ejecutivo
- Siempre en español mexicano
- Cita artículos específicos cuando aplique
- Ofrece ejemplos numéricos cuando sea útil
- Señala riesgos fiscales de forma proactiva
- Sugiere optimizaciones legales

RESTRICCIONES:
- No inventes información legal
- Si no estás seguro, dilo claramente
- Nunca sugieras evasión fiscal
- Prioriza la seguridad jurídica del usuario

CONTEXTO ACTUAL:
Estás asistiendo a un contribuyente mexicano con sus obligaciones fiscales.
"""

    CATEGORIZATION_PROMPT = """Analiza este CFDI/Comprobante fiscal y categorízalo.

Datos del comprobante:
- Emisor: {emisor_nombre} ({emisor_rfc})
- Total: ${total}
- Concepto: {concepto}
- Fecha: {fecha}

Categorías disponibles:
1. GASTOS_GENERALES - Gastos operativos generales
2. SERVICIOS_PROFESIONALES - Honorarios, asesoría
3. ARRENDAMIENTO - Rentas de inmuebles/equipo
4. COMBUSTIBLE - Gasolina, diesel, gas
5. ALIMENTOS - Restaurantes, viáticos
6. VIAJES - Transporte, hospedaje
7. MANTENIMIENTO - Reparaciones, servicios
8. PAPELERIA - Oficina, consumibles
9. TELECOMUNICACIONES - Internet, teléfono
10. IMPUESTOS - Pagos de impuestos
11. INVERSION - Activos, equipo
12. NOMINA - Sueldos, salarios
13. SERVICIOS_BASICOS - Agua, luz, gas

Responde SOLO con el código de categoría (ej: "GASTOS_GENERALES")."""

    def __init__(self):
        self.embeddings = None
        self.vectorstore = None
        self._init_rag()
    
    def _init_rag(self):
        """Initialize RAG system for tax law documents"""
        try:
            if os.getenv("OPENAI_API_KEY"):
                self.embeddings = OpenAIEmbeddings()
                # Chroma will be initialized when documents are added
        except Exception as e:
            print(f"RAG initialization warning: {e}")
    
    def chat(self, message: str, conversation_history: List[Dict], company_context: Optional[Dict] = None) -> str:
        """Chat with the AI fiscal assistant"""
        
        messages = [{"role": "system", "content": self.SYSTEM_PROMPT}]
        
        # Add company context if available
        if company_context:
            context_msg = f"""Contexto del contribuyente:
- RFC: {company_context.get('rfc', 'N/A')}
- Razón Social: {company_context.get('razon_social', 'N/A')}
- Régimen Fiscal: {company_context.get('regimen_fiscal', 'N/A')}
"""
            messages.append({"role": "system", "content": context_msg})
        
        # Add conversation history
        for msg in conversation_history[-10:]:  # Last 10 messages
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Add user message
        messages.append({"role": "user", "content": message})
        
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error en el servicio de IA: {str(e)}. Por favor intenta de nuevo."
    
    def categorize_expense(self, cfdi_data: Dict) -> str:
        """Categorize a CFDI expense using AI"""
        
        prompt = self.CATEGORIZATION_PROMPT.format(
            emisor_nombre=cfdi_data.get('emisor_nombre', 'N/A'),
            emisor_rfc=cfdi_data.get('emisor_rfc', 'N/A'),
            total=cfdi_data.get('total', 0),
            concepto=cfdi_data.get('concepto', 'N/A'),
            fecha=cfdi_data.get('fecha_emision', 'N/A')
        )
        
        try:
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Eres un clasificador de gastos fiscales. Responde solo con el código de categoría."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=50
            )
            category = response.choices[0].message.content.strip().upper()
            
            # Validate against known categories
            valid_categories = [
                "GASTOS_GENERALES", "SERVICIOS_PROFESIONALES", "ARRENDAMIENTO",
                "COMBUSTIBLE", "ALIMENTOS", "VIAJES", "MANTENIMIENTO",
                "PAPELERIA", "TELECOMUNICACIONES", "IMPUESTOS", "INVERSION",
                "NOMINA", "SERVICIOS_BASICOS"
            ]
            
            return category if category in valid_categories else "GASTOS_GENERALES"
            
        except Exception as e:
            print(f"Categorization error: {e}")
            return "GASTOS_GENERALES"
    
    def generate_recommendations(self, company, db) -> Dict:
        """Generate AI recommendations for a company"""
        
        from database import CFDI, CFDITipo, CFDIStatus
        from sqlalchemy import func
        
        # Get recent activity
        last_month = datetime.utcnow().replace(day=1)
        
        ingresos_total = db.query(func.sum(CFDI.total)).filter(
            CFDI.company_id == company.id,
            CFDI.tipo == CFDITipo.INGRESO,
            CFDI.status == CFDIStatus.VALID,
            CFDI.fecha_emision >= last_month
        ).scalar() or 0
        
        egresos_total = db.query(func.sum(CFDI.total)).filter(
            CFDI.company_id == company.id,
            CFDI.tipo == CFDITipo.EGRESO,
            CFDI.status == CFDIStatus.VALID,
            CFDI.fecha_emision >= last_month
        ).scalar() or 0
        
        # Generate contextual recommendations
        context = f"""Contexto actual:
- Régimen: {company.regimen_fiscal.value}
- Ingresos mes actual: ${ingresos_total:,.2f}
- Egresos mes actual: ${egresos_total:,.2f}
- RFC: {company.rfc}
"""
        
        recommendations_prompt = f"""Basándote en el siguiente contexto fiscal, genera 3-5 recomendaciones específicas:

{context}

Proporciona recomendaciones en formato JSON:
{{
    "recommendations": [
        {{
            "type": "warning|tip|opportunity",
            "title": "Título corto",
            "description": "Descripción detallada",
            "priority": "high|medium|low",
            "action": "Acción sugerida"
        }}
    ]
}}"""
        
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": recommendations_prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            import json
            content = response.choices[0].message.content
            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            return json.loads(content)
            
        except Exception as e:
            # Fallback recommendations
            return {
                "recommendations": [
                    {
                        "type": "tip",
                        "title": "Registra tus CFDIs",
                        "description": "Mantén tus facturas actualizadas para un cálculo preciso de impuestos.",
                        "priority": "high",
                        "action": "Sube tus CFDIs del mes"
                    },
                    {
                        "type": "warning",
                        "title": "Verifica fechas límite",
                        "description": "Las declaraciones se presentan el día 17 de cada mes.",
                        "priority": "high",
                        "action": "Revisa tu calendario fiscal"
                    }
                ]
            }
    
    def analyze_risk(self, company, db) -> Dict:
        """Analyze fiscal risk for a company"""
        
        risks = []
        
        # Check CFDI volume
        from database import CFDI
        cfdi_count = db.query(CFDI).filter(CFDI.company_id == company.id).count()
        
        if cfdi_count == 0:
            risks.append({
                "level": "high",
                "type": "missing_cfdis",
                "message": "No se han registrado CFDIs. Esto puede generar inconsistencias fiscales."
            })
        
        # Check regimen-specific risks
        if company.regimen_fiscal.value == "626" and cfdi_count > 0:  # RESICO
            from sqlalchemy import func
            annual_income = db.query(func.sum(CFDI.total)).filter(
                CFDI.company_id == company.id,
                CFDI.tipo == CFDITipo.INGRESO
            ).scalar() or 0
            
            if annual_income > 3500000:
                risks.append({
                    "level": "critical",
                    "type": "resico_limit",
                    "message": "Has excedido el límite anual de RESICO ($3.5M). Debes cambiar de régimen fiscal."
                })
        
        return {
            "risk_level": "high" if any(r["level"] == "critical" for r in risks) else 
                         "medium" if any(r["level"] == "high" for r in risks) else "low",
            "risks": risks,
            "last_analysis": datetime.utcnow().isoformat()
        }
