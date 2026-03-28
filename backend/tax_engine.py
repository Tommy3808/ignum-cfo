from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime, timedelta
from typing import List, Dict
from database import CFDI, Company, Declaration, RegimenFiscal, CFDITipo, CFDIStatus

class TaxEngine:
    """Mexican tax calculation engine supporting RESICO, RIF, Personas Morales"""
    
    # Monthly ISR deductions by regime (approximate 2024 rates)
    ISR_DEDUCTIONS = {
        RegimenFiscal.RESICO: 0.0,  # RESICO has special calculation
        RegimenFiscal.RIF: 0.0,
        RegimenFiscal.SUELDOS: 0.0,  # Calculated by payroll
        RegimenFiscal.MORAL_GENERAL: 0.0,  # Full deduction system
        RegimenFiscal.MORAL_NF: 0.0,
    }
    
    # IVA rates
    IVA_RATE = 0.16  # 16%
    IVA_FRONTERIZO = 0.08  # 8% for border zones
    
    # RESICO monthly rates (2024)
    RESICO_RATES = [
        (0, 25000, 1.00),
        (25000.01, 50000, 1.10),
        (50000.01, 83333.33, 1.50),
        (83333.34, 208333.33, 2.00),
        (208333.34, 3500000, 2.50),
    ]
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_monthly(self, company: Company, year: int, month: int) -> Dict:
        """Calculate monthly tax obligations"""
        
        # Get CFDIs for the period
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        
        ingresos_cfdis = self.db.query(CFDI).filter(
            CFDI.company_id == company.id,
            CFDI.tipo == CFDITipo.INGRESO,
            CFDI.status == CFDIStatus.VALID,
            CFDI.fecha_emision >= start_date,
            CFDI.fecha_emision < end_date
        ).all()
        
        egresos_cfdis = self.db.query(CFDI).filter(
            CFDI.company_id == company.id,
            CFDI.tipo == CFDITipo.EGRESO,
            CFDI.status == CFDIStatus.VALID,
            CFDI.fecha_emision >= start_date,
            CFDI.fecha_emision < end_date
        ).all()
        
        # Calculate totals
        ingresos = sum(cfdi.total for cfdi in ingresos_cfdis)
        egresos = sum(cfdi.total for cfdi in egresos_cfdis)
        
        iva_cobrado = sum(cfdi.iva_trasladado for cfdi in ingresos_cfdis)
        iva_pagado = sum(cfdi.iva_trasladado for cfdi in egresos_cfdis)
        iva_retenido = sum(cfdi.iva_retenido for cfdi in ingresos_cfdis)
        isr_retenido = sum(cfdi.isr_retenido for cfdi in ingresos_cfdis)
        
        # Calculate ISR based on regimen
        isr_a_cargo = self._calculate_isr(
            company.regimen_fiscal, 
            ingresos, 
            egresos,
            year,
            month
        )
        
        # Calculate IVA
        iva_a_cargo = iva_cobrado - iva_pagado - iva_retenido
        iva_a_favor = 0
        if iva_a_cargo < 0:
            iva_a_favor = abs(iva_a_cargo)
            iva_a_cargo = 0
        
        # Determine due date
        due_date = self._get_due_date(year, month, company.regimen_fiscal)
        
        result = {
            "period": f"{year}-{month:02d}",
            "company_rfc": company.rfc,
            "regimen_fiscal": company.regimen_fiscal.value,
            "ingresos": round(ingresos, 2),
            "egresos": round(egresos, 2),
            "utilidad_bruta": round(ingresos - egresos, 2),
            "iva_cobrado": round(iva_cobrado, 2),
            "iva_pagado": round(iva_pagado, 2),
            "iva_retenido": round(iva_retenido, 2),
            "iva_a_cargo": round(iva_a_cargo, 2),
            "iva_a_favor": round(iva_a_favor, 2),
            "isr_retenido": round(isr_retenido, 2),
            "isr_a_cargo": round(isr_a_cargo, 2),
            "isr_a_favor": 0,
            "total_a_pagar": round(isr_a_cargo + iva_a_cargo, 2),
            "due_date": due_date.isoformat(),
            "cfdi_count": {
                "ingresos": len(ingresos_cfdis),
                "egresos": len(egresos_cfdis)
            },
            "recommendations": self._generate_recommendations(
                company.regimen_fiscal,
                ingresos,
                egresos,
                isr_a_cargo,
                iva_a_cargo
            )
        }
        
        return result
    
    def _calculate_isr(self, regimen: RegimenFiscal, ingresos: float, egresos: float, year: int, month: int) -> float:
        """Calculate ISR based on regimen"""
        
        if regimen == RegimenFiscal.RESICO:
            return self._calculate_resico_isr(ingresos)
        elif regimen == RegimenFiscal.RIF:
            return self._calculate_rif_isr(ingresos)
        elif regimen == RegimenFiscal.MORAL_GENERAL:
            return self._calculate_moral_isr(ingresos, egresos)
        elif regimen == RegimenFiscal.SUELDOS:
            # For salaried employees, ISR is withheld by employer
            return 0
        else:
            # Default to general calculation
            return self._calculate_moral_isr(ingresos, egresos)
    
    def _calculate_resico_isr(self, ingresos: float) -> float:
        """Calculate ISR under RESICO regime"""
        # RESICO: Fixed rate based on income bracket
        for min_val, max_val, rate in self.RESICO_RATES:
            if min_val <= ingresos <= max_val:
                return round(ingresos * (rate / 100), 2)
        # Above 3.5M, special rate applies
        if ingresos > 3500000:
            return round(ingresos * 0.025, 2)
        return 0
    
    def _calculate_rif_isr(self, ingresos: float) -> float:
        """Calculate ISR under RIF regime"""
        # RIF: Has its own rate table and is being phased out
        # Simplified calculation for MVP
        if ingresos <= 20000:
            return 0
        elif ingresos <= 30000:
            return round(ingresos * 0.005, 2)
        else:
            return round(ingresos * 0.0125, 2)
    
    def _calculate_moral_isr(self, ingresos: float, egresos: float) -> float:
        """Calculate ISR for Personas Morales"""
        utilidad = ingresos - egresos
        if utilidad <= 0:
            return 0
        
        # Personas Morales: 30% flat rate on profit (simplified)
        # Real calculation involves more factors
        tasa_isr = 0.30
        return round(utilidad * tasa_isr, 2)
    
    def _get_due_date(self, year: int, month: int, regimen: RegimenFiscal) -> datetime:
        """Get declaration due date based on RFC last digit"""
        # SAT due dates: 17th of following month, extended based on RFC last digit
        # Simplified: Return 17th of next month
        if month == 12:
            due = datetime(year + 1, 1, 17)
        else:
            due = datetime(year, month + 1, 17)
        
        # Adjust for weekends (simplified)
        if due.weekday() >= 5:  # Saturday or Sunday
            due = due + timedelta(days=7 - due.weekday())
        
        return due
    
    def _generate_recommendations(self, regimen: RegimenFiscal, ingresos: float, egresos: float, isr: float, iva: float) -> List[str]:
        """Generate tax optimization recommendations"""
        recommendations = []
        
        if regimen == RegimenFiscal.RESICO:
            if ingresos > 208333:
                recommendations.append("Estás cerca del tope de RESICO (3.5M anuales). Considera cambio a Régimen General.")
            if egresos < (ingresos * 0.1):
                recommendations.append("Tus deducciones son bajas. Busca incrementar gastos deducibles válidos.")
        
        elif regimen == RegimenFiscal.MORAL_GENERAL:
            utilidad = ingresos - egresos
            margin = (utilidad / ingresos * 100) if ingresos > 0 else 0
            if margin > 30:
                recommendations.append(f"Margen de utilidad alto ({margin:.1f}%). Evalúa estrategias de optimización fiscal.")
        
        if iva > 0 and iva < 1000:
            recommendations.append("IVA a cargo menor a $1,000. Puedes acumularlo para el siguiente mes.")
        
        return recommendations
    
    def get_upcoming_deadlines(self) -> List[Dict]:
        """Get list of upcoming tax deadlines"""
        today = datetime.now()
        deadlines = []
        
        # Next 3 months of declarations
        for i in range(3):
            target = today + timedelta(days=30*i)
            year, month = target.year, target.month
            
            # ISR and IVA are due on the 17th of next month
            if month == 12:
                due = datetime(year + 1, 1, 17)
            else:
                due = datetime(year, month + 1, 17)
            
            deadlines.append({
                "type": "ISR",
                "period": f"{year}-{month:02d}",
                "due_date": due.isoformat(),
                "description": "Declaración mensual de ISR"
            })
            deadlines.append({
                "type": "IVA",
                "period": f"{year}-{month:02d}",
                "due_date": due.isoformat(),
                "description": "Declaración mensual de IVA"
            })
        
        return deadlines
    
    def validate_sat_compliance(self, company: Company) -> Dict:
        """Check SAT compliance status"""
        # This would integrate with SAT web services in production
        # For MVP, return placeholder
        return {
            "rfc": company.rfc,
            "sat_certified": company.sat_certified,
            "status": "active" if company.sat_certified else "pending",
            "last_verification": datetime.utcnow().isoformat(),
            "warnings": []
        }
